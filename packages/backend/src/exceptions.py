from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ProblemDetail(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str
    instance: str | None = None


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ProblemDetail(
            type=f"errors/{exc.status_code}",
            title=exc.detail if isinstance(exc.detail, str) else "Error",
            status=exc.status_code,
            detail=exc.detail if isinstance(exc.detail, str) else str(exc.detail),
            instance=str(request.url),
        ).model_dump(),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=ProblemDetail(
            type="errors/validation_error",
            title="Validation Error",
            status=422,
            detail=str(exc.errors()),
            instance=str(request.url),
        ).model_dump(),
    )
