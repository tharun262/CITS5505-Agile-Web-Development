from flask import Blueprint, request, jsonify, session
from models import User, Friendship, FriendRequest, Message, iso_utc
from extensions import db

friends_bp = Blueprint("friends", __name__)


def serialize_user_basic(user):
    return {
        "id": user.id,
        "username": user.username,
        "bio": user.bio,
        "location": user.location,
        "created_at": iso_utc(user.created_at)
    }


def get_relationship_status(current_user_id, other_user_id):
    if current_user_id == other_user_id:
        return {"status": "self"}

    friendship = Friendship.query.filter(
        ((Friendship.user_id == current_user_id) & (Friendship.friend_id == other_user_id)) |
        ((Friendship.user_id == other_user_id) & (Friendship.friend_id == current_user_id))
    ).first()

    if friendship:
        return {"status": "friends"}

    incoming = FriendRequest.query.filter_by(
        sender_id=other_user_id,
        receiver_id=current_user_id,
        status="pending"
    ).first()

    if incoming:
        return {"status": "pending_received", "request_id": incoming.id}

    outgoing = FriendRequest.query.filter_by(
        sender_id=current_user_id,
        receiver_id=other_user_id,
        status="pending"
    ).first()

    if outgoing:
        return {"status": "pending_sent", "request_id": outgoing.id}

    return {"status": "not_friends"}


@friends_bp.route("/api/v1/friend-requests", methods=["POST"])
def send_friend_request():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json() or {}
    friend_username = (data.get("friend_username") or "").strip()

    if not friend_username:
        return jsonify({"error": "Friend username is required"}), 400

    current_user = User.query.get(user_id)
    friend_user = User.query.filter_by(username=friend_username).first()

    if not current_user:
        return jsonify({"error": "Current user not found"}), 404

    if not friend_user:
        return jsonify({"error": "User not found"}), 404

    if current_user.id == friend_user.id:
        return jsonify({"error": "You cannot add yourself"}), 400

    relationship = get_relationship_status(current_user.id, friend_user.id)
    status = relationship["status"]

    if status == "friends":
        return jsonify({"error": "Already friends"}), 409

    if status == "pending_sent":
        return jsonify({"error": "Friend request already sent"}), 409

    if status == "pending_received":
        return jsonify({
            "error": "This user has already sent you a friend request",
            "request_id": relationship.get("request_id")
        }), 409

    existing_request = FriendRequest.query.filter_by(
        sender_id=current_user.id,
        receiver_id=friend_user.id
    ).first()

    if existing_request:
        existing_request.status = "pending"
        db.session.commit()
        return jsonify({
            "message": "Friend request sent successfully",
            "request": existing_request.to_dict()
        }), 201

    friend_request = FriendRequest(
        sender_id=current_user.id,
        receiver_id=friend_user.id,
        status="pending"
    )
    db.session.add(friend_request)
    db.session.commit()

    return jsonify({
        "message": "Friend request sent successfully",
        "request": friend_request.to_dict()
    }), 201


@friends_bp.route("/api/v1/friend-requests", methods=["GET"])
def list_friend_requests():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    incoming = FriendRequest.query.filter_by(
        receiver_id=user_id,
        status="pending"
    ).order_by(FriendRequest.created_at.desc()).all()

    outgoing = FriendRequest.query.filter_by(
        sender_id=user_id,
        status="pending"
    ).order_by(FriendRequest.created_at.desc()).all()

    return jsonify({
        "incoming": [r.to_dict() for r in incoming],
        "outgoing": [r.to_dict() for r in outgoing]
    }), 200


@friends_bp.route("/api/v1/friend-requests/<int:request_id>/accept", methods=["PATCH"])
def accept_friend_request(request_id):
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    friend_request = FriendRequest.query.get(request_id)

    if not friend_request:
        return jsonify({"error": "Friend request not found"}), 404

    if friend_request.receiver_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    if friend_request.status != "pending":
        return jsonify({"error": f"Cannot accept a {friend_request.status} request"}), 400

    existing_friendship = Friendship.query.filter(
        ((Friendship.user_id == friend_request.sender_id) & (Friendship.friend_id == friend_request.receiver_id)) |
        ((Friendship.user_id == friend_request.receiver_id) & (Friendship.friend_id == friend_request.sender_id))
    ).first()

    if not existing_friendship:
        db.session.add(Friendship(user_id=friend_request.sender_id, friend_id=friend_request.receiver_id))
        db.session.add(Friendship(user_id=friend_request.receiver_id, friend_id=friend_request.sender_id))

    friend_request.status = "accepted"
    db.session.commit()

    return jsonify({
        "message": "Friend request accepted",
        "request": friend_request.to_dict()
    }), 200


@friends_bp.route("/api/v1/friend-requests/<int:request_id>/reject", methods=["PATCH"])
def reject_friend_request(request_id):
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    friend_request = FriendRequest.query.get(request_id)

    if not friend_request:
        return jsonify({"error": "Friend request not found"}), 404

    if friend_request.receiver_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    if friend_request.status != "pending":
        return jsonify({"error": f"Cannot reject a {friend_request.status} request"}), 400

    friend_request.status = "rejected"
    db.session.commit()

    return jsonify({
        "message": "Friend request rejected",
        "request": friend_request.to_dict()
    }), 200


@friends_bp.route("/api/v1/friends", methods=["POST"])
def add_friend():
    return jsonify({
        "error": "Direct friendship is disabled. Use /api/v1/friend-requests instead."
    }), 400


@friends_bp.route("/api/v1/friends/<friend_username>", methods=["DELETE"])
def remove_friend(friend_username):
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    friend_user = User.query.filter_by(username=friend_username).first()

    if not friend_user:
        return jsonify({"error": "User not found"}), 404

    friendships = Friendship.query.filter(
        ((Friendship.user_id == user_id) & (Friendship.friend_id == friend_user.id)) |
        ((Friendship.user_id == friend_user.id) & (Friendship.friend_id == user_id))
    ).all()

    if not friendships:
        return jsonify({"error": "Not friends"}), 404

    for friendship in friendships:
        db.session.delete(friendship)

    db.session.commit()

    return jsonify({"message": "Friend removed successfully"}), 200


@friends_bp.route("/api/v1/friends/<username>", methods=["GET"])
def get_friends(username):
    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    friendships = Friendship.query.filter_by(user_id=user.id).all()
    friends = [User.query.get(f.friend_id) for f in friendships]
    friends = [f for f in friends if f]

    return jsonify({
        "friends": [serialize_user_basic(f) for f in friends],
        "count": len(friends)
    }), 200


@friends_bp.route("/api/v1/users/lookup/<username>", methods=["GET"])
def lookup_user(username):
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "username": user.username,
        "bio": user.bio,
        "location": user.location
    }), 200


@friends_bp.route("/api/v1/friends/status/<friend_username>", methods=["GET"])
def check_friend_status(friend_username):
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    friend_user = User.query.filter_by(username=friend_username).first()

    if not friend_user:
        return jsonify({"error": "User not found"}), 404

    relationship = get_relationship_status(user_id, friend_user.id)
    return jsonify(relationship), 200


@friends_bp.route("/api/v1/messages", methods=["POST"])
def send_message():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json() or {}
    recipient_id = data.get("recipient_id")
    content = (data.get("content") or "").strip()

    if not recipient_id or not content:
        return jsonify({"error": "Recipient ID and content are required"}), 400

    if len(content) > 5000:
        return jsonify({"error": "Message too long (max 5000 characters)"}), 400

    recipient = User.query.get(recipient_id)

    if not recipient:
        return jsonify({"error": "Recipient not found"}), 404

    if user_id == recipient_id:
        return jsonify({"error": "Cannot message yourself"}), 400

    message = Message(sender_id=user_id, recipient_id=recipient_id, content=content)
    db.session.add(message)
    db.session.commit()

    return jsonify({
        "message": "Message sent successfully",
        "data": message.to_dict()
    }), 201


@friends_bp.route("/api/v1/messages", methods=["GET"])
def get_messages():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    filter_by = request.args.get("filter", "all")

    if filter_by == "sent":
        messages = Message.query.filter_by(sender_id=user_id).order_by(Message.created_at.desc()).all()
    elif filter_by == "received":
        messages = Message.query.filter_by(recipient_id=user_id).order_by(Message.created_at.desc()).all()
    elif filter_by == "unread":
        messages = Message.query.filter_by(recipient_id=user_id, is_read=False).order_by(Message.created_at.desc()).all()
    else:
        messages = Message.query.filter(
            (Message.sender_id == user_id) | (Message.recipient_id == user_id)
        ).order_by(Message.created_at.desc()).all()

    return jsonify({
        "messages": [m.to_dict() for m in messages],
        "count": len(messages)
    }), 200


@friends_bp.route("/api/v1/messages/<int:message_id>", methods=["GET"])
def get_message(message_id):
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    message = Message.query.get(message_id)

    if not message:
        return jsonify({"error": "Message not found"}), 404

    if message.sender_id != user_id and message.recipient_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    return jsonify({"message": message.to_dict()}), 200


@friends_bp.route("/api/v1/messages/<int:message_id>/read", methods=["PATCH"])
def mark_message_read(message_id):
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    message = Message.query.get(message_id)

    if not message:
        return jsonify({"error": "Message not found"}), 404

    if message.recipient_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    message.is_read = True
    db.session.commit()

    return jsonify({"message": "Message marked as read"}), 200


@friends_bp.route("/api/v1/messages/conversation/<username>", methods=["GET"])
def get_conversation(username):
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    other_user = User.query.filter_by(username=username).first()

    if not other_user:
        return jsonify({"error": "User not found"}), 404

    messages = Message.query.filter(
        ((Message.sender_id == user_id) & (Message.recipient_id == other_user.id)) |
        ((Message.sender_id == other_user.id) & (Message.recipient_id == user_id))
    ).order_by(Message.created_at.asc()).all()

    return jsonify({
        "messages": [m.to_dict() for m in messages],
        "count": len(messages),
        "other_user": serialize_user_basic(other_user)
    }), 200


@friends_bp.route("/api/v1/messages/<int:message_id>", methods=["DELETE"])
def delete_message(message_id):
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    message = Message.query.get(message_id)

    if not message:
        return jsonify({"error": "Message not found"}), 404

    if message.sender_id != user_id:
        return jsonify({"error": "Only sender can delete"}), 403

    db.session.delete(message)
    db.session.commit()

    return "", 204