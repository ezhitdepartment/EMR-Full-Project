import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, Search, FilterX } from "lucide-react";
import YearMonthFilter from "../../components/common/YearMonthFilter";
import { loadLoginHistory } from "../../utils/auditLogs";
import { ROLE_OPTIONS } from "../../data/roles";

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

function fullName(entry) {
  const name = [entry.prefix, entry.firstName, entry.lastName].filter(Boolean).join(" ");
  return name || entry.username || "—";
}

// "2026-07-14T09:32:00.000Z" -> "07/14/2026 9:32 AM"
function formatLoginDate(iso) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  const datePart = dt.toLocaleDateString("en-US");
  const timePart = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}

export default function AuditLogs() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");

  async function refresh() {
    setLoading(true);
    setEntries(await loadLoginHistory());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // Refetch on tab focus, same as every other Supabase-backed list page —
    // another admin could sign in (or someone else could) while this tab
    // is in the background.
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  // Clearing month should clear day too — "day" only means anything once
  // a month is picked (matches YearMonthFilter disabling it otherwise).
  function handleMonthChange(value) {
    setMonth(value);
    if (!value) setDay("");
  }

  const years = useMemo(() => {
    const set = new Set(entries.map((e) => new Date(e.loggedInAt).getFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return entries
      .filter((e) => {
        const dt = new Date(e.loggedInAt);
        if (year && dt.getFullYear() !== Number(year)) return false;
        if (month && dt.getMonth() + 1 !== Number(month)) return false;
        if (day && dt.getDate() !== Number(day)) return false;
        return true;
      })
      .filter((e) => {
        if (!q) return true;
        return (
          fullName(e).toLowerCase().includes(q) ||
          (e.email || "").toLowerCase().includes(q) ||
          (e.licenseNumber || "").toLowerCase().includes(q) ||
          (ROLE_LABELS[e.role] || e.role || "").toLowerCase().includes(q)
        );
      });
    // Already sorted newest-first by loadLoginHistory()'s query.
  }, [entries, search, year, month, day]);

  function clearFilters() {
    setSearch("");
    setYear("");
    setMonth("");
    setDay("");
  }

  const hasActiveFilters = search || year || month || day;

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-1">Admin</p>
          <h1 className="text-2xl font-semibold text-slate-800">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Every account that has logged in to the system, newest first.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          title="Refresh"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex flex-col gap-1 min-w-64">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Search
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, license no., role…"
              className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>
        </div>

        <YearMonthFilter
          label="Date Logged In"
          year={year}
          month={month}
          day={day}
          years={years}
          onYearChange={setYear}
          onMonthChange={handleMonthChange}
          onDayChange={setDay}
          showDay
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <FilterX size={14} />
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="py-16 text-center text-sm text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <ShieldCheck size={28} />
            <p className="text-sm font-medium">No login activity found</p>
            <p className="text-xs text-slate-400">
              {entries.length === 0
                ? "Logins will show up here as accounts sign in."
                : "Try a different search or date range."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Role</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">License No.</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Date Logged In</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 align-top font-medium text-slate-800 whitespace-nowrap">
                      {fullName(e)}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 px-2.5 py-0.5 text-xs font-semibold uppercase">
                        {ROLE_LABELS[e.role] || e.role || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600 whitespace-nowrap">
                      {e.licenseNumber || "—"}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600 whitespace-nowrap">
                      {e.email || "—"}
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