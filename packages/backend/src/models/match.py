import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.demo import Demo
    from src.models.player_match_stats import PlayerMatchStats
    from src.models.round import Round


class Match(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "matches"

    demo_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("demos.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    map: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    match_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    tickrate: Mapped[int] = mapped_column(Integer, nullable=False, server_default="64")

    # Teams
    team1_name: Mapped[str | None] = mapped_column(String(100))
    team2_name: Mapped[str | None] = mapped_column(String(100))
    team1_score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    team2_score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    # Optional link to our tracked team
    our_team_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("teams.id", ondelete="SET NULL"),
    )

    match_type: Mapped[str | None] = mapped_column(String(30))  # competitive, wingman, etc.
    total_rounds: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    overtime_rounds: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    duration_seconds: Mapped[float | None] = mapped_column(Float)

    # Relationships
    demo: Mapped["Demo"] = relationship(back_populates="match")
    rounds: Mapped[list["Round"]] = relationship(
        back_populates="match", order_by="Round.round_number"
    )
    player_stats: Mapped[list["PlayerMatchStats"]] = relationship(back_populates="match")

    __table_args__ = (
        CheckConstraint("team1_score >= 0", name="ck_match_team1_score_positive"),
        CheckConstraint("team2_score >= 0", name="ck_match_team2_score_positive"),
        CheckConstraint("total_rounds >= 0", name="ck_match_total_rounds_positive"),
        CheckConstraint("overtime_rounds >= 0", name="ck_match_overtime_rounds_positive"),
    )
