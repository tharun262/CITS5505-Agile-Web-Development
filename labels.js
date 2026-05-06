// labels.js — list user's labels, click a chip to filter tasks by that label

const API_BASE = "http://127.0.0.1:5000";

let allTasks = [];
let selectedLabel = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupLogout();
  await fetchAllTasks();

  // Allow deep-linking via ?label=foo (used by index.html badges)
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("label");
  if (fromQuery) {
    selectedLabel = fromQuery.toLowerCase();
  }

  renderChips();
  renderTasks();

  document.getElementById("clear-filter-btn")?.addEventListener("click", () => {
    selectedLabel = null;
    history.replaceState(null, "", "labels.html");
    renderChips();
    renderTasks();
  });
});

async function setupLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "login.html";
    });
  }
}

async function fetchAllTasks() {
  try {
    // include archived so labels page covers everything the user has
    const res = await fetch(
      `${API_BASE}/api/v1/tasks?include_archived=true&page_size=200`,
      { credentials: "include" }
    );
    if (!res.ok) {
      console.error("Failed to load tasks", res.status);
      return;
    }
    const data = await res.json();
    allTasks = data.items || [];
  } catch (err) {
    console.error("Error loading tasks:", err);
  }
}

function getAllLabels() {
  const set = new Set();
  allTasks.forEach((t) => (t.labels || []).forEach((l) => set.add(l)));
  return [...set].sort();
}

function renderChips() {
  const chipsBox = document.getElementById("labels-chips");
  const header = document.getElementById("labels-header");
  const clearBtn = document.getElementById("clear-filter-btn");
  if (!chipsBox) return;

  const labels = getAllLabels();

  if (labels.length === 0) {
    chipsBox.innerHTML =
      '<span class="text-muted small">No labels yet. Add labels when creating a task on the Notes page.</span>';
    if (header) header.textContent = "Labels";
    clearBtn?.classList.add("d-none");
    return;
  }

  chipsBox.innerHTML = labels
    .map((l) => {
      const isActive = l === selectedLabel;
      const cls = isActive
        ? "btn btn-primary rounded-pill px-3 py-1"
        : "btn btn-outline-primary rounded-pill px-3 py-1";
      return `<button class="${cls}" data-label="${escapeAttr(l)}">${escapeHtml(l)}</button>`;
    })
    .join("");

  chipsBox.querySelectorAll("button[data-label]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedLabel = btn.getAttribute("data-label");
      history.replaceState(null, "", `labels.html?label=${encodeURIComponent(selectedLabel)}`);
      renderChips();
      renderTasks();
    });
  });

  if (header) {
    header.textContent = selectedLabel
      ? `Filtered by Label: ${selectedLabel}`
      : "Labels";
  }
  if (clearBtn) {
    if (selectedLabel) clearBtn.classList.remove("d-none");
    else clearBtn.classList.add("d-none");
  }
}

function renderTasks() {
  const container = document.getElementById("labels-tasks-container");
  if (!container) return;

  if (!selectedLabel) {
    container.innerHTML =
      '<div class="col-12"><p class="text-muted text-center pt-3">Pick a label above to see matching tasks.</p></div>';
    return;
  }

  const filtered = allTasks.filter((t) => (t.labels || []).includes(selectedLabel));

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="col-12"><p class="text-muted text-center pt-3">No tasks tagged with this label.</p></div>';
    return;
  }

  container.innerHTML = filtered
    .map((task) => {
      const title = escapeHtml(task.title || "Untitled");
      const description = escapeHtml(task.description || "");
      const archivedNote = task.is_archived
        ? '<span class="badge bg-secondary-subtle text-secondary-emphasis me-1">Archived</span>'
        : "";
      const completedNote = task.is_completed
        ? '<i class="bi bi-check-circle-fill text-success me-1"></i>'
        : "";
      const otherLabels = (task.labels || [])
        .filter((l) => l !== selectedLabel)
        .map(
          (l) =>
            `<span class="badge rounded-pill text-bg-light text-secondary me-1">${escapeHtml(l)}</span>`
        )
        .join("");

      return `
        <div class="col-12 col-md-6 col-xl-3">
          <div class="card note-card h-100 bg-white border border-primary-subtle">
            <div class="card-body">
              ${completedNote}${archivedNote}
              <h2 class="h6 fw-bold mb-2">${title}</h2>
              <p class="text-secondary small mb-3">${description}</p>
              <span class="badge rounded-pill text-bg-primary me-1">${escapeHtml(selectedLabel)}</span>
              ${otherLabels}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(s) {
  return escapeHtml(s);
}
