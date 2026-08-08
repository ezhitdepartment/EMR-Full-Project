import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ScrollText, RefreshCw } from "lucide-react";
import { loadLoginHistoryForUser } from "../../utils/auditLogs";

// "2026-07-14T09:32:00.000Z" -> "07/14/2026 9:32 AM" (matches AuditLogs.jsx)
function formatLoginDate(iso) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  const datePart = dt.toLocaleDateString("en-US");
  const timePart = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}

// Per-account activity history, reached via "View Audit Log" in Roles.jsx.
// Currently shows login history (backed by the same login_events table as
// the main Audit Logs page) — ready to extend with other activity types
// (patients created, consultations authored, etc.) as those get their own
// logging.
export default function UserAuditLogPage() {
  const { userId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const username = state?.username;

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setEntries(await loadLoginHistoryForUser(userId));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const displayName = username || entries[0]?.username;

  return (
    <div className="max-w-3xl">
      <button
        type="button"
        onClick={() => navigate("/admin/roles")}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Roles
      </button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-1">Admin</p>
          <h1 className="text-2xl font-semibold text-slate-800">
            Audit Log{displayName ? ` — ${displayName}` : ""}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Login history for this account.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          title="Refresh"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="py-16 text-center text-sm text-slate-400">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <ScrollText size={28} />
            <p className="text-sm font-medium">No activity recorded yet</p>
            <p className="text-xs text-slate-400">Logins will show up here once this account signs in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Event</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 align-top font-medium text-slate-800 whitespace-nowrap">
                      Logged in
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600 whitespace-nowrap">
                      {formatLoginDate(e.loggedInAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
