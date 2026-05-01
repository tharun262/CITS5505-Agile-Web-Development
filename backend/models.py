from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)

    username = db.Column(db.String(80), unique=True, nullable=False)

    email = db.Column(db.String(120), unique=True, nullable=False)

    password_hash = db.Column(db.String(200), nullable=False)

    bio = db.Column(db.String(200), nullable=True)

    # 🔐 set password (hash it)
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    # 🔐 check password
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    # (optional but useful later)
    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "bio": self.bio
        }