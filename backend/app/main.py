from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    RupayaException,
    UnauthorizedError,
    ValidationError,
)

from app.routers import auth, bills, groups, users, summary
from app.services.socket_manager import socket_manager
from app.services.auth_service import get_current_user
from app.db.session import get_db
from fastapi import WebSocket, WebSocketDisconnect, Depends

app = FastAPI(title="Rupaya API", openapi_url=f"{settings.api_base_path}/openapi.json")

# Enable CORS - Configure based on environment
# In production, you should set ALLOWED_ORIGINS environment variable
import os
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
if allowed_origins == ["*"]:
    # Development mode - allow common local origins
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "*"  # Allow all for development
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.exception_handler(RupayaException)
async def rupaya_exception_handler(request: Request, exc: RupayaException):
    status_code = 500
    if isinstance(exc, NotFoundError):
        status_code = 404
    elif isinstance(exc, UnauthorizedError):
        status_code = 401
    elif isinstance(exc, ForbiddenError):
        status_code = 403
    elif isinstance(exc, ConflictError):
        status_code = 409
    elif isinstance(exc, ValidationError):
        status_code = 400

    return JSONResponse(
        status_code=status_code,
        content={"detail": exc.message},
    )


app.include_router(auth.router, prefix=settings.api_base_path)
app.include_router(users.router, prefix=settings.api_base_path)
app.include_router(groups.router, prefix=settings.api_base_path)
app.include_router(bills.router, prefix=settings.api_base_path)
app.include_router(summary.router, prefix=settings.api_base_path)


@app.websocket("/ws/{group_id}")
async def websocket_endpoint(websocket: WebSocket, group_id: str, token: str = None):
    # If token is not provided in query, check headers (though query is more common for WS)
    if not token:
        token = websocket.query_params.get("token")
    
    try:
        # Simple token verification (we can't use Depends(get_current_user) directly for WS in all cases easily)
        # For now, let's accept the connection and verify later or use a dedicated helper
        # Actually, let's try to verify it now
        from app.core.security import jwt
        from app.core.config import settings
        
        if not token:
            await websocket.close(code=1008)
            return

        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008)
            return
            
    except Exception:
        await websocket.close(code=1008)
        return

    await socket_manager.connect(websocket, group_id)
    try:
        while True:
            # Keep connection alive and listen for any client messages if needed
            data = await websocket.receive_text()
            # We can handle client messages here (e.g., heartbeats)
    except WebSocketDisconnect:
        socket_manager.disconnect(websocket, group_id)


@app.get("/")
async def root():
    return {"message": "Rupaya API running 🚀", "docs": "/docs", "version": "v1"}


@app.get("/health")
@app.get(f"{settings.api_base_path}/health")
async def health_check():
    """Health check endpoint for deployment platforms"""
    return {"status": "healthy", "service": "rupaya-api"}

