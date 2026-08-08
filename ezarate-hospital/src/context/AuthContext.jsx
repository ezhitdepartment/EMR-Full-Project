import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, clearToken } from "../lib/apiClient";

const AuthContext = createContext(null);

// Backend's UserSummary record already serializes as camelCase JSON
// (id, username, role, prefix, firstName, lastName, email, licenseNumber,
// status, photo) — this just normalizes nulls to "" so components that do
// `user.photo || <default>` keep behaving exactly like they did against
// the old profiles-row shape.
function normalizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    prefix: u.prefix || "",
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    email: u.email || "",
    licenseNumber: u.licenseNumber || "",
    status: u.status || "active",
    photo: u.photo || "",
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Distinguishes "still checking for an existing session" from "checked,
  // nobody's logged in" — AppRoutes.jsx should show a loading state instead
  // of bouncing to /login for a split second on every page refresh.
  const [loading, setLoading] = useState(true);

  // TODO: Supabase Realtime Presence (who's currently online in Roles.jsx)
  // has no equivalent yet in the plain REST backend — this always reports
  // "nobody online" rather than silently pretending to track it. Revisit
  // with either a polling "last seen" heartbeat endpoint or a WebSocket/
  // STOMP channel once that's worth building.
  const [onlineUserIds] = useState(() => new Set());

  useEffect(() => {
    let active = true;

    // Restore an existing session on page load/refresh. There's no
    // server-side session to re-check like Supabase's getSession() had —
    // just a JWT sitting in localStorage, so we ask the backend to confirm
    // it's still valid (and pick up any role/status change since it was
    // issued) via GET /api/auth/me.
    async function restoreSession() {
      const token = getToken();
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      const { data, error } = await api.get("/api/auth/me");
      if (!active) return;

      if (error) {
        // Expired/invalid token, or the account no longer exists — same
        // "not logged in" outcome either way.
        clearToken();
        setUser(null);
      } else {
        setUser(normalizeUser(data));
      }
      setLoading(false);
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  async function login(usernameOrEmail, password, role) {
    const input = (usernameOrEmail || "").trim();

    // The backend accepts either a username or an email directly (see
    // UserRepository.findByUsernameOrEmail) — no need to detect which one
    // this is or look up an email first, unlike the old Supabase Auth flow.
    const { data, error } = await api.post("/api/auth/login", {
      usernameOrEmail: input,
      password,
      role: role || null,
    });

    if (error) {
      // Backend's error messages already match exactly what this used to
      // return: "Invalid username or password.", "This account has been
      // suspended. Contact an admin.", "This account isn't registered
      // under the selected role." — see AuthService/GlobalExceptionHandler.
      return { success: false, error: error.message };
    }

    setToken(data.token);
    const profile = normalizeUser(data.user);
    setUser(profile);
    // login_events is written server-side inside AuthService.login() now —
    // no separate recordLogin() call needed from here anymore.
    return { success: true, role: profile.role };
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  // Personal Information tab in Account Settings.
  async function updateProfile(updates) {
    if (!user) return { success: false, error: "Not logged in." };

    const { data, error } = await api.put("/api/auth/me", {
      prefix: updates.prefix,
      firstName: updates.firstName,
      lastName: updates.lastName,
      licenseNumber: updates.licenseNumber,
    });

    if (error) return { success: false, error: error.message };

    setUser(normalizeUser(data));
    return { success: true };
  }

  // Security Information tab in Account Settings. The backend verifies the
  // old password itself now (AuthService.changePassword), so there's no
  // need for the old "sign in again to confirm" trick Supabase Auth needed.
  async function changePassword(oldPassword, newPassword) {
    if (!user) return { success: false, error: "Not logged in." };

    const { error } = await api.put("/api/auth/change-password", {
      oldPassword,
      newPassword,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, onlineUserIds, login, logout, updateProfile, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}