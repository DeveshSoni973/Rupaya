# app/services/summary_service.py
from typing import Optional

from app.core.exceptions import ForbiddenError
from app.db import prisma
from app.models.users import UserOut
from app.services.group_service import GroupService, get_group_service


class SummaryService:
    def __init__(self, group_service: GroupService = None):
        self.group_service = group_service or get_group_service()

    async def get_user_summary(self, user_id: str, group_id: Optional[str] = None):
        """
        Returns summary for a user.
        If group_id is provided, returns summary limited to that group.
        """
        # If group_id is provided, validate membership
        if group_id:
            await self.group_service.check_is_member(user_id, group_id)

        # 1. Total Groups (only count this group if group_id provided)
        if group_id:
            group_count = 1
        else:
            group_count = await prisma.groupmember.count(
                where={"user_id": user_id, "deleted_at": None}
            )

        # 2. Total Owed (others owe you)
        owed_filter = {"bill": {"deleted_at": None}, "user_id": {"not": user_id}, "paid": False}
        if group_id:
            owed_filter["bill"]["group_id"] = group_id
            owed_filter["bill"]["paid_by"] = user_id
        else:
            owed_filter["bill"]["paid_by"] = user_id

        owed_result = await prisma.billshare.group_by(
            by=["user_id"], sum={"amount": True}, where=owed_filter
        )
        total_owed = sum(item["_sum"]["amount"] or 0 for item in owed_result)

        # 3. Total Owe (you owe others)
        owe_filter = {"bill": {"deleted_at": None}, "user_id": user_id, "paid": False}
        if group_id:
            owe_filter["bill"]["group_id"] = group_id
            owe_filter["bill"]["paid_by"] = {"not": user_id}
        else:
            owe_filter["bill"]["paid_by"] = {"not": user_id}

        owe_result = await prisma.billshare.group_by(
            by=["user_id"], sum={"amount": True}, where=owe_filter
        )
        total_owe = sum(item["_sum"]["amount"] or 0 for item in owe_result)

        # 4. Recent Activity (last 5 bills)
        recent_filter = {"deleted_at": None}
        if group_id:
            recent_filter["group_id"] = group_id
        recent_filter["OR"] = [{"paid_by": user_id}, {"shares": {"some": {"user_id": user_id}}}]

        recent_bills = await prisma.bill.find_many(
            where=recent_filter,
            include={"payer": True, "group": True},
            order={"created_at": "desc"},
            take=5,
        )

        # 5. Friends (people you share groups with)
        friends_map = {}
        if not group_id:  # Only fetch friends if not scoped to a single group
            group_members = await prisma.groupmember.find_many(
                where={
                    "group": {"members": {"some": {"user_id": user_id}}},
                    "user_id": {"not": user_id},
                    "deleted_at": None,
                },
                include={"user": True},
                take=10,
            )

            for gm in group_members:
                if gm.user_id not in friends_map:
                    friends_map[gm.user_id] = {
                        "id": gm.user_id,
                        "name": gm.user.name,
                        "email": gm.user.email,
                    }

        return {
            "total_owed": total_owed,
            "total_owe": total_owe,
            "group_count": group_count,
            "recent_activity": [
                {
                    "id": b.id,
                    "description": b.description,
                    "amount": b.total_amount,
                    "date": b.created_at,
                    "payer_name": b.payer.name,
                    "group_name": b.group.name,
                    "type": "lent" if b.paid_by == user_id else "borrowed",
                }
                for b in recent_bills
            ],
            "friends": list(friends_map.values())[:5],
        }
