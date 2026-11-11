// Netlify adapter for the existing Vercel-style API handlers.
// This keeps the backend contract (/api/*) unchanged while allowing the same
// application to run fully on Netlify without requiring a separate API host.

import catalogHandler from "../../api/catalog.js";
import catalogProductsHandler from "../../api/catalog/products.js";
import inquiryHandler from "../../api/inquiry.js";
import createBookingHandler from "../../api/create-booking.js";
import adminBootstrapHandler from "../../api/admin/bootstrap.js";
import adminInquiriesHandler from "../../api/admin/inquiries.js";
import adminStateHandler from "../../api/admin/state.js";

const ROUTES = new Map([
  ["catalog", catalogHandler],
  ["catalog/products", catalogProductsHandler],
  ["inquiry", inquiryHandler],
  ["create-booking", createBookingHandler],
  ["admin/bootstrap", adminBootstrapHandler],
  ["admin/inquiries", adminInquiriesHandler],
  ["admin/state", adminStateHandler],
]);

function safeDecode(value) {
  try { return decodeURIComponent(value); } catch { return ""; }
}

function routeFromEvent(event) {
  const candidates = [
    event?.rawPath,
    event?.path,
    event?.requestContext?.http?.path,
    event?.rawUrl,
    event?.url,
  ].filter(Boolean).map(String);

  for (const candidate of candidates) {
    // Strip query string first for cleaner matching
    const pathOnly = candidate.split("?")[0];

    // Full URL or path containing /.netlify/functions/api/<route>
    const fnMatch = pathOnly.match(/\/\.netlify\/functions\/api(?:\/(.+))?$/);
    if (fnMatch) {
      const slug = (fnMatch[1] || "").replace(/^\/+|\/+$/g, "");
      if (slug) return safeDecode(slug);
    }

    // Path containing /api/<route> (original frontend URL, or after Netlify rewrite)
    const apiMatch = pathOnly.match(/\/api\/(.+)$/);
    if (apiMatch) {
      const slug = apiMatch[1].replace(/^\/+|\/+$/g, "");
      if (slug) return safeDecode(slug);
    }

    // Netlify sometimes passes only the splat portion (e.g. "admin/state")
    // when the function is invoked via a rewrite rule.
    // Check if the bare path (no leading slash) matches a known route.
    const bare = pathOnly.replace(/^\/+|\/+$/g, "");
    if (bare && ROUTES.has(bare)) return bare;
  }

  return "";
}

// Public form endpoints never need large bodies; the admin catalog save can be
// several MB (Netlify itself rejects anything above ~6 MB).
const PUBLIC_BODY_LIMIT = 256 * 1024;
const ADMIN_BODY_LIMIT = 6 * 1024 * 1024;

function bodyLimitFor(route) {
  return String(route).startsWith("admin/") ? ADMIN_BODY_LIMIT : PUBLIC_BODY_LIMIT;
}

function parseBody(event, maxBytes) {
  if (!event?.body) return { body: {}, tooLarge: false };
  let raw = String(event.body);
  if (raw.length > maxBytes * 1.4) return { body: {}, tooLarge: true };
  if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
  if (!raw) return { body: {}, tooLarge: false };
  if (Buffer.byteLength(raw, "utf8") > maxBytes) return { body: {}, tooLarge: true };
  try { return { body: JSON.parse(raw), tooLarge: false }; } catch { return { body: {}, tooLarge: false }; }
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) {
      this.statusCode = Number(code) || 200;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(payload) {
      this.setHeader("Content-Type", "application/json; charset=utf-8");
      this.body = JSON.stringify(payload);
      return this;
    },
    send(payload) {
      if (typeof payload === "string") {
        this.body = payload;
      } else {
        this.setHeader("Content-Type", "application/json; charset=utf-8");
        this.body = JSON.stringify(payload);
      }
      return this;
    },
    end(payload = "") {
      this.body = payload;
      return this;
    },
  };
}

// The site calls this API from its own origin, which needs no CORS headers at all.
// Cross-origin access is therefore limited to known site origins (never "*").
function allowedOrigins() {
  const set = new Set(["https://nextlevelevents.in", "https://www.nextlevelevents.in"]);
  const add = (value) => {
    const text = String(value || "").trim();
    if (!text) return;
    try { set.add(new URL(text).origin); } catch { /* ignore malformed value */ }
  };
  [process.env.URL, process.env.DEPLOY_URL, process.env.DEPLOY_PRIME_URL, process.env.SITE_URL].forEach(add);
  String(process.env.ALLOWED_ORIGINS || "").split(",").forEach(add);
  const context = process.env.CONTEXT;
  if (!context || context === "dev") {
    ["http://localhost:5173", "http://localhost:4173", "http://localhost:8888", "http://localhost:3000"].forEach(add);
  }
  return set;
}

function corsHeadersFor(origin) {
  const base = { Vary: "Origin", "X-Content-Type-Options": "nosniff" };
  if (origin && allowedOrigins().has(origin)) {
    return {
      ...base,
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };
  }
  return base;
}

export async function handler(event, context) {
  // Resolve HTTP method across all Netlify event shapes (v1, v2, Lambda compat)
  const method = (
    event?.httpMethod ||
    event?.method ||
    event?.requestContext?.http?.method ||
    "GET"
  ).toUpperCase();

  const headers = Object.fromEntries(
    Object.entries(event?.headers || {}).map(([key, value]) => [String(key).toLowerCase(), value])
  );
  const CORS_HEADERS = corsHeadersFor(String(headers.origin || ""));

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const route = routeFromEvent(event);
  const target = ROUTES.get(route);

  if (!target) {
    return {
      statusCode: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: false, error: "API route not found." }),
    };
  }

  const parsed = parseBody(event, bodyLimitFor(route));
  if (parsed.tooLarge) {
    return {
      statusCode: 413,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: false, error: "Request is too large." }),
    };
  }
  const query = event?.queryStringParameters || {};
  const req = {
    method,
    headers,
    body: parsed.body,
    query,
    url: event?.rawUrl || event?.path || `/api/${route}`,
    waitUntil: typeof context?.waitUntil === "function" ? context.waitUntil.bind(context) : null,
  };
  const res = createResponse();

  try {
    await target(req, res);
    return {
      statusCode: res.statusCode || 200,
      headers: { ...CORS_HEADERS, ...res.headers },
      body: res.body || "",
    };
  } catch (error) {
    console.error(`Netlify API error for /api/${route}:`, error);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: false, error: "Internal server error." }),
    };
  }
}
