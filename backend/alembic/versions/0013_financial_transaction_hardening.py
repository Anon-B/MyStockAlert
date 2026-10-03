"""financial transaction precision, idempotency and alert delivery states"""
from alembic import op
import sqlalchemy as sa

revision = "0013_financial_hardening"
down_revision = "0012_transaction_thb_value"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("portfolio_transactions", sa.Column("user_id", sa.UUID(), nullable=True))
    op.add_column("portfolio_transactions", sa.Column("idempotency_key", sa.String(128), nullable=True))
    op.execute("""
        UPDATE portfolio_transactions pt
        SET user_id = ph.user_id
        FROM portfolio_holdings ph
        WHERE pt.holding_id = ph.id
    """)
    op.create_foreign_key(
        "fk_portfolio_transactions_user_id",
        "portfolio_transactions", "users", ["user_id"], ["id"], ondelete="CASCADE"
    )
    op.create_unique_constraint(
        "uq_portfolio_tx_user_idempotency",
        "portfolio_transactions",
        ["user_id", "idempotency_key"]
    )
    op.create_index(
        "ix_portfolio_tx_user_status",
        "portfolio_transactions",
        ["user_id", "status", "executed_at"]
    )
    op.create_check_constraint(
        "ck_portfolio_transactions_status",
        "portfolio_transactions",
        "status IN ('MATCHED','FILLED','PENDING','CANCELLED','REJECTED')"
    )
    op.add_column(
        "alert_history",
        sa.Column("provider", sa.String(64), nullable=True)
    )
    op.add_column(
        "alert_history",
        sa.Column("delivery_status", sa.String(32), nullable=True)
    )
    op.execute("UPDATE alert_history SET delivery_status = status WHERE delivery_status IS NULL")
    op.create_index(
        "ix_alert_history_delivery_status",
        "alert_history",
        ["user_id", "delivery_status", "triggered_at"]
    )
    op.create_index(
        "ix_alert_outbox_retry",
        "alert_outbox",
        ["status", "next_attempt_at"]
    )

def downgrade():
    op.drop_index("ix_alert_outbox_retry", table_name="alert_outbox")
    op.drop_index("ix_alert_history_delivery_status", table_name="alert_history")
    op.drop_column("alert_history", "delivery_status")
    op.drop_column("alert_history", "provider")
    op.drop_constraint("ck_portfolio_transactions_status", "portfolio_transactions", type_="check")
    op.drop_index("ix_portfolio_tx_user_status", table_name="portfolio_transactions")
    op.drop_constraint("uq_portfolio_tx_user_idempotency", "portfolio_transactions", type_="unique")
    op.drop_constraint("fk_portfolio_transactions_user_id", "portfolio_transactions", type_="foreignkey")
    op.drop_column("portfolio_transactions", "idempotency_key")
    op.drop_column("portfolio_transactions", "user_id")
