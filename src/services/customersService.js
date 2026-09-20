// Customer enquiry API. Public writes go through the server so database
// credentials and validation stay off the client.
const API_BASE = import.meta.env.VITE_API_URL || "/api";

function createRequestId() {
  try { return crypto.randomUUID(); } catch { return `inq_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }
}

export async function submitInquiry(inquiryData) {
  let res;
  try {
    res = await fetch(`${API_BASE}/inquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ requestId: createRequestId(), website: "", ...inquiryData }),
    });
  } catch (error) {
    throw new Error("The inquiry service is unreachable. Please check the server/API connection and try again.");
  }

  const contentType = res.headers.get("content-type") || "";
  let data = {};
  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => ({}));
  } else {
    // Vite/Vercel can return an HTML error page when an API route is missing.
    // Convert that into a useful message instead of hiding it behind the same
    // generic submission error.
    const text = await res.text().catch(() => "");
    if (text && !res.ok) data = { error: `Inquiry service returned HTTP ${res.status}.` };
  }

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Unable to send your enquiry (HTTP ${res.status}).`);
  }
  return data;
}
