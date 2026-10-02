from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0006_portfolio_transactions"
down_revision = "0005_timestamp_triggers"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "portfolio_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("holding_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("portfolio_holdings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("side", sa.String(4), nullable=False),
        sa.Column("order_id", sa.String(100)),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("execution_price", sa.Numeric(20, 8), nullable=False),
        sa.Column("trading_value", sa.Numeric(20, 8), nullable=False),
        sa.Column("commission", sa.Numeric(20, 8), server_default="0", nullable=False),
        sa.Column("trading_fee", sa.Numeric(20, 8), server_default="0", nullable=False),
        sa.Column("clearing_fee", sa.Numeric(20, 8), server_default="0", nullable=False),
        sa.Column("regulatory_fee", sa.Numeric(20, 8), server_default="0", nullable=False),
        sa.Column("cat_fee", sa.Numeric(20, 8), server_default="0", nullable=False),
        sa.Column("sec_fee", sa.Numeric(20, 8), server_default="0", nullable=False),
        sa.Column("taf_fee", sa.Numeric(20, 8), server_default="0", nullable=False),
        sa.Column("vat", sa.Numeric(20, 8), server_default="0", nullable=False),
        sa.Column("fx_rate", sa.Numeric(20, 8)),
        sa.Column("net_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("executed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_portfolio_transactions_holding_executed", "portfolio_transactions", ["holding_id", "executed_at"])
    op.create_check_constraint("ck_portfolio_tx_side", "portfolio_transactions", "side IN ('BUY','SELL')")

def downgrade():
    op.drop_constraint("ck_portfolio_tx_side", "portfolio_transactions", type_="check")
    op.drop_index("ix_portfolio_transactions_holding_executed", table_name="portfolio_transactions")
    op.drop_table("portfolio_transactions")
