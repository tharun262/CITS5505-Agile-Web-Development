let reminders = [];
let filteredReminders = [];
let countdownInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  fetchReminders();
  setupAddReminderButton();
  setupReminderForm();
  setupNotificationButton();
  setupSearch();
});

function setupAddReminderButton() {
  const addReminderCard = document.getElementById("addReminderCard");
  if (!addReminderCard) return;

  addReminderCard.style.cursor = "pointer";
  addReminderCard.addEventListener("click", () => {
    const modalEl = document.getElementById("addReminderModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  });
}

function setupReminderForm() {
  const form = document.getElementById("reminderForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("reminderTitle").value.trim();
    const description = document.getElementById("reminderDescription").value.trim();
    const dueAtValue = document.getElementById("reminderDueAt").value;

    if (!title || !dueAtValue) {
      alert("Title and reminder time are required.");
      return;
    }

    const payload = {
      title,
      description,
      due_at: new Date(dueAtValue).toISOString()
    };

    try {
      const response = await fetch("http://127.0.0.1:5000/api/v1/tasks", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMessage = "Failed to create reminder.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (_) {}
        alert(errorMessage);
        return;
      }

      form.reset();

      const modalEl = document.getElementById("addReminderModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      await fetchReminders();
    } catch (err) {
      console.error("Error creating reminder:", err);
      alert("Network error while creating reminder.");
    }
  });
}

function setupNotificationButton() {
  const btn = document.getElementById("enableNotificationsBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return;
    }

    if (Notification.permission === "granted") {
      alert("Notifications are already enabled.");
      return;
    }

    if (Notification.permission === "denied") {
      alert("Notifications are blocked in your browser settings.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      new Notification("KeepLite notifications enabled", {
        body: "You will now get reminder alerts."
      });
      window.KeepLiteReminderNotifications?.start();
    }
  });
}

function setupSearch() {
  const input = document.getElementById("searchRemindersInput");
  if (!input) return;

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();

    if (!query) {
      filteredReminders = [...reminders];
    } else {
      filteredReminders = reminders.filter((task) => {
        const title = (task.title || "").toLowerCase();
        const description = (task.description || "").toLowerCase();
        return title.includes(query) || description.includes(query);
      });
    }

    renderReminders(filteredReminders);
  });
}

async function fetchReminders() {
  try {
    const response = await fetch("http://127.0.0.1:5000/api/v1/tasks?page_size=100", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error("Failed to fetch tasks");
      renderReminders([]);
      return;
    }

    const data = await response.json();

    reminders = (data.items || [])
      .filter(task => task.due_at && !task.is_completed && !task.is_archived)
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

    filteredReminders = [...reminders];
    renderReminders(filteredReminders);
    startCountdowns();
  } catch (err) {
    console.error("Error fetching reminders:", err);
    renderReminders([]);
  }
}

function renderReminders(reminderList) {
  const container = document.getElementById("remindersGrid");
  if (!container) return;

  container.innerHTML = "";
  updateStats(reminderList);

  if (!reminderList.length) {
    container.innerHTML = `
      <div class="col-12">
        <div class="text-center text-muted" style="padding: 2rem;">
          <i class="bi bi-bell text-secondary opacity-50" style="font-size: 3rem;"></i>
          <h5 class="mt-2 fw-medium text-secondary">No upcoming reminders</h5>
          <p class="text-secondary">Create a reminder to see it here.</p>
        </div>
      </div>
    `;
    return;
  }

  const now = new Date();

  reminderList.forEach((task) => {
    const dueDate = new Date(task.due_at);
    const isOverdue = dueDate.getTime() < now.getTime();

    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-3";

    col.innerHTML = `
      <div class="card note-card h-100 ${isOverdue ? "border-danger" : ""}" ${!isOverdue ? 'style="background: #e8f0fe"' : 'style="background: #fff"'}>
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h2 class="h6 fw-bold mb-0">${escapeHtml(task.title || "Untitled")}</h2>

            <div class="dropdown">
              <button
                class="btn btn-sm btn-light rounded-circle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i class="bi bi-three-dots"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                <li>
                  <button class="dropdown-item archive-reminder-btn" data-id="${task.id}" type="button">
                    <i class="bi bi-archive me-2"></i>Archive
                  </button>
                </li>
                <li>
                  <button class="dropdown-item text-danger delete-reminder-btn" data-id="${task.id}" type="button">
                    <i class="bi bi-trash me-2"></i>Delete
                  </button>
                </li>
              </ul>
            </div>
          </div>

          ${isOverdue ? '<div class="alert alert-danger p-2 mb-2">Overdue</div>' : ""}
          <p class="text-secondary mb-3">${escapeHtml(task.description || "")}</p>

          <span class="badge rounded-pill ${isOverdue ? "bg-danger" : "bg-white text-dark shadow-sm"}">
            <i class="bi ${isOverdue ? "bi-clock" : "bi-calendar-event"} me-1"></i>
            ${escapeHtml(formatDueDate(dueDate))}
          </span>

          <div class="mt-3">
            <small
              class="fw-semibold ${isOverdue ? "text-danger" : "text-primary"} countdown-text"
              data-task-id="${task.id}"
              data-title="${escapeHtmlAttr(task.title || "Untitled")}"
              data-due-at="${task.due_at}"
            >
              ${escapeHtml(getCountdownText(dueDate))}
            </small>
          </div>
        </div>
      </div>
    `;

    container.appendChild(col);
  });

  bindReminderActions();
}

function bindReminderActions() {
  document.querySelectorAll(".archive-reminder-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const taskId = btn.getAttribute("data-id");
      if (!taskId) return;

      if (!confirm("Archive this reminder?")) return;

      try {
        const response = await fetch(`http://127.0.0.1:5000/api/v1/tasks/${taskId}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            is_archived: true
          })
        });

        if (!response.ok) {
          alert("Failed to archive reminder.");
          return;
        }

        reminders = reminders.filter(task => String(task.id) !== String(taskId));
        filteredReminders = filteredReminders.filter(task => String(task.id) !== String(taskId));
        renderReminders(filteredReminders);
      } catch (err) {
        console.error("Archive error:", err);
        alert("Network error while archiving reminder.");
      }
    });
  });

  document.querySelectorAll(".delete-reminder-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const taskId = btn.getAttribute("data-id");
      if (!taskId) return;

      if (!confirm("Delete this reminder?")) return;

      try {
        const response = await fetch(`http://127.0.0.1:5000/api/v1/tasks/${taskId}`, {
          method: "DELETE",
          credentials: "include"
        });

        if (!response.ok) {
          alert("Failed to delete reminder.");
          return;
        }

        reminders = reminders.filter(task => String(task.id) !== String(taskId));
        filteredReminders = filteredReminders.filter(task => String(task.id) !== String(taskId));
        renderReminders(filteredReminders);
      } catch (err) {
        console.error("Delete error:", err);
        alert("Network error while deleting reminder.");
      }
    });
  });
}

function startCountdowns() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  updateCountdowns();

  countdownInterval = setInterval(() => {
    updateCountdowns();
  }, 1000);
}

function updateCountdowns() {
  const elements = document.querySelectorAll(".countdown-text");

  elements.forEach((el) => {
    const dueAt = el.getAttribute("data-due-at");
    if (!dueAt) return;

    const dueDate = new Date(dueAt);
    const overdue = dueDate.getTime() <= Date.now();

    el.textContent = getCountdownText(dueDate);
    el.classList.toggle("text-danger", overdue);
    el.classList.toggle("text-primary", !overdue);

  });

  updateStats(filteredReminders);
}

function updateStats(reminderList) {
  const total = reminderList.length;
  const today = reminderList.filter(task => isToday(new Date(task.due_at))).length;
  const overdue = reminderList.filter(task => new Date(task.due_at).getTime() < Date.now()).length;
  const upcoming = total - overdue;

  setText("statTotal", total);
  setText("statToday", today);
  setText("statUpcoming", upcoming);
  setText("statOverdue", overdue);
}

function formatDueDate(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const check = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  if (check.getTime() === today.getTime()) {
    return `Today, ${time}`;
  } else if (check.getTime() === tomorrow.getTime()) {
    return `Tomorrow, ${time}`;
  } else {
    return `${date.toLocaleDateString()}, ${time}`;
  }
}

function getCountdownText(dueDate) {
  const diff = dueDate.getTime() - Date.now();

  if (diff <= 0) {
    const overdueMs = Math.abs(diff);
    const days = Math.floor(overdueMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((overdueMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `Overdue by ${days}d ${hours}h`;
    if (hours > 0) return `Overdue by ${hours}h ${mins}m`;
    return `Overdue by ${mins}m`;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h ${mins}m left`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s left`;
  if (mins > 0) return `${mins}m ${secs}s left`;
  return `${secs}s left`;
}

function isToday(date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeHtmlAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
