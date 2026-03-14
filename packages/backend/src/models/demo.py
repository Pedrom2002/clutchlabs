import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.match import Match
    from src.models.user import User


class DemoStatus(enum.StrEnum):
    uploaded = "uploaded"
    queued = "queued"
    downloading = "downloading"
    parsing = "parsing"
    extracting_features = "extracting_features"
    running_models = "running_models"
    completed = "completed"
    failed = "failed"
    error = "error"


class Demo(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "demos"

    org_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    s3_key: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)

    status: Mapped[DemoStatus] = mapped_column(
        Enum(DemoStatus, name="demo_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        server_default="uploaded",
        index=True,
    )
    error_message: Mapped[str | None] = mapped_column(Text)

    # Processing timestamps
    parsing_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    parsing_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    processing_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    processing_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    match: Mapped["Match | None"] = relationship(back_populates="demo")
    uploader: Mapped["User | None"] = relationship()
