from alembic import op

revision = "0005_timestamp_triggers"
down_revision = "0004_hardening"
branch_labels = None
depends_on = None

def upgrade():
    op.execute("""
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql;
    """)
    for table in ("portfolio_holdings","watchlist_items","alert_rules","settings","market_quotes","alert_outbox"):
        op.execute(f"DROP TRIGGER IF EXISTS {table}_updated_at ON {table}")
        op.execute(f"CREATE TRIGGER {table}_updated_at BEFORE UPDATE ON {table} FOR EACH ROW EXECUTE FUNCTION set_updated_at()")

def downgrade():
    for table in ("portfolio_holdings","watchlist_items","alert_rules","settings","market_quotes","alert_outbox"):
        op.execute(f"DROP TRIGGER IF EXISTS {table}_updated_at ON {table}")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at()")
