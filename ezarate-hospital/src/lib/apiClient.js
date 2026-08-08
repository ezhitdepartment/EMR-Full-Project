// Talks to the Spring Boot backend that replaced Supabase. Every call
// returns { data, error } — same shape supabase-js calls used — on purpose,
// so migrating each utils/*.js file away from `supabase.from(...)` stays a
// mechanical, low-risk swap instead of a rewrite of every call site's error
// handling.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
// Exported for the rare call sites that can't go through request() below —
// file uploads (multipart, not JSON) and file downloads (need the raw
// Response/blob, not a parsed JSON body). See utils/labOrders.js's
// uploadLabOrderFile / getLabOrderFileUrl for the pattern.
export { BASE_URL };

const TOKEN_KEY = "ezarate_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // DELETE and some PUT endpoints (e.g. change-password) return 204 with no body.
    if (res.status === 204) {
      return { data: null, error: null };
    }

    const contentType = res.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await res.json() : null;

    if (!res.ok) {
      // Matches GlobalExceptionHandler's ErrorResponse shape: { "error": "message" }.
      const message = payload?.error || res.statusText || `Request failed (${res.status})`;
      return { data: null, error: { message, status: res.status } };
    }

    return { data: payload, error: null };
  } catch (err) {
    // Network failure, backend unreachable, CORS issue, etc.
    return { data: null, error: { message: err.message || "Network error" } };
  }
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  patch: (path, body) => request("PATCH", path, body),
  del: (path) => request("DELETE", path),
};