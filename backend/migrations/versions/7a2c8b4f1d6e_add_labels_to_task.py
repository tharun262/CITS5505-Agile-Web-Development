"""add labels field to task

Revision ID: 7a2c8b4f1d6e
Revises: 579ba7f1e294
Create Date: 2026-05-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7a2c8b4f1d6e'
down_revision = '579ba7f1e294'
branch_labels = None
depends_on = None


def upgrade():
    # SQLite needs batch_alter_table for ADD COLUMN with constraints
    with op.batch_alter_table('task') as batch_op:
        batch_op.add_column(sa.Column('labels', sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table('task') as batch_op:
        batch_op.drop_column('labels')
