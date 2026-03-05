let trackedDate: string | null = null;

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function trackActivity() {
  const today = todayStr();
  if (trackedDate === today) return;
  trackedDate = today;
  fetch("/api/activity", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }).catch(() => {
    trackedDate = null;
  });
}
