// ============================================================================
// STANDARDIZED API RESPONSE HELPERS
// ============================================================================

export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...headers,
    },
  });
}

export function errorResponse(message, status = 400, details = null) {
  return jsonResponse(
    {
      ok: false,
      error: message,
      ...(details ? { details } : {}),
    },
    status
  );
}
