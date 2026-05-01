from flask import Blueprint, request, jsonify, session
from models import User
from extensions import db

auth_bp = Blueprint("auth", __name__)

# test route
@auth_bp.route("/auth/test")
def test():
    return {"message": "auth working"}


# signup
@auth_bp.route("/auth/signup", methods=["POST"])
def signup():
    data = request.get_json()

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"error": "Username, email and password are required"}), 400

    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()

    if existing_user:
        return jsonify({"error": "Username or email already exists"}), 409

    user = User(username=username, email=email)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "User created successfully",
        "user": user.to_dict()
    }), 201


# login
@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json()

    username_or_email = data.get("username") or data.get("email")
    password = data.get("password")

    if not username_or_email or not password:
        return jsonify({"error": "Username/email and password are required"}), 400

    user = User.query.filter(
        (User.username == username_or_email) | (User.email == username_or_email)
    ).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid login details"}), 401

    session["user_id"] = user.id

    return jsonify({
        "message": "Logged in successfully",
        "user": user.to_dict()
    }), 200


# get current user
@auth_bp.route("/auth/me", methods=["GET"])
def me():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"user": user.to_dict()}), 200


# logout
@auth_bp.route("/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200