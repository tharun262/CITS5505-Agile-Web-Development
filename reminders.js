// reminders.js - Load and display task reminders

document.addEventListener("DOMContentLoaded", () => {
  fetchReminders();
  setupAddReminderButton();
  setupLogout();
});

async function setupLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("http://127.0.0.1:5000/auth/logout", {
        method: "POST",
        credentials: "include"
      });
      window.location.href = "login.html";
    });
  }
}

function setupAddReminderButton() {
  const addReminderCard = document.querySelector(".card.note-create");
  if (addReminderCard) {
    addReminderCard.addEventListener("click", () => {
      alert("Reminder feature coming soon! Create a task with a due date to set reminders.");
    });
    addReminderCard.style.cursor = "pointer";
  }
}

async function fetchReminders() {
  try {
    // Get upcoming tasks (tasks with due_at date in future)
    const response = await fetch("http://127.0.0.1:5000/api/v1/tasks?page_size=100", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch tasks");
      renderReminders([]);
      return;
    }

    const data = await response.json();
    const allTasks = data.items || [];
    
    // Filter tasks with due dates
    const now = new Date();
    const tasksWithDue = allTasks
      .filter(task => task.due_at && !task.is_completed)
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

    renderReminders(tasksWithDue);
  } catch (err) {
    console.error("Error fetching reminders:", err);
    renderReminders([]);
  }
}

function renderReminders(reminders) {
  const container = document.querySelector(".row.g-4");
  if (!container) return;

  // Clear any existing content
  container.innerHTML = "";

  if (reminders.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="text-center text-muted" style="padding: 2rem;">
          <i class="bi bi-bell text-secondary opacity-50" style="font-size: 3rem;"></i>
          <h5 class="mt-2 fw-medium text-secondary">No upcoming reminders</h5>
          <p class="text-secondary">Create a task with a due date to set reminders.</p>
        </div>
      </div>
    `;
    return;
  }

  const now = new Date();
  
  reminders.forEach((task) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-3";

    const title = escapeHtml(task.title || "Untitled");
    const description = escapeHtml(task.description || "");
    const dueDate = new Date(task.due_at);
    const isOverdue = dueDate < now;
    const timeStr = formatDueDate(dueDate);

    const badgeClass = isOverdue ? "bg-danger" : "bg-primary";
    const badge = `<span class="badge rounded-pill ${badgeClass}">
      <i class="bi bi-clock me-1"></i> ${timeStr}
    </span>`;

    col.innerHTML = `
      <div class="card note-card h-100 ${isOverdue ? 'border-danger' : ''}">
        <div class="card-body">
          ${isOverdue ? '<div class="alert alert-danger p-2 mb-2">Overdue</div>' : ''}
          <h2 class="h6 fw-bold mb-3">${title}</h2>
          <p class="text-secondary mb-3">${description}</p>
          ${badge}
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

function formatDueDate(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateToCheck = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateToCheck.getTime() === today.getTime()) {
    return "Today, " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (dateToCheck.getTime() === tomorrow.getTime()) {
    return "Tomorrow, " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else {
    return date.toLocaleDateString() + ", " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
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
