from flask import Flask
from extensions import db, migrate
from models import User
from routes.auth import auth_bp
from routes.profiles import profiles_bp
from routes.comments import comments_bp
from routes.calendar import calendar_bp

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
app.config["SECRET_KEY"] = "secret-key"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
migrate.init_app(app, db)

app.register_blueprint(auth_bp)
app.register_blueprint(profiles_bp)
app.register_blueprint(comments_bp)
app.register_blueprint(calendar_bp)

@app.route("/")
def home():
    return "Backend is running"

if __name__ == "__main__":
    app.run(debug=True)