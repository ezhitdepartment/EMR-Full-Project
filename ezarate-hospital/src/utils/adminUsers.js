// Admin-only user management — backed by the Spring Boot UserAdminController
// (/api/admin/users/**) instead of Supabase Edge Functions
// (admin-create-user, admin-set-suspension, admin-reset-password,
// admin-delete-account) and direct `profiles` table queries. The backend
// enforces ADMIN-only access itself (@PreAuthorize("hasRole('ADMIN')") on
// the whole controller) via the caller's JWT, so there's no service_role
// key or Edge Function indirection needed anymore — this file just calls
// the endpoints directly.
//
// Response shape note: UserResponse (the backend DTO) is already camelCase
// (firstName, lastName, licenseNumber, createdAt, ...) — every function
// below returns it as-is rather than translating from snake_case the way
// the old Supabase version had to.

import { api } from "../lib/apiClient";

// Full staff list — Roles.jsx's table. `status` is optional ("suspended"
// filters to archived accounts; omitted returns everyone). Throws on
// failure (same convention as every other function in this file below) so
// Roles.jsx can show the real error message instead of a silently empty
// table.
export async function loadStaffAccounts(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const { data, error } = await api.get(`/api/admin/users${query}`);
  if (error) throw new Error(error.message);
  return data || [];
}

// Creates a new staff login with whatever role the admin picks. Throws
// with a human-readable message on failure (missing fields, duplicate
// email, caller isn't actually an admin, etc.) — callers should catch and
// display err.message.
export async function createStaffAccount({
  email,
  password,
  username,
  role,
  prefix,
  firstName,
  lastName,
  licenseNumber,
}) {
  const { data, error } = await api.post("/api/admin/users", {
    email,
    password,
    username,
    role,
    prefix,
    firstName,
    lastName,
    licenseNumber,
  });
  if (error) throw new Error(error.message);
  return data;
}

// Suspends (or un-suspends) an account — blocks/unblocks sign-in.
export async function setAccountSuspension(targetUserId, suspend) {
  const { data, error } = await api.patch(`/api/admin/users/${targetUserId}/suspension`, {
    suspend,
  });
  if (error) throw new Error(error.message);
  return data.status; // "active" | "suspended"
}

// Resets the account's password to the fixed temporary password
// ("Temporary123"). The affected user should log in with it and change it
// right away.
export async function resetToOriginalPassword(targetUserId) {
  const { error } = await api.post(`/api/admin/users/${targetUserId}/reset-password`);
  if (error) throw new Error(error.message);
}

// Permanently deletes an account. Requires the CALLING admin's own
// username + password as a step-up confirmation (verified server-side).
export async function deleteAccount({ targetUserId, adminUsername, adminPassword }) {
  const { error } = await api.post(`/api/admin/users/${targetUserId}/delete`, {
    adminUsername,
    adminPassword,
  });
  if (error) throw new Error(error.message);
}

// Fetches one user's profile — used by the user profile page.
export async function getUserById(userId) {
  const { data, error } = await api.get(`/api/admin/users/${userId}`);
  if (error) return null;
  return data;
}

// Saves a new profile photo (base64 data URL) and returns the updated
// profile.
export async function saveUserPhoto(userId, photoDataUrl) {
  const { data, error } = await api.patch(`/api/admin/users/${userId}/photo`, {
    photo: photoDataUrl,
  });
  if (error) throw new Error(error.message);
  return data;
}

// Suspended accounts, for the Archive page's "Archived User Accounts" tab.
// "Archived" here means suspended (status = 'suspended') — the same state
// Roles.jsx's Suspend/Unsuspend toggle already writes via
// setAccountSuspension() above. A permanently deleted account isn't
// listed here at all (deleteAccount() removes it entirely), so this only
// ever shows accounts an admin can still un-suspend and restore.
//
// Unlike loadStaffAccounts(), this one swallows errors and returns []
// instead of throwing — Archive.jsx awaits it inside a Promise.all
// alongside several other non-throwing loaders (loadEncounters(),
// loadLabOrders(), etc.), and one rejection in that group would blank out
// every other tab's data along with it.
export async function loadArchivedAccounts() {
  try {
    return await loadStaffAccounts("suspended");
  } catch (err) {
    console.error("loadArchivedAccounts failed:", err.message);
    return [];
  }
}

// Activity summary for the user profile page: how many patients they
// registered, and how many consultation entries they've authored (plus
// how many distinct patients those consultations touched).
export async function getUserActivityStats(userId) {
  const { data, error } = await api.get(`/api/admin/users/${userId}/activity-stats`);
  if (error) {
    console.error("getUserActivityStats failed:", error.message);
    return { patientsCreated: 0, consultationsAuthored: 0, patientsConsulted: 0 };
  }
  return data;
}