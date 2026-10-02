from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_market_quotes"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "market_quotes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("market", sa.String(10), nullable=False),
        sa.Column("symbol", sa.String(32), nullable=False),
        sa.Column("price", sa.Numeric(20,8), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("change_percent", sa.Numeric(12,6)),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("quoted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("market", "symbol"),
    )
    op.create_index("ix_market_quotes_symbol", "market_quotes", ["market", "symbol"])

def downgrade():
    op.drop_index("ix_market_quotes_symbol", table_name="market_quotes")
    op.drop_table("market_quotes")
