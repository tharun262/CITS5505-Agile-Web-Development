from datetime import datetime, timezone

from extensions import db
from models import Message, Task, iso_utc


def _truncate(value, max_length):
    if not value or len(value) <= max_length:
        return value
    return value[: max_length - 3] + "..."


def _build_reminder_message(task):
    title = _truncate(task.title, 180)
    due_at = iso_utc(task.due_at) or "the scheduled time"
    lines = [
        f'Reminder: "{title}" is due now.',
        "",
        f"Due time: {due_at}",
    ]

    if task.description:
        lines.extend(["", _truncate(task.description, 800)])

    return "\n".join(lines)


def dispatch_due_reminders(user_id):
    """Create one unread self-message for each due task that has not notified yet."""
    now = datetime.now(timezone.utc)
    due_tasks = Task.query.filter(
        Task.user_id == user_id,
        Task.due_at.isnot(None),
        Task.due_at <= now,
        Task.reminder_sent_at.is_(None),
        Task.is_completed.is_(False),
        Task.is_archived.is_(False),
    ).all()

    if not due_tasks:
        return 0

    for task in due_tasks:
        message = Message(
            sender_id=user_id,
            recipient_id=user_id,
            content=_build_reminder_message(task),
        )
        task.reminder_sent_at = now
        db.session.add(message)

    db.session.commit()
    return len(due_tasks)
