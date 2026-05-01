from flask import Blueprint, request, jsonify, session
from models import User
from extensions import db

profiles_bp = Blueprint("profiles", __name__)

@profiles_bp.route("/profiles/test")
def test_profiles():
    return {"message": "profiles working"}


@profiles_bp.route("/profiles/me", methods=["GET"])
def get_my_profile():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    user = User.query.get(user_id)

    return jsonify({"profile": user.to_dict()}), 200


@profiles_bp.route("/profiles/me", methods=["PATCH"])
def update_my_profile():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    user = User.query.get(user_id)
    data = request.get_json()

    if "bio" in data:
        user.bio = data["bio"]

    db.session.commit()

    return jsonify({
        "message": "Profile updated successfully",
        "profile": user.to_dict()
    }), 200


@profiles_bp.route("/profiles/<username>", methods=["GET"])
def get_public_profile(username):
    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "profile": {
            "id": user.id,
            "username": user.username,
            "bio": user.bio
        }
    }), 200