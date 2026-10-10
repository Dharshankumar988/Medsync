"""Add original_file_hash to prescriptions

Revision ID: bb2f70762e6f
Revises: 7495c9abff35
Create Date: 2026-09-08 11:54:22.872932

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bb2f70762e6f'
down_revision: Union[str, Sequence[str], None] = '7495c9abff35'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS original_file_hash VARCHAR(64)")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('prescriptions', 'original_file_hash')
