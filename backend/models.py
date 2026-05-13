from datetime import datetime
from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    bio = db.Column(db.String(200), nullable=True)

    tasks = db.relationship("Task", backref="user", lazy=True, cascade="all, delete-orphan")
    posts = db.relationship("Post", backref="author", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "bio": self.bio
        }


class Comment(db.Model):
    __tablename__ = "comment"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("post.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    body = db.Column(db.String(1000), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    author = db.relationship("User")
    post = db.relationship(
        "Post",
        backref=db.backref("comments", lazy=True, cascade="all, delete-orphan"),
    )


class CalendarCredential(db.Model):
    __tablename__ = "calendar_credential"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)
    access_token = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text, nullable=True)
    token_expiry = db.Column(db.DateTime, nullable=True)
    scope = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Task(db.Model):
    __tablename__ = "task"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)

    due_at = db.Column(db.DateTime, nullable=True)
    is_completed = db.Column(db.Boolean, default=False, nullable=False)
    is_archived = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)

    shared_post_id = db.Column(db.Integer, nullable=True)
    google_event_id = db.Column(db.String(255), nullable=True)

    # Comma-separated labels, e.g. "java,study,urgent"
    # Stored denormalized for simplicity; parsed to a list in to_dict.
    labels = db.Column(db.String(255), nullable=True)

    # Inline image stored as a data URL (e.g. "data:image/png;base64,...").
    # Trade-off: simple to demo, no filesystem / S3 dependency, but bloats the
    # row. Acceptable for a checkpoint prototype. Capped client-side at ~2 MB.
    photo_data_url = db.Column(db.Text, nullable=True)

    posts = db.relationship("Post", backref="task", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "due_at": self.due_at.isoformat() if self.due_at else None,
            "is_completed": self.is_completed,
            "is_archived": self.is_archived,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "shared_post_id": self.shared_post_id,
            "google_event_id": self.google_event_id,
            "labels": [l for l in (self.labels or "").split(",") if l],
            "photo_data_url": self.photo_data_url,
        }


class Post(db.Model):
    __tablename__ = "post"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("task.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    title_snapshot = db.Column(db.String(200), nullable=False)
    description_snapshot = db.Column(db.Text, nullable=True)
    caption = db.Column(db.String(280), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "task_id": self.task_id,
            "user_id": self.user_id,
            "title_snapshot": self.title_snapshot,
            "description_snapshot": self.description_snapshot,
            "caption": self.caption,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }