from datetime import datetime

from app.core.exceptions import (
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.db import prisma
from app.models.bills import BillCreate, SplitType
from app.services.group_service import GroupService


class BillService:
    def __init__(self, group_service: GroupService):
        self.group_service = group_service

    def _calculate_shares(self, data: BillCreate) -> list[dict]:
        """
        Calculate individual share amounts based on split type.
        Returns a list of dictionaries for Prisma create.
        """
        if data.split_type == SplitType.EQUAL:
            # For EQUAL split, 'shares' contains the users involved (including payer if they owe a part)
            count = len(data.shares)
            if count == 0:
                raise ValidationError("At least one person must be involved in the split")
            
            individual_amount = data.total_amount / count
            return [
                {"user_id": str(share.user_id), "amount": individual_amount, "paid": False}
                for share in data.shares
            ]
            
        elif data.split_type == SplitType.EXACT:
            total_shares = sum(share.amount or 0 for share in data.shares)
            if abs(total_shares - data.total_amount) > 0.01:
                raise ValidationError(f"Sum of shares ({total_shares}) must equal total amount ({data.total_amount})")
            
            return [
                {"user_id": str(share.user_id), "amount": share.amount, "paid": False}
                for share in data.shares
            ]
        
        raise ValidationError(f"Split type {data.split_type} is not yet implemented")

    async def create_bill(self, user_id: str, data: BillCreate):
        """
        Create a new bill and its associated shares.
        """
        # 1. Check if group exists and user is a member
        await self.group_service.check_is_member(user_id, str(data.group_id))

        # 2. Calculate and validate shares
        shares_create = self._calculate_shares(data)

        # 3. Determine who paid (defaults to creator if not specified)
        paid_by = str(data.paid_by) if data.paid_by else user_id

        # 4. Create Bill with nested Shares
        bill = await prisma.bill.create(
            data={
                "description": data.description,
                "total_amount": data.total_amount,
                "group_id": str(data.group_id),
                "paid_by": paid_by,
                "created_by": user_id,
                "shares": {"create": shares_create},
            },
            include={"shares": True},
        )

        return bill

    async def get_group_bills(self, user_id: str, group_id: str):
        """
        Retrieve all bills for a specific group.
        Verifies that the requesting user is a member of that group.
        """
        # Check membership
        await self.group_service.check_is_member(user_id, group_id)

        bills = await prisma.bill.find_many(
            where={"group_id": group_id},
            include={"shares": True},
            order={"created_at": "desc"},
        )
        return bills

    async def get_bill_details(self, user_id: str, bill_id: str):
        """
        Get details of a specific bill.
        Verifies that the user has access via group membership.
        """
        bill = await prisma.bill.find_unique(where={"id": bill_id}, include={"shares": True})

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
        share = await prisma.billshare.find_unique(
            where={"id": share_id}, include={"bill": True}
        )

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
        )

        return updated_share

    async def mark_share_as_unpaid(self, user_id: str, share_id: str):
        """
        Mark a bill share as unpaid (undo payment).
        Only the user who owes the share can mark it as unpaid.
        """
        # Get the share
        share = await prisma.billshare.find_unique(
            where={"id": share_id}, include={"bill": True}
        )

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
        )

        return updated_share
