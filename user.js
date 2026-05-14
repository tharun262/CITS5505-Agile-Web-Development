const API = "http://127.0.0.1:5000";

let currentUser = null;
let viewedUser = null;
let relationshipStatus = "not_friends";
let relationshipRequestId = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadUserProfile();
  setupMessageModal();
  bindRelationshipButtons();
  await loadIncomingRequests();
});

function setupMessageModal() {
  const messageModalEl = document.getElementById("messageModal");
  const messageForm = document.getElementById("message-form");
  const messageBtn = document.getElementById("message-btn");

  if (!messageModalEl) return;

  const messageModal = bootstrap.Modal.getOrCreateInstance(messageModalEl);

  if (messageBtn) {
    messageBtn.addEventListener("click", () => {
      if (!viewedUser) return;
      document.getElementById("modal-recipient-name").textContent = viewedUser.username || "";
      messageModal.show();
    });
  }

  messageModalEl.addEventListener("shown.bs.modal", () => {
    const input = document.getElementById("message-text");
    if (input) input.focus();
  });

  if (messageForm) {
    messageForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const message = document.getElementById("message-text").value.trim();

      if (!message || !viewedUser) {
        alert("Message cannot be empty.");
        return;
      }

      try {
        const response = await fetch(`${API}/api/v1/messages`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            recipient_id: viewedUser.id,
            content: message
          })
        });

        const data = await safeJson(response);

        if (!response.ok) {
          throw new Error(data.error || "Failed to send message");
        }

        alert("Message sent successfully!");
        messageForm.reset();
        messageModal.hide();
      } catch (error) {
        alert("Error sending message: " + error.message);
      }
    });
  }
}

function bindRelationshipButtons() {
  const addBtn = document.getElementById("add-friend-btn");
  const acceptBtn = document.getElementById("accept-friend-btn");
  const rejectBtn = document.getElementById("reject-friend-btn");
  const removeBtn = document.getElementById("remove-friend-btn");

  if (addBtn) {
    addBtn.addEventListener("click", handleSendFriendRequest);
  }

  if (acceptBtn) {
    acceptBtn.addEventListener("click", handleAcceptFriendRequest);
  }

  if (rejectBtn) {
    rejectBtn.addEventListener("click", handleRejectFriendRequest);
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", handleRemoveFriend);
  }
}

async function loadUserProfile() {
  const params = new URLSearchParams(window.location.search);
  const username = params.get("username");
  const postsContainer = document.getElementById("user-posts");

  if (!username) {
    postsContainer.innerHTML = `<p class="muted-text">No username provided. Open this page with ?username=alice</p>`;
    return;
  }

  try {
    const meRes = await fetch(`${API}/auth/me`, {
      credentials: "include"
    });

    if (meRes.ok) {
      const meData = await meRes.json();
      currentUser = meData.user;
    }

    const [profileRes, feedRes, friendsRes, statusRes] = await Promise.all([
      fetch(`${API}/profiles/${encodeURIComponent(username)}`, { credentials: "include" }),
      fetch(`${API}/api/v1/feed?author=${encodeURIComponent(username)}`, { credentials: "include" }),
      fetch(`${API}/api/v1/friends/${encodeURIComponent(username)}`, { credentials: "include" }),
      fetch(`${API}/api/v1/friends/status/${encodeURIComponent(username)}`, { credentials: "include" })
    ]);

    if (!profileRes.ok) throw new Error("Could not load user profile");
    if (!feedRes.ok) throw new Error("Could not load user posts");

    const profileData = await profileRes.json();
    viewedUser = profileData.profile;

    const feedData = await feedRes.json();
    const posts = feedData.items || [];

    const friendsData = friendsRes.ok ? await friendsRes.json() : { friends: [], count: 0 };
    const friends = friendsData.friends || [];
    const friendCount = friendsData.count || 0;

    const statusData = statusRes.ok ? await statusRes.json() : { status: "not_friends" };
    relationshipStatus = statusData.status || "not_friends";
    relationshipRequestId = statusData.request_id || null;

    document.getElementById("user-name").textContent = viewedUser.username || username;
    document.getElementById("user-summary").textContent =
      viewedUser.bio || `Viewing public posts shared by ${viewedUser.username || username}.`;

    document.getElementById("user-bio").textContent = viewedUser.bio || "No bio provided.";
    document.getElementById("user-location").textContent =
      viewedUser.location ? `📍 ${viewedUser.location}` : "📍 Location not specified";

    const joinedDate = viewedUser.created_at ? formatShortDate(viewedUser.created_at) : "Recently";
    document.getElementById("user-joined").textContent = `Member since ${joinedDate}`;
    document.getElementById("member-since").textContent = joinedDate;

    document.getElementById("friends-count").textContent = friendCount;
    document.getElementById("posts-count").textContent = posts.length;

    updateRelationshipUI();

    if (friends.length > 0) {
      document.getElementById("friends-section").style.display = "block";
      loadFriendsList(friends);
    } else {
      document.getElementById("friends-section").style.display = "none";
    }

    if (!posts.length) {
      postsContainer.innerHTML = `<p class="muted-text">This user has not shared any public posts yet.</p>`;
    } else {
      postsContainer.innerHTML = posts.map(post => `
        <article class="profile-post-card">
          <h3>${escapeHtml(post.title_snapshot || "Shared task")}</h3>
          <p>${escapeHtml(post.caption || "No caption provided.")}</p>
          <small>${escapeHtml(formatDate(post.created_at))}</small>
        </article>
      `).join("");
    }
  } catch (err) {
    postsContainer.innerHTML = `<p class="muted-text">Failed to load user profile: ${escapeHtml(err.message)}</p>`;
  }
}

function loadFriendsList(friends) {
  const friendsContainer = document.getElementById("user-friends");

  if (!friends.length) {
    friendsContainer.innerHTML = `<p class="muted-text">This user has no friends yet.</p>`;
    return;
  }

  friendsContainer.innerHTML = friends.map(friend => `
    <div class="friend-card">
      <div class="friend-avatar">${escapeHtml((friend.username || "?").charAt(0).toUpperCase())}</div>
      <h3>${escapeHtml(friend.username)}</h3>
      <p class="friend-bio">${escapeHtml(friend.bio || "No bio")}</p>
      <a href="user.html?username=${encodeURIComponent(friend.username)}" class="btn-friend-link">View Profile</a>
    </div>
  `).join("");
}

function updateRelationshipUI() {
  const addBtn = document.getElementById("add-friend-btn");
  const requestSentBtn = document.getElementById("request-sent-btn");
  const acceptBtn = document.getElementById("accept-friend-btn");
  const rejectBtn = document.getElementById("reject-friend-btn");
  const removeBtn = document.getElementById("remove-friend-btn");
  const messageBtn = document.getElementById("message-btn");
  const banner = document.getElementById("relationship-banner");

  const allButtons = [addBtn, requestSentBtn, acceptBtn, rejectBtn, removeBtn, messageBtn];
  allButtons.forEach(btn => btn && btn.classList.add("d-none"));

  banner.classList.add("d-none");
  banner.textContent = "";

  if (!currentUser || !viewedUser) return;

  if (currentUser.username === viewedUser.username) {
    return;
  }

  if (relationshipStatus === "friends") {
    removeBtn.classList.remove("d-none");
    messageBtn.classList.remove("d-none");
    banner.textContent = `You and ${viewedUser.username} are friends.`;
    banner.classList.remove("d-none");
    return;
  }

  if (relationshipStatus === "pending_sent") {
    requestSentBtn.classList.remove("d-none");
    banner.textContent = `Friend request sent to ${viewedUser.username}.`;
    banner.classList.remove("d-none");
    return;
  }

  if (relationshipStatus === "pending_received") {
    acceptBtn.classList.remove("d-none");
    rejectBtn.classList.remove("d-none");
    banner.textContent = `${viewedUser.username} sent you a friend request.`;
    banner.classList.remove("d-none");
    return;
  }

  addBtn.classList.remove("d-none");
  messageBtn.classList.remove("d-none");
}

async function loadIncomingRequests() {
  const section = document.getElementById("friend-requests-section");
  const list = document.getElementById("friend-requests-list");

  if (!section || !list) return;

  try {
    const response = await fetch(`${API}/api/v1/friend-requests`, {
      credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) throw new Error(data.error || "Failed to load requests");

    const incoming = data.incoming || [];

    if (!incoming.length) {
      list.innerHTML = `<p class="muted-text mb-0">No pending friend requests.</p>`;
      return;
    }

    list.innerHTML = incoming.map(req => `
      <div class="friend-request-item">
        <div>
          <h3>${escapeHtml(req.sender_username || "Unknown user")}</h3>
          <p>Sent ${escapeHtml(formatDate(req.created_at))}</p>
        </div>
        <div class="friend-request-actions">
          <button class="btn btn-success rounded-pill fw-semibold" onclick="acceptFriendRequestById(${req.id})">Accept</button>
          <button class="btn btn-outline-danger rounded-pill fw-semibold" onclick="rejectFriendRequestById(${req.id})">Reject</button>
        </div>
      </div>
    `).join("");
  } catch (error) {
    list.innerHTML = `<p class="muted-text mb-0">Failed to load friend requests.</p>`;
  }
}

async function handleSendFriendRequest() {
  if (!viewedUser) return;

  try {
    const response = await fetch(`${API}/api/v1/friend-requests`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        friend_username: viewedUser.username
      })
    });

    const data = await safeJson(response);

    if (!response.ok) {
      throw new Error(data.error || "Failed to send friend request");
    }

    relationshipStatus = "pending_sent";
    relationshipRequestId = data.request ? data.request.id : null;
    updateRelationshipUI();
    await loadIncomingRequests();
    alert(`Friend request sent to ${viewedUser.username}!`);
  } catch (error) {
    alert("Error: " + error.message);
  }
}

async function handleAcceptFriendRequest() {
  if (!relationshipRequestId) {
    alert("No pending request found.");
    return;
  }

  try {
    const response = await fetch(`${API}/api/v1/friend-requests/${relationshipRequestId}/accept`, {
      method: "PATCH",
      credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
      throw new Error(data.error || "Failed to accept request");
    }

    relationshipStatus = "friends";
    relationshipRequestId = null;
    updateRelationshipUI();
    await loadIncomingRequests();
    await loadUserProfile();
    alert("Friend request accepted!");
  } catch (error) {
    alert("Error: " + error.message);
  }
}

async function handleRejectFriendRequest() {
  if (!relationshipRequestId) {
    alert("No pending request found.");
    return;
  }

  try {
    const response = await fetch(`${API}/api/v1/friend-requests/${relationshipRequestId}/reject`, {
      method: "PATCH",
      credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
      throw new Error(data.error || "Failed to reject request");
    }

    relationshipStatus = "not_friends";
    relationshipRequestId = null;
    updateRelationshipUI();
    await loadIncomingRequests();
    alert("Friend request rejected.");
  } catch (error) {
    alert("Error: " + error.message);
  }
}

async function handleRemoveFriend() {
  if (!viewedUser) return;
  if (!confirm(`Remove ${viewedUser.username} from friends?`)) return;

  try {
    const response = await fetch(`${API}/api/v1/friends/${encodeURIComponent(viewedUser.username)}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
      throw new Error(data.error || "Failed to remove friend");
    }

    relationshipStatus = "not_friends";
    relationshipRequestId = null;
    updateRelationshipUI();
    await loadUserProfile();
    alert(`${viewedUser.username} removed from friends.`);
  } catch (error) {
    alert("Error: " + error.message);
  }
}

async function acceptFriendRequestById(requestId) {
  try {
    const response = await fetch(`${API}/api/v1/friend-requests/${requestId}/accept`, {
      method: "PATCH",
      credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
      throw new Error(data.error || "Failed to accept request");
    }

    if (viewedUser && data.request && data.request.sender_id === viewedUser.id) {
      relationshipStatus = "friends";
      relationshipRequestId = null;
      updateRelationshipUI();
      await loadUserProfile();
    }

    await loadIncomingRequests();
  } catch (error) {
    alert("Error: " + error.message);
  }
}

async function rejectFriendRequestById(requestId) {
  try {
    const response = await fetch(`${API}/api/v1/friend-requests/${requestId}/reject`, {
      method: "PATCH",
      credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
      throw new Error(data.error || "Failed to reject request");
    }

    if (viewedUser && relationshipRequestId === requestId) {
      relationshipStatus = "not_friends";
      relationshipRequestId = null;
      updateRelationshipUI();
    }

    await loadIncomingRequests();
  } catch (error) {
    alert("Error: " + error.message);
  }
}

function formatShortDate(value) {
  if (!value) return "Recently";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Recently" : d.toLocaleDateString();
}

function formatDate(value) {
  if (!value) return "Recently";

  let safeValue = value;
  if (
    typeof safeValue === "string" &&
    !safeValue.endsWith("Z") &&
    !safeValue.match(/[+-]\d{2}:\d{2}$/)
  ) {
    safeValue += "Z";
  }

  const d = new Date(safeValue);
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

  return d.toLocaleString();
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"]/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[m]));
}