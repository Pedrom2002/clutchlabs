from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from src.config import settings
from src.schemas.auth import TokenPayload

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenPayload:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return TokenPayload(
            sub=payload["sub"],
            org_id=payload["org_id"],
            role=payload["role"],
            email=payload["email"],
            iat=payload.get("iat"),
            exp=payload.get("exp"),
        )
    except JWTError as err:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from err
