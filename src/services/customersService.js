// Customer enquiry API. Public writes go through the server so database
// credentials and validation stay off the client.
const API_BASE = import.meta.env.VITE_API_URL || "/api";

function createRequestId() {
  try { return crypto.randomUUID(); } catch { return `inq_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }
}

export async function submitInquiry(inquiryData) {
  const res = await fetch(`${API_BASE}/inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId: createRequestId(), website: "", ...inquiryData }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "Unable to send your enquiry.");
  return data;
}
