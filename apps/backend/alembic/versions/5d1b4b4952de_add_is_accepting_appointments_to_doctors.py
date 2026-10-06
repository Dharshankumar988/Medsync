"""add_is_accepting_appointments_to_doctors

Revision ID: 5d1b4b4952de
Revises: 5fcecd27ffe9
Create Date: 2026-10-06 17:04:08.313482

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5d1b4b4952de'
down_revision: Union[str, Sequence[str], None] = '5fcecd27ffe9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add is_accepting_appointments column to doctors table."""
    op.execute("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_accepting_appointments BOOLEAN DEFAULT TRUE")


def downgrade() -> None:
    """Remove is_accepting_appointments column from doctors table."""
    op.drop_column('doctors', 'is_accepting_appointments')
