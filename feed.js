const API = "http://127.0.0.1:5000/api/v1";
let currentUser = null;
let feedPosts = [];
const commentsCache = new Map();

document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();
  await loadFeed();
  setupLogout();
});

function setupLogout() {}

async function loadCurrentUser() {
  try {
    const res = await fetch("http://127.0.0.1:5000/auth/me", {
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      currentUser = data.user || null;
    }
  } catch {}
}

async function loadFeed() {
  const container = document.getElementById("feed-container");
  if (!container) return;

  container.innerHTML = `<p class="text-muted text-center pt-5">Loading feed...</p>`;

  try {
    const res = await fetch(`${API}/feed`, { credentials: "include" });

    if (!res.ok) {
      container.innerHTML = `<p class="text-danger text-center pt-5">Failed to load feed.</p>`;
      return;
    }

    const data = await res.json();
    let posts = Array.isArray(data.items) ? data.items : [];

    posts = posts.map((post) => ({
      ...post,
      like_count: Number(post.like_count || 0),
      comment_count: Number(post.comment_count || 0),
      liked_by_me: Boolean(post.liked_by_me),
    }));

    await Promise.all(
      posts.map(async (post) => {
        const comments = await fetchComments(post.id);
        post.comment_count = comments.length;
      })
    );

    posts.sort(comparePostsByEngagement);
    feedPosts = posts;

    if (feedPosts.length === 0) {
      container.innerHTML = `<p class="text-muted text-center pt-5">No posts yet. Share a completed task from the Notes page!</p>`;
      return;
    }

    container.innerHTML = "";
    for (const post of feedPosts) {
      container.appendChild(renderPost(post));
    }

    await Promise.all(
      feedPosts.map((post) => loadCommentsIntoDom(post.id, getPostAuthorId(post)))
    );
  } catch (err) {
    container.innerHTML = `<p class="text-danger text-center pt-5">Network error: ${escapeHtml(err.message)}</p>`;
  }
}

function comparePostsByEngagement(a, b) {
  const aScore = Number(a.like_count || 0) + Number(a.comment_count || 0);
  const bScore = Number(b.like_count || 0) + Number(b.comment_count || 0);

  if (bScore !== aScore) return bScore - aScore;

  const aTime = new Date(a.created_at || 0).getTime();
  const bTime = new Date(b.created_at || 0).getTime();
  return bTime - aTime;
}

function getPostAuthorId(post) {
  return post.user_id ?? post.author?.id ?? 0;
}

function renderPost(post) {
  const wrapper = document.createElement("div");
  wrapper.className = "card feed-post bg-white mb-4";
  wrapper.id = `post-${post.id}`;
  wrapper.dataset.authorId = getPostAuthorId(post);
  wrapper.dataset.authorUsername = post.author?.username ?? "";

  const author = post.author || {};
  const authorName = escapeHtml(author.display_name || author.username || "anonymous");
  const authorUsername = author.username || "";
  const title = escapeHtml(post.title_snapshot || "");
  const caption = post.caption ? escapeHtml(post.caption) : "";
  const createdAt = formatDate(post.created_at);
  const likes = Number(post.like_count || 0);
  const comments = Number(post.comment_count || 0);
  const liked = Boolean(post.liked_by_me);

  let imageHtml = "";
  if (post.image_data) {
    imageHtml = `
      <img
        src="${escapeHtml(getDisplayImageSrc(post.image_data))}"
        alt="Post image"
        class="img-fluid rounded-4 mb-3"
        style="max-height: 320px; width: 100%; object-fit: cover;"
      >
    `;
  }

  wrapper.innerHTML = `
    <div class="card-body">
      <div class="d-flex align-items-start justify-content-between gap-3 mb-3">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-person-circle fs-3 text-secondary"></i>
          <div>
            <div class="fw-semibold">
              <a
                href="user.html?username=${encodeURIComponent(authorUsername)}"
                class="text-decoration-none text-dark feed-author-link"
              >
                ${authorName}
              </a>
            </div>
            <div class="post-meta-line">${escapeHtml(createdAt)}</div>
          </div>
        </div>
      </div>

      <h2 class="post-title fw-bold mb-2">${title}</h2>

      ${imageHtml}

      ${caption ? `<p class="post-caption text-secondary mb-3">${caption}</p>` : ""}

      <div class="engagement-bar">
        <div class="engagement-stats">
          <span><i class="bi bi-heart-fill me-1 text-danger"></i><span id="like-count-${post.id}">${likes}</span></span>
          <span><i class="bi bi-chat-dots-fill me-1 text-warning"></i><span id="comment-count-${post.id}">${comments}</span></span>
        </div>

        <div class="engagement-actions">
          <button
            class="like-btn ${liked ? "liked" : ""}"
            id="like-btn-${post.id}"
            type="button"
            onclick="toggleLike(${post.id})"
          >
            <i class="bi ${liked ? "bi-heart-fill" : "bi-heart"} me-1"></i>
            ${liked ? "Liked" : "Like"}
          </button>
        </div>
      </div>

      <div class="comment-wrap mt-3">
        <div class="comment-list small mb-3" id="comments-${post.id}">
          <span class="text-muted">Loading comments...</span>
        </div>

        <form class="comment-composer d-flex gap-2" onsubmit="return submitComment(event, ${post.id})">
          <input
            type="text"
            class="form-control form-control-sm"
            placeholder="Write a comment..."
            maxlength="1000"
            required
          />
          <button type="submit" class="btn btn-sm btn-warning fw-bold px-3">Post</button>
        </form>
      </div>
    </div>
  `;

  return wrapper;
}

async function fetchComments(postId) {
  try {
    const res = await fetch(`${API}/posts/${postId}/comments`, {
      credentials: "include",
    });

    if (!res.ok) return [];

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    commentsCache.set(postId, items);
    return items;
  } catch {
    return [];
  }
}

async function loadCommentsIntoDom(postId, postAuthorId) {
  const list = document.getElementById(`comments-${postId}`);
  if (!list) return;

  try {
    const comments = await fetchComments(postId);

    const post = feedPosts.find((p) => p.id === postId);
    if (post) {
      post.comment_count = comments.length;
      updatePostCounters(postId, post.like_count || 0, comments.length);
    }

    if (comments.length === 0) {
      list.innerHTML = `<span class="text-muted">No comments yet. Be the first!</span>`;
      return;
    }

    list.innerHTML = "";
    comments.forEach((comment) => {
      list.appendChild(renderComment(comment, postId, postAuthorId));
    });
  } catch (err) {
    list.innerHTML = `<span class="text-danger">Error: ${escapeHtml(err.message)}</span>`;
  }
}

function renderComment(comment, postId, postAuthorId) {
  const row = document.createElement("div");
  row.className = "comment-row d-flex justify-content-between align-items-start py-2 border-bottom";

  const author = comment.author || {};
  const authorName = escapeHtml(author.display_name || author.username || "anonymous");
  const authorUsername = author.username || "";
  const body = escapeHtml(comment.body || "");
  const when = formatDate(comment.created_at);

  const canDelete =
    currentUser &&
    (currentUser.id === comment.author?.id || currentUser.id === postAuthorId);

  const deleteBtn = canDelete
    ? `
      <button
        class="btn btn-sm btn-link text-danger p-0 ms-2"
        onclick="deleteComment(${postId}, ${comment.id}, ${postAuthorId})"
        title="Delete"
      >
        <i class="bi bi-trash"></i>
      </button>
    `
    : "";

  row.innerHTML = `
    <div class="flex-grow-1 me-2">
      <div>
        <span class="fw-semibold">
          <a
            href="user.html?username=${encodeURIComponent(authorUsername)}"
            class="text-decoration-none text-dark feed-author-link"
          >
            ${authorName}
          </a>
        </span>
        <span class="text-muted small ms-2">${escapeHtml(when)}</span>
      </div>
      <div>${body}</div>
    </div>
    <div>${deleteBtn}</div>
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
      await loadFeed();
    } else {
      alert(data.error?.message || data.error || "Failed to post comment");
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
      await loadFeed();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error?.message || data.error || "Failed to delete");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

async function toggleLike(postId) {
  const post = feedPosts.find((p) => p.id === postId);
  if (!post) return;

  const isLiked = Boolean(post.liked_by_me);
  const method = isLiked ? "DELETE" : "POST";

  try {
    const res = await fetch(`${API}/posts/${postId}/like`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error?.message || data.error || "Failed to update like");
      return;
    }

    await loadFeed();
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

function updatePostCounters(postId, likeCount, commentCount) {
  const likeEl = document.getElementById(`like-count-${postId}`);
  const commentEl = document.getElementById(`comment-count-${postId}`);

  if (likeEl) likeEl.textContent = String(likeCount);
  if (commentEl) commentEl.textContent = String(commentCount);
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function getDisplayImageSrc(imageData) {
  if (!imageData) return "";
  if (imageData.startsWith("data:")) return imageData;
  return `data:image/png;base64,${imageData}`;
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