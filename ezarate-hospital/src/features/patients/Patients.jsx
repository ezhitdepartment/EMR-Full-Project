import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  RefreshCw,
  Users as UsersIcon,
  ChevronRight,
  ChevronLeft,
  FilterX,
} from "lucide-react";
import CreatePatientModal from "./CreatePatientModal";
import YearMonthFilter from "../../components/common/YearMonthFilter";
import { loadPatients } from "../../utils/patients";

const PAGE_SIZE = 10;

const SEX_OPTIONS = ["All", "Male", "Female"];
const MORTALITY_OPTIONS = ["All", "Alive", "Deceased"];

export default function Patients() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sexFilter, setSexFilter] = useState("All");
  const [mortalityFilter, setMortalityFilter] = useState("All");
  const [dobYear, setDobYear] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  async function refresh() {
    setLoading(true);
    setRecords(await loadPatients());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // Refetch when the person comes back to this tab — worth keeping now
    // that patients live in a shared database another teammate could have
    // changed. The "storage" event no longer fires for this (that only
    // covers localStorage), so it's dropped.
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, []);

  // Reset back to page 1 whenever the search or any filter changes, so the
  // user isn't left staring at an empty page 4 of a 1-page result set.
  useEffect(() => {
    setPage(1);
  }, [search, sexFilter, mortalityFilter, dobYear, dobMonth]);

  const hasActiveFilters =
    search.trim() !== "" ||
    sexFilter !== "All" ||
    mortalityFilter !== "All" ||
    dobYear !== "" ||
    dobMonth !== "";

  function clearFilters() {
    setSearch("");
    setSexFilter("All");
    setMortalityFilter("All");
    setDobYear("");
    setDobMonth("");
    setPage(1);
  }

  const filteredPatients = useMemo(() => {
    const withNames = records.map((r, idx) => ({
      ...r,
      _id: r.hospitalNo || idx,
      _fullName: [r.lastName, r.firstName, r.middleName].filter(Boolean).join(" "),
      // Not captured at creation yet — default to "Alive" until it is.
      _mortalityStatus: r.mortalityStatus || "Alive",
    }));

    const q = search.trim().toLowerCase();

    const filtered = withNames.filter((p) => {
      if (sexFilter !== "All" && p.sex !== sexFilter) return false;
      if (mortalityFilter !== "All" && p._mortalityStatus !== mortalityFilter) return false;
      if (dobYear) {
        const y = p.dateOfBirth ? new Date(p.dateOfBirth).getFullYear().toString() : "";
        if (y !== dobYear) return false;
      }
      if (dobMonth) {
        const m = p.dateOfBirth ? new Date(p.dateOfBirth).getMonth() + 1 : null;
        if (!m || m !== Number(dobMonth)) return false;
      }
      if (!q) return true;
      return (
        p._fullName.toLowerCase().includes(q) ||
        (p.hospitalNo || "").toLowerCase().includes(q)
      );
    });

    // Latest patient first.
    return filtered.sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
  }, [records, search, sexFilter, mortalityFilter, dobYear, dobMonth]);

  const availableYears = useMemo(() => {
    const s = new Set();
    for (const r of records) {
      if (r.dateOfBirth) {
        const y = new Date(r.dateOfBirth).getFullYear();
        if (!Number.isNaN(y)) s.add(y);
      }
    }
    return Array.from(s).sort((a, b) => b - a);
  }, [records]);

  const pageCount = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedPatients = filteredPatients.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );
  const rangeStart = filteredPatients.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredPatients.length);

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-1">
          Main
        </p>
        <h1 className="text-2xl font-semibold text-slate-800">Patients</h1>
        <p className="text-sm text-slate-500 mt-1">
          Search, filter, and review patient records — newest registrations first.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, name, or Hospital No."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>

          <div className="flex-1" />

          {/* Refresh */}
          <button
            type="button"
            onClick={refresh}
            title="Refresh list"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>

          {/* Create patient */}
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            title="Create patient"
            className="inline-flex items-center justify-center rounded-lg bg-teal-700 hover:bg-teal-800 text-white w-9 h-9 shadow-sm transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-end gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Sex
            </label>
            <select
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            >
              {SEX_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Mortality Status
            </label>
            <select
              value={mortalityFilter}
              onChange={(e) => setMortalityFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            >
              {MORTALITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <YearMonthFilter
            label="Date of Birth"
            year={dobYear}
            month={dobMonth}
            years={availableYears}
            onYearChange={setDobYear}
            onMonthChange={setDobMonth}
          />

          <div className="flex-1" />

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FilterX size={14} />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Patient list */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <RefreshCw size={24} className="animate-spin" />
            <p className="text-sm font-medium">Loading patients…</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <UsersIcon size={28} />
            <p className="text-sm font-medium">No patients found</p>
            <p className="text-xs text-slate-400">
              {records.length === 0
                ? "Patients you create will show up here."
                : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Hospital No.</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Last Name</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">First Name</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Middle Name</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Sex</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Date of Birth</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Address</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Barangay</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">City</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Province</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">
                      Contact Number
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPatients.map((p) => (
                    <tr
                      key={p._id}
                      onClick={() => navigate(`/patients/${p.hospitalNo}`)}
                      className="border-b border-slate-100 hover:bg-teal-50/60 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {p.hospitalNo || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                        {p.lastName || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                        {p.firstName || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                        {p.middleName || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {p.sex || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {p.dateOfBirth || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.address || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {p.barangay || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {p.city || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {p.province || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {p.mobile ? `+63 ${p.mobile}` : "—"}
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
                <span className="font-medium text-slate-700">{filteredPatients.length}</span>{" "}
                patients
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

      {/* Create Patient modal */}
      {showCreate && (
        <CreatePatientModal
          onClose={() => setShowCreate(false)}
          onCreated={(patient) => {
            setShowCreate(false);
            refresh();
            navigate(`/patients/${patient.hospitalNo}`);
          }}
        />
      )}
    </div>
  );
}