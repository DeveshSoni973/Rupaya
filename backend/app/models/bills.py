from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field
from app.models.users import UserOut


class SplitType(str, Enum):
    EQUAL = "EQUAL"
    EXACT = "EXACT"
    PERCENTAGE = "PERCENTAGE"


class BillShareBase(BaseModel):
    user_id: UUID
    amount: float | None = Field(None, gt=0, description="Amount owed by this user. Required for EXACT split.")


class BillShareCreate(BillShareBase):
    pass


class BillShareResponse(BillShareBase):
    id: UUID
    paid: bool
    amount: float  # Ensure it's returned in the response
    user: UserOut

    class Config:
        from_attributes = True


# --- Bill Models ---


class BillBase(BaseModel):
    description: str
    total_amount: float = Field(..., gt=0, description="Total amount of the bill")


class BillCreate(BillBase):
    group_id: UUID
    paid_by: UUID | None = None  # Who paid the bill (defaults to creator if not specified)
    split_type: SplitType = SplitType.EQUAL
    # If EQUAL, just provide user IDs in shares (amount ignored).
    # If EXACT, provide user_id and amount.
    shares: list[BillShareCreate]



class BillResponse(BillBase):
    id: UUID
    group_id: UUID
    paid_by: UUID
    payer: UserOut | None = None  # Add this
    created_by: UUID
    created_at: datetime
    shares: list[BillShareResponse] = []

    class Config:
        from_attributes = True
