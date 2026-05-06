const API = "http://127.0.0.1:5000/api/v1";
let completedTasks = [];

document.addEventListener("DOMContentLoaded", async () => {
  bindLogout();
  await loadCompletedTasks();
  bindForm();
});

function bindLogout() {
  const btn = document.getElementById("logout-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    await fetch("http://127.0.0.1:5000/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    window.location.href = "login.html";
  });
}

async function loadCompletedTasks() {
  const select = document.getElementById("task-select");
  const preview = document.getElementById("task-preview");

  try {
    const res = await fetch(`${API}/tasks`, {
      credentials: "include"
    });

    if (!res.ok) throw new Error("Could not load tasks");

    const data = await res.json();
    completedTasks = (data.items || []).filter(task => task.is_completed && !task.is_archived);

    if (!completedTasks.length) {
      preview.textContent = "No completed tasks available to share yet.";
      return;
    }

    completedTasks.forEach(task => {
      const option = document.createElement("option");
      option.value = task.id;
      option.textContent = task.title;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      const task = completedTasks.find(t => String(t.id) === select.value);
      preview.textContent = task
        ? `${task.title}\n\n${task.description || "No description"}`
        : "Choose a completed task to preview it here.";
    });
  } catch (err) {
    preview.textContent = `Failed to load completed tasks: ${err.message}`;
  }
}

function bindForm() {
  const form = document.getElementById("share-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const taskId = document.getElementById("task-select").value;
    const caption = document.getElementById("caption").value.trim();
    const message = document.getElementById("share-message");

    if (!taskId) {
      message.textContent = "Please select a completed task first.";
      return;
    }

    try {
      const res = await fetch(`${API}/tasks/${taskId}/share`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ caption })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        message.textContent = data.message || data.error?.message || "Failed to share task.";
        return;
      }

      message.textContent = "Task shared successfully. Redirecting to feed...";
      setTimeout(() => {
        window.location.href = "feed.html";
      }, 1000);
    } catch (err) {
      message.textContent = `Network error: ${err.message}`;
    }
  });
}