"""
Google Calendar integration (P3).

Real OAuth + API calls require:
  - Google Cloud project with an OAuth 2.0 client (Web application)
  - Env vars: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI
  - pip install google-auth-oauthlib google-api-python-client

This module is a skeleton. Replace TODO blocks with real flow / API calls.
"""

from flask import Blueprint, jsonify, request, session
from models import Task, CalendarCredential
from extensions import db

calendar_bp = Blueprint("calendar", __name__, url_prefix="/api/v1")


def get_logged_in_user_id():
    return session.get("user_id")


def unauthenticated_response():
    return jsonify({
        "error": {"code": "UNAUTHENTICATED", "message": "Authentication required"}
    }), 401


def task_not_found_response():
    return jsonify({
        "error": {"code": "TASK_NOT_FOUND", "message": "Task not found"}
    }), 404


def forbidden_response():
    return jsonify({
        "error": {"code": "FORBIDDEN", "message": "You do not have permission to access this task"}
    }), 403


def calendar_not_connected_response():
    return jsonify({
        "error": {"code": "CALENDAR_NOT_CONNECTED", "message": "Connect a Google account first"}
    }), 409


def not_implemented_response(message):
    return jsonify({
        "error": {"code": "NOT_IMPLEMENTED", "message": message}
    }), 501


# ---------------------------------------------------------------------------
# OAuth
# ---------------------------------------------------------------------------

@calendar_bp.get("/calendar/connect")
def connect():
    """Browser redirect into Google OAuth consent screen."""
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    # TODO: build OAuth flow and redirect
    # from google_auth_oauthlib.flow import Flow
    # flow = Flow.from_client_config(CLIENT_CONFIG, scopes=["https://www.googleapis.com/auth/calendar.events"])
    # flow.redirect_uri = current_app.config["GOOGLE_OAUTH_REDIRECT_URI"]
    # auth_url, state = flow.authorization_url(access_type="offline", include_granted_scopes="true", prompt="consent")
    # session["oauth_state"] = state
    # return redirect(auth_url)
    return not_implemented_response("Google OAuth flow not implemented")


@calendar_bp.get("/calendar/callback")
def callback():
    """Google redirects here with ?code=... after the user grants consent."""
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    # TODO: exchange auth code for tokens, upsert CalendarCredential row
    # state = session.pop("oauth_state", None)
    # flow = Flow.from_client_config(CLIENT_CONFIG, scopes=[...], state=state)
    # flow.redirect_uri = current_app.config["GOOGLE_OAUTH_REDIRECT_URI"]
    # flow.fetch_token(authorization_response=request.url)
    # creds = flow.credentials
    # cred = CalendarCredential.query.filter_by(user_id=user_id).first() or CalendarCredential(user_id=user_id)
    # cred.access_token = creds.token
    # cred.refresh_token = creds.refresh_token
    # cred.token_expiry = creds.expiry
    # cred.scope = " ".join(creds.scopes or [])
    # db.session.add(cred); db.session.commit()
    # return redirect("/profiles/me")  # back to frontend
    return not_implemented_response("OAuth callback not implemented")


@calendar_bp.post("/calendar/disconnect")
def disconnect():
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    cred = CalendarCredential.query.filter_by(user_id=user_id).first()
    if cred:
        # TODO: also POST to https://oauth2.googleapis.com/revoke?token=<access_token>
        db.session.delete(cred)
        db.session.commit()
    return "", 204


@calendar_bp.get("/calendar/status")
def status():
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    cred = CalendarCredential.query.filter_by(user_id=user_id).first()
    return jsonify({
        "connected": cred is not None,
        "connected_at": cred.created_at.isoformat() if cred and cred.created_at else None,
    }), 200


# ---------------------------------------------------------------------------
# Calendar event ↔ Task linking
# ---------------------------------------------------------------------------

@calendar_bp.post("/tasks/<int:id>/calendar-event")
def create_event(id):
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    task = Task.query.get(id)
    if not task:
        return task_not_found_response()
    if task.user_id != user_id:
        return forbidden_response()

    cred = CalendarCredential.query.filter_by(user_id=user_id).first()
    if not cred:
        return calendar_not_connected_response()

    if not task.due_at:
        return jsonify({
            "error": {"code": "TASK_HAS_NO_DUE_DATE", "message": "Task has no due_at"}
        }), 409

    body = request.get_json(silent=True) or {}
    duration_minutes = body.get("duration_minutes", 30)
    reminder_minutes_before = body.get("reminder_minutes_before", 15)

    # TODO: build event payload and call Google Calendar API
    # from googleapiclient.discovery import build
    # from google.oauth2.credentials import Credentials
    # google_creds = Credentials(token=cred.access_token, refresh_token=cred.refresh_token, ...)
    # service = build("calendar", "v3", credentials=google_creds)
    # event_body = {
    #     "summary": task.title,
    #     "description": task.description or "",
    #     "start": {"dateTime": task.due_at.isoformat(), "timeZone": "UTC"},
    #     "end":   {"dateTime": (task.due_at + timedelta(minutes=duration_minutes)).isoformat(), "timeZone": "UTC"},
    #     "reminders": {"useDefault": False, "overrides": [{"method": "popup", "minutes": reminder_minutes_before}]},
    # }
    # event = service.events().insert(calendarId="primary", body=event_body).execute()
    # task.google_event_id = event["id"]
    # db.session.commit()
    # return jsonify({"task_id": task.id, "google_event_id": event["id"], "html_link": event["htmlLink"]}), 201
    _ = (duration_minutes, reminder_minutes_before)
    return not_implemented_response("Calendar event creation not implemented")


@calendar_bp.delete("/tasks/<int:id>/calendar-event")
def delete_event(id):
    user_id = get_logged_in_user_id()
    if not user_id:
        return unauthenticated_response()

    task = Task.query.get(id)
    if not task:
        return task_not_found_response()
    if task.user_id != user_id:
        return forbidden_response()

    if not getattr(task, "google_event_id", None):
        return "", 204

    cred = CalendarCredential.query.filter_by(user_id=user_id).first()
    if not cred:
        return calendar_not_connected_response()

    # TODO: delete from Google
    # service.events().delete(calendarId="primary", eventId=task.google_event_id).execute()
    task.google_event_id = None
    db.session.commit()
    return "", 204
