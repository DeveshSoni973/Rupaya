from app.core.exceptions import (
    ConflictError,
    NotFoundError,
    ValidationError,
)
from app.core.security import hash_password, verify_password
from app.db import prisma


class UserService:
    async def register_user(self, name: str, email: str, password: str):
        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters")

        existing = await prisma.user.find_unique(where={"email": email})
        if existing:
            raise ConflictError("Email already registered")

        hashed_pw = hash_password(password)
        user = await prisma.user.create(data={"name": name, "email": email, "password": hashed_pw})
        return user

    async def change_user_password(self, user_id: str, old_password: str, new_password: str):
        if len(new_password) < 8:
            raise ValidationError("New password must be at least 8 characters")

        user = await prisma.user.find_unique(where={"id": user_id})
        if not user:
            raise NotFoundError("User not found")

        if not verify_password(old_password, user.password):
            raise ValidationError("Old password incorrect")

        hashed_new = hash_password(new_password)
        await prisma.user.update(where={"id": user_id}, data={"password": hashed_new})
        return {"detail": "Password changed successfully"}

    async def get_user_by_id(self, user_id: str):
        user = await prisma.user.find_unique(where={"id": user_id})
        if not user:
            raise NotFoundError("User not found")
        return user

