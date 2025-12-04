from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

# --- Bill Share Models ---

class BillShareBase(BaseModel):
    user_id: UUID
    amount: float = Field(..., gt=0, description="Amount owed by this user")

class BillShareCreate(BillShareBase):
    pass

class BillShareResponse(BillShareBase):
    id: UUID
    paid: bool
    
    class Config:
        from_attributes = True

# --- Bill Models ---

class BillBase(BaseModel):
    description: str
    total_amount: float = Field(..., gt=0, description="Total amount of the bill")

class BillCreate(BillBase):
    group_id: UUID
    paid_by: Optional[UUID] = None  # Who paid the bill (defaults to creator if not specified)
    shares: List[BillShareCreate]

class BillResponse(BillBase):
    id: UUID
    group_id: UUID
    paid_by: UUID  # Who actually paid the bill
    created_by: UUID
    created_at: datetime
    shares: List[BillShareResponse] = []

    class Config:
        from_attributes = True

