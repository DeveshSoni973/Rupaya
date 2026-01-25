from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query

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
    group_id_str = str(group_id) if group_id else None
    return await service.get_user_summary(current_user.id, group_id_str)
