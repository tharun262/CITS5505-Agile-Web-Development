// reminders.js - Load and display task reminders

// Convert explicit local date/time parts to an ISO string for the API.
function convertReminderDateTimeToISO(dateValue, hourValue, minuteValue, secondValue) {
  if (!dateValue || hourValue === "" || minuteValue === "" || secondValue === "") return null;

  const [yearStr, monthStr, dayStr] = dateValue.split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10) - 1;
  const day = Number.parseInt(dayStr, 10);
  const hours = Number.parseInt(hourValue, 10);
  const minutes = Number.parseInt(minuteValue, 10);
  const seconds = Number.parseInt(secondValue, 10);

  if ([year, month, day, hours, minutes, seconds].some(Number.isNaN)) return null;

  const localDate = new Date(year, month, day, hours, minutes, seconds, 0);
  if (Number.isNaN(localDate.getTime())) return null;

  return localDate.toISOString();
}

function formatTwoDigits(value) {
  return String(value).padStart(2, "0");
}

function populateTimeSelect(selectId, maxValue) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = "";
  for (let value = 0; value <= maxValue; value += 1) {
    const option = document.createElement("option");
    option.value = formatTwoDigits(value);
    option.textContent = formatTwoDigits(value);
    select.appendChild(option);
  }
}

function setupReminderDateTimePicker() {
  populateTimeSelect("reminderHour", 23);
  populateTimeSelect("reminderMinute", 59);
  populateTimeSelect("reminderSecond", 59);
}

document.addEventListener("DOMContentLoaded", () => {
  setupReminderDateTimePicker();
  fetchReminders();
  setInterval(fetchReminders, 30000);
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
      resetReminderModal();
      const modal = new bootstrap.Modal(document.getElementById("createReminderModal"));
      modal.show();
    });
    addReminderCard.style.cursor = "pointer";
  }

  // Handle modal form submission
  const createReminderBtn = document.getElementById("createReminderBtn");
  if (createReminderBtn) {
    createReminderBtn.addEventListener("click", () => {
      const title = document.getElementById("reminderTitle").value.trim();
      const description = document.getElementById("reminderDescription").value.trim();
      const dueAtInput = getReminderDueAtISO();

      if (!title) {
        alert("Title is required");
        return;
      }

      if (!dueAtInput) {
        alert("Due date and time are required for reminders");
        return;
      }

      createReminder(title, description, dueAtInput);

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById("createReminderModal"));
      if (modal) modal.hide();
    });
  }
}

function resetReminderModal() {
  document.getElementById("reminderTitle").value = "";
  document.getElementById("reminderDescription").value = "";
  setDefaultReminderDateTime();
}

function getReminderDueAtISO() {
  const dateValue = document.getElementById("reminderDate").value;
  const hourValue = document.getElementById("reminderHour").value;
  const minuteValue = document.getElementById("reminderMinute").value;
  const secondValue = document.getElementById("reminderSecond").value;

  return convertReminderDateTimeToISO(dateValue, hourValue, minuteValue, secondValue);
}

function setDefaultReminderDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);

  document.getElementById("reminderDate").value = [
    now.getFullYear(),
    formatTwoDigits(now.getMonth() + 1),
    formatTwoDigits(now.getDate()),
  ].join("-");
  document.getElementById("reminderHour").value = formatTwoDigits(now.getHours());
  document.getElementById("reminderMinute").value = formatTwoDigits(now.getMinutes());
  document.getElementById("reminderSecond").value = "00";
}

async function createReminder(title, description, dueAt) {
  if (!title) {
    alert("Title is required");
    return;
  }

  if (!dueAt) {
    alert("Due date and time are required for reminders");
    return;
  }

  try {
    const payload = {
      title,
      description: description || null,
    };

    payload.due_at = dueAt;

    const res = await fetch("http://127.0.0.1:5000/api/v1/tasks", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 201) {
      alert("Reminder created!");
      fetchReminders();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create reminder");
    }
  } catch (err) {
    alert("Network error: " + err.message);
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
