let currentFilter = "all";
let currentConversationUser = null;
let currentUserId = null;

document.addEventListener("DOMContentLoaded", () => {
  initMessageModals();
  loadCurrentUser();
  loadMessages();
  setInterval(loadMessages, 30000);
  setupFilterListeners();
});

function initMessageModals() {
  const newMessageModalEl = document.getElementById("newMessageModal");
  const conversationModalEl = document.getElementById("conversationModal");

  if (newMessageModalEl && newMessageModalEl.parentElement !== document.body) {
    document.body.appendChild(newMessageModalEl);
  }

  if (conversationModalEl && conversationModalEl.parentElement !== document.body) {
    document.body.appendChild(conversationModalEl);
  }

  if (newMessageModalEl) {
    newMessageModalEl.addEventListener("hidden.bs.modal", () => {
      const recipientInput = document.getElementById("recipientUsername");
      const messageInput = document.getElementById("messageContent");
      if (recipientInput) recipientInput.blur();
      if (messageInput) messageInput.blur();
      cleanupModalArtifacts();
    });
  }

  if (conversationModalEl) {
    conversationModalEl.addEventListener("hidden.bs.modal", () => {
      const replyInput = document.getElementById("replyContent");
      if (replyInput) replyInput.blur();
      cleanupModalArtifacts();
    });
  }
}

function cleanupModalArtifacts() {
  const anyModalOpen = document.querySelector(".modal.show");
  if (!anyModalOpen) {
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
    document.querySelectorAll(".modal-backdrop").forEach((el, index) => {
      if (index > 0 || !document.querySelector(".modal.show")) {
        el.remove();
      }
    });
  }
}

async function loadCurrentUser() {
  try {
    const response = await fetch("http://127.0.0.1:5000/auth/me", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      const userData = await response.json();
      currentUserId = userData.user ? userData.user.id : null;
    }
  } catch (err) {
    console.error("Error loading current user:", err);
  }
}

function getCurrentUserId() {
  return currentUserId;
}

function setupFilterListeners() {
  const filterButtons = document.querySelectorAll('input[name="messageFilter"]');
  filterButtons.forEach((button) => {
    button.addEventListener("change", (e) => {
      currentFilter = e.target.id.replace("filter", "").toLowerCase();
      loadMessages();
    });
  });
}

async function loadMessages() {
  try {
    const url =
      currentFilter === "all"
        ? "http://127.0.0.1:5000/api/v1/messages"
        : `http://127.0.0.1:5000/api/v1/messages?filter=${currentFilter}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error("Failed to load messages");
      return;
    }

    const data = await response.json();
    renderMessages(data.messages || []);
    updateUnreadCount(data.messages || []);
  } catch (err) {
    console.error("Error loading messages:", err);
  }
}

function renderMessages(messages) {
  const container = document.getElementById("messagesList");
  if (!container) return;

  if (!messages || messages.length === 0) {
    container.innerHTML = `<p class="text-muted">No messages found</p>`;
    return;
  }

  container.innerHTML = "";

  messages.forEach((message) => {
    const messageDiv = document.createElement("div");
    messageDiv.className = "card mb-2";

    const isReceived = Number(message.recipient_id) === Number(getCurrentUserId());
    const otherUser = isReceived ? message.sender_username : message.recipient_username;

    messageDiv.innerHTML = `
      <div class="card-body p-3">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="d-flex align-items-center mb-2 flex-wrap gap-2">
              <strong>${escapeHtml(otherUser || "Unknown User")}</strong>
              <span class="badge bg-secondary">${isReceived ? "Received" : "Sent"}</span>
              ${(!message.is_read && isReceived) ? `<span class="badge bg-primary">Unread</span>` : ""}
            </div>
            <p class="mb-2">${escapeHtml(message.content || "")}</p>
            <small class="text-muted">${formatDate(message.created_at)}</small>
          </div>
          <div class="btn-group btn-group-sm ms-3">
            <button
              class="btn btn-outline-primary"
              type="button"
              onclick="viewConversation('${escapeJsString(otherUser || "")}')"
              aria-label="Open conversation"
            >
              <i class="bi bi-chat"></i>
            </button>
            ${(isReceived && !message.is_read) ? `
              <button
                class="btn btn-outline-success"
                type="button"
                onclick="markAsRead(${message.id})"
                aria-label="Mark as read"
              >
                <i class="bi bi-check2"></i>
              </button>
            ` : ""}
            ${(!isReceived) ? `
              <button
                class="btn btn-outline-danger"
                type="button"
                onclick="deleteMessage(${message.id})"
                aria-label="Delete message"
              >
                <i class="bi bi-trash"></i>
              </button>
            ` : ""}
          </div>
        </div>
      </div>
    `;

    container.appendChild(messageDiv);
  });
}

function updateUnreadCount(messages) {
  const unreadMessages = messages.filter(
    (m) => !m.is_read && Number(m.recipient_id) === Number(getCurrentUserId())
  );
  const countElement = document.getElementById("unreadCount");
  if (!countElement) return;

  if (unreadMessages.length > 0) {
    countElement.textContent = unreadMessages.length;
    countElement.style.display = "inline-block";
  } else {
    countElement.textContent = "0";
    countElement.style.display = "none";
  }
}

function showNewMessageModal() {
  const modalElement = document.getElementById("newMessageModal");
  if (!modalElement) return;

  cleanupModalArtifacts();
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  modal.show();
}

async function sendMessage() {
  const recipientInput = document.getElementById("recipientUsername");
  const contentInput = document.getElementById("messageContent");

  const recipientUsername = recipientInput ? recipientInput.value.trim() : "";
  const content = contentInput ? contentInput.value.trim() : "";

  if (!recipientUsername || !content) {
    alert("Recipient and message content are required");
    return;
  }

  try {
    const userResponse = await fetch(
      `http://127.0.0.1:5000/api/v1/users/lookup/${encodeURIComponent(recipientUsername)}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (!userResponse.ok) {
      alert("User not found");
      return;
    }

    const userData = await userResponse.json();
    const recipientId = userData.id;

    const messageResponse = await fetch("http://127.0.0.1:5000/api/v1/messages", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recipient_id: recipientId,
        content: content
      })
    });

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}));
      alert(errorData.error || "Failed to send message");
      return;
    }

    if (recipientInput) recipientInput.value = "";
    if (contentInput) contentInput.value = "";

    const modalElement = document.getElementById("newMessageModal");
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }

    setTimeout(() => {
      cleanupModalArtifacts();
      loadMessages();
    }, 300);
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

async function viewConversation(username) {
  currentConversationUser = username;

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/v1/messages/conversation/${encodeURIComponent(username)}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      alert("Failed to load conversation");
      return;
    }

    const data = await response.json();
    renderConversation(data.messages || []);

    const modalElement = document.getElementById("conversationModal");
    const titleElement = document.getElementById("conversationTitle");

    if (titleElement) {
      titleElement.textContent = `Conversation with ${username}`;
    }

    cleanupModalArtifacts();
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
  } catch (err) {
    console.error("Conversation error:", err);
    alert("Network error");
  }
}

function renderConversation(messages) {
  const container = document.getElementById("conversationMessages");
  if (!container) return;

  container.innerHTML = "";

  if (!messages || messages.length === 0) {
    container.innerHTML = `<p class="text-muted">No messages in this conversation</p>`;
    return;
  }

  messages.forEach((message) => {
    const isReceived = Number(message.recipient_id) === Number(getCurrentUserId());
    const messageDiv = document.createElement("div");
    messageDiv.className = `mb-3 ${isReceived ? "text-start" : "text-end"}`;

    messageDiv.innerHTML = `
      <div class="d-inline-block" style="max-width: 75%;">
        <div class="card ${isReceived ? "bg-light" : "bg-primary text-white"}">
          <div class="card-body p-2">
            <p class="mb-1">${escapeHtml(message.content || "")}</p>
            <small class="${isReceived ? "text-muted" : "text-white-50"}">
              ${formatDate(message.created_at)}
            </small>
          </div>
        </div>
      </div>
    `;

    container.appendChild(messageDiv);
  });

  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

async function sendReply() {
  const replyInput = document.getElementById("replyContent");
  const content = replyInput ? replyInput.value.trim() : "";

  if (!content || !currentConversationUser) return;

  try {
    const userResponse = await fetch(
      `http://127.0.0.1:5000/api/v1/users/lookup/${encodeURIComponent(currentConversationUser)}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (!userResponse.ok) {
      alert("User not found");
      return;
    }

    const userData = await userResponse.json();
    const recipientId = userData.id;

    const messageResponse = await fetch("http://127.0.0.1:5000/api/v1/messages", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recipient_id: recipientId,
        content: content
      })
    });

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}));
      alert(errorData.error || "Failed to send reply");
      return;
    }

    if (replyInput) replyInput.value = "";
    await viewConversation(currentConversationUser);
    loadMessages();
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

async function markAsRead(messageId) {
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/v1/messages/${messageId}/read`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      loadMessages();
    }
  } catch (err) {
    console.error("Error marking message as read:", err);
  }
}

async function deleteMessage(messageId) {
  if (!confirm("Delete this message?")) return;

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/v1/messages/${messageId}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (response.ok) {
      loadMessages();
    } else {
      alert("Failed to delete message");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

function closeConversationModal() {
  const modalElement = document.getElementById("conversationModal");
  if (!modalElement) return;

  const modal = bootstrap.Modal.getInstance(modalElement);
  if (modal) {
    modal.hide();
    setTimeout(cleanupModalArtifacts, 300);
  }
}

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJsString(str) {
  if (str === null || str === undefined) return "";
  return str
    .toString()
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

function formatDate(dateString) {
  if (!dateString) return "";

  let safeDateString = dateString;

  if (
    typeof safeDateString === "string" &&
    !safeDateString.endsWith("Z") &&
    !safeDateString.match(/[+-]\d{2}:\d{2}$/)
  ) {
    safeDateString += "Z";
  }

  const date = new Date(safeDateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}
