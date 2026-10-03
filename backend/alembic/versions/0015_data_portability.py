"""add transaction import external id"""
from alembic import op
import sqlalchemy as sa

revision = "0015_data_portability"
down_revision = "0014_register"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("portfolio_transactions", sa.Column("import_external_id", sa.String(length=128), nullable=True))
    op.create_unique_constraint("uq_portfolio_tx_user_import_external", "portfolio_transactions", ["user_id", "import_external_id"])

def downgrade():
    op.drop_constraint("uq_portfolio_tx_user_import_external", "portfolio_transactions", type_="unique")
    op.drop_column("portfolio_transactions", "import_external_id")
