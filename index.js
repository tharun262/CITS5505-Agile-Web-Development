// index.js
let allTasks = [];
let selectedImageData = null;
let existingImageData = null;
let shareModalTaskId = null;
let noteModalMode = "create";

document.addEventListener("DOMContentLoaded", () => {
  fetchTasks();
  setupSearch();
  setupCreateButtons();
  setupNoteModal();
  setupShareModal();
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

function setupCreateButtons() {
  const btnTextNote = document.getElementById("btn-text-note");
  const btnImageNote = document.getElementById("btn-image-note");

  if (btnTextNote) {
    btnTextNote.addEventListener("click", () => openCreateNoteModal("text"));
  }

  if (btnImageNote) {
    btnImageNote.addEventListener("click", () => openCreateNoteModal("image"));
  }
}

function setupNoteModal() {
  const noteType = document.getElementById("noteType");
  const imageInput = document.getElementById("noteImage");
  const form = document.getElementById("noteForm");
  const modalEl = document.getElementById("noteModal");

  if (noteType) {
    noteType.addEventListener("change", toggleImageUploadField);
  }

  if (imageInput) {
    imageInput.addEventListener("change", handleImagePreview);
  }

  if (form) {
    form.addEventListener("submit", handleNoteSubmit);
  }

  if (modalEl) {
    modalEl.addEventListener("hidden.bs.modal", resetNoteForm);
  }
}

function openCreateNoteModal(type = "text") {
  noteModalMode = "create";
  resetNoteForm();

  const modalTitle = document.querySelector("#noteModalTitle span");
  const submitBtn = document.getElementById("noteSubmitBtn");
  const noteType = document.getElementById("noteType");

  if (modalTitle) modalTitle.textContent = "Create Note";
  if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Save Note';
  if (noteType) noteType.value = type;

  toggleImageUploadField();

  const modalEl = document.getElementById("noteModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function openEditNoteModal(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  noteModalMode = "edit";
  resetNoteForm();

  const modalTitle = document.querySelector("#noteModalTitle span");
  const submitBtn = document.getElementById("noteSubmitBtn");
  const noteTaskId = document.getElementById("noteTaskId");
  const noteType = document.getElementById("noteType");
  const noteTitle = document.getElementById("noteTitle");
  const noteDescription = document.getElementById("noteDescription");
  const noteLabels = document.getElementById("noteLabels");
  const noteReminder = document.getElementById("noteReminder");

  if (modalTitle) modalTitle.textContent = "Edit Note";
  if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-floppy me-2"></i>Save Changes';
  if (noteTaskId) noteTaskId.value = task.id;
  if (noteType) noteType.value = task.image_data ? "image" : "text";
  if (noteTitle) noteTitle.value = task.title || "";
  if (noteDescription) noteDescription.value = task.description || "";
  if (noteLabels) noteLabels.value = (task.labels || []).join(", ");
  if (noteReminder) noteReminder.value = formatForDateTimeLocal(task.due_at);

  existingImageData = task.image_data || null;
  selectedImageData = null;

  toggleImageUploadField();

  if (existingImageData) {
    const previewWrap = document.getElementById("noteImagePreviewWrap");
    const preview = document.getElementById("noteImagePreview");
    if (preview) {
      preview.src = getDisplayImageSrc(existingImageData);
    }
    if (previewWrap) {
      previewWrap.classList.remove("d-none");
    }
  }

  const modalEl = document.getElementById("noteModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function toggleImageUploadField() {
  const noteType = document.getElementById("noteType");
  const imageGroup = document.getElementById("imageUploadGroup");

  if (!noteType || !imageGroup) return;

  if (noteType.value === "image") {
    imageGroup.classList.remove("d-none");
  } else {
    imageGroup.classList.add("d-none");
  }
}

function handleImagePreview(e) {
  const file = e.target.files?.[0];
  const previewWrap = document.getElementById("noteImagePreviewWrap");
  const preview = document.getElementById("noteImagePreview");

  selectedImageData = null;

  if (!file) {
    if (existingImageData) {
      if (preview) preview.src = getDisplayImageSrc(existingImageData);
      previewWrap?.classList.remove("d-none");
    } else {
      previewWrap?.classList.add("d-none");
    }
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    selectedImageData = event.target.result || "";
    if (preview) {
      preview.src = selectedImageData;
    }
    previewWrap?.classList.remove("d-none");
  };
  reader.readAsDataURL(file);
}

async function handleNoteSubmit(e) {
  e.preventDefault();

  const taskId = document.getElementById("noteTaskId")?.value;
  const type = document.getElementById("noteType")?.value || "text";
  const title = document.getElementById("noteTitle")?.value.trim() || "";
  const description = document.getElementById("noteDescription")?.value.trim() || "";
  const labelsInput = document.getElementById("noteLabels")?.value || "";
  const reminderValue = document.getElementById("noteReminder")?.value || "";

  const labels = labelsInput
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  if (!title) {
    alert("Title is required");
    return;
  }

  const payload = {
    title,
    description: description || null,
    labels,
    due_at: reminderValue || null
  };

  if (type === "image") {
    if (selectedImageData) {
      payload.image_data = selectedImageData;
    } else if (existingImageData) {
      payload.image_data = existingImageData;
    } else {
      alert("Please upload an image for an image note.");
      return;
    }
  } else {
    payload.image_data = null;
  }

  try {
    if (noteModalMode === "edit" && taskId) {
      await updateTask(taskId, payload);
    } else {
      await createTask(payload);
    }

    const modalEl = document.getElementById("noteModal");
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    fetchTasks();
  } catch (err) {
    alert(err.message || "Something went wrong.");
  }
}

async function createTask(payload) {
  const res = await fetch("http://127.0.0.1:5000/api/v1/tasks", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status !== 201) {
    let message = "Failed to create note";
    try {
      const data = await res.json();
      message = data.error || data.message || message;
    } catch (_) {}
    throw new Error(message);
  }
}

async function updateTask(taskId, payload) {
  const res = await fetch(`http://127.0.0.1:5000/api/v1/tasks/${taskId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = "Failed to update note";
    try {
      const data = await res.json();
      message = data.error?.message || data.error || data.message || message;
    } catch (_) {}
    throw new Error(message);
  }
}

function resetNoteForm() {
  const form = document.getElementById("noteForm");
  const previewWrap = document.getElementById("noteImagePreviewWrap");
  const preview = document.getElementById("noteImagePreview");
  const noteType = document.getElementById("noteType");
  const noteTaskId = document.getElementById("noteTaskId");

  selectedImageData = null;
  existingImageData = null;

  if (form) form.reset();
  if (preview) preview.src = "";
  if (previewWrap) previewWrap.classList.add("d-none");
  if (noteType) noteType.value = "text";
  if (noteTaskId) noteTaskId.value = "";

  toggleImageUploadField();
}

async function fetchTasks() {
  try {
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

  const activeTasks = tasks.filter(task => !task.is_archived);

  if (activeTasks.length === 0) {
    container.innerHTML =
      '<div class="col-12"><p class="text-muted text-center pt-5">No notes found. Create one above!</p></div>';
    return;
  }

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

    let imageHtml = "";
    if (task.image_data) {
      imageHtml = `<img src="${escapeHtml(getDisplayImageSrc(task.image_data))}" alt="Note image" class="img-fluid rounded mb-3" style="max-height: 200px; width: 100%; object-fit: cover;">`;
    }

    const labelBadges = (task.labels || [])
      .map(
        (l) =>
          `<a href="labels.html?label=${encodeURIComponent(l)}" class="badge rounded-pill text-bg-primary me-1 text-decoration-none">${escapeHtml(l)}</a>`
      )
      .join("");

    const reminderBadge = task.due_at
      ? `<div class="mb-2">
          <span class="badge rounded-pill text-bg-warning">
            <i class="bi bi-bell me-1"></i>${escapeHtml(formatReminderDate(new Date(task.due_at)))}
          </span>
        </div>`
      : "";

    const canShare = task.is_completed && !task.shared_post_id;
    const alreadyShared = !!task.shared_post_id;
    const shareButton = canShare
      ? `<button class="btn btn-sm btn-warning mt-2" onclick="openShareModal(${task.id})">
           <i class="bi bi-share-fill me-1"></i>Share
         </button>`
      : alreadyShared
      ? `<span class="badge rounded-pill bg-success-subtle text-success-emphasis mt-2">
           <i class="bi bi-check2-circle me-1"></i>Shared
         </span>`
      : "";

    const actionButtons = `
      <div class="d-flex gap-2 mt-2 flex-wrap">
        <button class="btn btn-sm btn-outline-primary flex-grow-1" onclick="openEditNoteModal(${task.id})">
          <i class="bi bi-pencil-square me-1"></i>Edit
        </button>
        ${task.is_completed ? '' : `<button class="btn btn-sm btn-success flex-grow-1" onclick="completeTask(${task.id})"><i class="bi bi-check me-1"></i>Complete</button>`}
        <button class="btn btn-sm btn-outline-secondary" onclick="deleteTask(${task.id})"><i class="bi bi-trash"></i></button>
        <button class="btn btn-sm btn-outline-secondary" onclick="archiveTask(${task.id})"><i class="bi bi-archive"></i></button>
      </div>
    `;

    col.innerHTML = `
      <div class="card note-card h-100 bg-white border-0 shadow-sm">
        <div class="card-body">
          ${isCompleted}
          <h2 class="h6 fw-bold mb-3">${title}</h2>
          ${imageHtml}
          ${description ? `<p class="text-secondary mb-3">${description}</p>` : ""}
          ${reminderBadge}
          ${labelBadges ? `<div class="mb-2">${labelBadges}</div>` : ""}
          ${shareButton}
          ${actionButtons}
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

function setupShareModal() {
  const form = document.getElementById("shareTaskForm");
  const modalEl = document.getElementById("shareTaskModal");

  if (form) {
    form.addEventListener("submit", handleShareSubmit);
  }

  if (modalEl) {
    modalEl.addEventListener("hidden.bs.modal", () => {
      const caption = document.getElementById("shareCaption");
      const previewTitle = document.getElementById("shareTaskPreviewTitle");
      const previewDescription = document.getElementById("shareTaskPreviewDescription");
      const taskId = document.getElementById("shareTaskId");

      shareModalTaskId = null;
      if (caption) caption.value = "";
      if (previewTitle) previewTitle.textContent = "";
      if (previewDescription) previewDescription.textContent = "";
      if (taskId) taskId.value = "";
    });
  }
}

function openShareModal(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  shareModalTaskId = taskId;

  const previewTitle = document.getElementById("shareTaskPreviewTitle");
  const previewDescription = document.getElementById("shareTaskPreviewDescription");
  const taskIdInput = document.getElementById("shareTaskId");

  if (previewTitle) previewTitle.textContent = task.title || "Untitled";
  if (previewDescription) previewDescription.textContent = task.description || "No description added.";
  if (taskIdInput) taskIdInput.value = taskId;

  const modalEl = document.getElementById("shareTaskModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

async function handleShareSubmit(e) {
  e.preventDefault();

  const taskId = shareModalTaskId || document.getElementById("shareTaskId")?.value;
  const caption = document.getElementById("shareCaption")?.value.trim() || "";

  if (!taskId) {
    alert("Could not determine which note to share.");
    return;
  }

  try {
    const res = await fetch(`http://127.0.0.1:5000/api/v1/tasks/${taskId}/share`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: caption || null }),
    });

    const data = await res.json();

    if (res.status === 201) {
      const modalEl = document.getElementById("shareTaskModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      alert("Shared! Visit Feed to see it.");
      fetchTasks();
    } else {
      alert(data.error?.message || "Failed to share");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
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

function formatReminderDate(date) {
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

function formatForDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDisplayImageSrc(imageData) {
  if (!imageData) return "";
  if (imageData.startsWith("data:")) return imageData;
  return `data:image/png;base64,${imageData}`;
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