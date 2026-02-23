from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.models.users import UserOut
from app.routers.groups import get_group_service
from app.services.auth_service import get_current_user
from app.services.group_service import GroupService
from app.services.summary_service import SummaryService

router = APIRouter(prefix="/summary", tags=["Summary"])


def get_summary_service(
    group_service: GroupService = Depends(get_group_service),
) -> SummaryService:
    return SummaryService(group_service)


@router.get("/")
async def get_user_summary(
    group_id: Optional[UUID] = Query(None, description="Filter summary by group"),
    current_user: UserOut = Depends(get_current_user),
    service: SummaryService = Depends(get_summary_service),
):
    """
    Get user summary metrics (owed/owe amounts, group count, friends).

    - **Global summary**: Leave group_id empty to get metrics across all groups
    - **Group summary**: Provide group_id to get metrics for a specific group only
    """
    return await service.get_user_summary(current_user.id, group_id)


@router.get("/debts")
async def get_simplified_debts(
    group_id: UUID = Query(..., description="Group to compute simplified debts for"),
    current_user: UserOut = Depends(get_current_user),
    service: SummaryService = Depends(get_summary_service),
):
    """
    Returns the minimum set of transactions to settle all unpaid debts in a group.
    Uses the Minimum Cash Flow (debt simplification) algorithm.

    Response: list of { from: User, to: User, amount: float }
    """
    return await service.get_simplified_debts(group_id, current_user.id)


class SettleUpRequest(BaseModel):
    group_id: UUID


@router.post("/settle")
async def settle_up(
    body: SettleUpRequest,
    current_user: UserOut = Depends(get_current_user),
    service: SummaryService = Depends(get_summary_service),
):
    """
    Settle up all your debts in a group.
    Marks all current BillShares in the group as paid and creates
    new persistent "Settle Up" records for the simplified balances.
    """
    return await service.settle_up(
        group_id=body.group_id,
        user_id=current_user.id,
    )
