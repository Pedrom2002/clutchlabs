"""Schemas for scout reports."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ScoutReportCreate(BaseModel):
    player_steam_id: str = Field(..., min_length=1, max_length=20)
    notes: str | None = Field(default=None, max_length=4000)


class ScoutReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    player_steam_id: str
    rating: float
    strengths: list[str]
    weaknesses: list[str]
    training_plan: list[str]
    notes: str | None = None
    created_at: datetime


class ScoutReportList(BaseModel):
    items: list[ScoutReportResponse]
    total: int
    page: int
    page_size: int
