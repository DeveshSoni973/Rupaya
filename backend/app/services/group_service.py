# app/services/groups_service.py
from fastapi import HTTPException, status
from app.db import prisma
from app.models.groups import GroupCreate, GroupUpdate, AddMemberRequest
from app.services.auth_service import get_current_user
from datetime import datetime

async def check_is_member(user_id: str, group_id: str):
    """
    Verify if a user is an active member of a group.
    Raises 403 if not a member.
    Returns the membership record if valid.
    """
    member = await prisma.groupmember.find_first(
        where={
            "user_id": user_id,
            "group_id": group_id,
            "deleted_at": None
        }
    )
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this group"
        )
    return member

async def check_is_admin(user_id: str, group_id: str):
    """
    Verify if a user is an admin of a group.
    Raises 403 if not an admin.
    Returns the membership record if valid.
    """
    # First check if user is a member at all
    member = await check_is_member(user_id, group_id)
    
    # Then verify they have admin role
    if member.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can perform this action"
        )
    return member

async def create_group(group_data: GroupCreate, creator_id: str):
    # Create the group
    group = await prisma.group.create(
        data={
            "name": group_data.name,
            "description": group_data.description,
            "created_by": creator_id
        }
    )
    
    # Add creator as admin member
    await prisma.groupmember.create(
        data={
            "user_id": creator_id,
            "group_id": group.id,
            "role": "ADMIN",
            "created_by": creator_id
        }
    )
    
    return group

async def get_user_groups(user_id: str):
    # Get all groups where user is a member
    memberships = await prisma.groupmember.find_many(
        where={
            "user_id": user_id,
            "deleted_at": None
        },
        include={
            "group": {
                "include": {
                    "members": {
                        "include": {
                            "user": True
                        },
                        "where": {
                            "deleted_at": None
                        }
                    }
                }
            }
        }
    )
    
    return [membership.group for membership in memberships]

async def get_group_detail(group_id: str, user_id: str):
    # Verify user has access to this group
    await check_is_member(user_id, group_id)
    
    # Get group with members
    group = await prisma.group.find_unique(
        where={"id": group_id},
        include={
            "members": {
                "include": {
                    "user": True
                },
                "where": {
                    "deleted_at": None
                }
            }
        }
    )
    
    return group

async def add_member_to_group(group_id: str, member_data: AddMemberRequest, added_by_id: str):
    # Verify the adder is an admin of the group
    await check_is_admin(added_by_id, group_id)
    
    # Find user by email
    user_to_add = await prisma.user.find_unique(
        where={"email": member_data.email}
    )
    
    if not user_to_add:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already a member
    existing_member = await prisma.groupmember.find_first(
        where={
            "group_id": group_id,
            "user_id": user_to_add.id,
            "deleted_at": None
        }
    )
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this group"
        )
    
    # Add member
    member = await prisma.groupmember.create(
        data={
            "user_id": user_to_add.id,
            "group_id": group_id,
            "role": member_data.role,
            "created_by": added_by_id
        }
    )
    
    return member

async def remove_member_from_group(group_id: str, member_id: str, removed_by_id: str):
    # Verify the remover is an admin
    await check_is_admin(removed_by_id, group_id)
    
    # Soft delete the membership
    membership = await prisma.groupmember.update(
        where={"id": member_id},
        data={
            "deleted_at": datetime.utcnow(),
            "deleted_by": removed_by_id
        }
    )
    
    return membership