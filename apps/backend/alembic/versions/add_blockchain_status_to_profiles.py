"""add_blockchain_status_to_profiles

Revision ID: add_blockchain_status_to_profiles
Revises: 5d1b4b4952de
Create Date: 2026-01-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_blockchain_status_to_profiles'
down_revision: Union[str, Sequence[str], None] = '5d1b4b4952de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add blockchain_status and blockchain_tx_hash to patients, doctors, and pharmacies tables."""
    # Patient model
    op.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50) DEFAULT 'PENDING'")
    op.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_patients_blockchain_status ON patients(blockchain_status)")

    # Doctor model
    op.execute("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50) DEFAULT 'PENDING'")
    op.execute("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_doctors_blockchain_status ON doctors(blockchain_status)")

    # Pharmacy model
    op.execute("ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50) DEFAULT 'PENDING'")
    op.execute("ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_pharmacies_blockchain_status ON pharmacies(blockchain_status)")


def downgrade() -> None:
    """Remove blockchain_status and blockchain_tx_hash from patients, doctors, and pharmacies tables."""
    op.drop_index('idx_patients_blockchain_status', table_name='patients')
    op.drop_column('patients', 'blockchain_tx_hash')
    op.drop_column('patients', 'blockchain_status')

    op.drop_index('idx_doctors_blockchain_status', table_name='doctors')
    op.drop_column('doctors', 'blockchain_tx_hash')
    op.drop_column('doctors', 'blockchain_status')

    op.drop_index('idx_pharmacies_blockchain_status', table_name='pharmacies')
    op.drop_column('pharmacies', 'blockchain_tx_hash')
    op.drop_column('pharmacies', 'blockchain_status')
