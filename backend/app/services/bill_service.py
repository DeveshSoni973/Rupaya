# app/services/bill_service.py
from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update, delete, func, or_
from sqlalchemy.orm import selectinload

from app.core.exceptions import (
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.db.models import Bill, BillShare, SplitType, User
from app.models.bills import BillCreate, BillUpdate
# Note: app.models.bills.SplitType might be same as app.db.models.SplitType if imported? 
# If not, let's use the DB one for DB ops.
from app.services.group_service import GroupService
from app.services.socket_manager import socket_manager


class BillService:
    def __init__(self, group_service: GroupService):
        self.group_service = group_service

    @property
    def db(self):
        return self.group_service.db

    async def create_bill(self, user_id: UUID | str, data: BillCreate):
        """
        Create a new bill and its associated shares.
        """
        # 1. Check if group exists and user is a member
        await self.group_service.check_is_member(user_id, str(data.group_id))

        # 2. Determine who paid (defaults to creator if not specified)
        paid_by = str(data.paid_by) if data.paid_by else user_id

        # 3. Calculate and validate shares
        # Note: data.split_type logic handles Pydantic enum? 
        # We might need to cast to DB enum if they differ.
        shares_create = self._calculate_shares(
            data.split_type, data.total_amount, data.shares, paid_by
        )

        # 4. Create Bill with nested Shares
        bill = Bill(
            description=data.description,
            total_amount=data.total_amount,
            group_id=data.group_id, # UUID compatible?
            split_type=data.split_type, # ensure compatibility
            paid_by=paid_by,
            created_by=user_id
        )
        self.db.add(bill)
        await self.db.flush()

        for share_data in shares_create:
            share = BillShare(
                bill_id=bill.id,
                user_id=UUID(str(share_data["user_id"])) if isinstance(share_data["user_id"], str) else share_data["user_id"],
                amount=share_data["amount"],
                paid=share_data["paid"],
                created_by=user_id
            )
            self.db.add(share)
        
        await self.db.commit()
        await self.db.refresh(bill)
        
        # Load relations for return
        bill_details = await self.get_bill_details(user_id, str(bill.id))
        
        # Broadcast update
        await socket_manager.broadcast_to_group(str(data.group_id), {
            "type": "NEW_BILL",
            "bill_id": str(bill.id),
            "description": bill.description,
            "total_amount": float(bill.total_amount),
            "created_by_name": (await self.db.get(User, user_id)).name if isinstance(user_id, UUID) else user_id
        })

        return bill_details


    async def update_bill(self, user_id: UUID | str, bill_id: UUID | str, data: BillUpdate):
        """
        Update a bill's details.
        Also handles recalculating or replacing shares.
        """
        # 1. Fetch current bill (with shares) and verify existence
        stmt = select(Bill).options(selectinload(Bill.shares)).where(Bill.id == bill_id)
        result = await self.db.execute(stmt)
        bill = result.scalar_one_or_none()
        
        if not bill:
            raise NotFoundError("Bill not found")

        # 2. Check if user is a member of the group
        await self.group_service.check_is_member(user_id, str(bill.group_id))

        # 3. Handle Share Updates
        update_data = data.model_dump(exclude_unset=True)
        new_shares_data = None
        
        target_split_type = data.split_type if data.split_type is not None else bill.split_type
        target_total_amount = data.total_amount if data.total_amount is not None else bill.total_amount
        target_paid_by = str(data.paid_by) if data.paid_by is not None else str(bill.paid_by)

        if data.shares is not None:
            # We are providing new shares explicitly
            new_shares_data = self._calculate_shares(
                target_split_type, target_total_amount, data.shares, target_paid_by
            )
        elif ("total_amount" in update_data or "split_type" in update_data or "paid_by" in update_data):
            # If it's EQUAL, we can auto-recalculate from existing members.
            # Using str comparison for enums to be safe
            if str(target_split_type) == "EQUAL":
                # Use current share list to get user IDs
                # Transform bill.shares (ORM objects) to match input expectation if needed
                # _calculate_shares expects 'shares_input' which has .user_id
                
                # Mock object or simple struct
                class ShareInput:
                    def __init__(self, uid): self.user_id = uid
                
                fake_shares_input = [ShareInput(s.user_id) for s in bill.shares]
                
                new_shares_data = self._calculate_shares(
                    SplitType.EQUAL, target_total_amount, fake_shares_input, target_paid_by
                )
            elif str(target_split_type) == "EXACT":
                if "total_amount" in update_data:
                    current_sum = sum(s.amount for s in bill.shares)
                    if abs(current_sum - target_total_amount) > 0.01:
                        raise ValidationError("Updating total amount on an EXACT split requires providing new shares.")

        # 4. Surgical DB Updates
        
        # Update Bill metadata
        if "description" in update_data:
            bill.description = update_data["description"]
        if "total_amount" in update_data:
            bill.total_amount = update_data["total_amount"]
        if "split_type" in update_data:
            bill.split_type = update_data["split_type"]
        if "paid_by" in update_data:
            bill.paid_by = update_data["paid_by"]
            
        bill.updated_at = datetime.utcnow()
        bill.updated_by = user_id
        
        if new_shares_data is not None:
            # Surgical update for shares
            current_shares = {str(s.user_id): s for s in bill.shares}
            new_user_ids = {s["user_id"] for s in new_shares_data}

            # 1. Delete removed
            for uid, s in current_shares.items():
                if uid not in new_user_ids:
                    await self.db.delete(s)

            # 2. Update existing or Create new
            for share_data in new_shares_data:
                uid = share_data["user_id"]
                if uid in current_shares:
                    existing = current_shares[uid]
                    existing.amount = share_data["amount"]
                    existing.paid = share_data["paid"]
                else:
                    new_share = BillShare(
                        bill_id=bill_id,
                        user_id=uid,
                        amount=share_data["amount"],
                        paid=share_data["paid"],
                        created_by=user_id
                    )
                    self.db.add(new_share)

        await self.db.commit()

        # 5. Return full bill details
        bill_details = await self.get_bill_details(user_id, bill_id)

        # Broadcast update
        await socket_manager.broadcast_to_group(str(bill.group_id), {
            "type": "UPDATE_BILL",
            "bill_id": str(bill_id),
            "description": bill.description
        })

        return bill_details


    def _calculate_shares(
        self, split_type, total_amount: float, shares_input: list, paid_by: str
    ) -> list[dict]:
        """
        Calculate individual share amounts based on split type.
        Returns a list of dictionaries.
        """
        # Handling different Enum types if necessary
        st_str = str(split_type) if split_type else "EQUAL"
        st_equal = str(SplitType.EQUAL)
        st_exact = str(SplitType.EXACT)
        
        # Pydantic enum might be "EQUAL", DB enum might be "EQUAL"
        
        if st_str == st_equal or st_str == "EQUAL":
            # Filter those who should actually be part of the split divisor.
            # We treat amount=0 as "not involved in the equal split".
            involved_shares = [
                s for s in shares_input 
                if getattr(s, "amount", None) is None or s.amount > 0
            ]
            count = len(involved_shares)
            if count == 0:
                raise ValidationError("At least one person must be involved in the split")

            individual_amount = total_amount / count
            
            involved_ids = {str(s.user_id) for s in involved_shares}
            return [
                {
                    "user_id": str(share.user_id),
                    "amount": individual_amount if str(share.user_id) in involved_ids else 0,
                    "paid": str(share.user_id) == paid_by,
                }
                for share in shares_input
            ]

        elif st_str == st_exact or st_str == "EXACT":
            total_shares = sum(share.amount or 0 for share in shares_input)
            if abs(total_shares - total_amount) > 0.01:
                raise ValidationError(
                    f"Sum of shares ({total_shares}) must equal total amount ({total_amount})"
                )

            return [
                {
                    "user_id": str(share.user_id),
                    "amount": share.amount or 0,
                    "paid": str(share.user_id) == paid_by,
                }
                for share in shares_input
            ]

        raise ValidationError(f"Split type {split_type} is not yet implemented")


    async def get_group_bills(
        self, user_id: UUID | str, group_id: UUID | str, skip: int = 0, limit: int = 20, search: str = None
    ):
        """
        Retrieve bills for a specific group with pagination and optional search.
        """
        # Check membership
        await self.group_service.check_is_member(user_id, group_id)

        # Build query
        stmt = select(Bill).where(
            Bill.group_id == group_id, 
            Bill.deleted_at.is_(None)
        )
        
        if search:
            stmt = stmt.where(Bill.description.ilike(f"%{search}%"))
        
        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        res = await self.db.execute(count_stmt)
        total = res.scalar()

        # Fetch with pagination
        stmt = stmt.options(
            selectinload(Bill.shares).selectinload(BillShare.user),
            selectinload(Bill.payer),
            selectinload(Bill.group)
        ).order_by(Bill.created_at.desc()).offset(skip).limit(limit)
        
        res = await self.db.execute(stmt)
        bills = res.scalars().all()

        return {
            "items": bills,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(bills) < total,
        }

    async def get_user_bills(self, user_id: UUID | str, skip: int = 0, limit: int = 20):
        """
        Retrieve all bills where the user is involved (payer or debtor).
        """
        stmt = select(Bill).where(
            or_(
                Bill.paid_by == user_id,
                Bill.shares.any(BillShare.user_id == user_id)
            ),
            Bill.deleted_at.is_(None)
        )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        res = await self.db.execute(count_stmt)
        total = res.scalar()

        stmt = stmt.options(
            selectinload(Bill.shares).selectinload(BillShare.user),
            selectinload(Bill.payer),
            selectinload(Bill.group)
        ).order_by(Bill.created_at.desc()).offset(skip).limit(limit)

        res = await self.db.execute(stmt)
        bills = res.scalars().all()

        return {
            "items": bills,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(bills) < total,
        }

    async def get_bill_details(self, user_id: UUID | str, bill_id: UUID | str):
        """
        Get details of a specific bill.
        """
        stmt = select(Bill).options(
            selectinload(Bill.shares).selectinload(BillShare.user),
            selectinload(Bill.shares).selectinload(BillShare.user),
            selectinload(Bill.payer),
            selectinload(Bill.group)
        ).where(Bill.id == bill_id)
        
        res = await self.db.execute(stmt)
        bill = res.scalar_one_or_none()

        if not bill:
            raise NotFoundError("Bill not found")

        # Check if user has access to this bill (via group membership)
        await self.group_service.check_is_member(user_id, str(bill.group_id))

        return bill

    async def mark_share_as_paid(self, user_id: str, share_id: str):
        """
        Mark a bill share as paid.
        """
        # Get the share
        stmt = select(BillShare).options(selectinload(BillShare.bill), selectinload(BillShare.user)).where(BillShare.id == share_id)
        res = await self.db.execute(stmt)
        share = res.scalar_one_or_none()

        if not share:
            raise NotFoundError("Share not found")

        # Check if user has access to this bill
        await self.group_service.check_is_member(user_id, str(share.bill.group_id))

        # Verify the user is the one who owes this share
        if str(share.user_id) != user_id:
            raise ForbiddenError("You can only mark your own shares as paid")

        # Check if already paid
        if share.paid:
            raise ValidationError("This share is already marked as paid")

        # Mark as paid
        share.paid = True
        share.updated_by = user_id
        share.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(share)
        
        # Broadcast update
        await socket_manager.broadcast_to_group(str(share.bill.group_id), {
            "type": "PAYMENT_UPDATE",
            "bill_id": str(share.bill_id),
            "share_id": str(share_id),
            "paid": True,
            "user_id": str(share.user_id)
        })
        
        return share

    async def mark_share_as_unpaid(self, user_id: str, share_id: str):
        """
        Mark a bill share as unpaid (undo payment).
        """
        # Get the share
        stmt = select(BillShare).options(selectinload(BillShare.bill), selectinload(BillShare.user)).where(BillShare.id == share_id)
        res = await self.db.execute(stmt)
        share = res.scalar_one_or_none()

        if not share:
            raise NotFoundError("Share not found")

        # Check if user has access to this bill
        await self.group_service.check_is_member(user_id, str(share.bill.group_id))

        # Verify the user is the one who owes this share
        if str(share.user_id) != user_id:
            raise ForbiddenError("You can only mark your own shares as unpaid")

        # Check if already unpaid
        if not share.paid:
            raise ValidationError("This share is already marked as unpaid")

        # Mark as unpaid
        share.paid = False
        share.updated_by = user_id
        share.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(share)

        # Broadcast update
        await socket_manager.broadcast_to_group(str(share.bill.group_id), {
            "type": "PAYMENT_UPDATE",
            "bill_id": str(share.bill_id),
            "share_id": str(share_id),
            "paid": False,
            "user_id": str(share.user_id)
        })

        return share
