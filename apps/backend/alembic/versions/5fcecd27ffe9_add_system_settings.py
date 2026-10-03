"""Add system settings

Revision ID: 5fcecd27ffe9
Revises: 35b64c175e3e
Create Date: 2026-10-03 15:14:27.096634

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5fcecd27ffe9'
down_revision: Union[str, Sequence[str], None] = '35b64c175e3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('system_settings',
    sa.Column('key', sa.String(length=50), nullable=False),
    sa.Column('value_bool', sa.Boolean(), nullable=True),
    sa.Column('value_str', sa.String(length=255), nullable=True),
    sa.Column('value_json', sa.JSON(), nullable=True),
    sa.Column('description', sa.String(length=255), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('key', 'id')
    )
    op.create_index(op.f('ix_system_settings_created_at'), 'system_settings', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_system_settings_created_at'), table_name='system_settings')
    op.drop_table('system_settings')
