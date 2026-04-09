"""Add Stripe billing fields to organizations and missing DB indexes.

Revision ID: 005
Revises: 004
"""

from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Stripe billing fields on organizations
    op.add_column(
        "organizations",
        sa.Column("stripe_customer_id", sa.String(255), nullable=True, unique=True),
    )
    op.add_column(
        "organizations",
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
    )
    op.create_index(
        "ix_organizations_stripe_customer_id",
        "organizations",
        ["stripe_customer_id"],
        unique=True,
    )

    # Missing performance indexes
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index(
        "ix_rounds_match_round",
        "rounds",
        ["match_id", "round_number"],
    )
    op.create_index(
        "ix_player_match_stats_composite",
        "player_match_stats",
        ["org_id", "player_steam_id"],
    )
    op.create_index(
        "ix_detected_errors_org_player",
        "detected_errors",
        ["org_id", "player_steam_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_detected_errors_org_player", table_name="detected_errors")
    op.drop_index("ix_player_match_stats_composite", table_name="player_match_stats")
    op.drop_index("ix_rounds_match_round", table_name="rounds")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_organizations_stripe_customer_id", table_name="organizations")
    op.drop_column("organizations", "stripe_subscription_id")
    op.drop_column("organizations", "stripe_customer_id")
