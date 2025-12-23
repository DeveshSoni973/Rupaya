from fastapi import APIRouter, Depends

from app.models.auth import PasswordChangeRequest
from app.models.users import UserCreate, UserOut
from app.services.auth_service import get_current_user
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


user_service = UserService()


def get_user_service() -> UserService:
    return user_service


@router.post("/register", response_model=UserOut)
async def register(
    data: UserCreate,
    service: UserService = Depends(get_user_service),
):
    return await service.register_user(data.name, data.email, data.password)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: UserOut = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
async def change_password(
    data: PasswordChangeRequest,
    current_user: UserOut = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
):
    return await service.change_user_password(
        current_user.id, data.old_password, data.new_password
    )


@router.get("/search", response_model=list[UserOut])
async def search_users(
    q: str,
    current_user: UserOut = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
):
    return await service.search_users(q, str(current_user.id))





