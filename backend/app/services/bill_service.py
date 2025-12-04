from app.db import prisma
from app.models.bills import BillCreate
from fastapi import HTTPException, status
from app.services.group_service import check_is_member
from typing import List
from datetime import datetime

def validate_shares_total(shares: List, total_amount: float) -> None:
    """
    Validate that the sum of shares equals the total amount.
    Raises HTTPException if validation fails.
    """
    total_shares = sum(share.amount for share in shares)
    # Allow a small floating point error margin
    if abs(total_shares - total_amount) > 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sum of shares ({total_shares}) must equal total amount ({total_amount})"
        )

def prepare_shares_data(shares: List) -> List[dict]:
    """
    Transform share objects into Prisma-compatible data format.
    """
    return [
        {
            "user_id": str(share.user_id),
            "amount": share.amount,
            "paid": False
        }
        for share in shares
    ]

async def create_bill(user_id: str, bill_data: BillCreate):
    """
    Create a new bill and its associated shares.
    Validates that the user is a member of the group and that shares sum up to the total.
    """
    # 1. Check if group exists and user is a member
    await check_is_member(user_id, str(bill_data.group_id))

    # 2. Validate total amount matches shares
    validate_shares_total(bill_data.shares, bill_data.total_amount)

    # 3. Prepare share data
    shares_create = prepare_shares_data(bill_data.shares)

    # 4. Determine who paid (defaults to creator if not specified)
    paid_by = str(bill_data.paid_by) if bill_data.paid_by else user_id

    # 5. Create Bill with nested Shares using Prisma's nested write
    bill = await prisma.bill.create(
        data={
            "description": bill_data.description,
            "total_amount": bill_data.total_amount,
            "group_id": str(bill_data.group_id),
            "paid_by": paid_by,
            "created_by": user_id,
            "shares": {
                "create": shares_create
            }
        },
        include={
            "shares": True
        }
    )
    
    return bill

async def get_group_bills(user_id: str, group_id: str):
    """
    Retrieve all bills for a specific group.
    Verifies that the requesting user is a member of that group.
    """
    # Check membership
    await check_is_member(user_id, group_id)

    bills = await prisma.bill.find_many(
        where={"group_id": group_id},
        include={"shares": True},
        order={"created_at": "desc"}
    )
    return bills

async def get_bill_details(user_id: str, bill_id: str):
    """
    Get details of a specific bill.
    Verifies that the user has access via group membership.
    """
    bill = await prisma.bill.find_unique(
        where={"id": bill_id},
        include={"shares": True}
    )
    
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
        
    # Check if user has access to this bill (via group membership)
    await check_is_member(user_id, bill.group_id)
        
    return bill

async def mark_share_as_paid(user_id: str, share_id: str):
    """
    Mark a bill share as paid.
    Only the user who owes the share can mark it as paid.
    """
    # Get the share
    share = await prisma.billshare.find_unique(
        where={"id": share_id},
        include={"bill": True}
    )
    
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )
    
    # Check if user has access to this bill (via group membership)
    await check_is_member(user_id, share.bill.group_id)
    
    # Verify the user is the one who owes this share
    if share.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only mark your own shares as paid"
        )
    
    # Check if already paid
    if share.paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This share is already marked as paid"
        )
    
    # Mark as paid
    updated_share = await prisma.billshare.update(
        where={"id": share_id},
        data={
            "paid": True,
            "updated_by": user_id,
            "updated_at": datetime.utcnow()
        }
    )
    
    return updated_share

async def mark_share_as_unpaid(user_id: str, share_id: str):
    """
    Mark a bill share as unpaid (undo payment).
    Only the user who owes the share can mark it as unpaid.
    """
    # Get the share
    share = await prisma.billshare.find_unique(
        where={"id": share_id},
        include={"bill": True}
    )
    
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )
    
    # Check if user has access to this bill (via group membership)
    await check_is_member(user_id, share.bill.group_id)
    
    # Verify the user is the one who owes this share
    if share.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only mark your own shares as unpaid"
        )
    
    # Check if already unpaid
    if not share.paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This share is already marked as unpaid"
        )
    
    # Mark as unpaid
    updated_share = await prisma.billshare.update(
        where={"id": share_id},
        data={
            "paid": False,
            "updated_by": user_id,
            "updated_at": datetime.utcnow()
        }
    )
    
    return updated_share
