from alembic import op
import sqlalchemy as sa

revision = "0003_alert_state"
down_revision = "0002_market_quotes"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("alert_rules", sa.Column("upper_armed", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("alert_rules", sa.Column("lower_armed", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("alert_rules", sa.Column("last_triggered_at", sa.DateTime(timezone=True), nullable=True))

def downgrade():
    op.drop_column("alert_rules", "last_triggered_at")
    op.drop_column("alert_rules", "lower_armed")
    op.drop_column("alert_rules", "upper_armed")
