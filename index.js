// index.js
let allTasks = [];

function convertTaskDateTimeToISO(dateValue, hourValue, minuteValue, secondValue) {
  if (!dateValue) return null;

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

function setupTaskDateTimePicker() {
  populateTimeSelect("taskHour", 23);
  populateTimeSelect("taskMinute", 59);
  populateTimeSelect("taskSecond", 59);
}

document.addEventListener("DOMContentLoaded", () => {
  setupTaskDateTimePicker();
  fetchTasks();
  setInterval(fetchTasks, 30000);
  updateMessageUnreadBadge();
  setInterval(updateMessageUnreadBadge, 30000);
  setupSearch();
  setupCreateNote();
});

async function updateMessageUnreadBadge() {
  const badge = document.getElementById("messageUnreadBadge");
  if (!badge) return;

  try {
    const response = await fetch("http://127.0.0.1:5000/api/v1/messages?filter=unread", {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      badge.style.display = "none";
      return;
    }

    const data = await response.json();
    const unreadCount = Number(data.count || data.messages?.length || 0);

    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
      badge.style.display = "inline-block";
      badge.setAttribute("aria-label", `${unreadCount} unread messages`);
    } else {
      badge.textContent = "";
      badge.style.display = "none";
      badge.setAttribute("aria-label", "No unread messages");
    }
  } catch (err) {
    console.error("Error loading unread messages:", err);
    badge.style.display = "none";
  }
}

function setupSearch() {
  const searchForm = document.querySelector(".search-pill");
  const searchInput = searchForm?.querySelector("input");
  
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      if (query.trim() === "") {
        renderTasks(allTasks);
      } else {
        const filtered = allTasks.filter(task =>
          (task.title && task.title.toLowerCase().includes(query)) ||
          (task.description && task.description.toLowerCase().includes(query))
        );
        renderTasks(filtered);
      }
    });
  }
}

function setupCreateNote() {
  // Text note button
  const btnTextNote = document.getElementById("btn-text-note");
  if (btnTextNote) {
    btnTextNote.addEventListener("click", () => {
      resetTaskModal();
      document.getElementById("taskType").value = "text";
      document.getElementById("taskImageData").value = "";
      const modal = new bootstrap.Modal(document.getElementById("createTaskModal"));
      modal.show();
    });
  }

  // Image note button
  const btnImageNote = document.getElementById("btn-image-note");
  if (btnImageNote) {
    btnImageNote.addEventListener("click", () => {
      // Create a hidden file input
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageData = event.target.result;
            resetTaskModal();
            document.getElementById("taskType").value = "image";
            document.getElementById("taskImageData").value = imageData;
            const modal = new bootstrap.Modal(document.getElementById("createTaskModal"));
            modal.show();
          };
          reader.readAsDataURL(file);
        }
      });
      
      fileInput.click();
    });
  }

  // Handle modal form submission
  const createTaskBtn = document.getElementById("createTaskBtn");
  if (createTaskBtn) {
    createTaskBtn.addEventListener("click", () => {
      const title = document.getElementById("taskTitle").value.trim();
      const description = document.getElementById("taskDescription").value.trim();
      const labelsInput = document.getElementById("taskLabels").value.trim();
      const dueAtInput = getTaskDueAtISO();
      const taskType = document.getElementById("taskType").value;
      const imageData = document.getElementById("taskImageData").value;

      if (!title) {
        alert("Title is required");
        return;
      }

      const labels = labelsInput
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      if (taskType === "image" && imageData) {
        createTaskWithImage(title, description, imageData, labels, dueAtInput || null);
      } else {
        createTask(title, description, labels, dueAtInput || null);
      }

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById("createTaskModal"));
      if (modal) modal.hide();
    });
  }
}

function resetTaskModal() {
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDescription").value = "";
  document.getElementById("taskLabels").value = "";
  resetTaskDateTime();
  document.getElementById("taskType").value = "text";
  document.getElementById("taskImageData").value = "";
}

function getTaskDueAtISO() {
  const dateValue = document.getElementById("taskDate").value;
  const hourValue = document.getElementById("taskHour").value;
  const minuteValue = document.getElementById("taskMinute").value;
  const secondValue = document.getElementById("taskSecond").value;

  return convertTaskDateTimeToISO(dateValue, hourValue, minuteValue, secondValue);
}

function resetTaskDateTime() {
  document.getElementById("taskDate").value = "";
  document.getElementById("taskHour").value = "00";
  document.getElementById("taskMinute").value = "00";
  document.getElementById("taskSecond").value = "00";
}

async function createTask(title, description, labels, dueAt) {
  if (!title) {
    alert("Title is required");
    return;
  }

  try {
    const payload = {
      title,
      description: description || null,
      labels: labels || [],
    };

    if (dueAt) {
      payload.due_at = dueAt;
    }

    const res = await fetch("http://127.0.0.1:5000/api/v1/tasks", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 201) {
      alert("Note created!");
      fetchTasks();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create note");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

async function createTaskWithImage(title, description, imageData, labels, dueAt) {
  if (!title) {
    alert("Title is required");
    return;
  }

  try {
    const payload = {
      title,
      description: description || null,
      labels: labels || [],
      image_data: imageData, // Include base64 image data
    };

    if (dueAt) {
      payload.due_at = dueAt;
    }

    const res = await fetch("http://127.0.0.1:5000/api/v1/tasks", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 201) {
      alert("Image note created!");
      fetchTasks();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create image note");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

async function fetchTasks() {
  try {
    // According to routes/tasks.py, the endpoint is /api/v1/tasks
    const response = await fetch("http://127.0.0.1:5000/api/v1/tasks", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch tasks");
      return;
    }

    const data = await response.json();
    // API returns { items: [...], page, page_size, total }
    allTasks = data.items || [];

    renderTasks(allTasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
  }
}

function renderTasks(tasks) {
  const container = document.getElementById("tasks-container");
  if (!container) return;

  container.innerHTML = "";

  // Filter out archived tasks and sort by completion status
  const activeTasks = tasks.filter(task => !task.is_archived);
  
  if (activeTasks.length === 0) {
    container.innerHTML =
      '<div class="col-12"><p class="text-muted text-center pt-5">No notes found. Create one above!</p></div>';
    return;
  }

  // Sort: incomplete first, then completed
  const sorted = activeTasks.sort((a, b) => {
    if (a.is_completed === b.is_completed) return 0;
    return a.is_completed ? 1 : -1;
  });

  sorted.forEach((task) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-3";

    const title = escapeHtml(task.title || "Untitled");
    const description = escapeHtml(task.description || "");
    const isCompleted = task.is_completed
      ? '<i class="bi bi-check-circle-fill text-success mb-2 d-block"></i>'
      : "";

    // Handle image display
    let imageHtml = "";
    if (task.image_data) {
      imageHtml = `<img src="data:image/png;base64,${task.image_data}" alt="Note image" class="img-fluid rounded mb-3" style="max-height: 200px; width: 100%; object-fit: cover;">`;
    }

    const labelBadges = (task.labels || [])
      .map(
        (l) =>
          `<a href="labels.html?label=${encodeURIComponent(l)}" class="badge rounded-pill text-bg-primary me-1 text-decoration-none">${escapeHtml(l)}</a>`
      )
      .join("");

    // Show Share button only on completed-but-not-yet-shared tasks
    const canShare = task.is_completed && !task.shared_post_id;
    const alreadyShared = !!task.shared_post_id;
    const shareButton = canShare
      ? `<button class="btn btn-sm btn-warning mt-2" onclick="shareTask(${task.id})">
           <i class="bi bi-share-fill me-1"></i>Share
         </button>`
      : alreadyShared
      ? `<span class="badge rounded-pill bg-success-subtle text-success-emphasis mt-2">
           <i class="bi bi-check2-circle me-1"></i>Shared
         </span>`
      : "";

    const actionButtons = `
      <div class="d-flex gap-2 mt-2">
        ${task.is_completed ? '' : `<button class="btn btn-sm btn-success flex-grow-1" onclick="completeTask(${task.id})"><i class="bi bi-check me-1"></i>Complete</button>`}
        <button class="btn btn-sm btn-outline-secondary" onclick="deleteTask(${task.id})"><i class="bi bi-trash"></i></button>
        <button class="btn btn-sm btn-outline-secondary" onclick="archiveTask(${task.id})"><i class="bi bi-archive"></i></button>
      </div>
    `;

    col.innerHTML = `
      <div class="card note-card h-100 bg-white">
        <div class="card-body">
          ${isCompleted}
          <h2 class="h6 fw-bold mb-3">${title}</h2>
          ${imageHtml}
          ${description ? `<p class="text-secondary mb-3">${description}</p>` : ""}
          ${labelBadges ? `<div class="mb-2">${labelBadges}</div>` : ""}
          ${shareButton}
          ${actionButtons}
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

async function completeTask(taskId) {
  try {
    const res = await fetch(`http://127.0.0.1:5000/api/v1/tasks/${taskId}/complete`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (res.status === 200) {
      fetchTasks();
    } else {
      const data = await res.json();
      alert(data.error?.message || "Failed to complete task");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

async function archiveTask(taskId) {
  try {
    const task = allTasks.find(t => t.id === taskId);
    if (!task?.is_completed) {
      alert("Only completed tasks can be archived");
      return;
    }

    const res = await fetch(`http://127.0.0.1:5000/api/v1/tasks/${taskId}/archive`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (res.status === 200) {
      alert("Task archived!");
      fetchTasks();
    } else {
      const data = await res.json();
      alert(data.error?.message || "Failed to archive task");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

async function deleteTask(taskId) {
  if (!confirm("Delete this task?")) return;

  try {
    const res = await fetch(`http://127.0.0.1:5000/api/v1/tasks/${taskId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.status === 204) {
      alert("Task deleted!");
      fetchTasks();
    } else {
      const data = await res.json();
      alert(data.error?.message || "Failed to delete task");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

async function shareTask(taskId) {
  const caption = prompt("Add a caption for your post (optional):") || "";
  try {
    const res = await fetch(`http://127.0.0.1:5000/api/v1/tasks/${taskId}/share`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: caption.trim() || null }),
    });
    const data = await res.json();
    if (res.status === 201) {
      alert("Shared! Visit Feed to see it.");
      fetchTasks();
    } else {
      alert(data.error?.message || "Failed to share");
    }
  } catch (err) {
    alert("Network error: " + err.message);
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
