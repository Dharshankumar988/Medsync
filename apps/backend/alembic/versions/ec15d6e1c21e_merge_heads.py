"""merge heads

Revision ID: ec15d6e1c21e
Revises: 0f223737026c, a1b2c3d4e5f6
Create Date: 2026-08-19 19:27:36.794165

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec15d6e1c21e'
down_revision: Union[str, Sequence[str], None] = ('0f223737026c', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
