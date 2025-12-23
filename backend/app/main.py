from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    RupayaException,
    UnauthorizedError,
    ValidationError,
)
from app.db import prisma
from app.routers import auth, bills, groups, users

app = FastAPI(title="Rupaya API")


@app.on_event("startup")
async def startup():
    await prisma.connect()


@app.on_event("shutdown")
async def shutdown():
    await prisma.disconnect()


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


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(groups.router)
app.include_router(bills.router)


@app.get("/")
async def root():
    return {"message": "Rupaya API running 🚀"}

