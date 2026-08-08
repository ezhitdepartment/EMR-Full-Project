import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  ScrollText,
  UserRound,
  Users2,
  Ban,
  Trash2,
  KeyRound,
  Circle,
} from "lucide-react";
import { ROLE_OPTIONS } from "../../data/roles";
import { useAuth } from "../../context/AuthContext";
import { loadStaffAccounts, setAccountSuspension } from "../../utils/adminUsers";
import ResetPasswordModal from "./ResetPasswordModal";
import DeleteAccountModal from "./DeleteAccountModal";

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

const ROLE_BADGE_STYLES = {
  admin: "bg-indigo-100 text-indigo-700",
  doctor: "bg-teal-100 text-teal-700",
  er_nurse: "bg-rose-100 text-rose-700",
  opd_nurse: "bg-amber-100 text-amber-700",
  med_tech: "bg-sky-100 text-sky-700",
  xray_tech: "bg-violet-100 text-violet-700",
  pharmacist: "bg-emerald-100 text-emerald-700",
  staff: "bg-slate-200 text-slate-700",
};

// "2026-07-06T09:15:00.000Z" -> "07/06/2026" (matches the rest of the app).
function formatDateCreated(iso) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const y = dt.getFullYear();
  return `${m}/${d}/${y}`;
}

function StatusBadge({ status, online }) {
  if (status === "suspended") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
        <Circle size={7} className="fill-current" />
        Suspended
      </span>
    );
  }
  if (online) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        <Circle size={7} className="fill-current" />
        Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
      <Circle size={7} className="fill-current" />
      Offline
    </span>
  );
}

export default function Roles() {
  const navigate = useNavigate();
  const { user: currentUser, onlineUserIds } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(""); // row currently mid-action (suspend toggle)
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await loadStaffAccounts();
      setUsers([...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      setError(err.message || "Couldn't load staff accounts.");
      setUsers([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleToggleSuspend(u) {
    const suspending = u.status !== "suspended";
    const confirmed = window.confirm(
      suspending
        ? `Suspend ${u.username}? They won't be able to log in until you unsuspend them.`
        : `Unsuspend ${u.username}? They'll be able to log in again.`
    );
    if (!confirmed) return;

    setBusyId(u.id);
    try {
      const newStatus = await setAccountSuspension(u.id, suspending);
      setUsers((list) => list.map((row) => (row.id === u.id ? { ...row, status: newStatus } : row)));
    } catch (err) {
      alert(err.message || "Something went wrong updating this account's status.");
    } finally {
      setBusyId("");
    }
  }

  function handleAccountDeleted(userId) {
    setUsers((list) => list.filter((row) => row.id !== userId));
    setDeleteTarget(null);
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-1">Admin</p>
          <h1 className="text-2xl font-semibold text-slate-800">Roles</h1>
          <p className="text-sm text-slate-500 mt-1">
            All staff accounts and their assigned role.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          title="Refresh list"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <Users2 size={28} />
            <p className="text-sm font-medium text-red-600">Couldn't load users</p>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        ) : !loading && users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <Users2 size={28} />
            <p className="text-sm font-medium">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Username</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Role</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Date Created</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-sm text-slate-400">
                      Loading users…
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSuspended = u.status === "suspended";
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr key={u.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 align-top font-medium text-slate-800 whitespace-nowrap">
                          {u.username || "—"}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              ROLE_BADGE_STYLES[u.role] || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {ROLE_LABELS[u.role] || u.role || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-600 whitespace-nowrap">
                          {u.email || "—"}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <StatusBadge status={u.status} online={onlineUserIds.has(u.id)} />
                        </td>
                        <td className="px-4 py-3 align-top text-slate-600 whitespace-nowrap">
                          {formatDateCreated(u.createdAt)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                            <button
                              type="button"
                              title="View Audit Log"
                              onClick={() =>
                                navigate(`/admin/roles/${u.id}/audit-log`, {
                                  state: { username: u.username },
                                })
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
                            >
                              <ScrollText size={13} />
                              View Audit Log
                            </button>
                            <button
                              type="button"
                              title="View Profile"
                              onClick={() => navigate(`/admin/roles/${u.id}`)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
                            >
                              <UserRound size={13} />
                              View Profile
                            </button>
                            <button
                              type="button"
                              title="Reset Password"
                              onClick={() => setResetTarget(u)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
                            >
                              <KeyRound size={13} />
                              Reset Password
                            </button>
                            <button
                              type="button"
                              title={isSelf ? "You can't suspend your own account" : "Suspend"}
                              onClick={() => handleToggleSuspend(u)}
                              disabled={isSelf || busyId === u.id}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                                isSuspended
                                  ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                  : "border-amber-300 text-amber-700 hover:bg-amber-50"
                              }`}
                            >
                              <Ban size={13} />
                              {busyId === u.id ? "Updating…" : isSuspended ? "Unsuspend" : "Suspend"}
                            </button>
                            <button
                              type="button"
                              title={isSelf ? "You can't delete your own account" : "Delete Account"}
                              onClick={() => setDeleteTarget(u)}
                              disabled={isSelf}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={13} />
                              Delete Account
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={() => {
            setResetTarget(null);
            alert(`${resetTarget.username}'s password has been reset to "Temporary123".`);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteAccountModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => handleAccountDeleted(deleteTarget.id)}
        />
      )}
    </div>
  );
}