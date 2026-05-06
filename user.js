const API = "http://127.0.0.1:5000";

document.addEventListener("DOMContentLoaded", async () => {
  bindLogout();
  await loadUserProfile();
});

function bindLogout() {
  const btn = document.getElementById("logout-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
    window.location.href = "login.html";
  });
}

async function loadUserProfile() {
  const params = new URLSearchParams(window.location.search);
  const username = params.get("username");
  const container = document.getElementById("user-posts");

  if (!username) {
    container.innerHTML = `<p class="muted">No username provided. Open this page with ?username=alice</p>`;
    return;
  }

  try {
    const [profileRes, feedRes] = await Promise.all([
      fetch(`${API}/api/v1/profiles/${encodeURIComponent(username)}`, {
        credentials: "include"
      }),
      fetch(`${API}/api/v1/feed?author=${encodeURIComponent(username)}`, {
        credentials: "include"
      })
    ]);

    if (!profileRes.ok) throw new Error("Could not load user profile");
    if (!feedRes.ok) throw new Error("Could not load user posts");

    const profile = await profileRes.json();
    const feedData = await feedRes.json();
    const posts = feedData.items || [];

    document.getElementById("user-name").textContent =
      profile.displayname || profile.username || username;
    document.getElementById("user-summary").textContent =
      profile.bio || `Viewing public posts shared by ${profile.username || username}.`;

    if (!posts.length) {
      container.innerHTML = `<p class="muted">This user has not shared any public posts yet.</p>`;
      return;
    }

    container.innerHTML = posts.map(post => `
      <article class="list-card">
        <h3>${escapeHtml(post.title_snapshot || post.titlesnapshot || "Shared task")}</h3>
        <p>${escapeHtml(post.caption || "No caption provided.")}</p>
        <small>${escapeHtml(formatDate(post.created_at || post.createdat))}</small>
      </article>
    `).join("");
  } catch (err) {
    container.innerHTML = `<p class="muted">Failed to load user profile: ${escapeHtml(err.message)}</p>`;
  }
}

function formatDate(value) {
  if (!value) return "Recently";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Recently" : d.toLocaleString();
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"]/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[m]));
}