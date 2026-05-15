(() => {
  const API_URL = "http://127.0.0.1:5000/api/v1/tasks?page_size=100";
  const CHECK_INTERVAL_MS = 60 * 1000;
  const SOON_WINDOW_MS = 5 * 60 * 1000;
  const STORAGE_KEY = "keepliteNotifiedReminderKeys";

  let checkInterval = null;

  function getNotifiedKeys() {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch (_) {
      return new Set();
    }
  }

  function saveNotifiedKeys(keys) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys].slice(-300)));
  }

  async function fetchActiveReminders() {
    const response = await fetch(API_URL, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.items || []).filter(task => task.due_at && !task.is_completed && !task.is_archived);
  }

  function notify(title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    new Notification(title, {
      body,
      tag: `keeplite-${title}-${body}`,
      renotify: false
    });
  }

  async function checkReminders() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      const tasks = await fetchActiveReminders();
      const notifiedKeys = getNotifiedKeys();
      const now = Date.now();

      tasks.forEach((task) => {
        const dueTime = new Date(task.due_at).getTime();
        if (Number.isNaN(dueTime)) return;

        const title = task.title || "A reminder";
        const diff = dueTime - now;
        const soonKey = `${task.id}-${task.due_at}-soon`;
        const dueKey = `${task.id}-${task.due_at}-due`;

        if (diff > 0 && diff <= SOON_WINDOW_MS && !notifiedKeys.has(soonKey)) {
          notify("Reminder coming up", `${title} is due in less than 5 minutes.`);
          notifiedKeys.add(soonKey);
        }

        if (diff <= 0 && !notifiedKeys.has(dueKey)) {
          notify("Reminder due now", `${title} is due now.`);
          notifiedKeys.add(dueKey);
        }
      });

      saveNotifiedKeys(notifiedKeys);
    } catch (err) {
      console.error("Reminder notification check failed:", err);
    }
  }

  function start() {
    if (checkInterval) return;

    checkReminders();
    checkInterval = setInterval(checkReminders, CHECK_INTERVAL_MS);
  }

  window.KeepLiteReminderNotifications = {
    start,
    checkNow: checkReminders
  };

  if ("Notification" in window && Notification.permission === "granted") {
    start();
  }
})();
