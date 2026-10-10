"""add_delivery_tracking_fields

Revision ID: a1b2c3d4e5f6
Revises: 5d1b4b4952de
Create Date: 2026-01-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add delivery tracking fields to prescription_dispensing_log table, creating table if it does not exist."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'prescription_dispensing_log' not in tables:
        op.create_table(
            'prescription_dispensing_log',
            sa.Column('id', sa.UUID(), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('prescription_id', sa.UUID(), sa.ForeignKey('prescriptions.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('pharmacy_id', sa.UUID(), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('patient_id', sa.UUID(), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('dispensed_by_name', sa.String(255), nullable=True),
            sa.Column('dispensed_at', sa.DateTime(), server_default=sa.func.now(), nullable=False, index=True),
            sa.Column('medicines_prescribed', sa.JSON().with_variant(postgresql.JSONB, 'postgresql'), server_default=sa.text("'[]'::jsonb"), nullable=False),
            sa.Column('medicines_dispensed', sa.JSON().with_variant(postgresql.JSONB, 'postgresql'), server_default=sa.text("'[]'::jsonb"), nullable=False),
            sa.Column('prescribed_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
            sa.Column('dispensed_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
            sa.Column('count_mismatch', sa.Boolean(), server_default=sa.text('false'), nullable=False),
            sa.Column('mismatch_details', sa.Text(), nullable=True),
            sa.Column('patient_contact', sa.String(50), nullable=True),
            sa.Column('pharmacy_contact', sa.String(50), nullable=True),
            sa.Column('verification_method', sa.String(50), server_default=sa.text("'QR_OFFLINE'"), nullable=True),
            sa.Column('verified_at', sa.DateTime(), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('blockchain_tx_hash', sa.String(66), nullable=True),
            sa.Column('blockchain_status', sa.String(50), server_default=sa.text("'PENDING'"), nullable=True),
            sa.Column('delivery_status', sa.String(50), server_default=sa.text("'PENDING'"), nullable=True),
            sa.Column('delivery_started_at', sa.DateTime(), nullable=True),
            sa.Column('delivery_completed_at', sa.DateTime(), nullable=True),
            sa.Column('estimated_delivery_minutes', sa.Integer(), server_default=sa.text('10'), nullable=True),
            sa.Column('delivery_route', sa.JSON().with_variant(postgresql.JSONB, 'postgresql'), nullable=True),
            sa.Column('current_location', sa.JSON().with_variant(postgresql.JSONB, 'postgresql'), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False, index=True),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('idx_dispensing_log_delivery_status', 'prescription_dispensing_log', ['delivery_status'])
    else:
        op.execute("ALTER TABLE prescription_dispensing_log ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'PENDING'")
        op.execute("ALTER TABLE prescription_dispensing_log ADD COLUMN IF NOT EXISTS delivery_started_at TIMESTAMP")
        op.execute("ALTER TABLE prescription_dispensing_log ADD COLUMN IF NOT EXISTS delivery_completed_at TIMESTAMP")
        op.execute("ALTER TABLE prescription_dispensing_log ADD COLUMN IF NOT EXISTS estimated_delivery_minutes INTEGER DEFAULT 10")
        op.execute("ALTER TABLE prescription_dispensing_log ADD COLUMN IF NOT EXISTS delivery_route JSONB")
        op.execute("ALTER TABLE prescription_dispensing_log ADD COLUMN IF NOT EXISTS current_location JSONB")
        op.execute("CREATE INDEX IF NOT EXISTS idx_dispensing_log_delivery_status ON prescription_dispensing_log(delivery_status)")


def downgrade() -> None:
    """Remove delivery tracking fields from prescription_dispensing_log table."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'prescription_dispensing_log' in tables:
        columns = [c['name'] for c in inspector.get_columns('prescription_dispensing_log')]
        if 'delivery_status' in columns:
            op.drop_index('idx_dispensing_log_delivery_status', table_name='prescription_dispensing_log')
            op.drop_column('prescription_dispensing_log', 'current_location')
            op.drop_column('prescription_dispensing_log', 'delivery_route')
            op.drop_column('prescription_dispensing_log', 'estimated_delivery_minutes')
            op.drop_column('prescription_dispensing_log', 'delivery_completed_at')
            op.drop_column('prescription_dispensing_log', 'delivery_started_at')
            op.drop_column('prescription_dispensing_log', 'delivery_status')
