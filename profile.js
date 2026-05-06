document.addEventListener("DOMContentLoaded", async () => {
  const profileName = document.getElementById("profile-name");
  const profileBio = document.getElementById("profile-bio");
  const completedCount = document.getElementById("completed-count");
  const archivedCount = document.getElementById("archived-count");
  const postsCount = document.getElementById("posts-count");
  const profilePosts = document.getElementById("profile-posts");
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

  try {
    // Get current user profile
    const profileRes = await fetch("http://127.0.0.1:5000/auth/me", {
      credentials: "include"
    });
    if (!profileRes.ok) throw new Error("Failed to load profile");
    const profileData = await profileRes.json();
    const user = profileData.user;

    // Get user's tasks
    const tasksRes = await fetch("http://127.0.0.1:5000/api/v1/tasks?include_archived=true", {
      credentials: "include"
    });
    const tasksData = tasksRes.ok ? await tasksRes.json() : { items: [] };
    const tasks = tasksData.items || [];

    // Get user's posts
    const postsRes = await fetch("http://127.0.0.1:5000/api/v1/feed?author=" + encodeURIComponent(user.username), {
      credentials: "include"
    });
    const postsData = postsRes.ok ? await postsRes.json() : { items: [] };
    const posts = postsData.items || [];

    profileName.textContent = user.username || "My Profile";
    profileBio.textContent = user.bio || "Your progress, shared posts, and account summary appear here.";

    completedCount.textContent = tasks.filter(task => task.is_completed).length;
    archivedCount.textContent = tasks.filter(task => task.is_archived).length;
    postsCount.textContent = posts.length;

    if (!posts.length) {
      profilePosts.innerHTML = `<p class="muted-text">You have not shared any posts yet.</p>`;
      return;
    }

    profilePosts.innerHTML = posts.map(post => {
      const title = post.title_snapshot || "Shared task";
      const caption = post.caption || "No caption added.";
      const createdAt = post.created_at ? new Date(post.created_at).toLocaleString() : "Recently shared";

      return `
        <article class="profile-post-card">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(caption)}</p>
          <small>${escapeHtml(createdAt)}</small>
        </article>
      `;
    }).join("");
  } catch (error) {
    profileName.textContent = "Profile unavailable";
    profileBio.textContent = "There was a problem loading your profile.";
    profilePosts.innerHTML = `<p class="muted-text">Unable to load profile data right now. Error: ${error.message}</p>`;
  }
});

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}