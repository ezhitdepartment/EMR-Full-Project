// Shared list-page component behind BOTH the "Lab Orders" tab and the
// "X-Ray Orders" tab. The two pages are just this same view scoped to a
// different set of diagnostic `formTypes` (see FORM_TYPE_BY_TEST in
// utils/labOrders.js) — Laboratory tests only for Lab Orders, X-Ray +
// Ultrasound & Imaging for X-Ray Orders. Everything else (search, filters,
// sort, pagination, CSV export) is identical, so it lives
// here once instead of being duplicated across two files.
//
// Scoping happens at TWO levels, same as before:
//   1. `formTypes` (this component's own scope) — which tab you're on.
//   2. Role — med_tech/xray_tech only ever see orders that contain at
//      least one test in their own specialty at all (an order can mix a
//      CBC with a Chest X-Ray; each tech only cares about their half of
//      it, but the ORDER itself still shows up on both tabs for anyone who
//      can reach both).
//
// An order that has tests in both scopes will legitimately appear on both
// the Lab Orders and X-Ray Orders tabs — that's expected, not a bug: it's
// one order/one bill, but two different specialties' worklists both have
// something to do on it.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Search,
  Plus,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
  FilterX,
  MoreVertical,
  Download,
  ListOrdered,
} from "lucide-react";
import CreateLabOrderModal from "./CreateLabOrderModal";
import YearMonthFilter from "../../components/common/YearMonthFilter";
import { formatAge } from "../../utils/age";
import {
  DIAGNOSTIC_OPTIONS,
  formatDateCreated,
  loadLabOrders,
  FORM_TYPE_BY_TEST,
} from "../../utils/labOrders";
import { getOrderStatus, ORDER_STATUS_STYLES } from "../../utils/labOrderDiagnostics";

const PAGE_SIZE = 8;

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap ${
        active ? "text-teal-700" : ""
      }`}
    >
      {label}
      <ChevronsUpDown size={12} className={active ? "text-teal-700" : "text-slate-400"} />
      {active && <span className="sr-only">{sortDir}</span>}
    </button>
  );
}

export default function OrdersListView({
  formTypes,
  title,
  subtitle,
  emptyMessage,
  csvFilename,
  icon: EmptyIcon,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Techs work results, not create orders — that's the requesting nurse's
  // job. Doctors/admins/nurses keep the ability to create. Matches
  // current_user_can_create_lab_order() in the SQL exactly, so the button
  // never appears for a role that would get rejected on submit anyway.
  const canCreateOrder = !["med_tech", "xray_tech"].includes(user?.role);

  // This page's own scope (Laboratory, or X-Ray + Ultrasound & Imaging) —
  // an order only belongs on this tab if at least one of its tests falls
  // in this list.
  const inScope = (diagnosticName) => formTypes.includes(FORM_TYPE_BY_TEST[diagnosticName]);

  // Only offer diagnostics from this tab's own scope in the filter
  // dropdown — no point letting someone filter the X-Ray Orders tab down
  // to "CBC".
  const diagnosticOptions = useMemo(
    () => DIAGNOSTIC_OPTIONS.filter((d) => inScope(d)),
    [formTypes]
  );

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [diagnosticFilter, setDiagnosticFilter] = useState("All");
  const [dateYear, setDateYear] = useState("");
  const [dateMonth, setDateMonth] = useState("");
  const [sortField, setSortField] = useState("dateCreated");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function refresh() {
    const all = await loadLabOrders();
    const scoped = all
      .filter((o) => (o.diagnostics || []).some((d) => inScope(d)))
      .map((o) => ({
        ...o,
        // Only show/count the diagnostics that belong to THIS tab — a
        // mixed order still appears on both tabs, but each tab only ever
        // displays its own half of it.
        diagnostics: (o.diagnostics || []).filter((d) => inScope(d)),
      }));
    setOrders(scoped);
  }

  useEffect(() => {
    refresh();
    // No more "storage" event — lab orders live in Supabase now, not
    // localStorage. "focus" still catches "came back to this tab".
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formTypes.join(",")]);

  useEffect(() => {
    setPage(1);
  }, [search, diagnosticFilter, dateYear, dateMonth]);

  const hasActiveFilters =
    search.trim() !== "" || diagnosticFilter !== "All" || dateYear !== "" || dateMonth !== "";

  function clearFilters() {
    setSearch("");
    setDiagnosticFilter("All");
    setDateYear("");
    setDateMonth("");
    setPage(1);
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const withDerived = orders.map((o) => ({
      ...o,
      _fullName: [o.patient?.lastName, o.patient?.firstName, o.patient?.middleName]
        .filter(Boolean)
        .join(" "),
    }));

    const q = search.trim().toLowerCase();

    const result = withDerived.filter((o) => {
      if (diagnosticFilter !== "All" && !(o.diagnostics || []).includes(diagnosticFilter))
        return false;
      if (dateYear || dateMonth) {
        const created = o.dateCreated ? new Date(o.dateCreated) : null;
        if (!created) return false;
        if (dateYear && created.getFullYear().toString() !== dateYear) return false;
        if (dateMonth && created.getMonth() + 1 !== Number(dateMonth)) return false;
      }
      if (!q) return true;
      return o.id.toLowerCase().includes(q) || o._fullName.toLowerCase().includes(q);
    });

    result.sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case "id":
          av = a.id;
          bv = b.id;
          break;
        case "diagnosticCount":
          av = a.diagnostics?.length || 0;
          bv = b.diagnostics?.length || 0;
          break;
        default:
          av = a.dateCreated ? new Date(a.dateCreated).getTime() : 0;
          bv = b.dateCreated ? new Date(b.dateCreated).getTime() : 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [orders, search, diagnosticFilter, dateYear, dateMonth, sortField, sortDir]);

  const availableYears = useMemo(() => {
    const s = new Set();
    for (const o of orders) {
      if (o.dateCreated) {
        const y = new Date(o.dateCreated).getFullYear();
        if (!Number.isNaN(y)) s.add(y);
      }
    }
    return Array.from(s).sort((a, b) => b - a);
  }, [orders]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  function exportCsv() {
    const header = ["ID", "Patient", "Diagnostics", "Diagnostic Count", "Date Created"];
    const rows = filtered.map((o) => [
      o.id,
      o._fullName,
      (o.diagnostics || []).join("; "),
      o.diagnostics?.length || 0,
      formatDateCreated(o.dateCreated),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-1">Main</p>
          <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/lab-orders/queue")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <ListOrdered size={16} />
            Queue
          </button>
          {canCreateOrder && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors whitespace-nowrap"
            >
              <Plus size={16} />
              Create Lab Order
            </button>
          )}
        </div>
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap items-end justify-end gap-2 mb-3">
        <select
          value={diagnosticFilter}
          onChange={(e) => setDiagnosticFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
        >
          <option value="All">Diagnostics</option>
          {diagnosticOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <YearMonthFilter
          label="Date Created"
          year={dateYear}
          month={dateMonth}
          years={availableYears}
          onYearChange={setDateYear}
          onMonthChange={setDateMonth}
        />
      </div>

      {/* Search + toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or Patient"
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
          />
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          title="Clear filters"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FilterX size={16} />
        </button>
        <button
          type="button"
          onClick={refresh}
          title="Refresh list"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            title="More actions"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-40 rounded-lg border border-slate-200 bg-white shadow-lg z-10 overflow-hidden">
              <button
                type="button"
                onClick={exportCsv}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Download size={13} />
                Export CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <EmptyIcon size={28} />
            <p className="text-sm font-medium">{`No ${title.toLowerCase()} found`}</p>
            <p className="text-xs text-slate-400">
              {orders.length === 0 ? emptyMessage : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">
                      <SortHeader
                        label="ID"
                        field="id"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Patient</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Diagnostics</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                    <th className="px-4 py-3">
                      <SortHeader
                        label="Diagnostic Count"
                        field="diagnosticCount"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-4 py-3">
                      <SortHeader
                        label="Date Created"
                        field="dateCreated"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((o) => {
                    return (
                      <tr
                        key={o.id}
                        onClick={() => navigate(`/lab-orders/${o.id}`)}
                        className="border-b border-slate-100 transition-colors hover:bg-teal-50/60 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-medium text-teal-700 whitespace-nowrap align-top">
                          <span className="inline-flex items-center gap-1.5">
                            {o.id}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <p className="font-semibold text-slate-800">{o._fullName || "—"}</p>
                          <p className="text-xs text-slate-500">{formatAge(o.patient?.dateOfBirth)}</p>
                          <p className="text-xs text-slate-500 uppercase">{o.patient?.sex || "—"}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {(o.diagnostics || []).map((d) => (
                              <span
                                key={d}
                                className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 uppercase whitespace-nowrap"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              ORDER_STATUS_STYLES[getOrderStatus(o)]
                            }`}
                          >
                            {getOrderStatus(o)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-center text-slate-700">
                          {o.diagnostics?.length || 0}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap text-slate-600">
                          {formatDateCreated(o.dateCreated)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500">
                Showing <span className="font-medium text-slate-700">{rangeStart}</span>–
                <span className="font-medium text-slate-700">{rangeEnd}</span> of{" "}
                <span className="font-medium text-slate-700">{filtered.length}</span>{" "}
                {title.toLowerCase()}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>
                <span className="text-xs text-slate-500">
                  Page <span className="font-medium text-slate-700">{safePage}</span> of{" "}
                  <span className="font-medium text-slate-700">{pageCount}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={safePage >= pageCount}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateLabOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
