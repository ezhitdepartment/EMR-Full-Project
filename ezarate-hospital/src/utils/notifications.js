// Notifications data layer — backed by the Spring Boot NotificationController
// (/api/notifications, /api/notifications/unread-count,
// /api/notifications/{id}/read) instead of Supabase (`notifications` +
// `notification_reads`). Same rationale/pattern as utils/patients.js,
// utils/encounters.js, and utils/labOrders.js.
//
// Two behavior changes versus the old Supabase version, both driven by the
// backend contract:
//  - The backend already scopes the list to the signed-in user's role and
//    read state (see NotificationService.listForCurrentUser /
//    CurrentUserProvider) — it reads the JWT itself, so a userId no longer
//    needs to be passed in. The functions below still ACCEPT a userId param
//    so every call site (NotificationBell.jsx) keeps working unchanged; it's
//    simply unused now.
//  - There's no bulk "mark all as read" endpoint — only
//    POST /api/notifications/{id}/read for one notification at a time — so
//    markAllAsRead() fires one call per unread notification instead.

import { api } from "../lib/apiClient";

function toNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedType: row.relatedType,
    relatedId: row.relatedId,
    createdAt: row.createdAt,
    read: row.read,
  };
}

// Every notification aimed at the current user's role, newest first, with
// per-user read state already merged in by the backend. `limit` maps onto
// the endpoint's page `size` param — GET /api/notifications returns a
// Spring Data Page, so the rows live under `content`.
export async function loadNotifications(_userId, limit = 100) {
  const { data, error } = await api.get(`/api/notifications?size=${limit}`);
  if (error) {
    console.error("loadNotifications failed:", error.message);
    return [];
  }
  return (data?.content || []).map(toNotification);
}

export async function markAsRead(notificationId, _userId) {
  const { error } = await api.post(`/api/notifications/${notificationId}/read`);
  if (error) console.error("markAsRead failed:", error.message);
}

export async function markAllAsRead(notifications, _userId) {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;
  const results = await Promise.all(
    unread.map((n) => api.post(`/api/notifications/${n.id}/read`))
  );
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) console.error("markAllAsRead failed:", firstError.message);
}

// Where clicking a notification should take you.
export function notificationLink(n) {
  switch (n.relatedType) {
    case "patient":
      return `/patients/${n.relatedId}`;
    case "encounter":
      return `/encounters`;
    case "lab_order":
      return `/lab-orders/${n.relatedId}`;
    default:
      return null;
  }
}

// "2026-07-06T09:15:00.000Z" -> "5 min ago" / "2 hr ago" / "07/06/2026"
export function formatRelativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const dt = new Date(iso);
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${m}/${d}/${dt.getFullYear()}`;
}