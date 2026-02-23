# app/services/summary_service.py
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.db.models import GroupMember, Bill, BillShare, User
from app.services.group_service import GroupService


class SummaryService:
    def __init__(self, group_service: GroupService):
        self.group_service = group_service

    @property
    def db(self):
        return self.group_service.db

    async def get_user_summary(self, user_id: UUID | str, group_id: Optional[UUID | str] = None):
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        if isinstance(group_id, str):
            group_id = UUID(group_id)
            
        """
        Returns summary metrics for a user.
        If group_id is provided, returns summary limited to that group.
        """
        # If group_id is provided, validate membership
        if group_id:
            await self.group_service.check_is_member(user_id, group_id)

        # 1. Total Groups (only count this group if group_id provided)
        if group_id:
            group_count = 1
        else:
            stmt = select(func.count(GroupMember.id)).where(
                GroupMember.user_id == user_id,
                GroupMember.deleted_at.is_(None)
            )
            res = await self.db.execute(stmt)
            group_count = res.scalar() or 0

        # 2. Total Owed (others owe you)
        # Bill where paid_by = user_id, share where user_id != user_id, paid = False
        stmt_owed = select(func.sum(BillShare.amount))\
            .join(Bill, Bill.id == BillShare.bill_id)\
            .where(
                Bill.paid_by == user_id,
                Bill.deleted_at.is_(None),
                BillShare.user_id != user_id,
                BillShare.paid == False
            )
        
        if group_id:
            stmt_owed = stmt_owed.where(Bill.group_id == group_id)
            
        res_owed = await self.db.execute(stmt_owed)
        total_owed = res_owed.scalar() or 0

        # 3. Total Owe (you owe others)
        # Bill where paid_by != user_id, share where user_id = user_id, paid = False
        stmt_owe = select(func.sum(BillShare.amount))\
            .join(Bill, Bill.id == BillShare.bill_id)\
            .where(
                Bill.paid_by != user_id,
                Bill.deleted_at.is_(None),
                BillShare.user_id == user_id,
                BillShare.paid == False
            )
        
        if group_id:
            stmt_owe = stmt_owe.where(Bill.group_id == group_id)
            
        res_owe = await self.db.execute(stmt_owe)
        total_owe = res_owe.scalar() or 0

        # 4. Friends (people you share groups with) - only for global summary
        friends_map = {}

        if not group_id:
            # Subquery for my groups
            my_groups_sub = select(GroupMember.group_id).where(
                GroupMember.user_id == user_id,
                GroupMember.deleted_at.is_(None)
            ).scalar_subquery()
            
            # Find members of these groups excluding self
            stmt_friends = select(User).join(GroupMember, User.id == GroupMember.user_id).where(
                GroupMember.group_id.in_(my_groups_sub),
                GroupMember.user_id != user_id,
                GroupMember.deleted_at.is_(None)
            ).distinct().limit(10)
            
            res_friends = await self.db.execute(stmt_friends)
            friends = res_friends.scalars().all()

            for friend in friends:
                friends_map[str(friend.id)] = {
                    "id": str(friend.id),
                    "name": friend.name,
                    "email": friend.email,
                }

        return {
            "total_owed": round(total_owed, 2),
            "total_owe": round(total_owe, 2),
            "group_count": group_count,
            "friends": list(friends_map.values())[:5],
        }

    async def get_simplified_debts(self, group_id: UUID | str, current_user_id: UUID | str):
        """
        Returns the minimum set of transactions to settle all unpaid debts in a group.
        Uses the Minimum Cash Flow algorithm after computing net balances per person.
        """
        from app.utils.debt_simplifier import simplify_debts

        if isinstance(group_id, str):
            group_id = UUID(group_id)
        if isinstance(current_user_id, str):
            current_user_id = UUID(current_user_id)

        # Validate membership
        await self.group_service.check_is_member(current_user_id, group_id)

        # Fetch all unpaid shares in this group (with bill for paid_by)
        stmt = (
            select(BillShare)
            .join(Bill, Bill.id == BillShare.bill_id)
            .options(selectinload(BillShare.user))
            .where(
                Bill.group_id == group_id,
                Bill.deleted_at.is_(None),
                BillShare.paid == False,
                BillShare.amount > 0,
            )
        )
        res = await self.db.execute(stmt)
        shares = res.scalars().all()

        # Build net balances: { user_id_str: net_balance }
        balances: dict[str, float] = {}

        for share in shares:
            # Load parent bill to find payer
            bill_stmt = select(Bill).where(Bill.id == share.bill_id)
            bill_res = await self.db.execute(bill_stmt)
            bill = bill_res.scalar_one_or_none()
            if not bill:
                continue

            payer_id = str(bill.paid_by)
            debtor_id = str(share.user_id)

            # Payer is owed this amount (skip self-payment)
            if payer_id == debtor_id:
                continue

            balances[payer_id] = round(balances.get(payer_id, 0) + share.amount, 2)
            balances[debtor_id] = round(balances.get(debtor_id, 0) - share.amount, 2)

        # Run simplification
        transactions = simplify_debts(balances)

        # Enrich with user info
        all_user_ids = {t["from"] for t in transactions} | {t["to"] for t in transactions}
        users_stmt = select(User).where(User.id.in_([UUID(uid) for uid in all_user_ids]))
        users_res = await self.db.execute(users_stmt)
        users_map = {str(u.id): {"id": str(u.id), "name": u.name, "email": u.email}
                     for u in users_res.scalars().all()}

        return [
            {
                "from": users_map.get(t["from"], {"id": t["from"]}),
                "to": users_map.get(t["to"], {"id": t["to"]}),
                "amount": t["amount"],
            }
            for t in transactions
        ]

    async def settle_up(
        self,
        group_id: UUID | str,
        user_id: UUID | str,
    ) -> dict:
        """
        Records the current simplified debts for a user as new Bill transactions.
        This balances the user's ledger to zero without modifying historical bills.
        """
        from datetime import datetime
        from app.db.models import SplitType, BillShare, Bill
        from app.services.socket_manager import socket_manager

        if isinstance(group_id, str):
            group_id = UUID(group_id)
        if isinstance(user_id, str):
            user_id = UUID(user_id)

        # 1. Get simplified debts (the final net-net transactions)
        # We use a helper that doesn't filter by user to get the full group state
        simplified = await self.get_simplified_debts(group_id, user_id)
        if not simplified:
            return {"settled_count": 0, "total_amount": 0.0}

        now = datetime.utcnow()
        settled_with_names = []
        settled_count = 0
        total_settled_amount = 0.0

        # 2. For every transaction where the clicking user is involved,
        # record a "mirror" bill to offset the debt.
        for tx in simplified:
            tx_from_id = UUID(tx["from"]["id"]) # The person who "owes"
            tx_to_id = UUID(tx["to"]["id"])     # The person "owed"
            amount = tx["amount"]

            # Only record if the clicking user is the one paying back
            # or confirming they were paid back.
            if user_id == tx_from_id or user_id == tx_to_id:
                # Record who the user is settling with
                other_party_name = tx["to"]["name"] if user_id == tx_from_id else tx["from"]["name"]
                if other_party_name not in settled_with_names:
                    settled_with_names.append(other_party_name)

                # We record a transaction: 'tx_from' paid 'tx_to'
                bill = Bill(
                    group_id=group_id,
                    paid_by=tx_from_id,
                    created_by=user_id,
                    description=f"Settle Up: {tx['from']['name']} paid {tx['to']['name']}",
                    total_amount=amount,
                    split_type=SplitType.EXACT,
                    created_at=now
                )
                self.db.add(bill)
                await self.db.flush()

                share = BillShare(
                    bill_id=bill.id,
                    user_id=tx_to_id,
                    amount=amount,
                    paid=False, # Leave unpaid so it offsets the historical unpaid ledger
                    created_by=user_id,
                    created_at=now
                )
                self.db.add(share)

                settled_count += 1
                total_settled_amount += amount

        await self.db.commit()

        # 3. Broadcast update
        if settled_count > 0:
            user = await self.db.get(User, user_id)
            await socket_manager.broadcast_to_group(str(group_id), {
                "type": "SETTLE_UP",
                "group_id": str(group_id),
                "user_name": user.name if user else "Someone",
                "settled_with": settled_with_names,
                "settled_count": settled_count,
                "total_amount": round(total_settled_amount, 2),
            })

        return {
            "settled_count": settled_count,
            "total_amount": round(total_settled_amount, 2),
        }
