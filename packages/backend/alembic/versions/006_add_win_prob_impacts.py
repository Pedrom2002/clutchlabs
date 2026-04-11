"""Add win_prob_impacts table for win probability analysis.

Revision ID: 006
Revises: 005
"""

from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "win_prob_impacts",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("match_id", sa.Uuid(as_uuid=True), sa.ForeignKey("matches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("round_number", sa.Integer, nullable=False),
        sa.Column("tick", sa.Integer, nullable=False),
        sa.Column("victim_steam_id", sa.String(20), nullable=False),
        sa.Column("victim_name", sa.String(100), nullable=False),
        sa.Column("victim_side", sa.String(5), nullable=False),
        sa.Column("attacker_steam_id", sa.String(20), nullable=True),
        sa.Column("attacker_name", sa.String(100), nullable=True),
        sa.Column("prob_before", sa.Float, nullable=False),
        sa.Column("prob_after", sa.Float, nullable=False),
        sa.Column("win_delta", sa.Float, nullable=False),
        sa.Column("alive_t_before", sa.Integer, nullable=False),
        sa.Column("alive_ct_before", sa.Integer, nullable=False),
        sa.Column("bomb_planted", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("weapon", sa.String(50), nullable=True),
        sa.Column("headshot", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("was_traded", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("victim_x", sa.Float, nullable=True),
        sa.Column("victim_y", sa.Float, nullable=True),
        sa.Column("victim_z", sa.Float, nullable=True),
    )
    op.create_index("ix_win_prob_impacts_match_id", "win_prob_impacts", ["match_id"])
    op.create_index("ix_win_prob_impacts_victim_steam_id", "win_prob_impacts", ["victim_steam_id"])
    op.create_index("ix_win_prob_impacts_attacker_steam_id", "win_prob_impacts", ["attacker_steam_id"])
    op.create_index("ix_win_prob_impacts_win_delta", "win_prob_impacts", ["win_delta"])
    op.create_index("ix_winprob_match_round", "win_prob_impacts", ["match_id", "round_number"])
    op.create_index("ix_winprob_impact_desc", "win_prob_impacts", ["match_id", "win_delta"])


def downgrade() -> None:
    op.drop_index("ix_winprob_impact_desc", table_name="win_prob_impacts")
    op.drop_index("ix_winprob_match_round", table_name="win_prob_impacts")
    op.drop_index("ix_win_prob_impacts_win_delta", table_name="win_prob_impacts")
    op.drop_index("ix_win_prob_impacts_attacker_steam_id", table_name="win_prob_impacts")
    op.drop_index("ix_win_prob_impacts_victim_steam_id", table_name="win_prob_impacts")
    op.drop_index("ix_win_prob_impacts_match_id", table_name="win_prob_impacts")
    op.drop_table("win_prob_impacts")
