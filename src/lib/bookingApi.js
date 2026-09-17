const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_NLE_API_BASE || "/api";

async function apiFetch(url, { method = "GET", token, body, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("We couldn't reach the booking server. Please check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || data.message || "Unable to submit your booking.");
    error.status = res.status;
    throw error;
  }
  return data;
}

export function createBooking(booking) {
  return apiFetch(API_BASE + "/create-booking", {
    method: "POST",
    body: booking,
  });
}
