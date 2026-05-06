// labels.js - Label management (future feature)

document.addEventListener("DOMContentLoaded", () => {
  setupLogout();
  setupEditLabelsButton();
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

function setupEditLabelsButton() {
  const editBtn = document.querySelector("button.btn-outline-secondary");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      alert("Label management feature coming soon! You'll be able to create, edit, and organize labels here.");
    });
  }
}
