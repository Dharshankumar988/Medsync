"""add delivery_otps table

Revision ID: 52a1b3c4d5e6
Revises: c3d4e5f6a7b8
Create Date: 2026-09-13 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '52a1b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use IF NOT EXISTS because the user will run the SQL script manually
    op.execute("""
    CREATE TABLE IF NOT EXISTS delivery_otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES medicine_orders(id) ON DELETE CASCADE,
        otp_code VARCHAR(4) NOT NULL,
        is_used BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE (order_id)
    );
    """)
    
    op.execute("ALTER TABLE delivery_otps ENABLE ROW LEVEL SECURITY;")


def downgrade() -> None:
    op.drop_table('delivery_otps', if_exists=True)
