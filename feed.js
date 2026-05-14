// feed.js — feed page with inline comments per post

const API = "http://127.0.0.1:5000/api/v1";
let currentUser = null; // {id, username, ...} — set on load

document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();
  await loadFeed();
  setupLogout();
});

function setupLogout() {
  // The logout functionality for all pages with profile button
  // Just need to ensure the button on feed.html has the onclick event
}

async function loadCurrentUser() {
  try {
    const res = await fetch("http://127.0.0.1:5000/auth/me", {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user || null;
    }
  } catch {
    /* auth-guard already handles redirect */
  }
}

async function loadFeed() {
  const container = document.getElementById("feed-container");
  try {
    const res = await fetch(`${API}/feed`, { credentials: "include" });
    if (!res.ok) {
      container.innerHTML =
        '<p class="text-danger text-center pt-5">Failed to load feed.</p>';
      return;
    }
    const data = await res.json();
    const posts = data.items || [];

    if (posts.length === 0) {
      container.innerHTML =
        '<p class="text-muted text-center pt-5">No posts yet. Share a completed task from the Notes page!</p>';
      return;
    }

    container.innerHTML = "";
    for (const post of posts) {
      container.appendChild(renderPost(post));
    }

    // Load comments for each post in parallel
    posts.forEach((p) => loadComments(p.id, p.user_id));
  } catch (err) {
    container.innerHTML = `<p class="text-danger text-center pt-5">Network error: ${escapeHtml(err.message)}</p>`;
  }
}

function renderPost(post) {
  const wrapper = document.createElement("div");
  wrapper.className = "card note-card bg-white mb-4";
  wrapper.id = `post-${post.id}`;
  wrapper.dataset.authorId = post.user_id ?? post.author?.id ?? "";
  wrapper.dataset.authorUsername = post.author?.username ?? ""; // NEW

  const author = post.author || {};
  const authorName = escapeHtml(author.display_name || author.username || "anonymous");
  const authorUsername = author.username; // NEW
  const title = escapeHtml(post.title_snapshot || "");
  const caption = post.caption ? escapeHtml(post.caption) : "";
  const createdAt = formatDate(post.created_at);

  // Handle image display
  let imageHtml = "";
  if (post.image_data) {
    imageHtml = `<img src="data:image/png;base64,${post.image_data}" alt="Post image" class="img-fluid rounded mb-3" style="max-height: 300px; width: 100%; object-fit: cover;">`;
  }

  wrapper.innerHTML = `
    <div class="card-body">
      <div class="d-flex align-items-center gap-2 mb-2">
        <i class="bi bi-person-circle fs-4 text-secondary"></i>
        <div>
          <div class="fw-semibold">
            <a href="user.html?username=${encodeURIComponent(authorUsername)}" class="text-decoration-none text-dark feed-author-link">
              ${authorName}
            </a>
          </div>
          <div class="small text-muted">${createdAt}</div>
        </div>
      </div>
      <h2 class="h6 fw-bold mb-2">${title}</h2>
      ${imageHtml}
      ${caption ? `<p class="text-secondary mb-3">${caption}</p>` : ""}
      <hr class="my-3" />
      <div class="comment-section">
        <div class="comment-list small mb-3" id="comments-${post.id}">
          <span class="text-muted">Loading comments...</span>
        </div>
        <form class="d-flex gap-2" onsubmit="return submitComment(event, ${post.id})">
          <input type="text" class="form-control form-control-sm" placeholder="Write a comment..." maxlength="1000" required />
          <button type="submit" class="btn btn-sm btn-warning fw-bold">Post</button>
        </form>
      </div>
    </div>
  `;
  return wrapper;
}

async function loadComments(postId, postAuthorId) {
  const list = document.getElementById(`comments-${postId}`);
  if (!list) return;
  try {
    const res = await fetch(`${API}/posts/${postId}/comments`, {
      credentials: "include",
    });
    if (!res.ok) {
      list.innerHTML = '<span class="text-danger">Failed to load comments.</span>';
      return;
    }
    const data = await res.json();
    const comments = data.items || [];

    if (comments.length === 0) {
      list.innerHTML = '<span class="text-muted">No comments yet. Be the first!</span>';
      return;
    }

    list.innerHTML = "";
    for (const c of comments) {
      list.appendChild(renderComment(c, postId, postAuthorId));
    }
  } catch (err) {
    list.innerHTML = `<span class="text-danger">Error: ${escapeHtml(err.message)}</span>`;
  }
}

function renderComment(comment, postId, postAuthorId) {
  const row = document.createElement("div");
  row.className = "d-flex justify-content-between align-items-start py-1 border-bottom";

  const author = comment.author || {};
  const authorName = escapeHtml(author.display_name || author.username || "anonymous");
  const authorUsername = author.username; // NEW
  const body = escapeHtml(comment.body || "");
  const when = formatDate(comment.created_at);

  // Per spec §5.7: comment author OR post author can delete
  const canDelete =
    currentUser &&
    (currentUser.id === comment.author?.id || currentUser.id === postAuthorId);

  const deleteBtn = canDelete
    ? `<button class="btn btn-sm btn-link text-danger p-0 ms-2" onclick="deleteComment(${postId}, ${comment.id}, ${postAuthorId})" title="Delete">
         <i class="bi bi-trash"></i>
       </button>`
    : "";

  // NEW: Make comment author clickable
  row.innerHTML = `
    <div class="flex-grow-1 me-2">
      <span class="fw-semibold">
        <a href="user.html?username=${encodeURIComponent(authorUsername)}" class="text-decoration-none text-dark">
          ${authorName}
        </a>
      </span>
      <span class="text-muted small ms-2">${when}</span>
      <div>${body}</div>
    </div>
    ${deleteBtn}
  `;
  return row;
}

async function submitComment(event, postId) {
  event.preventDefault();
  const input = event.target.querySelector("input");
  const body = input.value.trim();
  if (!body) return false;

  try {
    const res = await fetch(`${API}/posts/${postId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (res.status === 201) {
      input.value = "";
      const postCard = document.getElementById(`post-${postId}`);
      const postAuthorId = parseInt(postCard?.dataset.authorId || "0", 10);
      loadComments(postId, postAuthorId);
    } else {
      alert(data.error?.message || "Failed to post comment");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
  return false;
}

async function deleteComment(postId, commentId, postAuthorId) {
  if (!confirm("Delete this comment?")) return;
  try {
    const res = await fetch(`${API}/posts/${postId}/comments/${commentId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.status === 204) {
      loadComments(postId, postAuthorId);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error?.message || "Failed to delete");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function escapeHtml(unsafe) {
  if (unsafe == null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}