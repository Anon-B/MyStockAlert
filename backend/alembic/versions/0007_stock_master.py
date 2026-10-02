"""add stock master"""
from alembic import op
import sqlalchemy as sa

revision = "0007_stock_master"
down_revision = "0006_portfolio_transactions"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "stock_master",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("market", sa.String(10), nullable=False),
        sa.Column("symbol", sa.String(32), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("exchange", sa.String(64)),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("source", sa.String(64), nullable=False, server_default="yahoo"),
        sa.Column("synced_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("market", "symbol", name="uq_stock_master_market_symbol"),
    )
    op.create_index("ix_stock_master_market_symbol", "stock_master", ["market", "symbol"])


def downgrade():
    op.drop_index("ix_stock_master_market_symbol", table_name="stock_master")
    op.drop_table("stock_master")
