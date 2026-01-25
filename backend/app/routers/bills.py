from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.models.bills import BillCreate, BillResponse, BillShareResponse, BillUpdate
from app.models.pagination import PaginatedResponse
from app.models.users import UserOut
from app.routers.groups import get_group_service
from app.services.auth_service import get_current_user
from app.services.bill_service import BillService
from app.services.group_service import GroupService

router = APIRouter(prefix="/bills", tags=["Bills"])


def get_bill_service(
    group_service: GroupService = Depends(get_group_service),
) -> BillService:
    return BillService(group_service)


@router.post("/", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    data: BillCreate,
    current_user: UserOut = Depends(get_current_user),
    service: BillService = Depends(get_bill_service),
):
    """
    Create a new bill in a group.
    The user must be a member of the group.
    """
    return await service.create_bill(current_user.id, data)


@router.get("/", response_model=PaginatedResponse[BillResponse])
async def get_user_bills(
    skip: int = 0,
    limit: int = 20,
    current_user: UserOut = Depends(get_current_user),
    service: BillService = Depends(get_bill_service),
):
    """
    Get all bills involving the current user with pagination.
    """
    return await service.get_user_bills(current_user.id, skip, limit)


@router.get("/group/{group_id}", response_model=PaginatedResponse[BillResponse])
async def get_group_bills(
    group_id: UUID,
    skip: int = 0,
    limit: int = 20,
    search: str = None,
    current_user: UserOut = Depends(get_current_user),
    service: BillService = Depends(get_bill_service),
):
    """
    Get bills for a specific group with pagination and search.
    """
    return await service.get_group_bills(current_user.id, str(group_id), skip, limit, search)


@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill(
    bill_id: UUID,
    current_user: UserOut = Depends(get_current_user),
    service: BillService = Depends(get_bill_service),
):
    """
    Get details of a specific bill.
    """
    return await service.get_bill_details(current_user.id, str(bill_id))


@router.patch("/{bill_id}", response_model=BillResponse)
async def update_bill(
    bill_id: UUID,
    data: BillUpdate,
    current_user: UserOut = Depends(get_current_user),
    service: BillService = Depends(get_bill_service),
):
    """
    Update a bill's details.
    Anyone in the group can update the bill.
    """
    return await service.update_bill(current_user.id, str(bill_id), data)



@router.patch("/shares/{share_id}/mark-paid", response_model=BillShareResponse)
async def mark_share_as_paid(
    share_id: UUID,
    current_user: UserOut = Depends(get_current_user),
    service: BillService = Depends(get_bill_service),
):
    """
    Mark a bill share as paid.
    Only the user who owes the share can mark it as paid.
    """
    return await service.mark_share_as_paid(current_user.id, str(share_id))


@router.patch("/shares/{share_id}/mark-unpaid", response_model=BillShareResponse)
async def mark_share_as_unpaid(
    share_id: UUID,
    current_user: UserOut = Depends(get_current_user),
    service: BillService = Depends(get_bill_service),
):
    """
    Mark a bill share as unpaid (undo payment).
    Only the user who owes the share can mark it as unpaid.
    """
    return await service.mark_share_as_unpaid(current_user.id, str(share_id))
