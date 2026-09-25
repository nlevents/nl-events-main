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
import accountBookingsHandler from "../../api/account/bookings.js";
import accountProfileHandler from "../../api/account/profile.js";

const ROUTES = new Map([
  ["catalog", catalogHandler],
  ["catalog/products", catalogProductsHandler],
  ["inquiry", inquiryHandler],
  ["create-booking", createBookingHandler],
  ["admin/bootstrap", adminBootstrapHandler],
  ["admin/inquiries", adminInquiriesHandler],
  ["admin/state", adminStateHandler],
  ["account/bookings", accountBookingsHandler],
  ["account/profile", accountProfileHandler],
]);

function routeFromEvent(event) {
  const candidates = [
    event?.rawPath,
    event?.path,
    event?.requestContext?.http?.path,
    event?.rawUrl,
    event?.url,
  ].filter(Boolean).map(String);

  // Debug: log in production so Netlify Function logs reveal the actual path shapes
  console.log("[api] routeFromEvent candidates:", JSON.stringify(candidates));

  for (const candidate of candidates) {
    // Strip query string first for cleaner matching
    const pathOnly = candidate.split("?")[0];

    // Full URL or path containing /.netlify/functions/api/<route>
    const fnMatch = pathOnly.match(/\/\.netlify\/functions\/api(?:\/(.+))?$/);
    if (fnMatch) {
      const slug = (fnMatch[1] || "").replace(/^\/+|\/+$/g, "");
      if (slug) return decodeURIComponent(slug);
    }

    // Path containing /api/<route> (original frontend URL, or after Netlify rewrite)
    const apiMatch = pathOnly.match(/\/api\/(.+)$/);
    if (apiMatch) {
      const slug = apiMatch[1].replace(/^\/+|\/+$/g, "");
      if (slug) return decodeURIComponent(slug);
    }

    // Netlify sometimes passes only the splat portion (e.g. "admin/state")
    // when the function is invoked via a rewrite rule.
    // Check if the bare path (no leading slash) matches a known route.
    const bare = pathOnly.replace(/^\/+|\/+$/g, "");
    if (bare && ROUTES.has(bare)) return bare;
  }

  return "";
}

function parseBody(event) {
  if (!event?.body) return {};
  let raw = String(event.body);
  if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function handler(event) {
  // Resolve HTTP method across all Netlify event shapes (v1, v2, Lambda compat)
  const method = (
    event?.httpMethod ||
    event?.method ||
    event?.requestContext?.http?.method ||
    "GET"
  ).toUpperCase();

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

  const headers = Object.fromEntries(
    Object.entries(event?.headers || {}).map(([key, value]) => [String(key).toLowerCase(), value])
  );
  const query = event?.queryStringParameters || {};
  const req = {
    method,
    headers,
    body: parseBody(event),
    query,
    url: event?.rawUrl || event?.path || `/api/${route}`,
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
      body: JSON.stringify({ ok: false, error: error?.message || "Internal server error." }),
    };
  }
}
