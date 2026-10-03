from alembic import op
import sqlalchemy as sa

revision = "0011_transaction_import_fields"
down_revision = "0010_auth_audit"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("portfolio_transactions", sa.Column("status", sa.String(16), nullable=False, server_default="MATCHED"))
    op.add_column("portfolio_transactions", sa.Column("net_amount_thb", sa.Numeric(20, 8), nullable=True))
    op.execute("UPDATE portfolio_transactions SET net_amount_thb = CASE WHEN currency = 'USD' AND fx_rate IS NOT NULL THEN net_amount * fx_rate ELSE net_amount END")
    op.alter_column("portfolio_transactions", "status", server_default=None)

def downgrade():
    op.drop_column("portfolio_transactions", "net_amount_thb")
    op.drop_column("portfolio_transactions", "status")
