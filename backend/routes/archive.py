from flask import Blueprint, jsonify, request, session
from models import Task
from extensions import db

archive_bp = Blueprint("archive", __name__, url_prefix="/api/v1/archive")


def get_logged_in_user_id():
    return session.get("user_id")


def unauthenticated_response():
    return jsonify({
        "error": {
            "code": "UNAUTHENTICATED",
            "message": "Authentication required"
        }
    }), 401


@archive_bp.get("")
def list_archived_tasks():
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", 20, type=int)

    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100

    query = Task.query.filter_by(
        user_id=user_id,
        is_archived=True
    ).order_by(Task.created_at.desc())

    pagination = query.paginate(page=page, per_page=page_size, error_out=False)

    return jsonify({
        "items": [task.to_dict() for task in pagination.items],
        "page": page,
        "page_size": page_size,
        "total": pagination.total
    }), 200


@archive_bp.post("/<int:id>/restore")
def restore_archived_task(id):
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

    if not task.is_archived:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Task is not archived"
            }
        }), 422

    task.is_archived = False
    db.session.commit()

    return jsonify(task.to_dict()), 200


@archive_bp.delete("/<int:id>")
def delete_archived_task(id):
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

    if not task.is_archived:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Task is not archived"
            }
        }), 422

    db.session.delete(task)
    db.session.commit()

    return "", 204