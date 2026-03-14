import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    display_name: str
    role: str
    steam_id: str | None = None
    avatar_url: str | None = None
    is_active: bool
    last_login_at: datetime | None = None
