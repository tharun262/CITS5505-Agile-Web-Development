from flask import Blueprint, jsonify, request
from models import Post, User


feed_bp = Blueprint("feed", __name__, url_prefix="/api/v1")


def serialize_author(user):
    return {
        "id": user.id,
        "username": user.username,
        "display_name": getattr(user, "display_name", None) or user.username
    }


def serialize_post(post):
    return {
        "id": post.id,
        "task_id": post.task_id,
        "title_snapshot": post.title_snapshot,
        "caption": post.caption,
        "author": serialize_author(post.author),
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "comment_count": len(post.comments) if hasattr(post, "comments") else 0
    }


@feed_bp.get("/feed")
def get_feed():
    author_username = request.args.get("author")
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", 20, type=int)
    sort = request.args.get("sort", "-created_at")

    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100

    query = Post.query

    if author_username:
        query = query.join(User, Post.user_id == User.id).filter(User.username == author_username)

    if sort == "created_at":
        query = query.order_by(Post.created_at.asc())
    else:
        query = query.order_by(Post.created_at.desc())

    pagination = query.paginate(page=page, per_page=page_size, error_out=False)

    return jsonify({
        "items": [serialize_post(post) for post in pagination.items],
        "page": page,
        "page_size": page_size,
        "total": pagination.total
    }), 200