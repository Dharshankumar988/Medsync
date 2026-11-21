"""alter_pharmacy_qr_identifier_to_text

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-11-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f4a5b6c7d8e9'
down_revision: Union[str, Sequence[str], None] = 'e3f4a5b6c7d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely migrate qr_identifier to TEXT in PostgreSQL without lock issues
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'pharmacies' 
                AND column_name = 'qr_identifier' 
                AND character_maximum_length IS NOT NULL
            ) THEN
                ALTER TABLE pharmacies ALTER COLUMN qr_identifier TYPE TEXT;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    pass
