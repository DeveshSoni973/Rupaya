# app/models/groups.py
from datetime import datetime

from pydantic import BaseModel

from app.models.bills import BillResponse
from app.models.users import UserOut


class GroupCreate(BaseModel):
    name: str
    description: str | None = None
    initial_members: list[str] = []  # List of emails to invite immediately



class GroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class GroupOut(BaseModel):
    id: str
    name: str
    description: str | None
    created_by: str | None
    created_at: datetime
    user_balance: float | None = 0.0

    class Config:
        from_attributes = True


class GroupMemberOut(BaseModel):
    id: str
    user: UserOut
    role: str
    created_at: datetime


class GroupDetailOut(GroupOut):
    members: list[GroupMemberOut]
    bills: list[BillResponse] = []
    total_spent: float | None = 0.0


class AddMemberRequest(BaseModel):
    email: str  # Add members by email
    role: str = "MEMBER"
