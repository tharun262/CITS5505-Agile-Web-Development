// auth-guard.js

// Backend uses Flask session cookies, so we need to verify auth via /auth/me
async function checkAuth() {
  try {
    const res = await fetch("http://127.0.0.1:5000/auth/me", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) {
      window.location.replace("login.html");
    }
  } catch {
    window.location.replace("login.html");
  }
}

// Run auth check immediately
checkAuth();
