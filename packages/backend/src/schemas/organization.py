import uuid

from pydantic import BaseModel, ConfigDict


class OrgResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    tier: str
    max_demos_per_month: int
    logo_url: str | None = None
