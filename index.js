// index.js
let allTasks = [];

document.addEventListener("DOMContentLoaded", () => {
  fetchTasks();
  setupSearch();
  setupCreateNote();
});

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
  const createCard = document.querySelector(".note-create");
  if (createCard) {
    createCard.addEventListener("click", () => {
      const title = prompt("Note title:");
      if (title === null) return;

      const description = prompt("Note description (optional):");
      if (description === null) return;

      const labelsInput = prompt("Labels (comma-separated, optional, e.g. 'study, java'):");
      if (labelsInput === null) return;

      const labels = labelsInput
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      createTask(title.trim() || "Untitled", description?.trim() || "", labels);
    });
  }
}

async function createTask(title, description, labels) {
  if (!title) {
    alert("Title is required");
    return;
  }

  try {
    const res = await fetch("http://127.0.0.1:5000/api/v1/tasks", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        labels: labels || [],
      }),
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
          <p class="text-secondary mb-3">${description}</p>
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
