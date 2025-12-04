from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings
from app.core.redis import redis_client
from app.core.security import encode_token, oauth2_scheme, verify_password
from app.db import prisma


def create_token(data: dict, expires_delta: timedelta | None = None, token_type: str = "access"):
    """Create a JWT access or refresh token with business logic for expiry."""
    to_encode = data.copy()
    to_encode["type"] = token_type

    if expires_delta is None:
        if token_type == "refresh":
            expires_delta = getattr(settings, "REFRESH_TOKEN_EXPIRE", timedelta(days=7))
        else:
            expires_delta = getattr(settings, "ACCESS_TOKEN_EXPIRE", timedelta(minutes=30))

    expire = datetime.now(UTC) + expires_delta
    to_encode.update({"exp": expire})
    return encode_token(to_encode)


async def login_user(email: str, password: str):
    user = await prisma.user.find_unique(where={"email": email})
    if not user or not verify_password(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    access_token = create_token({"sub": user.id}, token_type="access")
    refresh_token = create_token({"sub": user.id}, token_type="refresh")

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


async def logout_user(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        exp = payload.get("exp")
        ttl = exp - int(datetime.now(UTC).timestamp())
        if ttl > 0:
            await redis_client.setex(f"blacklist:{token}", ttl, "1")
        return {"detail": "Logged out successfully"}
    except JWTError as err:
        raise HTTPException(status_code=400, detail="Invalid token") from err


async def logout_all_sessions(token: str):
    user = await get_current_user(token)

    # Blacklist current token too
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        exp = payload.get("exp")
        ttl = exp - int(datetime.now(UTC).timestamp())
        if ttl > 0:
            await redis_client.setex(f"blacklist:{token}", ttl, "1")
    except JWTError:
        pass

    # Mark all tokens from this user invalid for 24h
    await redis_client.setex(f"revoke_all:{user.id}", 3600 * 24, "1")
    return {"detail": "All sessions revoked"}


async def refresh_access_token(refresh_token: str):
    # Check if refresh token is blacklisted
    if await redis_client.exists(f"blacklist:{refresh_token}"):
        raise HTTPException(status_code=401, detail="Refresh token invalidated")

    try:
        payload = jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        # Check if all sessions revoked
        if await redis_client.exists(f"revoke_all:{user_id}"):
            raise HTTPException(
                status_code=401, detail="All sessions revoked. Please log in again."
            )

        user = await prisma.user.find_unique(where={"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        new_access = create_token({"sub": user_id}, token_type="access")
        return {"access_token": new_access, "token_type": "bearer"}
    except JWTError as err:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token") from err


async def get_current_user(token: str = Depends(oauth2_scheme)):
    if await redis_client.exists(f"blacklist:{token}"):
        raise HTTPException(status_code=401, detail="Token invalidated. Please log in again.")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        # Check global user revocation
        if await redis_client.exists(f"revoke_all:{user_id}"):
            raise HTTPException(status_code=401, detail="Session revoked. Please log in again.")

        user = await prisma.user.find_unique(where={"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except JWTError as err:
        raise HTTPException(status_code=401, detail="Invalid token") from err
