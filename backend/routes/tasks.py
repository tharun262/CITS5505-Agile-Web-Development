from flask import Blueprint, jsonify, request, session
from models import Task
from extensions import db
from datetime import datetime

tasks_bp = Blueprint("tasks", __name__, url_prefix="/api/v1")


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


def task_not_found_response():
    return jsonify({
        "error": {"code": "TASK_NOT_FOUND", "message": "Task not found"}
    }), 404


def serialize_task(task):
    return {
        "id": task.id,
        "user_id": task.user_id,
        "title": task.title,
        "description": task.description,
        "due_at": task.due_at.isoformat() if task.due_at else None,
        "is_completed": task.is_completed,
        "is_archived": task.is_archived,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
    }


# GET /tasks - List active tasks (filter / search / paginate)
@tasks_bp.get("/tasks")
def list_tasks():
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", 50, type=int)
    sort = request.args.get("sort", "-created_at")
    search = request.args.get("search", "")
    include_archived = request.args.get("include_archived", "false").lower() == "true"

    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 50
    if page_size > 200:
        page_size = 200

    # Build query for user's tasks
    query = Task.query.filter_by(user_id=user_id)

    # Exclude archived tasks by default
    if not include_archived:
        query = query.filter_by(is_archived=False)

    # Search filter
    if search.strip():
        query = query.filter(
            (Task.title.ilike(f"%{search}%")) |
            (Task.description.ilike(f"%{search}%"))
        )

    # Sorting
    if sort == "-created_at":
        query = query.order_by(Task.created_at.desc())
    elif sort == "created_at":
        query = query.order_by(Task.created_at.asc())
    elif sort == "-due_at":
        query = query.order_by(Task.due_at.desc())
    elif sort == "due_at":
        query = query.order_by(Task.due_at.asc())
    else:
        query = query.order_by(Task.created_at.desc())

    pagination = query.paginate(page=page, per_page=page_size, error_out=False)

    return jsonify({
        "items": [serialize_task(t) for t in pagination.items],
        "page": page,
        "page_size": page_size,
        "total": pagination.total,
    }), 200


# POST /tasks - Create a task
@tasks_bp.post("/tasks")
def create_task():
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    body = request.get_json(silent=True) or {}

    title = body.get("title")
    description = body.get("description")
    due_at = body.get("due_at")

    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "Title is required and must be a non-empty string"}), 400

    # Parse due_at if provided
    parsed_due_at = None
    if due_at:
        try:
            if isinstance(due_at, str):
                parsed_due_at = datetime.fromisoformat(due_at)
            else:
                return jsonify({"error": "due_at must be an ISO 8601 datetime string"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid due_at format. Use ISO 8601 format"}), 400

    task = Task(
        user_id=user_id,
        title=title.strip(),
        description=description if isinstance(description, str) else None,
        due_at=parsed_due_at,
    )

    db.session.add(task)
    db.session.commit()

    return jsonify(serialize_task(task)), 201


# GET /tasks/{id} - Get one task
@tasks_bp.get("/tasks/<int:task_id>")
def get_task(task_id):
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    task = Task.query.get(task_id)
    if not task:
        return task_not_found_response()

    if task.user_id != user_id:
        return forbidden_response()

    return jsonify(serialize_task(task)), 200


# PATCH /tasks/{id} - Edit a task (title / description / due_at)
@tasks_bp.patch("/tasks/<int:task_id>")
def update_task(task_id):
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    task = Task.query.get(task_id)
    if not task:
        return task_not_found_response()

    if task.user_id != user_id:
        return forbidden_response()

    body = request.get_json(silent=True) or {}

    # Update title if provided
    if "title" in body:
        title = body.get("title")
        if not isinstance(title, str) or not title.strip():
            return jsonify({"error": "Title must be a non-empty string"}), 400
        task.title = title.strip()

    # Update description if provided
    if "description" in body:
        description = body.get("description")
        task.description = description if isinstance(description, str) else None

    # Update due_at if provided
    if "due_at" in body:
        due_at = body.get("due_at")
        if due_at is None:
            task.due_at = None
        else:
            try:
                if isinstance(due_at, str):
                    task.due_at = datetime.fromisoformat(due_at)
                else:
                    return jsonify({"error": "due_at must be an ISO 8601 datetime string"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid due_at format. Use ISO 8601 format"}), 400

    task.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(serialize_task(task)), 200


# DELETE /tasks/{id} - Permanently delete a task (cascade post)
@tasks_bp.delete("/tasks/<int:task_id>")
def delete_task(task_id):
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    task = Task.query.get(task_id)
    if not task:
        return task_not_found_response()

    if task.user_id != user_id:
        return forbidden_response()

    db.session.delete(task)
    db.session.commit()

    return "", 204


# POST /tasks/{id}/complete - Mark task as completed
@tasks_bp.post("/tasks/<int:task_id>/complete")
def complete_task(task_id):
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    task = Task.query.get(task_id)
    if not task:
        return task_not_found_response()

    if task.user_id != user_id:
        return forbidden_response()

    task.is_completed = True
    task.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(serialize_task(task)), 200


# POST /tasks/{id}/uncomplete - Revert completion (blocked if shared)
@tasks_bp.post("/tasks/<int:task_id>/uncomplete")
def uncomplete_task(task_id):
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    task = Task.query.get(task_id)
    if not task:
        return task_not_found_response()

    if task.user_id != user_id:
        return forbidden_response()

    # Note: In the future, add logic to check if task is shared
    # If shared, return error: "Cannot uncomplete shared task"

    task.is_completed = False
    task.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(serialize_task(task)), 200


# POST /tasks/{id}/archive - Move completed task to archive
@tasks_bp.post("/tasks/<int:task_id>/archive")
def archive_task(task_id):
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    task = Task.query.get(task_id)
    if not task:
        return task_not_found_response()

    if task.user_id != user_id:
        return forbidden_response()

    if not task.is_completed:
        return jsonify({
            "error": {"code": "INVALID_STATE", "message": "Only completed tasks can be archived"}
        }), 400

    task.is_archived = True
    task.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(serialize_task(task)), 200
