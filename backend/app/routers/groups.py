from uuid import UUID

from fastapi import APIRouter, Depends

from app.models.groups import (
    AddMemberRequest,
    GroupCreate,
    GroupDetailOut,
    GroupMemberOut,
    GroupOut,
)
from app.models.users import UserOut
from app.services.auth_service import get_current_user
from app.services.group_service import GroupService

router = APIRouter(prefix="/groups", tags=["Groups"])


group_service = GroupService()


def get_group_service() -> GroupService:
    return group_service


@router.post("/", response_model=GroupOut)
async def create_group(
    data: GroupCreate,
    current_user: UserOut = Depends(get_current_user),
    service: GroupService = Depends(get_group_service),
):
    return await service.create_group(data, current_user.id)


@router.get("/", response_model=list[GroupOut])
async def get_user_groups(
    current_user: UserOut = Depends(get_current_user),
    service: GroupService = Depends(get_group_service),
):
    return await service.get_user_groups(current_user.id)


@router.get("/{group_id}", response_model=GroupDetailOut)
async def get_group(
    group_id: UUID,
    current_user: UserOut = Depends(get_current_user),
    service: GroupService = Depends(get_group_service),
):
    return await service.get_group_detail(str(group_id), current_user.id)


@router.post("/{group_id}/members", response_model=GroupMemberOut)
async def add_member(
    group_id: UUID,
    data: AddMemberRequest,
    current_user: UserOut = Depends(get_current_user),
    service: GroupService = Depends(get_group_service),
):
    return await service.add_member_to_group(
        str(group_id), data, current_user.id
    )


@router.delete("/{group_id}/members/{member_id}")
async def remove_member(
    group_id: UUID,
    member_id: UUID,
    current_user: UserOut = Depends(get_current_user),
    service: GroupService = Depends(get_group_service),
):
    return await service.remove_member_from_group(
        str(group_id), str(member_id), current_user.id
    )
