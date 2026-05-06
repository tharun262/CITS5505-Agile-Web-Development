document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const profileName = document.getElementById("profile-name");
  const profileBio = document.getElementById("profile-bio");
  const completedCount = document.getElementById("completed-count");
  const archivedCount = document.getElementById("archived-count");
  const postsCount = document.getElementById("posts-count");
  const profilePosts = document.getElementById("profile-posts");
  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const [profileRes, postsRes, tasksRes, archiveRes] = await Promise.all([
      fetch("/profiles/me", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch("/posts/me", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch("/tasks", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch("/archive", {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    if (!profileRes.ok) throw new Error("Failed to load profile");

    const profile = await profileRes.json();
    const posts = postsRes.ok ? await postsRes.json() : [];
    const tasks = tasksRes.ok ? await tasksRes.json() : [];
    const archived = archiveRes.ok ? await archiveRes.json() : [];

    profileName.textContent = profile.username || "My Profile";
    profileBio.textContent = profile.bio || "Your progress, shared posts, and account summary appear here.";

    completedCount.textContent = Array.isArray(tasks)
      ? tasks.filter(task => task.completed || task.is_completed).length
      : 0;

    archivedCount.textContent = Array.isArray(archived) ? archived.length : 0;
    postsCount.textContent = Array.isArray(posts) ? posts.length : 0;

    if (!Array.isArray(posts) || posts.length === 0) {
      profilePosts.innerHTML = `<p class="muted-text">You have not shared any posts yet.</p>`;
      return;
    }

    profilePosts.innerHTML = posts.map(post => {
      const title = post.task_title || post.title || "Shared task";
      const caption = post.caption || "No caption added.";
      const createdAt = post.created_at
        ? new Date(post.created_at).toLocaleString()
        : "Recently shared";

      return `
        <article class="profile-post-card">
          <h3>${title}</h3>
          <p>${caption}</p>
          <small>${createdAt}</small>
        </article>
      `;
    }).join("");
  } catch (error) {
    profileName.textContent = "Profile unavailable";
    profileBio.textContent = "There was a problem loading your profile.";
    profilePosts.innerHTML = `<p class="muted-text">Unable to load profile data right now.</p>`;
  }
});