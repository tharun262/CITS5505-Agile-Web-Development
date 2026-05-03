from flask import Blueprint, jsonify, request, session
from extensions import db
from models import Task, Post, User

posts_bp = Blueprint("posts", __name__, url_prefix="/api/v1")


def get_logged_in_user_id():
    return session.get("user_id")


def unauthenticated_response():
    return jsonify({
        "error": {
            "code": "UNAUTHENTICATED",
            "message": "Authentication required"
        }
    }), 401


def serialize_author(user):
    return {
        "id": user.id,
        "username": user.username,
        "display_name": getattr(user, "display_name", None) or user.username
    }


def serialize_post(post, include_description=True):
    data = {
        "id": post.id,
        "task_id": post.task_id,
        "title_snapshot": post.title_snapshot,
        "caption": post.caption,
        "author": serialize_author(post.author),
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "comment_count": len(post.comments) if hasattr(post, "comments") else 0
    }

    if include_description:
        data["description_snapshot"] = post.description_snapshot

    return data


@posts_bp.post("/tasks/<int:id>/share")
def share_task(id):
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    task = Task.query.get(id)

    if not task:
        return jsonify({
            "error": {
                "code": "TASK_NOT_FOUND",
                "message": "Task not found"
            }
        }), 404

    if task.user_id != user_id:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You do not have permission to access this task"
            }
        }), 403

    if not task.is_completed:
        return jsonify({
            "error": {
                "code": "TASK_NOT_COMPLETED",
                "message": "Only completed tasks can be shared"
            }
        }), 409

    if getattr(task, "shared_post_id", None):
        return jsonify({
            "error": {
                "code": "TASK_ALREADY_SHARED",
                "message": "Task has already been shared"
            }
        }), 409

    body = request.get_json(silent=True) or {}
    caption = body.get("caption")

    if caption is not None and len(caption) > 280:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "caption must be 280 characters or fewer",
                "details": {"field": "caption"}
            }
        }), 422

    post = Post(
        task_id=task.id,
        user_id=user_id,
        title_snapshot=task.title,
        description_snapshot=task.description,
        caption=caption
    )

    db.session.add(post)
    db.session.flush()

    if hasattr(task, "shared_post_id"):
        task.shared_post_id = post.id

    db.session.commit()

    return jsonify(serialize_post(post, include_description=True)), 201


@posts_bp.get("/posts/<int:post_id>")
def get_post(post_id):
    post = Post.query.get(post_id)

    if not post:
        return jsonify({
            "error": {
                "code": "POST_NOT_FOUND",
                "message": "Post not found"
            }
        }), 404

    return jsonify(serialize_post(post, include_description=True)), 200


@posts_bp.delete("/posts/<int:post_id>")
def delete_post(post_id):
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    post = Post.query.get(post_id)

    if not post:
        return jsonify({
            "error": {
                "code": "POST_NOT_FOUND",
                "message": "Post not found"
            }
        }), 404

    if post.user_id != user_id:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You do not have permission to delete this post"
            }
        }), 403

    task = Task.query.get(post.task_id)
    if task and hasattr(task, "shared_post_id"):
        task.shared_post_id = None

    db.session.delete(post)
    db.session.commit()

    return "", 204