"""make_hospital_userid_nullable_v2

Revision ID: 35b64c175e3e
Revises: c3d4e5f6a7b8
Create Date: 2026-09-15 18:48:30.109748

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision: str = '35b64c175e3e'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'hospitals' not in tables:
        # Create hospitals table if it does not exist yet
        op.create_table(
            'hospitals',
            sa.Column('id', sa.UUID(), primary_key=True),
            sa.Column('user_id', sa.UUID(), sa.ForeignKey('users.id'), nullable=True, unique=True),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('address', sa.String(500), nullable=False),
            sa.Column('city', sa.String(100), nullable=True),
            sa.Column('state', sa.String(100), nullable=True),
            sa.Column('country', sa.String(100), nullable=True),
            sa.Column('pincode', sa.String(20), nullable=True),
            sa.Column('phone_number', sa.String(20), nullable=True),
            sa.Column('email', sa.String(255), nullable=True),
            sa.Column('website', sa.String(255), nullable=True),
            sa.Column('is_verified', sa.Boolean(), server_default=sa.text('false')),
            sa.Column('is_active', sa.Boolean(), server_default=sa.text('true')),
            sa.Column('google_maps_url', sa.String(1024), nullable=True),
            sa.Column('latitude', sa.Numeric(10, 8), nullable=True),
            sa.Column('longitude', sa.Numeric(11, 8), nullable=True),
            sa.Column('description', sa.String(), nullable=True),
            sa.Column('logo_url', sa.String(1024), nullable=True),
            sa.Column('type', sa.String(50), server_default=sa.text("'hospital'")),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index(op.f('ix_hospitals_user_id'), 'hospitals', ['user_id'], unique=True)
    else:
        # Table exists, make user_id nullable
        try:
            op.alter_column('hospitals', 'user_id',
                       existing_type=sa.UUID(),
                       nullable=True)
        except Exception:
            pass


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'hospitals' in tables:
        op.alter_column('hospitals', 'user_id',
                   existing_type=sa.UUID(),
                   nullable=False)
