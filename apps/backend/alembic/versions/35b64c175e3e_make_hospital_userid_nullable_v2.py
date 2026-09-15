"""make_hospital_userid_nullable_v2

Revision ID: 35b64c175e3e
Revises: 52a1b3c4d5e6
Create Date: 2026-09-15 18:48:30.109748

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision: str = '35b64c175e3e'
down_revision: Union[str, Sequence[str], None] = '52a1b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make user_id nullable in hospitals table
    op.alter_column('hospitals', 'user_id',
               existing_type=postgresql.UUID(as_uuid=True),
               nullable=True)


def downgrade() -> None:
    # Revert user_id to not nullable
    op.alter_column('hospitals', 'user_id',
               existing_type=postgresql.UUID(as_uuid=True),
               nullable=False)
