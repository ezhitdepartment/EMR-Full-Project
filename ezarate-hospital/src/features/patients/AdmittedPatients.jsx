import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, RefreshCw, BedDouble, ChevronRight, ChevronLeft, FilterX,
  FileText, ClipboardList, LogOut, Loader2,
} from "lucide-react";
import { loadAdmittedPatients, dischargeAdmittedPatient } from "../../utils/admittedPatients";

const PAGE_SIZE = 10;

const PATIENT_TYPE_OPTIONS = ["All", "ER Patient", "OPD Patient"];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// Same square, colored, icon-only row action button Encounters.jsx uses
// for Triage/Start Consultation/Reassign/Cancel — kept identical here so
// Admitted Patients' row actions read as the same control, not a
// look-alike. `loading` swaps the icon for a spinner itself, so call
// sites don't each need their own busy-icon ternary.
function ActionButton({ title, icon: Icon, colorClass, onClick, disabled, loading }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 ${colorClass}`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
    </button>
  );
}

export default function AdmittedPatients() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [patientTypeFilter, setPatientTypeFilter] = useState("All");
  const [page, setPage] = useState(1);
  // Tracks which row + which action is currently in flight (e.g.
  // "CONS-123:discharge" or "CONS-123:abstract"), so only that row's
  // button shows a spinner and the others stay clickable.
  const [busyKey, setBusyKey] = useState(null);

  async function refresh() {
    setLoading(true);
    setRecords(await loadAdmittedPatients());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // Same reasoning as Patients.jsx — another nurse/doctor could admit or
    // discharge someone while this tab is sitting in the background.
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, patientTypeFilter]);

  const hasActiveFilters = search.trim() !== "" || patientTypeFilter !== "All";

  function clearFilters() {
    setSearch("");
    setPatientTypeFilter("All");
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (patientTypeFilter !== "All" && r.patientType !== patientTypeFilter) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        (r.hospitalNo || "").toLowerCase().includes(q) ||
        (r.admittingDiagnosis || "").toLowerCase().includes(q) ||
        (r.attendingPhysician || "").toLowerCase().includes(q)
      );
    });
  }, [records, search, patientTypeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  function handleOpenMedicalAbstract(e, record) {
    e.stopPropagation();
    // `record` is passed along as router state purely as a shortcut (so
    // the page doesn't have to re-look-up which encounter this admission
    // belongs to on first open) — the page re-fetches the patient and any
    // already-saved abstract on its own regardless, so a direct link or a
    // refresh still works fine without it.
    navigate(`/admitted-patients/${record.hospitalNo}/medical-abstract`, { state: { record } });
  }

  // Same "real, saved, editable page instead of a straight-to-PDF button"
  // upgrade Medical Abstract already got — see
  // AdmissionDischargeRecordPage.jsx.
  function handleOpenAdmissionDischargeRecord(e, record) {
    e.stopPropagation();
    navigate(`/admitted-patients/${record.hospitalNo}/admission-discharge-record`, { state: { record } });
  }

  async function handleDischarge(e, record) {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Mark ${record.fullName || "this patient"} as Discharged? They will be removed from Admitted Patients.`
    );
    if (!confirmed) return;

    const key = `${record.consultationId}:discharge`;
    setBusyKey(key);
    try {
      const { error } = await dischargeAdmittedPatient(record.consultationId);
      if (error) {
        window.alert(`Couldn't mark this patient as Discharged: ${error}`);
        return;
      }
      await refresh();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-1">Main</p>
        <h1 className="text-2xl font-semibold text-slate-800">Admitted Patients</h1>
        <p className="text-sm text-slate-500 mt-1">
          One line per patient whose most recent Consultation Form Disposition is "Admitted" — the
          list updates itself the moment a doctor changes that to Discharged (or anything else).
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, Hospital No., or diagnosis"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>

          <div className="flex-1" />

          <button
            type="button"
            onClick={refresh}
            title="Refresh list"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-end gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient Type</label>
            <select
              value={patientTypeFilter}
              onChange={(e) => setPatientTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            >
              {PATIENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

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

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <RefreshCw size={24} className="animate-spin" />
            <p className="text-sm font-medium">Loading admitted patients…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <BedDouble size={28} />
            <p className="text-sm font-medium">No admitted patients</p>
            <p className="text-xs text-slate-400">
              {records.length === 0
                ? "Patients a doctor marks \u201cAdmitted\u201d on the Consultation Form will show up here."
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
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Patient Name</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Sex</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Patient Type</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Admitting Diagnosis</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Date Admitted</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Attending Physician</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Notes</th>
                    <th className="sticky right-0 bg-slate-50 px-4 py-3 font-semibold whitespace-nowrap text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => {
                    const isBusyDischarge = busyKey === `${r.consultationId}:discharge`;
                    const rowBusy = Boolean(busyKey && busyKey.startsWith(`${r.consultationId}:`));

                    return (
                      <tr
                        key={r.hospitalNo || r.consultationId}
                        onClick={() => navigate(`/patients/${r.hospitalNo}`)}
                        className="border-b border-slate-100 hover:bg-teal-50/60 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.hospitalNo || "—"}</td>
                        <td className="px-4 py-3 text-slate-800 whitespace-nowrap">{r.fullName || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.sex || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.patientType || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{r.admittingDiagnosis || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(r.dateAdmitted)}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.attendingPhysician || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{r.dispositionNotes || "—"}</td>
                        <td className="sticky right-0 bg-white px-4 py-3 align-top whitespace-nowrap shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
                          <div className="flex items-center justify-center gap-1.5">
                            <ActionButton
                              title="Medical Abstract"
                              icon={FileText}
                              colorClass="bg-indigo-500"
                              disabled={rowBusy}
                              onClick={(e) => handleOpenMedicalAbstract(e, r)}
                            />
                            <ActionButton
                              title="Admission and Discharge Record"
                              icon={ClipboardList}
                              colorClass="bg-sky-500"
                              disabled={rowBusy}
                              onClick={(e) => handleOpenAdmissionDischargeRecord(e, r)}
                            />
                            <ActionButton
                              title="Mark as Discharged"
                              icon={LogOut}
                              colorClass="bg-red-500"
                              loading={isBusyDischarge}
                              disabled={rowBusy}
                              onClick={(e) => handleDischarge(e, r)}
                            />
                          </div>
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
                <span className="font-medium text-slate-700">{filtered.length}</span> admitted patients
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
    </div>
  );
}