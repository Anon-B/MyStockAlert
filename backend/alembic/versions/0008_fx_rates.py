"""add fx rates"""
from alembic import op
import sqlalchemy as sa

revision = "0008_fx_rates"
down_revision = "0007_stock_master"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "fx_rates",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("base_currency", sa.String(3), nullable=False),
        sa.Column("quote_currency", sa.String(3), nullable=False),
        sa.Column("rate", sa.Numeric(20, 10), nullable=False),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("quoted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("base_currency", "quote_currency", name="uq_fx_rates_pair"),
    )
    op.create_index("ix_fx_rates_pair_updated", "fx_rates", ["base_currency", "quote_currency", "updated_at"])


def downgrade():
    op.drop_index("ix_fx_rates_pair_updated", table_name="fx_rates")
    op.drop_table("fx_rates")
