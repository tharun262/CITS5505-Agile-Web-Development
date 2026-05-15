from datetime import datetime, timezone
from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash


def utc_now():
    return datetime.now(timezone.utc)


def iso_utc(dt):
    if not dt:
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)

    return dt.isoformat().replace("+00:00", "Z")


class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    bio = db.Column(db.String(200), nullable=True)
    location = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    tasks = db.relationship("Task", backref="user", lazy=True, cascade="all, delete-orphan")
    posts = db.relationship("Post", backref="author", lazy=True, cascade="all, delete-orphan")

    friends = db.relationship(
        "User",
        secondary="friendship",
        primaryjoin="User.id == foreign(Friendship.user_id)",
        secondaryjoin="User.id == foreign(Friendship.friend_id)",
        backref=db.backref("friend_of", lazy=True),
        lazy=True
    )

    messages_sent = db.relationship(
        "Message",
        backref="sender",
        lazy=True,
        cascade="all, delete-orphan",
        foreign_keys="Message.sender_id"
    )
    messages_received = db.relationship(
        "Message",
        backref="recipient",
        lazy=True,
        cascade="all, delete-orphan",
        foreign_keys="Message.recipient_id"
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "bio": self.bio,
            "location": self.location,
            "created_at": iso_utc(self.created_at)
        }


class Friendship(db.Model):
    __tablename__ = "friendship"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    friend_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (db.UniqueConstraint("user_id", "friend_id", name="unique_friendship"),)


class FriendRequest(db.Model):
    __tablename__ = "friend_request"

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    sender = db.relationship("User", foreign_keys=[sender_id], backref="friend_requests_sent")
    receiver = db.relationship("User", foreign_keys=[receiver_id], backref="friend_requests_received")

    __table_args__ = (
        db.UniqueConstraint("sender_id", "receiver_id", name="unique_friend_request"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "sender_username": self.sender.username if self.sender else None,
            "receiver_username": self.receiver.username if self.receiver else None,
            "status": self.status,
            "created_at": iso_utc(self.created_at),
            "updated_at": iso_utc(self.updated_at)
        }


class Message(db.Model):
    __tablename__ = "message"

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "sender_username": self.sender.username,
            "recipient_id": self.recipient_id,
            "recipient_username": self.recipient.username,
            "content": self.content,
            "is_read": self.is_read,
            "created_at": iso_utc(self.created_at)
        }


class Comment(db.Model):
    __tablename__ = "comment"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("post.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    body = db.Column(db.String(1000), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    author = db.relationship("User")
    post = db.relationship(
        "Post",
        backref=db.backref("comments", lazy=True, cascade="all, delete-orphan"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "post_id": self.post_id,
            "user_id": self.user_id,
            "body": self.body,
            "author": {
                "id": self.author.id,
                "username": self.author.username
            } if self.author else None,
            "created_at": iso_utc(self.created_at)
        }


class PostLike(db.Model):
    __tablename__ = "post_like"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("post.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    user = db.relationship("User")
    post = db.relationship(
        "Post",
        backref=db.backref("likes", lazy=True, cascade="all, delete-orphan"),
    )

    __table_args__ = (
        db.UniqueConstraint("post_id", "user_id", name="unique_post_like"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "post_id": self.post_id,
            "user_id": self.user_id,
            "created_at": iso_utc(self.created_at),
        }


class CalendarCredential(db.Model):
    __tablename__ = "calendar_credential"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)
    access_token = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text, nullable=True)
    token_expiry = db.Column(db.DateTime(timezone=True), nullable=True)
    scope = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)


class Task(db.Model):
    __tablename__ = "task"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)

    due_at = db.Column(db.DateTime(timezone=True), nullable=True)
    is_completed = db.Column(db.Boolean, default=False, nullable=False)
    is_archived = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    shared_post_id = db.Column(db.Integer, nullable=True)
    google_event_id = db.Column(db.String(255), nullable=True)

    labels = db.Column(db.String(255), nullable=True)
    image_data = db.Column(db.LargeBinary, nullable=True)

    posts = db.relationship("Post", backref="task", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        image_data_b64 = None
        if self.image_data:
            import base64
            image_data_b64 = base64.b64encode(self.image_data).decode("utf-8")

        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "due_at": iso_utc(self.due_at),
            "is_completed": self.is_completed,
            "is_archived": self.is_archived,
            "created_at": iso_utc(self.created_at),
            "updated_at": iso_utc(self.updated_at),
            "completed_at": iso_utc(self.completed_at),
            "shared_post_id": self.shared_post_id,
            "google_event_id": self.google_event_id,
            "labels": [l for l in (self.labels or "").split(",") if l],
            "image_data": image_data_b64,
        }


class Post(db.Model):
    __tablename__ = "post"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("task.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    title_snapshot = db.Column(db.String(200), nullable=False)
    description_snapshot = db.Column(db.Text, nullable=True)
    caption = db.Column(db.String(280), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "task_id": self.task_id,
            "user_id": self.user_id,
            "author": {
                "id": self.author.id,
                "username": self.author.username,
                "bio": self.author.bio,
                "location": self.author.location
            } if self.author else None,
            "title_snapshot": self.title_snapshot,
            "description_snapshot": self.description_snapshot,
            "caption": self.caption,
            "created_at": iso_utc(self.created_at)
        }