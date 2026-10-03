from alembic import op
import sqlalchemy as sa

revision = "0012_transaction_thb_value"
down_revision = "0011_transaction_import_fields"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("portfolio_transactions", sa.Column("trading_value_thb", sa.Numeric(20, 8), nullable=True))
    op.execute("UPDATE portfolio_transactions SET trading_value_thb = CASE WHEN currency = 'USD' AND fx_rate IS NOT NULL THEN trading_value * fx_rate ELSE trading_value END")

def downgrade():
    op.drop_column("portfolio_transactions", "trading_value_thb")
