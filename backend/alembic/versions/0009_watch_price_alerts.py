from alembic import op
import sqlalchemy as sa

revision = "0009_watch_price_alerts"
down_revision = "0008_fx_rates"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("alert_rules", sa.Column("upper_price", sa.Numeric(20, 8), nullable=True))
    op.add_column("alert_rules", sa.Column("lower_price", sa.Numeric(20, 8), nullable=True))

def downgrade():
    op.drop_column("alert_rules", "lower_price")
    op.drop_column("alert_rules", "upper_price")
