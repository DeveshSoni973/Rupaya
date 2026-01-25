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
        self, user_id: str, search: str | None = None, 
        filter: str | None = None,
        sort_by: str = "created_at", order: str = "desc",
        skip: int = 0, limit: int = 20
    ):
        # ... logic ...
        # (Rest of the logic from previous step, adding filter check at the end of metrics loop)
        
        # 1. Get all memberships for the user
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
                    ],
                }
            }

        memberships = await prisma.groupmember.find_many(
            where=where_filter,
            include={
                "group": {
                    "include": {
                        "members": {"where": {"deleted_at": None}},
                    }
                }
            },
        )

        # 2. Process each group to add metrics
        groups_list = []
        for m in memberships:
            if not m.group:
                continue
            
            group_id = m.group.id
            
            # Sub-query for Owed (others owe user in this group)
            owed_result = await prisma.billshare.group_by(
                by=["bill_id"],
                sum={"amount": True},
                where={
                    "bill": {"group_id": group_id, "paid_by": user_id, "deleted_at": None},
                    "user_id": {"not": user_id},
                    "paid": False
                }
            )
            total_owed = sum(item["_sum"]["amount"] or 0 for item in owed_result)

            # Sub-query for Owe (user owes others in this group)
            owe_result = await prisma.billshare.group_by(
                by=["bill_id"],
                sum={"amount": True},
                where={
                    "bill": {"group_id": group_id, "paid_by": {"not": user_id}, "deleted_at": None},
                    "user_id": user_id,
                    "paid": False
                }
            )
            total_owe = sum(item["_sum"]["amount"] or 0 for item in owe_result)

            # --- FILTERING LOGIC ---
            if filter == "owe" and total_owe <= 0:
                continue
            if filter == "owed" and total_owed <= 0:
                continue

            g_dict = m.group.model_dump()
            g_dict["member_count"] = len(m.group.members)
            g_dict["total_owed"] = total_owed
            g_dict["total_owe"] = total_owe
            groups_list.append(g_dict)

        # 3. Handle Sorting
        reverse = (order.lower() == "desc")
        
        if sort_by == "name":
            groups_list.sort(key=lambda x: x["name"].lower(), reverse=reverse)
        elif sort_by == "owed":
            groups_list.sort(key=lambda x: x["total_owed"], reverse=reverse)
        elif sort_by == "owe":
            groups_list.sort(key=lambda x: x["total_owe"], reverse=reverse)
        else: # default: created_at
            groups_list.sort(key=lambda x: x["created_at"], reverse=reverse)

        # 4. Handle Pagination
        total = len(groups_list)
        paginated_items = groups_list[skip : skip + limit]

        return {
            "items": paginated_items,
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
        data["member_count"] = len(group.members)

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
