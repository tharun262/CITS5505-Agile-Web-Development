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
    // Assuming API returns { data: [...] }
    const tasks = data.data || [];

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

    // Task data based on models.py
    const title = escapeHtml(task.title || "Untitled");
    const description = escapeHtml(task.description || "");
    const labelHTML = task.labels
      ? `<span class="badge rounded-pill badge-soft mt-2">${escapeHtml(task.labels)}</span>`
      : "";
    const color = task.color ? task.color : "#fff";
    const isCompleted = task.is_completed
      ? '<i class="bi bi-check-circle-fill text-success mb-2 d-block"></i> '
      : "";

    col.innerHTML = `
            <div class="card note-card h-100" style="background-color: ${color}">
                <div class="card-body">
                    ${isCompleted}
                    <h2 class="h6 fw-bold mb-3">${title}</h2>
                    <p class="text-secondary mb-3">${description}</p>
                    ${labelHTML}
                </div>
            </div>
        `;
    container.appendChild(col);
  });
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
