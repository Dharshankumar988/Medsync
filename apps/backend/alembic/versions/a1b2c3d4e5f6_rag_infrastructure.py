"""rag infrastructure

Revision ID: a1b2c3d4e5f6
Revises: a7f3c2d8e9b1
Create Date: 2026-08-09 08:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'a7f3c2d8e9b1'
branch_labels = None
depends_on = None

def upgrade():
    # Enable vector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Create knowledge_documents table
    op.create_table('knowledge_documents',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('source', sa.String(length=255), nullable=True),
    sa.Column('file_name', sa.String(length=255), nullable=False),
    sa.Column('storage_path', sa.String(length=500), nullable=False),
    sa.Column('mime_type', sa.String(length=100), nullable=False),
    sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('metadata_json', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    # Create knowledge_chunks table
    op.create_table('knowledge_chunks',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('chunk_index', sa.Integer(), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('embedding', Vector(dim=384), nullable=True),
    sa.Column('token_count', sa.Integer(), nullable=True),
    sa.Column('metadata_json', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['document_id'], ['knowledge_documents.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    
    # Create private bucket in Supabase storage (simulated by a SQL insert if we had access to storage schema, but typical postgres users don't directly write to storage.buckets. We'll do it if the storage schema exists)
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
                INSERT INTO storage.buckets (id, name, public) 
                VALUES ('knowledge-base', 'knowledge-base', false)
                ON CONFLICT (id) DO NOTHING;
            END IF;
        END $$;
    """)

def downgrade():
    op.drop_table('knowledge_chunks')
    op.drop_table('knowledge_documents')
    
    # Optionally remove bucket if needed (usually we leave it alone or delete it)
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
                DELETE FROM storage.buckets WHERE id = 'knowledge-base';
            END IF;
        END $$;
    """)
