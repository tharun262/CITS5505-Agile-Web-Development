const API = "http://127.0.0.1:5000";
let currentProfile = {};

document.addEventListener("DOMContentLoaded", async () => {
  setupLogout();
  setupEditProfileForm();
  await loadProfilePage();
});

function setupLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      window.location.href = "login.html";
    }
  });
}

function setupEditProfileForm() {
  const modalEl = document.getElementById("editProfileModal");
  const form = document.getElementById("edit-profile-form");
  const errorBox = document.getElementById("edit-profile-error");

  if (!modalEl || !form) return;

  modalEl.addEventListener("show.bs.modal", () => {
    setInputValue("edit-username", currentProfile.username || "");
    setInputValue("edit-bio", currentProfile.bio || "");
    setInputValue("edit-location", currentProfile.location || "");

    if (errorBox) {
      errorBox.textContent = "";
      errorBox.classList.add("d-none");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      username: getInputValue("edit-username").trim(),
      bio: getInputValue("edit-bio").trim(),
      location: getInputValue("edit-location").trim()
    };

    try {
      const response = await fetch(`${API}/profiles/me`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      await loadProfilePage();
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = error.message;
        errorBox.classList.remove("d-none");
      } else {
        alert(error.message);
      }
    }
  });
}

async function loadProfilePage() {
  try {
    const meRes = await fetch(`${API}/profiles/me`, {
      credentials: "include"
    });

    if (!meRes.ok) {
      throw new Error("Failed to load current user");
    }

    const meData = await meRes.json();
    const currentUser = meData.profile || {};
    currentProfile = currentUser;

    const username = currentUser.username || "";

    setText("profile-name", username || "My profile");
    setText("profile-bio", currentUser.bio || "No bio provided yet.");
    setText(
      "profile-location",
      currentUser.location ? `📍 ${currentUser.location}` : "📍 Location not specified"
    );
    setText(
      "profile-joined",
      currentUser.created_at
        ? `Member since ${formatShortDate(currentUser.created_at)}`
        : "Member since recently"
    );

    const [completedRes, archivedRes, postsRes, requestsRes, friendsRes] = await Promise.all([
      fetch(`${API}/api/v1/tasks?status=completed`, { credentials: "include" }),
      fetch(`${API}/api/v1/tasks?status=archived`, { credentials: "include" }),
      fetch(`${API}/api/v1/feed?author=${encodeURIComponent(username)}`, { credentials: "include" }),
      fetch(`${API}/api/v1/friend-requests`, { credentials: "include" }),
      fetch(`${API}/api/v1/friends/${encodeURIComponent(username)}`, { credentials: "include" })
    ]);

    const completedData = completedRes.ok ? await safeJson(completedRes) : { tasks: [] };
    const archivedData = archivedRes.ok ? await safeJson(archivedRes) : { tasks: [] };
    const postsData = postsRes.ok ? await safeJson(postsRes) : { items: [] };
    const requestsData = requestsRes.ok ? await safeJson(requestsRes) : { incoming: [] };
    const friendsData = friendsRes.ok ? await safeJson(friendsRes) : { friends: [] };

    setText("completed-count", (completedData.tasks || []).length);
    setText("archived-count", (archivedData.tasks || []).length);
    setText("posts-count", (postsData.items || []).length);

    renderFriendRequests(requestsData.incoming || []);
    renderFriends(friendsData.friends || []);
    renderPosts(postsData.items || []);

    const banner = document.getElementById("profile-banner");
    if (banner) {
      const pendingCount = (requestsData.incoming || []).length;
      if (pendingCount > 0) {
        banner.textContent = `You have ${pendingCount} pending friend request${pendingCount !== 1 ? "s" : ""}.`;
        banner.classList.remove("d-none");
      } else {
        banner.classList.add("d-none");
      }
    }
  } catch (error) {
    console.error("Profile page error:", error);
    setFailureState("friend-requests-list", "Failed to load friend requests.");
    setFailureState("friends-list", "Failed to load friends.");
    setFailureState("profile-posts", "Failed to load posts.");
  }
}

function renderFriendRequests(requests) {
  const container = document.getElementById("friend-requests-list");
  if (!container) return;

  if (!requests.length) {
    container.innerHTML = `<p class="muted-text mb-0">No pending friend requests.</p>`;
    return;
  }

  container.innerHTML = requests.map(req => `
    <div class="friend-request-item">
      <div>
        <h3>${escapeHtml(req.sender_username || "Unknown user")}</h3>
        <p>Sent ${escapeHtml(formatDate(req.created_at))}</p>
      </div>
      <div class="friend-request-actions">
        <button class="btn btn-success rounded-pill fw-semibold" onclick="acceptFriendRequest(${req.id})">Accept</button>
        <button class="btn btn-outline-danger rounded-pill fw-semibold" onclick="rejectFriendRequest(${req.id})">Reject</button>
        <a href="user.html?username=${encodeURIComponent(req.sender_username || "")}" class="btn btn-outline-secondary rounded-pill fw-semibold">
          View Profile
        </a>
      </div>
    </div>
  `).join("");
}

function renderFriends(friends) {
  const container = document.getElementById("friends-list");
  if (!container) return;

  if (!friends.length) {
    container.innerHTML = `<p class="muted-text mb-0">You have no friends yet.</p>`;
    return;
  }

  container.innerHTML = friends.map(friend => `
    <div class="friend-card">
      <div class="friend-avatar">${escapeHtml((friend.username || "?").charAt(0).toUpperCase())}</div>
      <h3>${escapeHtml(friend.username)}</h3>
      <p class="friend-bio">${escapeHtml(friend.bio || "No bio yet.")}</p>
      <a href="user.html?username=${encodeURIComponent(friend.username)}" class="btn-friend-link">View Profile</a>
    </div>
  `).join("");
}

function renderPosts(posts) {
  const container = document.getElementById("profile-posts");
  if (!container) return;

  if (!posts.length) {
    container.innerHTML = `<p class="muted-text mb-0">You have not shared any public posts yet.</p>`;
    return;
  }

  container.innerHTML = posts.map(post => `
    <article class="profile-post-card">
      <h3>${escapeHtml(post.title_snapshot || "Shared task")}</h3>
      <p>${escapeHtml(post.caption || "No caption provided.")}</p>
      <small>${escapeHtml(formatDate(post.created_at))}</small>
    </article>
  `).join("");
}

async function acceptFriendRequest(requestId) {
  try {
    const response = await fetch(`${API}/api/v1/friend-requests/${requestId}/accept`, {
      method: "PATCH",
      credentials: "include"
    });

    const data = await safeJson(response);
    if (!response.ok) {
      throw new Error(data.error || "Failed to accept request");
    }

    await loadProfilePage();
    alert("Friend request accepted!");
  } catch (error) {
    alert("Error: " + error.message);
  }
}

async function rejectFriendRequest(requestId) {
  try {
    const response = await fetch(`${API}/api/v1/friend-requests/${requestId}/reject`, {
      method: "PATCH",
      credentials: "include"
    });

    const data = await safeJson(response);
    if (!response.ok) {
      throw new Error(data.error || "Failed to reject request");
    }

    await loadProfilePage();
    alert("Friend request rejected.");
  } catch (error) {
    alert("Error: " + error.message);
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || "";
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

function setFailureState(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<p class="muted-text mb-0">${escapeHtml(text)}</p>`;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function formatShortDate(value) {
  if (!value) return "recently";
  const d = new Date(ensureUtc(value));
  return Number.isNaN(d.getTime()) ? "recently" : d.toLocaleDateString();
}

function formatDate(value) {
  if (!value) return "Recently";

  const d = new Date(ensureUtc(value));
  if (Number.isNaN(d.getTime())) return "Recently";

  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return d.toLocaleDateString();
}

function ensureUtc(value) {
  if (
    typeof value === "string" &&
    !value.endsWith("Z") &&
    !value.match(/[+-]\d{2}:\d{2}$/)
  ) {
    return `${value}Z`;
  }
  return value;
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"]/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[m]));
}