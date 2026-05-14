from flask import Blueprint, request, jsonify, session
from models import User, Friendship
from extensions import db

profiles_bp = Blueprint("profiles", __name__)


@profiles_bp.route("/profiles/test")
def test_profiles():
    return {"message": "profiles working"}


@profiles_bp.route("/profiles/me", methods=["GET"])
def get_my_profile():
    """Get current user's profile"""
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"profile": user.to_dict()}), 200


@profiles_bp.route("/profiles/me", methods=["PATCH"])
def update_my_profile():
    """Update current user's profile"""
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}

    if "bio" in data:
        user.bio = data["bio"]

    if "location" in data:
        user.location = data["location"]

    if "username" in data:
        new_username = data.get("username", "").strip()

        if not new_username:
            return jsonify({"error": "Username cannot be empty"}), 400

        existing = User.query.filter(
            User.username == new_username,
            User.id != user_id
        ).first()

        if existing:
            return jsonify({"error": "Username already taken"}), 409

        user.username = new_username

    db.session.commit()

    return jsonify({
        "message": "Profile updated successfully",
        "profile": user.to_dict()
    }), 200


@profiles_bp.route("/profiles/<username>", methods=["GET"])
def get_public_profile(username):
    """Get any user's public profile"""
    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "profile": {
            "id": user.id,
            "username": user.username,
            "bio": user.bio,
            "location": user.location,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    }), 200


@profiles_bp.route("/profiles/<username>/summary", methods=["GET"])
def get_profile_summary(username):
    """Get user profile with stats"""
    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    friend_count = Friendship.query.filter_by(user_id=user.id).count()
    post_count = len(user.posts) if user.posts else 0
    task_count = len(user.tasks) if user.tasks else 0

    return jsonify({
        "profile": {
            "id": user.id,
            "username": user.username,
            "bio": user.bio,
            "location": user.location,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "friend_count": friend_count,
            "post_count": post_count,
            "task_count": task_count
        }
    }), 200