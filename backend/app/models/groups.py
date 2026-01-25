from datetime import datetime

from pydantic import BaseModel

from app.models.users import UserOut


class GroupCreate(BaseModel):
    name: str
    description: str | None = None
    initial_members: list[str] = []  # emails


class GroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class GroupMemberOut(BaseModel):
    id: str
    user: UserOut
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class GroupOut(BaseModel):
    id: str
    name: str
    description: str | None
    created_by: str | None
    created_at: datetime
    members: list[GroupMemberOut] = []

    class Config:
        from_attributes = True


class GroupDetailOut(GroupOut):
    pass


class AddMemberRequest(BaseModel):
    email: str
    role: str = "MEMBER"
