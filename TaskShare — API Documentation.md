# TaskShare — API Documentation

> Version: `v1` · Status: **Draft for implementation** · Stack: **Flask + SQLite + Flask-Login**
>
> This document defines the HTTP API exposed by the TaskShare backend. It is the single source of truth that both frontend and backend developers should follow. Anything not listed here must be agreed upon by the team and added to this document via pull request before implementation.



------

## 1. Overview

TaskShare is a social productivity web application. The API exposes nine resource groups that map directly to the project's MVP priorities:

| Resource group           | Project priority                        | MVP tier          |
| ------------------------ | --------------------------------------- | ----------------- |
| `auth`                   | Signup / Login / Logout                 | P1 — Must Have    |
| `tasks`                  | Create / Edit / Delete / Complete       | P1 — Must Have    |
| `archive`                | Move completed task to archive          | P1 — Must Have    |
| `posts`                  | Share a completed task as a public post | P2 — Should Have  |
| `feed`                   | Browse other users' shared posts        | P2 — Should Have  |
| `profiles` (own / other) | View activity summary                   | P2 — Should Have  |
| `comments`               | Comment on a public post                | P3 — Nice to Have |
| `calendar`               | Google Calendar sync                    | P3 — Nice to Have |

Implementation order **must** follow these tiers: P1 endpoints are the contract for the minimum viable product and should land first.

------

## 2. Base URL & Versioning

| Environment       | Base URL                           |
| ----------------- | ---------------------------------- |
| Local development | `http://127.0.0.1:5000/api/v1`     |
| Production (TBD)  | `https://<deployment-host>/api/v1` |

All endpoints in this document are **relative to the base URL** above. The leading `/api/v1` is implicit; for example, the documented path `/tasks` resolves to `http://127.0.0.1:5000/api/v1/tasks` in local dev.

The version segment (`v1`) is mandatory. Breaking changes must be released under a new version (`v2`) so that the frontend can pin to a known contract.

------

## 3. Authentication

TaskShare uses **session cookie authentication** backed by Flask-Login.

### How it works

1. Client calls `POST /auth/signup` or `POST /auth/login` with credentials in JSON.
2. Server verifies the credentials, creates a server-side session, and sets a `Set-Cookie: session=<value>; HttpOnly; SameSite=Lax` header.
3. The browser automatically attaches the cookie to every subsequent same-origin request. The frontend does **not** need to read or store the session value.
4. `POST /auth/logout` invalidates the session.

### Protected endpoints

Every endpoint marked **🔒 Auth required** in the tables below will respond with `401 UNAUTHENTICATED` if the request has no valid session cookie.

### CORS

If frontend and backend run on different origins during development, the backend must:

- Set `Access-Control-Allow-Credentials: true`
- Whitelist the frontend origin (no wildcard `*`)
- The frontend `fetch` call must include `credentials: "include"`

------

## 4. Conventions

### 4.1 Content type

All request and response bodies are JSON. Every request that sends a body must include:

```
Content-Type: application/json
```

### 4.2 Naming

JSON keys use `snake_case` (e.g. `created_at`, `is_archived`). URLs use `kebab-case` (e.g. `/calendar-event`).

### 4.3 Timestamps

All timestamps are ISO-8601 strings in UTC, e.g. `"2026-05-01T08:30:00Z"`. The frontend is responsible for converting to the user's local timezone for display.

### 4.4 Standard response envelope

Successful responses return the resource directly (no extra wrapper) so JSON is small and predictable:

```json
{ "id": 17, "title": "Buy groceries", "is_completed": false }
```

List responses return an object with `items` and pagination metadata (see §8):

```json
{
  "items": [ /* ... */ ],
  "page": 1,
  "page_size": 20,
  "total": 137
}
```

### 4.5 Standard error envelope

Every 4xx / 5xx response uses this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title must not be empty",
    "details": { "field": "title" }
  }
}
```

`code` is a stable machine-readable string (full list in §7). `details` is optional and varies by error.

### 4.6 HTTP status codes

| Code | Meaning                                                      |
| ---- | ------------------------------------------------------------ |
| 200  | OK — resource returned                                       |
| 201  | Created — new resource                                       |
| 204  | No Content — success without body (e.g. logout, delete)      |
| 400  | Bad Request — malformed JSON or invalid input                |
| 401  | Unauthenticated — no valid session                           |
| 403  | Forbidden — authenticated but not allowed                    |
| 404  | Not Found                                                    |
| 409  | Conflict — e.g. username already taken                       |
| 422  | Unprocessable Entity — validation failed on a well-formed request |
| 500  | Internal Server Error                                        |

------

## 5. Endpoints

### 5.1 Auth

| Method | Path           | Auth | Purpose                             |
| ------ | -------------- | ---- | ----------------------------------- |
| POST   | `/auth/signup` | —    | Create a new account                |
| POST   | `/auth/login`  | —    | Start a session                     |
| POST   | `/auth/logout` | 🔒    | End the current session             |
| GET    | `/auth/me`     | 🔒    | Return the currently logged-in user |

#### POST `/auth/signup`

Request:

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "S3cure!Pass",
  "password_confirm": "S3cure!Pass"
}
```

Validation rules:

- `username`: 3–20 characters, `[A-Za-z0-9_]`, must be unique
- `email`: valid email syntax, must be unique
- `password`: minimum 8 characters
- `password_confirm`: must equal `password`
  
Client-side validation is also applied on the frontend:
- Email must follow a valid format (e.g. name@example.com)
- Password must contain at least:
  - 8 characters
  - one uppercase letter
  - one lowercase letter
  - one number
  - one special character (e.g. @)

These checks improve user experience, but the backend still enforces validation.

Responses:

- **201 Created** — returns the new user (without password hash) and sets the session cookie:

  ```json
  {
    "id": 7,
    "username": "alice",
    "email": "alice@example.com",
    "created_at": "2026-05-01T08:30:00Z"
  }
  ```

- **409 Conflict** — `USERNAME_TAKEN` or `EMAIL_TAKEN`

- **422 Unprocessable Entity** — `VALIDATION_ERROR`
  
**Frontend behaviour**:
- On successful registration, the user is redirected to the login page
- Validation errors are shown as clear messages instead of raw JSON

#### POST `/auth/login`

Request:

```json
{
  "username": "alice",
  "password": "S3cure!Pass"
}
```

`username` accepts either username or email so users do not have to remember which they registered with.

Responses:

- **200 OK** — same user shape as signup, sets session cookie
- **401 Unauthenticated** — `INVALID_CREDENTIALS` (return a deliberately generic message; do **not** disclose whether it was the username or password that was wrong)
  
**Frontend behaviour**:
- On successful login, the user is redirected to the main page (index.html)
- On failure, a user-friendly error message is displayed instead of raw JSON

#### POST `/auth/logout`

No request body. Invalidates the session and clears the cookie.

- **204 No Content**

#### GET `/auth/me`

Returns the user associated with the current session. Frontend uses this on page load to decide whether to show "Log in" or "Dashboard".

- **200 OK** — user object
- **401 Unauthenticated** — no active session

------

### 5.2 Users & Profiles

| Method | Path                   | Auth | Purpose                               |
| ------ | ---------------------- | ---- | ------------------------------------- |
| GET    | `/profiles/me`         | 🔒    | Get the logged-in user's full profile |
| PATCH  | `/profiles/me`         | 🔒    | Update bio / display name             |
| GET    | `/profiles/{username}` | —    | View another user's public profile    |

#### GET `/profiles/me`

Returns the logged-in user's profile, including private statistics (total tasks, completed tasks, archived tasks, posts, comments).

- **200 OK**

  ```json
  {
    "id": 7,
    "username": "alice",
    "email": "alice@example.com",
    "display_name": "Alice L.",
    "bio": "Trying to ship one task a day.",
    "created_at": "2026-04-15T10:00:00Z",
    "stats": {
      "total_tasks": 42,
      "completed_tasks": 30,
      "archived_tasks": 28,
      "shared_posts": 12,
      "comments": 5
    }
  }
  ```

#### PATCH `/profiles/me`

All fields are optional; only fields present in the body are updated.

Request:

```json
{ "display_name": "Alice", "bio": "Productivity nerd." }
```

- **200 OK** — returns the updated profile
- **422 Unprocessable Entity** — `VALIDATION_ERROR` (e.g. bio over 500 chars)

#### GET `/profiles/{username}`

Public view of another user. Returns only public information — no email, no archive count, only the **publicly shared** post count.

- **200 OK**

  ```json
  {
    "id": 9,
    "username": "bob",
    "display_name": "Bob",
    "bio": "Studying CITS5505.",
    "created_at": "2026-03-02T09:00:00Z",
    "public_stats": {
      "shared_posts": 8
    }
  }
  ```

- **404 Not Found** — `USER_NOT_FOUND`

> Note: the user's public posts are not embedded in this response. The Feed page should call `GET /feed?author={username}` to paginate them properly.

------

### 5.3 Tasks

All task endpoints operate on tasks **owned by the logged-in user**. A user can never see or modify another user's tasks through this group of endpoints — sharing is opt-in and goes through `/posts` (§5.5).

| Method | Path                     | Auth | Purpose                      |
| ------ | ------------------------ | ---- | ---------------------------- |
| GET    | `/tasks`                 | 🔒    | List the user's active tasks |
| POST   | `/tasks`                 | 🔒    | Create a task                |
| GET    | `/tasks/{id}`            | 🔒    | Get one task                 |
| PATCH  | `/tasks/{id}`            | 🔒    | Edit a task                  |
| DELETE | `/tasks/{id}`            | 🔒    | Permanently delete a task    |
| POST   | `/tasks/{id}/complete`   | 🔒    | Mark task completed          |
| POST   | `/tasks/{id}/uncomplete` | 🔒    | Revert completion            |
| POST   | `/tasks/{id}/archive`    | 🔒    | Move task to archive         |

#### GET `/tasks`

Query parameters:

| Param       | Type                           | Default       | Description                                           |
| ----------- | ------------------------------ | ------------- | ----------------------------------------------------- |
| `status`    | `active` | `completed` | `all` | `active`      | Filter by completion. `active` excludes archived.     |
| `q`         | string                         | —             | Case-insensitive substring match on title/description |
| `page`      | int                            | 1             | See §8                                                |
| `page_size` | int                            | 20            | Max 100                                               |
| `sort`      | string                         | `-created_at` | See §8                                                |

`active` returns tasks that are **not archived**, regardless of `is_completed`. Use the Archive endpoints (§5.4) to list archived tasks.

- **200 OK**

  ```json
  {
    "items": [
      {
        "id": 17,
        "title": "Buy groceries",
        "description": "Milk, eggs, bread",
        "is_completed": false,
        "is_archived": false,
        "due_at": "2026-05-03T17:00:00Z",
        "created_at": "2026-05-01T08:30:00Z",
        "updated_at": "2026-05-01T08:30:00Z",
        "completed_at": null
      }
    ],
    "page": 1,
    "page_size": 20,
    "total": 1
  }
  ```

#### POST `/tasks`

Request:

```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "due_at": "2026-05-03T17:00:00Z"
}
```

- `title`: required, 1–200 chars
- `description`: optional, ≤ 2000 chars
- `due_at`: optional ISO-8601 timestamp

Responses:

- **201 Created** — returns the new task
- **422** — `VALIDATION_ERROR`

#### GET `/tasks/{id}`

- **200 OK** — task object
- **404** — `TASK_NOT_FOUND`
- **403** — `FORBIDDEN` (task belongs to another user)

#### PATCH `/tasks/{id}`

Partial update. Only fields present are updated. Same validation rules as `POST /tasks`. `is_completed` and `is_archived` are **not** mutable through this endpoint — use the dedicated action endpoints below.

- **200 OK** — updated task

#### DELETE `/tasks/{id}`

Permanent deletion. If the task has been shared as a public post, that post and its comments are also deleted (cascade). The frontend should warn the user before calling this when `shared_post_id` is set.

- **204 No Content**

#### POST `/tasks/{id}/complete`

No request body. Sets `is_completed = true` and `completed_at = now()`. Idempotent: calling twice returns the same result.

- **200 OK** — updated task
- **409** — `TASK_ALREADY_ARCHIVED` if the task is already in the archive (an archived task cannot have its completion state toggled directly; restore it first)

#### POST `/tasks/{id}/uncomplete`

Reverts a completion. Disallowed if the task has already been shared as a public post — the user must delete the post first.

- **200 OK**
- **409** — `TASK_ALREADY_SHARED`

#### POST `/tasks/{id}/archive`

Sets `is_archived = true`. Per the project flow ("completed task is moved to archive"), the server enforces that **only completed tasks can be archived**.

- **200 OK** — updated task
- **409** — `TASK_NOT_COMPLETED`

------

### 5.4 Archive

The archive is just a view of tasks where `is_archived = true`. These endpoints exist for clarity rather than for a different underlying table.

| Method | Path                    | Auth | Purpose                              |
| ------ | ----------------------- | ---- | ------------------------------------ |
| GET    | `/archive`              | 🔒    | List archived tasks                  |
| POST   | `/archive/{id}/restore` | 🔒    | Move an archived task back to active |
| DELETE | `/archive/{id}`         | 🔒    | Permanently delete an archived task  |

#### GET `/archive`

Same query parameters as `GET /tasks` except `status` is fixed to archived tasks only.

- **200 OK** — paginated list of archived tasks

#### POST `/archive/{id}/restore`

Sets `is_archived = false`. The task remains completed (it was completed before being archived).

- **200 OK** — restored task

#### DELETE `/archive/{id}`

Same effect as `DELETE /tasks/{id}` — kept here so the frontend "Archive page" can call a URL that matches its mental model.

- **204 No Content**

------

### 5.5 Posts (Shared Tasks)

A **post** is a snapshot of a completed task that the owner has chosen to share publicly. Snapshotting (rather than referencing the live task) means later edits to the task do not retroactively change the public post — this is important for trust on the social feed.

| Method | Path                | Auth | Purpose                                       |
| ------ | ------------------- | ---- | --------------------------------------------- |
| POST   | `/tasks/{id}/share` | 🔒    | Publish a completed task as a post            |
| GET    | `/posts/{post_id}`  | —    | View a single post                            |
| DELETE | `/posts/{post_id}`  | 🔒    | Unshare (delete the post; task is unaffected) |

#### POST `/tasks/{id}/share`

The task must belong to the requester and be `is_completed = true`. The user may add an optional caption.

Request:

```json
{ "caption": "Finally done with this!" }
```

- `caption`: optional, ≤ 280 chars

Responses:

- **201 Created** — returns the new post:

  ```json
  {
    "id": 5,
    "task_id": 17,
    "title_snapshot": "Buy groceries",
    "description_snapshot": "Milk, eggs, bread",
    "caption": "Finally done with this!",
    "author": {
      "id": 7,
      "username": "alice",
      "display_name": "Alice L."
    },
    "created_at": "2026-05-01T09:00:00Z",
    "comment_count": 0
  }
  ```

- **409** — `TASK_NOT_COMPLETED` or `TASK_ALREADY_SHARED`

#### GET `/posts/{post_id}`

Public — no auth needed. Returns the post object above.

- **200 OK**
- **404** — `POST_NOT_FOUND`

#### DELETE `/posts/{post_id}`

Only the post's author can delete. Cascade-deletes comments. The original task is not affected.

- **204 No Content**
- **403** — `FORBIDDEN`

------

### 5.6 Feed

| Method | Path    | Auth | Purpose             |
| ------ | ------- | ---- | ------------------- |
| GET    | `/feed` | —    | Browse public posts |

#### GET `/feed`

Query parameters:

| Param       | Type                         | Default       | Description                                                  |
| ----------- | ---------------------------- | ------------- | ------------------------------------------------------------ |
| `author`    | string (username)            | —             | Restrict to one author. Used by the Other-User Profile page. |
| `page`      | int                          | 1             | See §8                                                       |
| `page_size` | int                          | 20            | Max 100                                                      |
| `sort`      | `-created_at` | `created_at` | `-created_at` | Newest first by default                                      |

- **200 OK**

  ```json
  {
    "items": [
      {
        "id": 5,
        "title_snapshot": "Buy groceries",
        "caption": "Finally done with this!",
        "author": { "id": 7, "username": "alice", "display_name": "Alice L." },
        "created_at": "2026-05-01T09:00:00Z",
        "comment_count": 2
      }
    ],
    "page": 1,
    "page_size": 20,
    "total": 137
  }
  ```

> Note: `description_snapshot` is **omitted** from feed list responses to keep payloads small. Call `GET /posts/{id}` to load the full description.

------

### 5.7 Comments

| Method | Path                                     | Auth | Purpose                 |
| ------ | ---------------------------------------- | ---- | ----------------------- |
| GET    | `/posts/{post_id}/comments`              | —    | List comments on a post |
| POST   | `/posts/{post_id}/comments`              | 🔒    | Add a comment           |
| DELETE | `/posts/{post_id}/comments/{comment_id}` | 🔒    | Delete a comment        |

#### GET `/posts/{post_id}/comments`

Query parameters: `page`, `page_size` (default 50, max 200), `sort` (`created_at` ascending by default — comments read top-to-bottom in chronological order).

- **200 OK**

  ```json
  {
    "items": [
      {
        "id": 21,
        "post_id": 5,
        "body": "Nice work!",
        "author": { "id": 9, "username": "bob", "display_name": "Bob" },
        "created_at": "2026-05-01T09:05:00Z"
      }
    ],
    "page": 1,
    "page_size": 50,
    "total": 1
  }
  ```

#### POST `/posts/{post_id}/comments`

Request:

```json
{ "body": "Nice work!" }
```

- `body`: required, 1–1000 chars
- **201 Created** — returns the new comment
- **404** — `POST_NOT_FOUND`

#### DELETE `/posts/{post_id}/comments/{comment_id}`

Allowed if the requester is **either** the comment author **or** the post author (so post authors can moderate their own posts).

- **204 No Content**
- **403** — `FORBIDDEN`

------

### 5.8 Google Calendar (Optional)

Marked P3 — implement only after P1 + P2 are stable. OAuth is handled outside the JSON API: the frontend redirects the browser to `/calendar/connect` (a regular HTTP GET, not Ajax) and the backend handles Google's redirect flow.

| Method | Path                         | Auth | Purpose                                     |
| ------ | ---------------------------- | ---- | ------------------------------------------- |
| GET    | `/calendar/connect`          | 🔒    | Browser redirect into the Google OAuth flow |
| POST   | `/calendar/disconnect`       | 🔒    | Revoke the stored Google credential         |
| GET    | `/calendar/status`           | 🔒    | Whether the user has a connected calendar   |
| POST   | `/tasks/{id}/calendar-event` | 🔒    | Create a Google Calendar event from a task  |
| DELETE | `/tasks/{id}/calendar-event` | 🔒    | Remove the linked event                     |

#### POST `/tasks/{id}/calendar-event`

Creates a calendar event with the task's title, description, and `due_at` as start time. Returns the linked event id.

Request:

```json
{ "duration_minutes": 30, "reminder_minutes_before": 15 }
```

Both fields optional (defaults: 30, 15).

- **201 Created**

  ```json
  { "task_id": 17, "google_event_id": "abcd1234", "html_link": "https://calendar.google.com/..." }
  ```

- **409** — `CALENDAR_NOT_CONNECTED` or `TASK_HAS_NO_DUE_DATE`

------

## 6. Data Models

> The schema below is the API-level shape. The actual SQLAlchemy models may add audit columns (`updated_at`, soft-delete flags) that are not exposed.

### 6.1 User

| Field           | Type           | Notes                                               |
| --------------- | -------------- | --------------------------------------------------- |
| `id`            | int            | Primary key                                         |
| `username`      | string         | Unique, 3–20 chars                                  |
| `email`         | string         | Unique. Never returned in public profile responses. |
| `password_hash` | string         | **Never** returned in any response                  |
| `display_name`  | string \| null | Defaults to `username` if null                      |
| `bio`           | string \| null | ≤ 500 chars                                         |
| `created_at`    | timestamp      |                                                     |

### 6.2 Task

| Field             | Type              | Notes                                                        |
| ----------------- | ----------------- | ------------------------------------------------------------ |
| `id`              | int               |                                                              |
| `user_id`         | int               | Owner                                                        |
| `title`           | string            | 1–200 chars                                                  |
| `description`     | string \| null    | ≤ 2000 chars                                                 |
| `is_completed`    | bool              |                                                              |
| `is_archived`     | bool              | Server enforces: archive ⇒ completed                         |
| `due_at`          | timestamp \| null |                                                              |
| `created_at`      | timestamp         |                                                              |
| `updated_at`      | timestamp         |                                                              |
| `completed_at`    | timestamp \| null | Set when `is_completed` flips to true                        |
| `shared_post_id`  | int \| null       | If non-null, the task has been shared. Editing/uncompleting is blocked. |
| `google_event_id` | string \| null    | Optional calendar link                                       |

### 6.3 Post

| Field                  | Type           | Notes                                       |
| ---------------------- | -------------- | ------------------------------------------- |
| `id`                   | int            |                                             |
| `task_id`              | int            | Source task at time of sharing              |
| `user_id`              | int            | Author. Denormalised for fast feed queries. |
| `title_snapshot`       | string         | Copied from task at share time              |
| `description_snapshot` | string \| null | Copied from task at share time              |
| `caption`              | string \| null | ≤ 280 chars                                 |
| `created_at`           | timestamp      |                                             |

### 6.4 Comment

| Field        | Type      | Notes        |
| ------------ | --------- | ------------ |
| `id`         | int       |              |
| `post_id`    | int       |              |
| `user_id`    | int       | Author       |
| `body`       | string    | 1–1000 chars |
| `created_at` | timestamp |              |

### 6.5 Entity-relationship overview

```
User 1 ────< Task 1 ───? Post 1 ────< Comment >──── 1 User
                              │
                              └─── 1 User (author, denormalised)
```

------

## 7. Error Reference

| HTTP | `code`                   | When                                                         |
| ---- | ------------------------ | ------------------------------------------------------------ |
| 400  | `MALFORMED_JSON`         | Request body is not valid JSON                               |
| 401  | `UNAUTHENTICATED`        | No session, or session expired                               |
| 401  | `INVALID_CREDENTIALS`    | Bad username/email or password on login                      |
| 403  | `FORBIDDEN`              | Authenticated but not the owner of the resource              |
| 404  | `USER_NOT_FOUND`         | `/profiles/{username}`                                       |
| 404  | `TASK_NOT_FOUND`         | Any `/tasks/{id}` route                                      |
| 404  | `POST_NOT_FOUND`         | Any `/posts/{id}` route                                      |
| 404  | `COMMENT_NOT_FOUND`      | Comment delete                                               |
| 409  | `USERNAME_TAKEN`         | Signup                                                       |
| 409  | `EMAIL_TAKEN`            | Signup                                                       |
| 409  | `TASK_NOT_COMPLETED`     | Trying to archive or share a non-completed task              |
| 409  | `TASK_ALREADY_ARCHIVED`  | Toggling completion on an archived task                      |
| 409  | `TASK_ALREADY_SHARED`    | Sharing twice, or uncompleting a shared task                 |
| 409  | `CALENDAR_NOT_CONNECTED` | Calendar action without OAuth connection                     |
| 409  | `TASK_HAS_NO_DUE_DATE`   | Calendar event from a task with no `due_at`                  |
| 422  | `VALIDATION_ERROR`       | Field-level validation failure. `details.field` indicates which. |
| 500  | `INTERNAL_ERROR`         | Unhandled server exception. The frontend should show a generic "Something went wrong" message. |

------

## 8. Pagination, Sorting, Filtering

### Pagination

All list endpoints accept `page` (1-indexed) and `page_size`. Defaults vary per endpoint and are documented above. The response always includes:

```json
{ "items": [ /* ... */ ], "page": 2, "page_size": 20, "total": 137 }
```

### Sorting

The `sort` query parameter is a comma-separated list of fields. A leading `-` indicates descending. Examples:

- `sort=-created_at` — newest first (default for feed and tasks)
- `sort=due_at,-created_at` — earliest due date first; ties broken by newest created

Each endpoint documents which fields are sortable. Requesting a non-sortable field returns `422 VALIDATION_ERROR`.

### Filtering

Filters are exposed as discrete query parameters (`status`, `author`, `q`) rather than a generic query language. Add new filters to this document before implementing them.

------

## 9. End-to-End Example

Walking through the project's "Suggested Main User Flow":

```
# 1. Sign up
POST /api/v1/auth/signup
{ "username": "alice", "email": "alice@example.com",
  "password": "S3cure!Pass", "password_confirm": "S3cure!Pass" }
→ 201, sets session cookie

# 2. Create a task
POST /api/v1/tasks
{ "title": "Finish CITS5505 checkpoint", "due_at": "2026-05-05T23:59:00Z" }
→ 201, returns task #17

# 3. Complete it
POST /api/v1/tasks/17/complete
→ 200, is_completed=true

# 4. Archive it
POST /api/v1/tasks/17/archive
→ 200, is_archived=true

# 5. Share it as a public post
POST /api/v1/tasks/17/share
{ "caption": "Done early for once." }
→ 201, returns post #5

# 6. Another user (Bob) browses the feed
GET /api/v1/feed
→ 200, post #5 is in items

# 7. Bob comments
POST /api/v1/posts/5/comments
{ "body": "Nice!" }
→ 201

# 8. Alice optionally syncs to Google Calendar (P3)
POST /api/v1/tasks/17/calendar-event
{ "reminder_minutes_before": 30 }
→ 201
```

------

