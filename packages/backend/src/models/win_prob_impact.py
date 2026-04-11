"""Win probability impact data per kill — for visualization and analysis."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Index, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.match import Match


class WinProbImpact(UUIDMixin, TimestampMixin, Base):
    """Win probability impact for each kill in a match.

    Used to:
    - Show win prob curve per round
    - Identify top impact deaths
    - Compute player-level impact metrics
    """

    __tablename__ = "win_prob_impacts"

    match_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    tick: Mapped[int] = mapped_column(Integer, nullable=False)

    # Players involved
    victim_steam_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    victim_name: Mapped[str] = mapped_column(String(100), nullable=False)
    victim_side: Mapped[str] = mapped_column(String(5), nullable=False)  # t or ct
    attacker_steam_id: Mapped[str | None] = mapped_column(String(20), index=True)
    attacker_name: Mapped[str | None] = mapped_column(String(100))

    # Win probability
    prob_before: Mapped[float] = mapped_column(Float, nullable=False)
    prob_after: Mapped[float] = mapped_column(Float, nullable=False)
    win_delta: Mapped[float] = mapped_column(Float, nullable=False, index=True)

    # Game context
    alive_t_before: Mapped[int] = mapped_column(Integer, nullable=False)
    alive_ct_before: Mapped[int] = mapped_column(Integer, nullable=False)
    bomb_planted: Mapped[bool] = mapped_column(default=False, nullable=False)
    weapon: Mapped[str | None] = mapped_column(String(50))
    headshot: Mapped[bool] = mapped_column(default=False, nullable=False)
    was_traded: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Position
    victim_x: Mapped[float | None] = mapped_column(Float)
    victim_y: Mapped[float | None] = mapped_column(Float)
    victim_z: Mapped[float | None] = mapped_column(Float)

    # Relationships
    match: Mapped["Match"] = relationship()

    __table_args__ = (
        Index("ix_winprob_match_round", "match_id", "round_number"),
        Index("ix_winprob_impact_desc", "match_id", "win_delta"),
    )
