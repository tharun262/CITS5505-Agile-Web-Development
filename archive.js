// archive.js - Load and display archived tasks

document.addEventListener("DOMContentLoaded", () => {
  fetchArchivedTasks();
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

async function fetchArchivedTasks() {
  try {
    const response = await fetch("http://127.0.0.1:5000/api/v1/archive", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch archived tasks");
      renderError("Failed to load archived tasks");
      return;
    }

    const data = await response.json();
    const tasks = data.items || [];
    renderArchive(tasks);
  } catch (err) {
    console.error("Error fetching archived tasks:", err);
    renderError("Network error: " + err.message);
  }
}

function renderArchive(tasks) {
  const container = document.querySelector(".row.g-4");
  if (!container) return;

  // Clear placeholder content
  container.innerHTML = "";

  if (tasks.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "col-12";
    emptyDiv.innerHTML = `
      <div class="text-center text-muted">
        <i class="bi bi-archive text-secondary opacity-50" style="font-size: 3rem;"></i>
        <h5 class="mt-2 fw-medium text-secondary">No archived notes yet</h5>
        <p class="text-secondary">Archive your completed notes to keep your dashboard clean.</p>
      </div>
    `;
    container.appendChild(emptyDiv);
    return;
  }

  tasks.forEach((task) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-3";

    const title = escapeHtml(task.title || "Untitled");
    const description = escapeHtml(task.description || "");
    const completedBadge = task.is_completed
      ? '<i class="bi bi-check-circle-fill text-success mb-2 d-block"></i>'
      : "";

    col.innerHTML = `
      <div class="card note-card h-100 archived-card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            ${completedBadge}
            <h2 class="h6 fw-bold ${task.is_completed ? 'text-muted' : 'text-dark'}">${title}</h2>
            <button class="btn btn-link text-muted p-0" onclick="restoreTask(${task.id})" title="Restore">
              <i class="bi bi-arrow-up-circle text-muted"></i>
            </button>
          </div>
          <p class="text-secondary mb-3 small">${description}</p>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteArchivedTask(${task.id})">
            <i class="bi bi-trash me-1"></i>Delete permanently
          </button>
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

async function restoreTask(taskId) {
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/v1/archive/${taskId}/restore`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      alert("Task restored!");
      fetchArchivedTasks();
    } else {
      const data = await response.json();
      alert(data.error?.message || "Failed to restore task");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

async function deleteArchivedTask(taskId) {
  if (!confirm("Delete this archived task permanently?")) return;

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/v1/archive/${taskId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (response.status === 204) {
      alert("Task deleted permanently.");
      fetchArchivedTasks();
    } else {
      const data = await response.json();
      alert(data.error?.message || "Failed to delete task");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

function renderError(message) {
  const container = document.querySelector(".row.g-4");
  if (container) {
    container.innerHTML = `<div class="col-12"><p class="text-danger text-center pt-5">${escapeHtml(message)}</p></div>`;
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
