"""add reminder_sent_at to task

Revision ID: 8f3a1c2d4e5b
Revises: 6dc653b48f52
Create Date: 2026-05-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8f3a1c2d4e5b'
down_revision = '6dc653b48f52'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.add_column(sa.Column('reminder_sent_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.drop_column('reminder_sent_at')
