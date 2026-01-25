from datetime import datetime

from app.core.exceptions import (
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.db import prisma
from app.models.bills import BillCreate, BillUpdate, SplitType
from app.services.group_service import GroupService


class BillService:
    def __init__(self, group_service: GroupService):
        self.group_service = group_service

    async def create_bill(self, user_id: str, data: BillCreate):
        """
        Create a new bill and its associated shares.
        """
        # 1. Check if group exists and user is a member
        await self.group_service.check_is_member(user_id, str(data.group_id))

        # 2. Determine who paid (defaults to creator if not specified)
        paid_by = str(data.paid_by) if data.paid_by else user_id

        # 3. Calculate and validate shares
        shares_create = self._calculate_shares(
            data.split_type, data.total_amount, data.shares, paid_by
        )


        # 4. Create Bill with nested Shares
        bill = await prisma.bill.create(
            data={
                "description": data.description,
                "total_amount": data.total_amount,
                "group_id": str(data.group_id),
                "split_type": data.split_type,
                "paid_by": paid_by,
                "created_by": user_id,
                "shares": {"create": shares_create},
            },

            include={
                "shares": {"include": {"user": True}},
                "payer": True,
            },
        )

        return bill

    async def update_bill(self, user_id: str, bill_id: str, data: BillUpdate):
        """
        Update a bill's details.
        Also handles recalculating or replacing shares.
        """
        # 1. Fetch current bill (with shares) and verify existence
        bill = await prisma.bill.find_unique(where={"id": bill_id}, include={"shares": True})
        if not bill:
            raise NotFoundError("Bill not found")

        # 2. Check if user is a member of the group
        await self.group_service.check_is_member(user_id, bill.group_id)

        # 3. Handle Share Updates
        update_data = data.model_dump(exclude_unset=True)
        new_shares_data = None
        
        target_split_type = data.split_type if data.split_type is not None else bill.split_type
        target_total_amount = data.total_amount if data.total_amount is not None else bill.total_amount
        target_paid_by = str(data.paid_by) if data.paid_by is not None else bill.paid_by

        if data.shares is not None:
            # We are providing new shares explicitly
            new_shares_data = self._calculate_shares(
                target_split_type, target_total_amount, data.shares, target_paid_by
            )
        elif ("total_amount" in update_data or "split_type" in update_data or "paid_by" in update_data):
            # If it's EQUAL, we can auto-recalculate from existing members.
            if target_split_type == SplitType.EQUAL:
                # Use current share list to get user IDs

                new_shares_data = self._calculate_shares(
                    SplitType.EQUAL, target_total_amount, bill.shares, target_paid_by
                )
            elif target_split_type == SplitType.EXACT:
                # If total_amount changed on EXACT without new shares, it's an error

                if "total_amount" in update_data:
                    current_sum = sum(s.amount for s in bill.shares)
                    if abs(current_sum - target_total_amount) > 0.01:
                        raise ValidationError("Updating total amount on an EXACT split requires providing new shares.")

        # 4. Surgical DB Updates
        update_dict = {k: v for k, v in update_data.items() if k != "shares"}
        update_dict["updated_at"] = datetime.utcnow()
        update_dict["updated_by"] = user_id
        if "paid_by" in update_dict and update_dict["paid_by"]:
            update_dict["paid_by"] = str(update_dict["paid_by"])

        if new_shares_data is None:
            # Just update metadata
            await prisma.bill.update(
                where={"id": bill_id},
                data=update_dict
            )
        else:
            # Surgical update for shares in a transaction
            current_shares = {s.user_id: s for s in bill.shares}
            new_user_ids = {s["user_id"] for s in new_shares_data}

            async with prisma.batch_() as batch:
                batch.bill.update(where={"id": bill_id}, data=update_dict)

                # 1. Delete removed
                for uid, s in current_shares.items():
                    if uid not in new_user_ids:
                        batch.billshare.delete(where={"id": s.id})

                # 2. Update existing or Create new
                for share_data in new_shares_data:
                    uid = share_data["user_id"]
                    if uid in current_shares:
                        existing = current_shares[uid]
                        # When updating, we should sync the 'paid' status as well,
                        # especially if the payer changed.
                        batch.billshare.update(
                            where={"id": existing.id},
                            data={
                                "amount": share_data["amount"],
                                "paid": share_data["paid"]
                            }
                        )

                    else:
                        batch.billshare.create(
                            data={
                                "bill_id": bill_id,
                                "user_id": uid,
                                "amount": share_data["amount"],
                                "paid": share_data["paid"],
                                "created_by": user_id
                            }
                        )


        # 5. Return full bill details
        return await self.get_bill_details(user_id, bill_id)





    def _calculate_shares(
        self, split_type: SplitType, total_amount: float, shares_input: list, paid_by: str
    ) -> list[dict]:
        """
        Calculate individual share amounts based on split type.
        Returns a list of dictionaries for Prisma create.
        """
        if split_type == SplitType.EQUAL:
            count = len(shares_input)
            if count == 0:
                raise ValidationError("At least one person must be involved in the split")

            individual_amount = total_amount / count
            return [
                {
                    "user_id": str(share.user_id),
                    "amount": individual_amount,
                    "paid": str(share.user_id) == paid_by,
                }
                for share in shares_input
            ]

        elif split_type == SplitType.EXACT:
            total_shares = sum(share.amount or 0 for share in shares_input)
            if abs(total_shares - total_amount) > 0.01:
                raise ValidationError(
                    f"Sum of shares ({total_shares}) must equal total amount ({total_amount})"
                )

            return [
                {
                    "user_id": str(share.user_id),
                    "amount": share.amount,
                    "paid": str(share.user_id) == paid_by,
                }
                for share in shares_input
            ]

        raise ValidationError(f"Split type {split_type} is not yet implemented")


    async def get_group_bills(
        self, user_id: str, group_id: str, skip: int = 0, limit: int = 20, search: str = None
    ):
        """
        Retrieve bills for a specific group with pagination and optional search.
        Verifies that the requesting user is a member of that group.
        """
        # Check membership
        await self.group_service.check_is_member(user_id, group_id)

        # Build where clause
        where = {"group_id": group_id, "deleted_at": None}
        if search:
            where["description"] = {"contains": search, "mode": "insensitive"}

        # Get total count for this group
        total = await prisma.bill.count(where=where)

        bills = await prisma.bill.find_many(
            where=where,
            include={
                "shares": {"include": {"user": True}},
                "payer": True,
            },
            order={"created_at": "desc"},
            skip=skip,
            take=limit,
        )

        return {
            "items": bills,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(bills) < total,
        }

    async def get_user_bills(self, user_id: str, skip: int = 0, limit: int = 20):
        """
        Retrieve all bills where the user is involved (payer or debtor).
        """
        where = {
            "OR": [
                {"paid_by": user_id},
                {"shares": {"some": {"user_id": user_id}}},
            ],
            "deleted_at": None,
        }

        total = await prisma.bill.count(where=where)

        bills = await prisma.bill.find_many(
            where=where,
            include={
                "shares": {"include": {"user": True}},
                "payer": True,
                "group": True,
            },
            order={"created_at": "desc"},
            skip=skip,
            take=limit,
        )

        return {
            "items": bills,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(bills) < total,
        }

    async def get_bill_details(self, user_id: str, bill_id: str):
        """
        Get details of a specific bill.
        Verifies that the user has access via group membership.
        """
        bill = await prisma.bill.find_unique(
            where={"id": bill_id},
            include={
                "shares": {"include": {"user": True}},
                "payer": True,
            },
        )

        if not bill:
            raise NotFoundError("Bill not found")

        # Check if user has access to this bill (via group membership)
        await self.group_service.check_is_member(user_id, bill.group_id)

        return bill

    async def mark_share_as_paid(self, user_id: str, share_id: str):
        """
        Mark a bill share as paid.
        Only the user who owes the share can mark it as paid.
        """
        # Get the share
        share = await prisma.billshare.find_unique(where={"id": share_id}, include={"bill": True})

        if not share:
            raise NotFoundError("Share not found")

        # Check if user has access to this bill (via group membership)
        await self.group_service.check_is_member(user_id, share.bill.group_id)

        # Verify the user is the one who owes this share
        if share.user_id != user_id:
            raise ForbiddenError("You can only mark your own shares as paid")

        # Check if already paid
        if share.paid:
            raise ValidationError("This share is already marked as paid")

        # Mark as paid
        updated_share = await prisma.billshare.update(
            where={"id": share_id},
            data={"paid": True, "updated_by": user_id, "updated_at": datetime.utcnow()},
            include={"user": True},
        )

        return updated_share

    async def mark_share_as_unpaid(self, user_id: str, share_id: str):
        """
        Mark a bill share as unpaid (undo payment).
        Only the user who owes the share can mark it as unpaid.
        """
        # Get the share
        share = await prisma.billshare.find_unique(where={"id": share_id}, include={"bill": True})

        if not share:
            raise NotFoundError("Share not found")

        # Check if user has access to this bill (via group membership)
        await self.group_service.check_is_member(user_id, share.bill.group_id)

        # Verify the user is the one who owes this share
        if share.user_id != user_id:
            raise ForbiddenError("You can only mark your own shares as unpaid")

        # Check if already unpaid
        if not share.paid:
            raise ValidationError("This share is already marked as unpaid")

        # Mark as unpaid
        updated_share = await prisma.billshare.update(
            where={"id": share_id},
            data={"paid": False, "updated_by": user_id, "updated_at": datetime.utcnow()},
            include={"user": True},
        )

        return updated_share
