// Audit Logs data layer — currently just login events (who logged in and
// when), backed by the Spring Boot AuditLogController (/api/audit-logs)
// instead of Supabase's `login_events` table directly.
//
// TWO THINGS THAT CHANGED FROM THE SUPABASE VERSION:
//
// 1. recordLogin() is gone. AuthService.login() on the backend now writes
//    the LoginEvent itself, server-side, the moment a sign-in succeeds
//    (same "copy the name/role/etc. in at the moment of login" reasoning
//    the old schema used) — so there's nothing left for the frontend to
//    write. Nothing in this app called recordLogin() anymore even before
//    this change (see the comment in context/AuthContext.jsx), so removing
//    it is a no-op for every existing call site.
//
// 2. GET /api/audit-logs is paginated (Spring Data Page, default size 50)
//    and admin-only, with no per-user filter built in yet. loadLoginHistory()
//    below pages through every result to reconstruct the old "give me
//    everything" behavior; loadLoginHistoryForUser() reuses the same fetch
//    and filters by userId client-side, since the backend has no
//    ?userId= param (yet) to push that filtering down to the DB.

import { api } from "../lib/apiClient";

function toLoginEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    username: row.username,
    role: row.role,
    prefix: row.prefix || "",
    firstName: row.firstName || "",
    lastName: row.lastName || "",
    email: row.email || "",
    licenseNumber: row.licenseNumber || "",
    loggedInAt: row.loggedInAt,
  };
}

// Pages through GET /api/audit-logs (admin-only, newest-first) and
// collects every entry — the backend caps each page at PAGE_SIZE, so a
// single request can't return the full list on its own.
const PAGE_SIZE = 200;

async function fetchAllLoginEvents() {
  const all = [];
  let page = 0;
  // Safety cap so a backend bug (e.g. `last` never turning true) can't
  // spin this into an infinite loop.
  for (let guard = 0; guard < 100; guard += 1) {
    const { data, error } = await api.get(`/api/audit-logs?page=${page}&size=${PAGE_SIZE}`);
    if (error) {
      console.error("Loading audit logs failed:", error.message);
      break;
    }
    all.push(...(data?.content || []));
    if (!data || data.last || data.content?.length === 0) break;
    page += 1;
  }
  return all.map(toLoginEvent);
}

export async function loadLoginHistory() {
  return fetchAllLoginEvents();
}

// Same as loadLoginHistory() but scoped to one account — backs the
// per-user "View Audit Log" page reached from Roles.jsx.
export async function loadLoginHistoryForUser(userId) {
  const all = await fetchAllLoginEvents();
  return all.filter((entry) => entry.userId === userId);
}

// Archive.jsx's "Delete Permanently" button on the Archived Audit Logs
// tab. Admin-only, enforced server-side (AuditLogController is
// @PreAuthorize("hasRole('ADMIN')") at the class level).
export async function deleteLoginEvent(id) {
  const { error } = await api.del(`/api/audit-logs/${encodeURIComponent(id)}`);
  if (error) throw new Error(error.message);
}