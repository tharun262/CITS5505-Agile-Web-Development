// index.js
document.addEventListener("DOMContentLoaded", () => {
  fetchTasks();
});

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
    const tasks = data.items || [];

    renderTasks(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
  }
}

function renderTasks(tasks) {
  const container = document.getElementById("tasks-container");
  if (!container) return;

  container.innerHTML = "";

  if (tasks.length === 0) {
    container.innerHTML =
      '<div class="col-12"><p class="text-muted text-center pt-5">No notes found. Create one above!</p></div>';
    return;
  }

  tasks.forEach((task) => {
    // Skip archived tasks on the main view
    if (task.is_archived) return;

    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-3";

    const title = escapeHtml(task.title || "Untitled");
    const description = escapeHtml(task.description || "");
    const isCompleted = task.is_completed
      ? '<i class="bi bi-check-circle-fill text-success mb-2 d-block"></i>'
      : "";

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

    col.innerHTML = `
      <div class="card note-card h-100 bg-white">
        <div class="card-body">
          ${isCompleted}
          <h2 class="h6 fw-bold mb-3">${title}</h2>
          <p class="text-secondary mb-3">${description}</p>
          ${shareButton}
        </div>
      </div>
    `;
    container.appendChild(col);
  });
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
