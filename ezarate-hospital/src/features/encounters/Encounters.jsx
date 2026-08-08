import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
  FilterX,
  MoreVertical,
  Stethoscope,
  PlayCircle,
  ArrowLeftRight,
  CalendarX,
  RotateCcw,
  Folder,
  FileSignature,
  Pill,
  Repeat,
} from "lucide-react";
import ReassignPhysicianModal from "./ReassignPhysicianModal";
import WaiverModal from "./WaiverModal";
import YearMonthFilter from "../../components/common/YearMonthFilter";
import { useAuth } from "../../context/AuthContext";
import { formatAge } from "../../utils/age";
import {
  STATUS,
  STATUS_STYLES,
  CONSULTATION_TYPE_OPTIONS,
  MIGRATED_STATUS_OPTIONS,
  PCU_STATUS_OPTIONS,
  PATIENT_TYPE_OPTIONS,
  loadEncounters,
  updateEncounter,
  transferPatientType,
  formatDateCreated,
} from "../../utils/encounters";
import { loadMedicinePrescriptions } from "../../utils/medicinePrescriptions";
import { loadDiagnosesByEncounter } from "../../utils/consultations";

const PAGE_SIZE = 8;
const TABS = ["ALL", STATUS.PENDING, STATUS.COMPLETED, STATUS.CANCELLED];

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap ${
        active ? "text-teal-300" : ""
      }`}
    >
      {label}
      <ChevronsUpDown size={12} className={active ? "text-teal-300" : "text-teal-100/70"} />
      {active && <span className="sr-only">{sortDir}</span>}
    </button>
  );
}

function ActionButton({ title, icon: Icon, colorClass, onClick, disabled }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 ${colorClass}`}
    >
      <Icon size={15} />
    </button>
  );
}

export default function Encounters() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Only Doctor and Admin ever see both patient types on this page at
  // once — ER Nurse/OPD Nurse are already scoped server-side (RLS) to
  // just their own type, so the dropdown would be a no-op filter for them.
  const canFilterPatientType = user?.role === "doctor" || user?.role === "admin";
  const [encounters, setEncounters] = useState([]);
  const [medicationsByEncounter, setMedicationsByEncounter] = useState({});
  const [diagnosesByEncounter, setDiagnosesByEncounter] = useState({});
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [migratedFilter, setMigratedFilter] = useState("All");
  const [apptYear, setApptYear] = useState("");
  const [apptMonth, setApptMonth] = useState("");
  const [consultationTypeFilter, setConsultationTypeFilter] = useState("All");
  const [pcuStatusFilter, setPcuStatusFilter] = useState("All");
  const [patientTypeFilter, setPatientTypeFilter] = useState("All");
  const [sortField, setSortField] = useState("dateCreated");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [rowMenuId, setRowMenuId] = useState(null);

  // Which action modal is open, and for which encounter.
  const [activeAction, setActiveAction] = useState(null); // "triage" | "reassign" | "waiver"
  const [activeEncounter, setActiveEncounter] = useState(null);

  async function refresh() {
    setEncounters(await loadEncounters());

    // Medication column — every medicine name prescribed under each
    // exact encounter/registration, keyed by encounter id.
    const byEncounter = {};
    (await loadMedicinePrescriptions()).forEach((rx) => {
      if (!rx.encounterId) return;
      const names = (rx.items || []).map((item) => item.medicineName).filter(Boolean);
      byEncounter[rx.encounterId] = Array.from(
        new Set([...(byEncounter[rx.encounterId] || []), ...names])
      );
    });
    setMedicationsByEncounter(byEncounter);

    // Diagnosis column — the doctor's Clinical Diagnosis (or ICD-10 picks)
    // from the Consultation Form, matched back to whichever registration
    // it was saved against.
    setDiagnosesByEncounter(await loadDiagnosesByEncounter());
  }

  useEffect(() => {
    refresh();
    // No more "storage" event — encounters/prescriptions live in Supabase
    // now, not localStorage, so cross-tab sync isn't relevant the same way.
    // "focus" still catches "came back to this tab, pull anything new".
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, tab, migratedFilter, apptYear, apptMonth, consultationTypeFilter, pcuStatusFilter, patientTypeFilter]);

  const hasActiveFilters =
    search.trim() !== "" ||
    migratedFilter !== "All" ||
    apptYear !== "" ||
    apptMonth !== "" ||
    consultationTypeFilter !== "All" ||
    pcuStatusFilter !== "All" ||
    patientTypeFilter !== "All";

  function clearFilters() {
    setSearch("");
    setMigratedFilter("All");
    setApptYear("");
    setApptMonth("");
    setConsultationTypeFilter("All");
    setPcuStatusFilter("All");
    setPatientTypeFilter("All");
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

  function openAction(action, encounter) {
    setActiveEncounter(encounter);
    setActiveAction(action);
    setRowMenuId(null);
  }

  function closeAction() {
    setActiveAction(null);
    setActiveEncounter(null);
  }

  async function handleCancel(encounter) {
    if (!window.confirm(`Cancel encounter ${encounter.id}? This can't be undone.`)) return;
    try {
      await updateEncounter(encounter.id, (e) => ({ ...e, status: STATUS.CANCELLED }));
      refresh();
    } catch (err) {
      alert(`Couldn't cancel this registration: ${err.message || "unknown error"}`);
    }
    setRowMenuId(null);
  }

  // Undoes a cancellation. Restores the registration to PENDING — the
  // same state every encounter starts in, and the only state Cancel is
  // ever triggered from (Cancel is disabled once an encounter reaches
  // COMPLETED, so nothing was ever cancelled directly out of COMPLETED
  // to begin with). trg_encounters_set_census_no only clears census_no
  // on the way INTO CANCELLED — it doesn't reissue one on the way back
  // out, so a restored registration picks up a fresh Census No. the next
  // time a consultation is saved on it, same as any other PENDING one.
  async function handleRestore(encounter) {
    if (!window.confirm(`Restore encounter ${encounter.id}? It will go back to Pending.`)) return;
    try {
      await updateEncounter(encounter.id, (e) => ({ ...e, status: STATUS.PENDING }));
      refresh();
    } catch (err) {
      alert(`Couldn't restore this registration: ${err.message || "unknown error"}`);
    }
    setRowMenuId(null);
  }

  // Flips OPD Patient <-> ER Patient on this registration. Guarded by a
  // confirmation since it changes which nurse role can subsequently see
  // and manage this encounter (RLS scopes ER Nurse to ER Patient rows and
  // OPD Nurse to OPD Patient rows — see current_user_can_access_patient_type
  // in the schema).
  //
  // A Census No. is tied to the patient type it was generated under (its
  // own per-type running count — see the schema's Census No. addenda), so
  // it has no meaning once the encounter becomes the other type. If this
  // encounter's Census No. was already assigned (nurse consultation
  // already saved), transferring it discards that number and the DB
  // immediately stamps a brand-new one under the new type's own counter —
  // transferPatientType() (utils/encounters.js) handles both the discard
  // and the reissue in a single update, not a plain updateEncounter().
  async function handleTransferPatient(encounter) {
    const nextType = encounter.patientType === "ER Patient" ? "OPD Patient" : "ER Patient";
    const censusWarning = encounter.censusNo
      ? ` This encounter's Census No. (${encounter.censusNo}) was assigned as ${encounter.patientType} and will be discarded — a new Census No. will be assigned under ${nextType}.`
      : "";
    if (
      !window.confirm(
        `Transfer this patient from ${encounter.patientType} to ${nextType}?${censusWarning}`
      )
    )
      return;
    const result = await transferPatientType(encounter.id, nextType);
    if (!result) {
      window.alert("Transfer failed. Please try again or contact your administrator.");
    }
    refresh();
    setRowMenuId(null);
  }

  function handleStartConsultation(encounter) {
    navigate(`/patients/${encounter.hospitalNo}`, {
      state: {
        openConsultation: true,
        consultationReadOnly: encounter.status === STATUS.CANCELLED,
        consultationEncounterId: encounter.id,
        returnTo: "/encounters",
      },
    });
  }

  const filtered = useMemo(() => {
    const withDerived = encounters.map((e) => ({
      ...e,
      _fullName: [e.patient?.lastName, e.patient?.firstName, e.patient?.middleName]
        .filter(Boolean)
        .join(" "),
    }));

    const q = search.trim().toLowerCase();

    const result = withDerived.filter((e) => {
      if (tab !== "ALL" && e.status !== tab) return false;
      if (migratedFilter !== "All" && e.migratedStatus !== migratedFilter) return false;
      if (consultationTypeFilter !== "All" && e.consultationType !== consultationTypeFilter) return false;
      if (pcuStatusFilter !== "All" && e.pcuStatus !== pcuStatusFilter) return false;
      if (patientTypeFilter !== "All" && e.patientType !== patientTypeFilter) return false;
      if (apptYear || apptMonth) {
        const dt = e.appointmentDate ? new Date(e.appointmentDate) : null;
        if (!dt) return false;
        if (apptYear && dt.getFullYear().toString() !== apptYear) return false;
        if (apptMonth && dt.getMonth() + 1 !== Number(apptMonth)) return false;
      }
      if (!q) return true;
      return (
        e.id.toLowerCase().includes(q) ||
        (e.censusNo || "").toLowerCase().includes(q) ||
        e._fullName.toLowerCase().includes(q) ||
        (e.hospitalNo || "").toLowerCase().includes(q) ||
        (e.doctor || "").toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case "id":
          av = a.id;
          bv = b.id;
          break;
        case "censusNo":
          // Pending (null) rows sort last regardless of direction, so a
          // freshly-created registration doesn't jump to the top of an
          // ascending sort just because null < everything.
          av = a.censusNo || "\uffff";
          bv = b.censusNo || "\uffff";
          break;
        case "appointmentDate":
          av = a.appointmentDate || "";
          bv = b.appointmentDate || "";
          break;
        case "createdBy":
          av = a.createdBy || "";
          bv = b.createdBy || "";
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
  }, [
    encounters,
    tab,
    search,
    migratedFilter,
    apptYear,
    apptMonth,
    consultationTypeFilter,
    pcuStatusFilter,
    patientTypeFilter,
    sortField,
    sortDir,
  ]);

  const availableApptYears = useMemo(() => {
    const s = new Set();
    for (const e of encounters) {
      if (e.appointmentDate) {
        const y = new Date(e.appointmentDate).getFullYear();
        if (!Number.isNaN(y)) s.add(y);
      }
    }
    return Array.from(s).sort((a, b) => b - a);
  }, [encounters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Registration</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your patients' registrations.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/encounters/create")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus size={16} />
          Create Registration
        </button>
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap items-end justify-end gap-2 mb-3">
        <select
          value={migratedFilter}
          onChange={(e) => setMigratedFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
        >
          <option value="All">Migrated Status</option>
          {MIGRATED_STATUS_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <YearMonthFilter
          label="Appointment Date"
          year={apptYear}
          month={apptMonth}
          years={availableApptYears}
          onYearChange={setApptYear}
          onMonthChange={setApptMonth}
        />
        <select
          value={consultationTypeFilter}
          onChange={(e) => setConsultationTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
        >
          <option value="All">Consultation Type</option>
          {CONSULTATION_TYPE_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={pcuStatusFilter}
          onChange={(e) => setPcuStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
        >
          <option value="All">PCU Status</option>
          {PCU_STATUS_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {canFilterPatientType && (
          <select
            value={patientTypeFilter}
            onChange={(e) => setPatientTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
          >
            <option value="All">Patient Type (ER/OPD)</option>
            {PATIENT_TYPE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Status tabs + search + toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
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

        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, PIN, Patient or Doctor"
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
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <Stethoscope size={28} />
            <p className="text-sm font-medium">No registrations found</p>
            <p className="text-xs text-slate-400">
              {encounters.length === 0
                ? "Registrations you create will show up here."
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
                      <SortHeader label="Census" field="censusNo" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Hospital No.</th>
                    <th className="px-4 py-3">
                      <SortHeader
                        label="Apt Date"
                        field="appointmentDate"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Patient</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Patient Type</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Pay Type</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Doctor</th>
                    <th className="px-4 py-3">
                      <SortHeader
                        label="Created By"
                        field="createdBy"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Diagnosis</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Medication</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                    <th className="sticky right-0 z-10 bg-teal-900 px-4 py-3 font-semibold whitespace-nowrap shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.25)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 hover:bg-teal-50/40 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap align-top">
                        {e.censusNo ? (
                          <span className="text-teal-700">{e.censusNo}</span>
                        ) : (
                          <span
                            title="Assigned automatically once the nurse saves the Consultation Form"
                            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
                          >
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">{e.hospitalNo || "—"}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">
                        {e.appointmentDate
                          ? formatDateCreated(new Date(e.appointmentDate).toISOString())
                          : "—"}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{e._fullName || "—"}</p>
                        <p className="text-xs text-slate-500">{formatAge(e.patient?.dateOfBirth)}</p>
                        <p className="text-xs text-slate-500 uppercase">{e.patient?.sex || "—"}</p>
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        {e.patientType ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
                              e.patientType === "ER Patient"
                                ? "bg-red-50 text-red-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {e.patientType}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">{e.paymentType || "—"}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">{e.consultationType || "—"}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">{e.doctor || "—"}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">{e.createdBy || "—"}</td>
                      <td className="px-4 py-3 align-top max-w-[220px]">
                        {diagnosesByEncounter[e.id] ? (
                          <p className="text-slate-700 truncate" title={diagnosesByEncounter[e.id]}>
                            {diagnosesByEncounter[e.id]}
                          </p>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top max-w-[220px]">
                        {medicationsByEncounter[e.id]?.length ? (
                          <p className="text-slate-700 truncate" title={medicationsByEncounter[e.id].join(", ")}>
                            {medicationsByEncounter[e.id].join(", ")}
                          </p>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[e.status]}`}>
                          {e.status}
                        </span>
                      </td>
                      <td
                        className={`sticky right-0 bg-white px-4 py-3 align-top whitespace-nowrap shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)] ${
                          rowMenuId === e.id ? "z-30" : "z-10"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <ActionButton
                            title="Triage"
                            icon={Stethoscope}
                            colorClass="bg-orange-500"
                            onClick={() => navigate(`/encounters/${e.id}/triage`)}
                          />
                          <ActionButton
                            title="Start Consultation"
                            icon={PlayCircle}
                            colorClass="bg-blue-800"
                            onClick={() => handleStartConsultation(e)}
                          />
                          <ActionButton
                            title="Reassign Physician"
                            icon={ArrowLeftRight}
                            colorClass="bg-sky-500"
                            onClick={() => openAction("reassign", e)}
                            disabled={e.status === STATUS.CANCELLED}
                          />
                          {e.status === STATUS.CANCELLED ? (
                            <ActionButton
                              title="Restore"
                              icon={RotateCcw}
                              colorClass="bg-emerald-600"
                              onClick={() => handleRestore(e)}
                            />
                          ) : (
                            <ActionButton
                              title="Cancel"
                              icon={CalendarX}
                              colorClass="bg-red-500"
                              onClick={() => handleCancel(e)}
                              disabled={e.status === STATUS.COMPLETED}
                            />
                          )}
                          <div className="relative">
                            <button
                              type="button"
                              title="More Actions"
                              onClick={() => setRowMenuId(rowMenuId === e.id ? null : e.id)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                              <MoreVertical size={15} />
                            </button>
                            {rowMenuId === e.id && (
                              <div className="absolute right-0 mt-1 w-44 rounded-lg border border-slate-200 bg-white shadow-lg z-20 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenuId(null);
                                    navigate(`/encounters/${e.id}/files`);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <Folder size={13} />
                                  Registration Files
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenuId(null);
                                    navigate("/medicine-prescriptions/create", {
                                      state: { presetHospitalNo: e.hospitalNo, presetEncounterId: e.id },
                                    });
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <Pill size={13} />
                                  Medicine Prescription
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAction("waiver", e)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <FileSignature size={13} />
                                  Waiver
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTransferPatient(e)}
                                  disabled={e.status === STATUS.CANCELLED}
                                  title={`Transfer to ${e.patientType === "ER Patient" ? "OPD Patient" : "ER Patient"}`}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                >
                                  <Repeat size={13} />
                                  Transfer Patient
                                </button>
                              </div>
                            )}
                          </div>
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
                Showing <span className="font-medium text-slate-700">{rangeStart}</span>-
                <span className="font-medium text-slate-700">{rangeEnd}</span> of{" "}
                <span className="font-medium text-slate-700">{filtered.length}</span> encounters
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

      {activeAction === "reassign" && activeEncounter && (
        <ReassignPhysicianModal
          encounter={activeEncounter}
          onClose={closeAction}
          onSave={async (doctor) => {
            try {
              await updateEncounter(activeEncounter.id, (e) => ({ ...e, doctor }));
              refresh();
              closeAction();
            } catch (err) {
              alert(`Couldn't reassign the physician: ${err.message || "unknown error"}`);
            }
          }}
        />
      )}

      {activeAction === "waiver" && activeEncounter && (
        <WaiverModal
          encounter={activeEncounter}
          onClose={closeAction}
          onSave={async (waiver) => {
            try {
              await updateEncounter(activeEncounter.id, (e) => ({ ...e, waiver }));
              refresh();
              closeAction();
            } catch (err) {
              alert(`Couldn't save the waiver: ${err.message || "unknown error"}`);
            }
          }}
        />
      )}
    </div>
  );
}