"""add_delivery_tracking_fields

Revision ID: a1b2c3d4e5f6
Revises: 5d1b4b4952de
Create Date: 2026-01-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '5d1b4b4952de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add delivery tracking fields to prescription_dispensing_log table."""
    op.execute("ALTER TABLE prescription_dispensing_log ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'PENDING'")
    op.execute("ALTER TABLE prescription_dispensing_log ADD COLUMN IF NOT EXISTS delivery_started_at TIMESTAMP")
    op.execute("ALTER TABLE prescription_dispensing_log ADD COLUMN IF NOT EXISTS delivery_completed_at TIMESTAMP")
    op.execute("ALTER TABLE prescription_dispensing_log ADD COLUMN IF NOT EXISTS estimated_delivery_minutes INTEGER DEFAULT 10")
    op.execute("ALTER TABLE prescription_dispensing_log ADD COLUMN IF NOT EXISTS delivery_route JSONB")
    op.execute("ALTER TABLE prescription_dispensing_log ADD COLUMN IF NOT EXISTS current_location JSONB")
    op.execute("CREATE INDEX IF NOT EXISTS idx_dispensing_log_delivery_status ON prescription_dispensing_log(delivery_status)")


def downgrade() -> None:
    """Remove delivery tracking fields from prescription_dispensing_log table."""
    op.drop_index('idx_dispensing_log_delivery_status', table_name='prescription_dispensing_log')
    op.drop_column('prescription_dispensing_log', 'current_location')
    op.drop_column('prescription_dispensing_log', 'delivery_route')
    op.drop_column('prescription_dispensing_log', 'estimated_delivery_minutes')
    op.drop_column('prescription_dispensing_log', 'delivery_completed_at')
    op.drop_column('prescription_dispensing_log', 'delivery_started_at')
    op.drop_column('prescription_dispensing_log', 'delivery_status')
