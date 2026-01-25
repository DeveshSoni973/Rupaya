# app/services/group_service.py
from datetime import datetime

from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.db import prisma
from app.models.groups import AddMemberRequest, GroupCreate


class GroupService:
    # auth helper
    async def check_is_member(self, user_id: str, group_id: str):
        """
        Verify if a user is an active member of a group.
        Raises 403 if not a member.
        Returns the membership record if valid.
        """
        member = await prisma.groupmember.find_first(
            where={
                "user_id": user_id,
                "group_id": group_id,
                "deleted_at": None,
            }
        )
        if not member:
            raise ForbiddenError("User is not a member of this group")
        return member

    async def check_is_admin(self, user_id: str, group_id: str):
        member = await self.check_is_member(user_id, group_id)
        if member.role != "ADMIN":
            raise ForbiddenError("Only group admins can perform this action")
        return member

    async def create_group(self, data: GroupCreate, creator_id: str):
        if not data.initial_members:
            raise ValidationError("A group must have at least one other member.")

        group = await prisma.group.create(
            data={
                "name": data.name,
                "description": data.description,
                "created_by": creator_id,
            }
        )

        # creator = admin
        await prisma.groupmember.create(
            data={
                "user_id": creator_id,
                "group_id": group.id,
                "role": "ADMIN",
                "created_by": creator_id,
            }
        )

        added_count = 0
        for email in data.initial_members:
            user = await prisma.user.find_unique(where={"email": email})
            if not user or user.id == creator_id:
                continue

            await prisma.groupmember.create(
                data={
                    "user_id": user.id,
                    "group_id": group.id,
                    "role": "MEMBER",
                    "created_by": creator_id,
                }
            )
            added_count += 1

        if added_count == 0:
            await prisma.group.delete(where={"id": group.id})
            raise ValidationError("A group must have at least one other valid member.")

        return group

    # -------------------------
    # READ OPERATIONS
    # -------------------------
    async def get_user_groups(
        self, user_id: str, search: str | None = None, skip: int = 0, limit: int = 20
    ):
        # Get all groups where user is a member
        where_filter = {
            "user_id": user_id,
            "deleted_at": None,
            "group": {"deleted_at": None},
        }

        if search:
            where_filter["group"] = {
                "is": {
                    "deleted_at": None,
                    "OR": [
                        {"name": {"contains": search, "mode": "insensitive"}},
                        {"description": {"contains": search, "mode": "insensitive"}},
                        {
                            "members": {
                                "some": {
                                    "user": {"email": {"contains": search, "mode": "insensitive"}},
                                    "deleted_at": None,
                                }
                            }
                        },
                    ],
                }
            }

        total = await prisma.groupmember.count(where=where_filter)

        memberships = await prisma.groupmember.find_many(
            where=where_filter,
            include={
                "group": {
                    "include": {
                        "members": {
                            "include": {"user": True},
                            "where": {"deleted_at": None},
                        }
                    }
                }
            },
            skip=skip,
            take=limit,
            order={"created_at": "desc"},
        )

        groups = [m.group for m in memberships if m.group]

        return {
            "items": groups,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": (skip + limit) < total,
        }

    async def get_group_detail(self, group_id: str, user_id: str):
        await self.check_is_member(user_id, group_id)

        group = await prisma.group.find_unique(
            where={"id": group_id},
            include={
                "members": {
                    "include": {"user": True},
                    "where": {"deleted_at": None},
                }
            },
        )

        if not group:
            raise NotFoundError("Group not found")

        data = group.model_dump()
        data["members"] = [m.model_dump() for m in group.members]

        return data

    # -------------------------
    # MEMBERSHIP MANAGEMENT
    # -------------------------
    async def add_member_to_group(
        self,
        group_id: str,
        data: AddMemberRequest,
        added_by_id: str,
    ):
        await self.check_is_admin(added_by_id, group_id)

        user = await prisma.user.find_unique(where={"email": data.email})
        if not user:
            raise NotFoundError("User not found")

        existing = await prisma.groupmember.find_first(
            where={"user_id": user.id, "group_id": group_id}
        )

        if existing:
            if existing.deleted_at is None:
                raise ValidationError("User is already a member")

            return await prisma.groupmember.update(
                where={"id": existing.id},
                data={
                    "deleted_at": None,
                    "deleted_by": None,
                    "role": data.role,
                    "updated_by": added_by_id,
                    "updated_at": datetime.utcnow(),
                },
                include={"user": True},
            )

        return await prisma.groupmember.create(
            data={
                "user_id": user.id,
                "group_id": group_id,
                "role": data.role,
                "created_by": added_by_id,
            },
            include={"user": True},
        )

    async def remove_member_from_group(
        self,
        group_id: str,
        member_id: str,
        removed_by_id: str,
    ):
        await self.check_is_admin(removed_by_id, group_id)

        return await prisma.groupmember.update(
            where={"id": member_id},
            data={
                "deleted_at": datetime.utcnow(),
                "deleted_by": removed_by_id,
            },
        )
