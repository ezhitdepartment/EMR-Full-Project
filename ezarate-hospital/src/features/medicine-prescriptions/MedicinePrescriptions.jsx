import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  RefreshCw,
  Pill,
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
  FilterX,
  MoreVertical,
  Eye,
  Download,
  CalendarX,
} from "lucide-react";
import ViewMedicinePrescriptionModal from "./ViewMedicinePrescriptionModal";
import YearMonthFilter from "../../components/common/YearMonthFilter";
import { formatAge } from "../../utils/age";
import {
  STATUS,
  STATUS_STYLES,
  formatDateCreated,
  loadMedicinePrescriptions,
  cancelMedicinePrescription,
} from "../../utils/medicinePrescriptions";

const PAGE_SIZE = 8;
const TABS = ["ALL", STATUS.ACTIVE, STATUS.CANCELLED];

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

export default function MedicinePrescriptions() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [dateYear, setDateYear] = useState("");
  const [dateMonth, setDateMonth] = useState("");
  const [sortField, setSortField] = useState("dateCreated");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [viewRecord, setViewRecord] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busyCancelId, setBusyCancelId] = useState("");

  async function refresh() {
    setRecords(await loadMedicinePrescriptions());
  }

  async function handleCancel(record) {
    if (!window.confirm(`Cancel prescription ${record.id}? This can't be undone.`)) return;
    setBusyCancelId(record.id);
    try {
      await cancelMedicinePrescription(record.id);
      refresh();
    } catch (err) {
      alert(`Couldn't cancel this prescription: ${err.message || "unknown error"}`);
    } finally {
      setBusyCancelId("");
    }
  }

  useEffect(() => {
    refresh();
    // No more "storage" event — prescriptions live in Supabase now, not
    // localStorage. "focus" still catches "came back to this tab".
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab, search, dateYear, dateMonth]);

  const hasActiveFilters = search.trim() !== "" || dateYear !== "" || dateMonth !== "";

  function clearFilters() {
    setSearch("");
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
    const withDerived = records.map((r) => ({
      ...r,
      _fullName: [r.patient?.lastName, r.patient?.firstName, r.patient?.middleName]
        .filter(Boolean)
        .join(" "),
    }));

    const q = search.trim().toLowerCase();

    const result = withDerived.filter((r) => {
      if (tab !== "ALL" && r.status !== tab) return false;
      if (dateYear || dateMonth) {
        const created = r.dateCreated ? new Date(r.dateCreated) : null;
        if (!created) return false;
        if (dateYear && created.getFullYear().toString() !== dateYear) return false;
        if (dateMonth && created.getMonth() + 1 !== Number(dateMonth)) return false;
      }
      if (!q) return true;
      return r.id.toLowerCase().includes(q) || r._fullName.toLowerCase().includes(q);
    });

    result.sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case "id":
          av = a.id;
          bv = b.id;
          break;
        case "medicineCount":
          av = a.items?.length || 0;
          bv = b.items?.length || 0;
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
  }, [records, tab, search, dateYear, dateMonth, sortField, sortDir]);

  const availableYears = useMemo(() => {
    const s = new Set();
    for (const r of records) {
      if (r.dateCreated) {
        const y = new Date(r.dateCreated).getFullYear();
        if (!Number.isNaN(y)) s.add(y);
      }
    }
    return Array.from(s).sort((a, b) => b - a);
  }, [records]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  function exportCsv() {
    const header = ["ID", "Patient", "Medicine Count", "Prescribed By", "Status", "Date Created"];
    const rows = filtered.map((r) => [
      r.id,
      r._fullName,
      r.items?.length || 0,
      r.prescribedBy || "",
      r.status || STATUS.ACTIVE,
      formatDateCreated(r.dateCreated),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medicine-prescriptions.csv";
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Medicine Prescriptions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your prescribed medicines and prescriptions
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/medicine-prescriptions/create")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus size={16} />
          Add Prescription
        </button>
      </div>

      {/* Status tabs */}
      <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden mb-3">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t ? "bg-teal-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Date Created filter */}
      <div className="flex items-center justify-end gap-2 mb-3">
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
      <div className="flex items-center justify-end gap-2 mb-4">
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
          <button
            type="button"
            title="Search"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors"
          >
            <Search size={16} />
          </button>
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
            <Pill size={28} />
            <p className="text-sm font-medium">No prescribed medicines found</p>
            <p className="text-xs text-slate-400">
              {records.length === 0
                ? "Medicines you prescribe will show up here."
                : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-900 text-left text-xs uppercase tracking-wide text-white">
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
                    <th className="px-4 py-3">
                      <SortHeader
                        label="Medicine Count"
                        field="medicineCount"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Prescribed By</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                    <th className="px-4 py-3">
                      <SortHeader
                        label="Date Created"
                        field="dateCreated"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 hover:bg-teal-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap align-top">
                        {r.id}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{r._fullName || "—"}</p>
                        <p className="text-xs text-slate-500">{formatAge(r.patient?.dateOfBirth)}</p>
                        <p className="text-xs text-slate-500 uppercase">{r.patient?.sex || "—"}</p>
                      </td>
                      <td className="px-4 py-3 align-top text-center text-slate-700">
                        {r.items?.length || 0}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">
                        {r.prescribedBy || "—"}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[r.status]}`}>
                          {r.status || STATUS.ACTIVE}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-slate-600">
                        {formatDateCreated(r.dateCreated)}
                      </td>
                      <td className="px-4 py-3 align-top text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewRecord(r)}
                            title="View prescribed medicine"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancel(r)}
                            disabled={r.status === STATUS.CANCELLED || busyCancelId === r.id}
                            title="Cancel prescription"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500 hover:opacity-90 text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
                          >
                            <CalendarX size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500">
                Showing <span className="font-medium text-slate-700">{rangeStart}</span>–
                <span className="font-medium text-slate-700">{rangeEnd}</span> of{" "}
                <span className="font-medium text-slate-700">{filtered.length}</span> records
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

      {viewRecord && (
        <ViewMedicinePrescriptionModal record={viewRecord} onClose={() => setViewRecord(null)} />
      )}
    </div>
  );
}