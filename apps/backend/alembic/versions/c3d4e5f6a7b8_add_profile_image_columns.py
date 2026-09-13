"""add profile_image_url to users and doctor_profile_image_url to prescriptions

Revision ID: c3d4e5f6a7b8
Revises: f1e2d3c4b5a6
Create Date: 2026-09-13 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'f1e2d3c4b5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add profile image columns."""
    op.add_column('users', sa.Column('profile_image_url', sa.String(1024), nullable=True))
    op.add_column('prescriptions', sa.Column('doctor_profile_image_url', sa.String(1024), nullable=True))


def downgrade() -> None:
    """Remove profile image columns."""
    op.drop_column('prescriptions', 'doctor_profile_image_url')
    op.drop_column('users', 'profile_image_url')
