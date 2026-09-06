"""make doctor_id and appointment_id nullable

Revision ID: 7495c9abff35
Revises: ec15d6e1c21e
Create Date: 2026-09-06 17:49:43.348886

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7495c9abff35'
down_revision: Union[str, Sequence[str], None] = 'ec15d6e1c21e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('prescriptions', 'doctor_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.alter_column('prescriptions', 'appointment_id',
               existing_type=sa.UUID(),
               nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('prescriptions', 'appointment_id',
               existing_type=sa.UUID(),
               nullable=False)
    op.alter_column('prescriptions', 'doctor_id',
               existing_type=sa.UUID(),
               nullable=False)
