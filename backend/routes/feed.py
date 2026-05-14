from flask import Blueprint, jsonify, request
from models import Post, User, Comment
import base64


feed_bp = Blueprint("feed", __name__, url_prefix="/api/v1")


def serialize_author(user):
    """Serialize user info for API responses"""
    return {
        "id": user.id,
        "username": user.username,
        "bio": user.bio,
        "location": user.location,
        "display_name": user.username
    }


def serialize_post(post):
    """Serialize post with full author info"""
    # Get image_data from the associated task if it exists
    image_data_b64 = None
    if post.task and post.task.image_data:
        image_data_b64 = base64.b64encode(post.task.image_data).decode('utf-8')
    
    return {
        "id": post.id,
        "task_id": post.task_id,
        "user_id": post.user_id,
        "title_snapshot": post.title_snapshot,
        "description_snapshot": post.description_snapshot,
        "caption": post.caption,
        "author": serialize_author(post.author) if post.author else None,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "comment_count": len(post.comments) if hasattr(post, "comments") else 0,
        "image_data": image_data_b64,
    }


def serialize_comment(comment):
    """Serialize comment with author info"""
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "user_id": comment.user_id,
        "body": comment.body,
        "author": serialize_author(comment.author) if comment.author else None,
        "created_at": comment.created_at.isoformat() if comment.created_at else None
    }


@feed_bp.get("/feed")
def get_feed():
    """Get public feed with pagination and filtering"""
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


@feed_bp.get("/posts/<int:post_id>/comments")
def get_post_comments(post_id):
    """Get all comments for a post"""
    post = Post.query.get(post_id)
    
    if not post:
        return jsonify({"error": "Post not found"}), 404
    
    comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.asc()).all()
    
    return jsonify({
        "items": [serialize_comment(c) for c in comments],
        "count": len(comments)
    }), 200


@feed_bp.post("/posts/<int:post_id>/comments")
def create_comment(post_id):
    """Create a comment on a post"""
    from extensions import db
    from flask import session
    
    user_id = session.get("user_id")
    
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401
    
    post = Post.query.get(post_id)
    
    if not post:
        return jsonify({"error": "Post not found"}), 404
    
    data = request.get_json()
    body = data.get("body", "").strip()
    
    if not body:
        return jsonify({"error": "Comment body is required"}), 400
    
    if len(body) > 1000:
        return jsonify({"error": "Comment too long (max 1000 characters)"}), 400
    
    comment = Comment(post_id=post_id, user_id=user_id, body=body)
    db.session.add(comment)
    db.session.commit()
    
    return jsonify({
        "message": "Comment created successfully",
        "comment": serialize_comment(comment)
    }), 201


@feed_bp.delete("/posts/<int:post_id>/comments/<int:comment_id>")
def delete_comment(post_id, comment_id):
    """Delete a comment (only by author or post author)"""
    from extensions import db
    from flask import session
    
    user_id = session.get("user_id")
    
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401
    
    comment = Comment.query.filter_by(id=comment_id, post_id=post_id).first()
    
    if not comment:
        return jsonify({"error": "Comment not found"}), 404
    
    post = Post.query.get(post_id)
    
    # Only comment author or post author can delete
    if user_id != comment.user_id and user_id != post.user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    db.session.delete(comment)
    db.session.commit()
    
    return "", 204