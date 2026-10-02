from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004_hardening"
down_revision = "0003_alert_state"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("alert_history", sa.Column("triggered_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.add_column("alert_history", sa.Column("delivered_at", sa.DateTime(timezone=True)))
    op.add_column("alert_history", sa.Column("retry_count", sa.Integer(), server_default="0", nullable=False))
    op.add_column("alert_history", sa.Column("last_error", sa.Text()))
    op.add_column("alert_history", sa.Column("idempotency_key", sa.String(128)))
    op.execute("UPDATE alert_history SET idempotency_key = id::text WHERE idempotency_key IS NULL")
    op.alter_column("alert_history", "idempotency_key", nullable=False)
    op.create_unique_constraint("uq_alert_history_idempotency", "alert_history", ["idempotency_key"])

    op.create_table(
        "alert_outbox",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("alert_history_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("alert_history.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("channel", sa.String(32), server_default="line", nullable=False),
        sa.Column("status", sa.String(32), server_default="pending", nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_error", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_portfolio_user_market_symbol", "portfolio_holdings", ["user_id", "market", "symbol"])
    op.create_index("ix_watchlist_user_market_symbol", "watchlist_items", ["user_id", "market", "symbol"])
    op.create_index("ix_alert_history_user_triggered", "alert_history", ["user_id", "triggered_at"])
    op.create_index("ix_outbox_status_next_attempt", "alert_outbox", ["status", "next_attempt_at"])

    op.create_check_constraint("ck_portfolio_market_currency", "portfolio_holdings", "(market = 'TH' AND currency = 'THB') OR (market = 'US' AND currency = 'USD')")
    op.create_check_constraint("ck_watchlist_market", "watchlist_items", "market IN ('TH','US')")
    op.create_check_constraint("ck_quote_market_currency", "market_quotes", "(market = 'TH' AND currency = 'THB') OR (market = 'US' AND currency = 'USD')")

def downgrade():
    op.drop_constraint("ck_quote_market_currency", "market_quotes", type_="check")
    op.drop_constraint("ck_watchlist_market", "watchlist_items", type_="check")
    op.drop_constraint("ck_portfolio_market_currency", "portfolio_holdings", type_="check")
    op.drop_index("ix_outbox_status_next_attempt", table_name="alert_outbox")
    op.drop_index("ix_alert_history_user_triggered", table_name="alert_history")
    op.drop_index("ix_watchlist_user_market_symbol", table_name="watchlist_items")
    op.drop_index("ix_portfolio_user_market_symbol", table_name="portfolio_holdings")
    op.drop_table("alert_outbox")
    op.drop_constraint("uq_alert_history_idempotency", "alert_history", type_="unique")
    op.drop_column("alert_history", "idempotency_key")
    op.drop_column("alert_history", "last_error")
    op.drop_column("alert_history", "retry_count")
    op.drop_column("alert_history", "delivered_at")
    op.drop_column("alert_history", "triggered_at")
