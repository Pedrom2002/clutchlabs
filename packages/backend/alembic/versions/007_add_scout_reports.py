"""Add scout_reports table and Organization.subscription_status column.

Revision ID: 007
Revises: 006
"""

from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scout_reports",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "org_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("player_steam_id", sa.String(20), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("rating", sa.Float(), nullable=False, server_default="0"),
        sa.Column("strengths", sa.JSON(), nullable=False),
        sa.Column("weaknesses", sa.JSON(), nullable=False),
        sa.Column("training_plan", sa.JSON(), nullable=False),
    )
    op.create_index("ix_scout_reports_org_id", "scout_reports", ["org_id"])
    op.create_index(
        "ix_scout_reports_player_steam_id", "scout_reports", ["player_steam_id"]
    )
    op.create_index(
        "ix_scout_reports_org_player", "scout_reports", ["org_id", "player_steam_id"]
    )

    # Organization.subscription_status for Stripe integration
    op.add_column(
        "organizations",
        sa.Column(
            "subscription_status",
            sa.String(30),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("organizations", "subscription_status")
    op.drop_index("ix_scout_reports_org_player", table_name="scout_reports")
    op.drop_index("ix_scout_reports_player_steam_id", table_name="scout_reports")
    op.drop_index("ix_scout_reports_org_id", table_name="scout_reports")
    op.drop_table("scout_reports")
