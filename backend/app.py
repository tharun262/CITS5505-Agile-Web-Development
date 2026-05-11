from flask import Flask
from flask_cors import CORS
from extensions import db, migrate
from models import User
from routes.auth import auth_bp
from routes.profiles import profiles_bp
from routes.archive import archive_bp
from routes.posts import posts_bp
from routes.feed import feed_bp
from routes.comments import comments_bp
from routes.calendar import calendar_bp
from routes.tasks import tasks_bp
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///app.db")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "fallback-secret")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
migrate.init_app(app, db)

app.register_blueprint(auth_bp)
app.register_blueprint(profiles_bp)
app.register_blueprint(archive_bp)
app.register_blueprint(posts_bp)
app.register_blueprint(feed_bp)
app.register_blueprint(comments_bp)
app.register_blueprint(calendar_bp)
app.register_blueprint(tasks_bp)

@app.route("/")
def home():
    return "Backend is running"

if __name__ == "__main__":
    app.run(debug=True)
