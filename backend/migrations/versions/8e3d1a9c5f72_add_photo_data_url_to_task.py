"""add photo_data_url field to task

Revision ID: 8e3d1a9c5f72
Revises: 7a2c8b4f1d6e
Create Date: 2026-05-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8e3d1a9c5f72'
down_revision = '7a2c8b4f1d6e'
branch_labels = None
depends_on = None


def upgrade():
    # SQLite needs batch_alter_table for ADD COLUMN with constraints
    with op.batch_alter_table('task') as batch_op:
        batch_op.add_column(sa.Column('photo_data_url', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('task') as batch_op:
        batch_op.drop_column('photo_data_url')
