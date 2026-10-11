"""add_security_pin_hash_to_doctors_and_pharmacies

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-10-11 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, Sequence[str], None] = 'd2e3f4a5b6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use idempotent ALTER TABLE statements for PostgreSQL
    op.execute("ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS security_pin_hash VARCHAR(255)")
    op.execute("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS security_pin_hash VARCHAR(255)")
    op.execute("ALTER TABLE prescription_transfers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()")


def downgrade() -> None:
    op.execute("ALTER TABLE prescription_transfers DROP COLUMN IF EXISTS updated_at")
    op.execute("ALTER TABLE pharmacies DROP COLUMN IF EXISTS security_pin_hash")
    op.execute("ALTER TABLE doctors DROP COLUMN IF EXISTS security_pin_hash")
