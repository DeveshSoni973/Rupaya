from datetime import datetime, timedelta, timezone

from fastapi import Depends
from jose import JWTError, jwt

from app.core.config import settings
from app.core.exceptions import NotFoundError, UnauthorizedError, ValidationError
from app.core.redis import redis_client
from app.core.security import encode_token, oauth2_scheme, verify_password
from app.db import prisma


class AuthService:
    def _create_token(
        self, data: dict, expires_delta: timedelta | None = None, token_type: str = "access"
    ):
        """Create a JWT access or refresh token with business logic for expiry."""
        to_encode = data.copy()
        to_encode["type"] = token_type

        now = datetime.now(timezone.utc)
        to_encode["iat"] = int(now.timestamp())

        if expires_delta is None:
            if token_type == "refresh":
                expires_delta = getattr(settings, "REFRESH_TOKEN_EXPIRE", timedelta(days=7))
            else:
                expires_delta = getattr(
                    settings, "ACCESS_TOKEN_EXPIRE", timedelta(minutes=30)
                )

        expire = datetime.now(timezone.utc) + expires_delta
        to_encode["exp"] = int(expire.timestamp())
        return encode_token(to_encode)

    async def login_user(self, email: str, password: str):
        user = await prisma.user.find_unique(where={"email": email})
        if not user or not verify_password(password, user.password):
            raise UnauthorizedError("Invalid email or password")

        access_token = self._create_token({"sub": user.id}, token_type="access")
        refresh_token = self._create_token({"sub": user.id}, token_type="refresh")

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }

    async def logout_user(self, token: str):
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )
            exp = payload.get("exp")
            ttl = exp - int(datetime.now(timezone.utc).timestamp())     #time to live
            if ttl > 0:
                await redis_client.setex(f"blacklist:{token}", ttl, "1")
            return {"detail": "Logged out successfully"}
        except JWTError as err:
            raise ValidationError("Invalid token") from err

    async def logout_all_sessions(self, token: str):
        user = await get_current_user(token)

        # Blacklist current token too
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )
            exp = payload.get("exp")
            ttl = exp - int(datetime.now(timezone.utc).timestamp())
            if ttl > 0:
                await redis_client.setex(f"blacklist:{token}", ttl, "1")
        except JWTError:
            pass

        # Mark all tokens from this user invalid for 24h
        now_ts = int(datetime.now(timezone.utc).timestamp())
        await redis_client.set(f"revoke_all:{user.id}", now_ts)
        return {"detail": "All sessions revoked"}

    async def refresh_access_token(self, refresh_token: str):
        # Check if refresh token is blacklisted
        if await redis_client.exists(f"blacklist:{refresh_token}"):
            raise UnauthorizedError("Refresh token invalidated")

        try:
            payload = jwt.decode(
                refresh_token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )
            if payload.get("type") != "refresh":
                raise UnauthorizedError("Invalid token type")

            user_id = payload.get("sub")
            if not user_id:
                raise UnauthorizedError("Invalid refresh token")

            # Check if all sessions revoked
            revoke_ts = await redis_client.get(f"revoke_all:{user_id}")
            if revoke_ts and payload.get("iat", 0) < int(revoke_ts):
                raise UnauthorizedError("All sessions revoked. Please log in again.")

            user = await prisma.user.find_unique(where={"id": user_id})
            if not user:
                raise NotFoundError("User not found")

            new_access = self._create_token({"sub": user_id}, token_type="access")
            return {"access_token": new_access, "token_type": "bearer"}
        except JWTError as err:
            raise UnauthorizedError("Invalid or expired refresh token") from err


async def get_current_user(token: str = Depends(oauth2_scheme)):
    if await redis_client.exists(f"blacklist:{token}"):
        raise UnauthorizedError("Token invalidated. Please log in again.")

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")

        if not user_id:
            raise UnauthorizedError("Invalid token payload")

        # Check global user revocation
        revoke_ts = await redis_client.get(f"revoke_all:{user_id}")
        if revoke_ts and payload.get("iat", 0) < int(revoke_ts):
            raise UnauthorizedError("Session revoked. Please log in again.")

        user = await prisma.user.find_unique(where={"id": user_id})
        if not user:
            raise NotFoundError("User not found")
        return user
    except JWTError as err:
        raise UnauthorizedError("Invalid token") from err


