from flask import Blueprint, jsonify, request, session
from models import Post, User, PostLike
import base64

feed_bp = Blueprint("feed", __name__, url_prefix="/api/v1")


def serialize_author(user):
    return {
        "id": user.id,
        "username": user.username,
        "bio": user.bio,
        "location": user.location,
        "display_name": user.username
    }


def serialize_post(post, current_user_id=None):
    image_data_b64 = None
    if post.task and post.task.image_data:
        image_data_b64 = base64.b64encode(post.task.image_data).decode("utf-8")

    like_count = len(post.likes) if hasattr(post, "likes") else 0
    comment_count = len(post.comments) if hasattr(post, "comments") else 0
    liked_by_me = False

    if current_user_id:
        liked_by_me = any(like.user_id == current_user_id for like in post.likes)

    return {
        "id": post.id,
        "task_id": post.task_id,
        "user_id": post.user_id,
        "title_snapshot": post.title_snapshot,
        "description_snapshot": post.description_snapshot,
        "caption": post.caption,
        "author": serialize_author(post.author) if post.author else None,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "comment_count": comment_count,
        "like_count": like_count,
        "liked_by_me": liked_by_me,
        "image_data": image_data_b64,
    }


@feed_bp.get("/feed")
def get_feed():
    author_username = request.args.get("author")
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", 20, type=int)
    sort = request.args.get("sort", "-created_at")
    current_user_id = session.get("user_id")

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
        "items": [serialize_post(post, current_user_id=current_user_id) for post in pagination.items],
        "page": page,
        "page_size": page_size,
        "total": pagination.total
    }), 200