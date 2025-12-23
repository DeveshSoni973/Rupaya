# app/services/group_service.py
from datetime import datetime

from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.db import prisma
from app.models.groups import AddMemberRequest, GroupCreate


class GroupService:
    async def check_is_member(self, user_id: str, group_id: str):
        """
        Verify if a user is an active member of a group.
        Raises 403 if not a member.
        Returns the membership record if valid.
        """
        member = await prisma.groupmember.find_first(
            where={"user_id": user_id, "group_id": group_id, "deleted_at": None}
        )

        if not member:
            raise ForbiddenError("User is not a member of this group")
        return member

    async def check_is_admin(self, user_id: str, group_id: str):
        """
        Verify if a user is an admin of a group.
        Raises 403 if not an admin.
        Returns the membership record if valid.
        """
        # First check if user is a member at all
        member = await self.check_is_member(user_id, group_id)

        # Then verify they have admin role
        if member.role != "ADMIN":
            raise ForbiddenError("Only group admins can perform this action")
        return member

    async def create_group(self, data: GroupCreate, creator_id: str):
        if not data.initial_members:
            raise ValidationError("A group must have at least one other member.")

        # Create the group
        group = await prisma.group.create(
            data={
                "name": data.name,
                "description": data.description,
                "created_by": creator_id,
            }
        )

        # 1. Add creator as admin
        await prisma.groupmember.create(
            data={
                "user_id": creator_id,
                "group_id": group.id,
                "role": "ADMIN",
                "created_by": creator_id,
            }
        )

        # 2. Add initial members
        for email in data.initial_members:
            user = await prisma.user.find_unique(where={"email": email})
            if not user:
                continue  # Or raise an error? For now, we skip non-existent users
            
            # Prevent double adding creator if they added themselves in the list
            if user.id == creator_id:
                continue

            await prisma.groupmember.create(
                data={
                    "user_id": user.id,
                    "group_id": group.id,
                    "role": "MEMBER",
                    "created_by": creator_id,
                }
            )

        return group

    async def get_user_groups(self, user_id: str):
        # Get all groups where user is a member
        memberships = await prisma.groupmember.find_many(
            where={"user_id": user_id, "deleted_at": None},
            include={
                "group": {
                    "include": {
                        "members": {"include": {"user": True}, "where": {"deleted_at": None}}
                    }
                }
            },
        )

        return [membership.group for membership in memberships]

    async def get_group_detail(self, group_id: str, user_id: str):
        # Verify user has access to this group
        await self.check_is_member(user_id, group_id)

        # Get group with members
        group = await prisma.group.find_unique(
            where={"id": group_id},
            include={"members": {"include": {"user": True}, "where": {"deleted_at": None}}},
        )

        return group

    async def add_member_to_group(
        self, group_id: str, data: AddMemberRequest, added_by_id: str
    ):
        # Verify the adder is an admin of the group
        await self.check_is_admin(added_by_id, group_id)

        # Find user by email
        user_to_add = await prisma.user.find_unique(where={"email": data.email})

        if not user_to_add:
            raise NotFoundError("User not found")

        # Check if already a member
        existing_member = await prisma.groupmember.find_first(
            where={"group_id": group_id, "user_id": user_to_add.id, "deleted_at": None}
        )

        if existing_member:
            raise ValidationError("User is already a member of this group")

        # Add member
        member = await prisma.groupmember.create(
            data={
                "user_id": user_to_add.id,
                "group_id": group_id,
                "role": data.role,
                "created_by": added_by_id,
            }
        )

        return member

    async def remove_member_from_group(
        self, group_id: str, member_id: str, removed_by_id: str
    ):
        # Verify the remover is an admin
        await self.check_is_admin(removed_by_id, group_id)

        # Soft delete the membership
        membership = await prisma.groupmember.update(
            where={"id": member_id},
            data={"deleted_at": datetime.utcnow(), "deleted_by": removed_by_id},
        )

        return membership
