import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  FilterX,
  ChevronsUpDown,
  Plus,
  Trash2,
  Pill,
} from "lucide-react";
import CreatePatientModal from "../patients/CreatePatientModal";
import YearMonthFilter from "../../components/common/YearMonthFilter";
import { formatDateCreated } from "../../utils/labOrders";
import { loadPatients } from "../../utils/patients";
import {
  MEDICINE_CATALOG,
  upsertMedicinePrescriptionForEncounter,
  findMedicinePrescriptionByEncounter,
} from "../../utils/medicinePrescriptions";
import { useAuth } from "../../context/AuthContext";

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap ${
        active ? "text-white" : "text-white/90"
      }`}
    >
      {label}
      <ChevronsUpDown size={12} />
    </button>
  );
}

function StepIndicator({ step, onStepClick }) {
  const steps = [
    { n: 1, label: "Search Patient" },
    { n: 2, label: "Select Medicine" },
  ];
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      {steps.map((s, idx) => {
        const active = step === s.n;
        const done = step > s.n;
        const clickable = done;
        return (
          <div key={s.n} className="flex items-center gap-4">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(s.n)}
              className={`flex items-center gap-2 ${clickable ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full border-2 text-sm font-semibold ${
                  active || done
                    ? "border-teal-700 text-teal-700"
                    : "border-slate-300 text-slate-400"
                }`}
              >
                {s.n}
              </span>
              <span
                className={`text-sm font-medium ${
                  active || done ? "text-teal-700" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div className={`w-40 h-px ${step > 1 ? "bg-teal-700" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

let rowSeq = 0;
function newRow() {
  rowSeq += 1;
  return { rowId: `row-${rowSeq}`, medicineName: "", quantity: 1, milligram: "", instructions: "" };
}
function rowFromItem(it) {
  rowSeq += 1;
  return {
    rowId: `row-${rowSeq}`,
    medicineName: it.medicineName,
    quantity: it.quantity,
    milligram: it.milligram || "",
    instructions: it.instructions,
  };
}

export default function AddMedicinePrescriptionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const presetHospitalNo = location.state?.presetHospitalNo || "";
  const presetEncounterId = location.state?.presetEncounterId || "";

  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [sortField, setSortField] = useState("lastName");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedHospitalNo, setSelectedHospitalNo] = useState(presetHospitalNo);
  const [showCreatePatient, setShowCreatePatient] = useState(false);

  const [prescribedBy, setPrescribedBy] = useState("");
  const [rows, setRows] = useState([newRow()]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(Boolean(presetEncounterId));
  const [hasExistingPrescription, setHasExistingPrescription] = useState(false);

  useEffect(() => {
    loadPatients().then(setPatients);
  }, []);

  // Opened from a specific registration (Encounters' "Prescribe" action) —
  // load whatever prescription already exists for THIS encounter, if any,
  // so re-opening the page to add/edit medicines edits that one
  // prescription instead of the doctor unknowingly submitting a second,
  // duplicate prescription for the same visit. See
  // upsertMedicinePrescriptionForEncounter() in utils/medicinePrescriptions.js
  // for the save-side half of this — same "one per registration" pattern
  // used for Lab Orders.
  useEffect(() => {
    if (!presetEncounterId) {
      setLoadingExisting(false);
      return;
    }
    let cancelled = false;
    setLoadingExisting(true);
    findMedicinePrescriptionByEncounter(presetEncounterId).then((existing) => {
      if (cancelled) return;
      if (existing) {
        setHasExistingPrescription(true);
        setPrescribedBy(existing.prescribedBy || "");
        setRows(
          existing.items.length > 0 ? existing.items.map(rowFromItem) : [newRow()]
        );
      }
      setLoadingExisting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [presetEncounterId]);

  // Arrived from a patient's profile page (e.g. their Medicine Prescriptions
  // tab) with a patient already chosen — skip straight to medicine
  // selection instead of making them search/pick the same patient again.
  useEffect(() => {
    if (presetHospitalNo && patients.some((p) => p.hospitalNo === presetHospitalNo)) {
      setStep(2);
    }
  }, [presetHospitalNo, patients]);

  const availableYears = useMemo(() => {
    const s = new Set();
    for (const r of patients) {
      if (r.dateOfBirth) {
        const y = new Date(r.dateOfBirth).getFullYear();
        if (!Number.isNaN(y)) s.add(y);
      }
    }
    return Array.from(s).sort((a, b) => b - a);
  }, [patients]);

  const selectedPatient = patients.find((p) => p.hospitalNo === selectedHospitalNo) || null;

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = patients.filter((p) => {
      if (dobYear) {
        const y = p.dateOfBirth ? new Date(p.dateOfBirth).getFullYear().toString() : "";
        if (y !== dobYear) return false;
      }
      if (dobMonth) {
        const m = p.dateOfBirth ? new Date(p.dateOfBirth).getMonth() + 1 : null;
        if (!m || m !== Number(dobMonth)) return false;
      }
      if (!q) return true;
      const haystack = [p.hospitalNo, p.firstName, p.lastName, p.middleName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    result = [...result].sort((a, b) => {
      const av = (a[sortField] || "").toString().toLowerCase();
      const bv = (b[sortField] || "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [patients, search, dobYear, dobMonth, sortField, sortDir]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function clearFilters() {
    setSearch("");
    setDobYear("");
    setDobMonth("");
  }

  function handlePatientCreated(patient) {
    setPatients((prev) => [patient, ...prev]);
    setSelectedHospitalNo(patient.hospitalNo);
    setShowCreatePatient(false);
  }

  // --- Step 2: medicine line items ---
  function updateRow(rowId, patch) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function selectMedicine(rowId, name) {
    updateRow(rowId, { medicineName: name });
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(rowId) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.rowId !== rowId) : prev));
  }

  async function handlePrescribe() {
    const items = rows.filter((r) => r.medicineName.trim() !== "");
    if (items.length === 0) {
      setError("Please add at least one medicine.");
      return;
    }
    if (!prescribedBy.trim()) {
      setError("Please enter the prescribing physician's name.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await upsertMedicinePrescriptionForEncounter({
        hospitalNo: selectedPatient.hospitalNo,
        encounterId: presetEncounterId || null,
        prescribedBy: prescribedBy.trim(),
        createdBy: user?.id || null,
        items: items.map((r) => ({
          medicineName: r.medicineName,
          quantity: Number(r.quantity) || 0,
          milligram: (r.milligram || "").trim(),
          instructions: r.instructions.trim(),
        })),
      });
      navigate(
        presetEncounterId
          ? "/encounters"
          : presetHospitalNo
          ? `/patients/${presetHospitalNo}`
          : "/medicine-prescriptions"
      );
    } catch (err) {
      setError("Could not save the prescription: " + err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Add Prescription</h1>
          <p className="text-sm text-slate-500 mt-0.5">Prescribe medicine to a patient</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>

      <div className="border-t border-slate-200">
        <StepIndicator step={step} onStepClick={setStep} />
      </div>

      {step === 1 && (
        <>
          {/* Search + filters */}
          <div className="flex items-center gap-2 mb-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Name or Hospital No."
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              />
            </div>
            <YearMonthFilter
              label="Date of Birth"
              year={dobYear}
              month={dobMonth}
              years={availableYears}
              onYearChange={setDobYear}
              onMonthChange={setDobMonth}
            />
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
              disabled={!search && !dobYear && !dobMonth}
              title="Clear filters"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FilterX size={16} />
            </button>
            <div className="flex-1" />
            <button
              type="button"
              disabled={!selectedHospitalNo}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors whitespace-nowrap"
            >
              Next
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setShowCreatePatient(true)}
              className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors"
            >
              Create Patient
            </button>
          </div>

          {/* Patient table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {filteredPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
                <p className="text-sm font-medium">No patients found</p>
                <p className="text-xs text-slate-400">
                  {patients.length === 0
                    ? 'No patients yet — click "Create Patient" to add one.'
                    : "Try a different search or filter."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-teal-900 text-left text-xs uppercase tracking-wide text-white">
                      <th className="px-4 py-3 w-10" />
                      <th className="px-4 py-3">
                        <SortHeader
                          label="Hospital No."
                          field="hospitalNo"
                          sortField={sortField}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-4 py-3">
                        <SortHeader
                          label="Last Name"
                          field="lastName"
                          sortField={sortField}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-4 py-3">
                        <SortHeader
                          label="First Name"
                          field="firstName"
                          sortField={sortField}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-4 py-3">
                        <SortHeader
                          label="Middle Name"
                          field="middleName"
                          sortField={sortField}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-4 py-3">
                        <SortHeader
                          label="Date of Birth"
                          field="dateOfBirth"
                          sortField={sortField}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p) => (
                      <tr
                        key={p.hospitalNo}
                        onClick={() => setSelectedHospitalNo(p.hospitalNo)}
                        className="border-b border-slate-100 hover:bg-teal-50/60 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 align-top">
                          <input
                            type="radio"
                            name="selectedPatient"
                            checked={selectedHospitalNo === p.hospitalNo}
                            onChange={() => setSelectedHospitalNo(p.hospitalNo)}
                            className="w-4 h-4 text-teal-700 focus:ring-teal-600"
                          />
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap text-slate-600">
                          {p.hospitalNo || "—"}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">
                          {p.lastName}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">
                          {p.firstName}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">
                          {p.middleName || "—"}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap text-slate-600">
                          {formatDateCreated(p.dateOfBirth)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {step === 2 && selectedPatient && (
        <div className="flex flex-col gap-4">
          {/* Selected patient summary */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {[selectedPatient.lastName, selectedPatient.firstName, selectedPatient.middleName]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="text-xs text-slate-500">
                Hospital No. {selectedPatient.hospitalNo || "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              Change patient
            </button>
          </div>

          {/* Medicine line items */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            {presetEncounterId && (loadingExisting || hasExistingPrescription) && (
              <p className="text-xs text-slate-500 mb-3">
                {loadingExisting
                  ? "Checking for an existing prescription on this registration…"
                  : "This registration already has a prescription — editing and saving updates it, instead of creating a second one."}
              </p>
            )}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">
                Medicines <span className="text-red-500">*</span>
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  Prescribed By
                  <input
                    type="text"
                    value={prescribedBy}
                    onChange={(e) => setPrescribedBy(e.target.value)}
                    placeholder="Dr. Juan Dela Cruz"
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 w-48 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_90px_60px_1fr_28px] gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Medicine
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Milligram
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Qty
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Instructions (Sig)
              </span>
              <span />
            </div>

            <datalist id="medicine-catalog-options">
              {MEDICINE_CATALOG.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <div
                  key={row.rowId}
                  className="grid grid-cols-[1fr_90px_60px_1fr_28px] gap-2 items-start"
                >
                  <input
                    type="text"
                    list="medicine-catalog-options"
                    value={row.medicineName}
                    onChange={(e) => selectMedicine(row.rowId, e.target.value)}
                    placeholder="Type or select a medicine"
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                  <input
                    type="text"
                    value={row.milligram}
                    onChange={(e) => updateRow(row.rowId, { milligram: e.target.value })}
                    placeholder="e.g. 500mg"
                    className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.rowId, { quantity: e.target.value })}
                    className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                  <input
                    type="text"
                    value={row.instructions}
                    onChange={(e) => updateRow(row.rowId, { instructions: e.target.value })}
                    placeholder="e.g. 1 tablet 3x a day after meals for 7 days"
                    className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(row.rowId)}
                    disabled={rows.length === 1}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors mt-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              <Plus size={14} />
              Add medicine
            </button>

            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handlePrescribe}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
            >
              <Pill size={14} />
              {submitting ? "Saving…" : "Add Prescription"}
            </button>
          </div>
        </div>
      )}

      {showCreatePatient && (
        <CreatePatientModal
          onClose={() => setShowCreatePatient(false)}
          onCreated={handlePatientCreated}
        />
      )}
    </div>
  );
}