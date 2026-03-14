from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, UUIDMixin


class BetaSignup(UUIDMixin, Base):
    __tablename__ = "beta_signups"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    source: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
