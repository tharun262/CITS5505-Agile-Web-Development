from flask import Blueprint, jsonify, request, session
from models import Post, Comment
from extensions import db

comments_bp = Blueprint("comments", __name__, url_prefix="/api/v1")


def get_logged_in_user_id():
    return session.get("user_id")


def unauthenticated_response():
    return jsonify({
        "error": {"code": "UNAUTHENTICATED", "message": "Authentication required"}
    }), 401


def forbidden_response():
    return jsonify({
        "error": {"code": "FORBIDDEN", "message": "You do not have permission to perform this action"}
    }), 403


def post_not_found_response():
    return jsonify({
        "error": {"code": "POST_NOT_FOUND", "message": "Post not found"}
    }), 404


def comment_not_found_response():
    return jsonify({
        "error": {"code": "COMMENT_NOT_FOUND", "message": "Comment not found"}
    }), 404


def serialize_author(user):
    return {
        "id": user.id,
        "username": user.username,
        "display_name": getattr(user, "display_name", None) or user.username,
    }


def serialize_comment(comment):
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "body": comment.body,
        "author": serialize_author(comment.author),
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
    }


@comments_bp.get("/posts/<int:post_id>/comments")
def list_comments(post_id):
    post = Post.query.get(post_id)
    if not post:
        return post_not_found_response()

    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", 50, type=int)
    sort = request.args.get("sort", "created_at")

    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 50
    if page_size > 200:
        page_size = 200

    query = Comment.query.filter_by(post_id=post_id)
    if sort == "-created_at":
        query = query.order_by(Comment.created_at.desc())
    else:
        query = query.order_by(Comment.created_at.asc())

    pagination = query.paginate(page=page, per_page=page_size, error_out=False)

    return jsonify({
        "items": [serialize_comment(c) for c in pagination.items],
        "page": page,
        "page_size": page_size,
        "total": pagination.total,
    }), 200


@comments_bp.post("/posts/<int:post_id>/comments")
def create_comment(post_id):
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    post = Post.query.get(post_id)
    if not post:
        return post_not_found_response()

    body = request.get_json(silent=True) or {}
    text = body.get("body")

    if not isinstance(text, str) or not text.strip():
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "body is required",
                "details": {"field": "body"},
            }
        }), 422

    if len(text) > 1000:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "body must be 1000 characters or fewer",
                "details": {"field": "body"},
            }
        }), 422

    comment = Comment(post_id=post_id, user_id=user_id, body=text.strip())
    db.session.add(comment)
    db.session.commit()

    return jsonify(serialize_comment(comment)), 201


@comments_bp.delete("/posts/<int:post_id>/comments/<int:comment_id>")
def delete_comment(post_id, comment_id):
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    post = Post.query.get(post_id)
    if not post:
        return post_not_found_response()

    comment = Comment.query.get(comment_id)
    if not comment or comment.post_id != post_id:
        return comment_not_found_response()

    if comment.user_id != user_id and post.user_id != user_id:
        return forbidden_response()

    db.session.delete(comment)
    db.session.commit()
    return "", 204
