import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  History,
  ClipboardCheck,
  UserCircle2,
} from "lucide-react";
import { findEncounterById, updateEncounter, formatDateCreated, CONSULTATION_TYPES, STATUS } from "../../utils/encounters";
import { formatAge } from "../../utils/age";
import { useAuth } from "../../context/AuthContext";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600";

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

// BMI = kg / m² — recomputed live whenever height or weight changes, same
// "never drifts out of sync" approach as the Age field in Create Patient.
function computeBmi(heightCm, weightKg) {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!h || !w) return "";
  const meters = h / 100;
  return (w / (meters * meters)).toFixed(2);
}

// Height is stored (and saved to Supabase) in cm only — `heightFt` is a
// purely client-side convenience mirror of the same value, converted live
// in both directions, same "never drifts out of sync" idea as BMI above.
// 1 ft = 30.48 cm exactly.
const CM_PER_FT = 30.48;

function cmToFt(cm) {
  const v = parseFloat(cm);
  if (!v && v !== 0) return "";
  return (v / CM_PER_FT).toFixed(2);
}

function ftToCm(ft) {
  const v = parseFloat(ft);
  if (!v && v !== 0) return "";
  return (v * CM_PER_FT).toFixed(1);
}

// Same idea for temperature — `temperature` (stored/saved to Supabase) is
// Celsius; `temperatureF` is a client-side-only Fahrenheit mirror.
function cToF(c) {
  const v = parseFloat(c);
  if (!v && v !== 0) return "";
  return (v * 9/5 + 32).toFixed(1);
}

function fToC(f) {
  const v = parseFloat(f);
  if (!v && v !== 0) return "";
  return ((v - 32) * 5/9).toFixed(1);
}

const emptyTriage = {
  systolic: "",
  diastolic: "",
  heartRate: "",
  respiratoryRate: "",
  temperature: "",
  temperatureF: "",
  height: "",
  heightFt: "",
  weight: "",
  bmi: "",
  leftVision: "",
  rightVision: "",
  labImagingEnabled: true,
  fbsGlucoseMgDl: "",
  fbsGlucoseMmolL: "",
  fbsDatePerformed: new Date().toISOString().slice(0, 10),
};

export default function TriagePage() {
  const { encounterId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [encounter, setEncounter] = useState(undefined); // undefined = loading, null = not found
  const [form, setForm] = useState(emptyTriage);
  const [anthropometricsOpen, setAnthropometricsOpen] = useState(true);
  const [labImagingOpen, setLabImagingOpen] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const found = await findEncounterById(encounterId);
      setEncounter(found);
      if (found?.triage) {
        const merged = { ...emptyTriage, ...found.triage };
        // heightFt / temperatureF are never persisted (only `height` in cm
        // and `temperature` in °C are saved to Supabase) — always
        // (re)derive them from the canonical values on load.
        merged.heightFt = cmToFt(merged.height);
        merged.temperatureF = cToF(merged.temperature);
        setForm(merged);
      }
    }
    load();
  }, [encounterId]);

  function set(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "height") {
        // cm entered -> mirror into ft
        next.heightFt = cmToFt(value);
      } else if (field === "heightFt") {
        // ft entered -> mirror into cm (the value actually saved)
        next.height = ftToCm(value);
      } else if (field === "temperature") {
        // °C entered -> mirror into °F
        next.temperatureF = cToF(value);
      } else if (field === "temperatureF") {
        // °F entered -> mirror into °C (the value actually saved)
        next.temperature = fToC(value);
      }
      if (field === "height" || field === "heightFt" || field === "weight") {
        next.bmi = computeBmi(next.height, next.weight);
      }
      return next;
    });
  }

  async function handleUpdateTriage() {
    try {
      const updated = await updateEncounter(encounterId, (e) => ({
        ...e,
        triage: {
          ...form,
          createdByUuid: e.triage?.createdByUuid || user?.id || null,
        },
      }));
      if (updated) {
        setEncounter(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      alert(`Couldn't save triage: ${err.message || "unknown error"}`);
    }
  }

  if (encounter === undefined) {
    return <div className="min-h-[50vh]" />;
  }

  if (encounter === null) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
        <p className="text-sm font-semibold text-slate-800 mb-1">Registration not found</p>
        <p className="text-xs text-slate-500 mb-4">
          We couldn't find an encounter with ID "{encounterId}".
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Registration
        </button>
      </div>
    );
  }

  const patient = encounter.patient || {};
  const fullName = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
  const triageCreatedBy = encounter.triage?.createdBy || user?.username;
  const triageCreatedAt = encounter.triage?.createdAt;
  const isCancelled = encounter.status === STATUS.CANCELLED;

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Appointment Triage</h1>
          <p className="text-sm text-slate-500 mt-1">Start the triage process</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>

      {isCancelled && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This registration was cancelled — triage is now view-only and can no longer be edited.
        </div>
      )}

      <fieldset disabled={isCancelled} className="contents">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left column — clinical measurements */}
        <div className="flex flex-col gap-4">
          {/* ANTHROPOMETRICS */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setAnthropometricsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <span className="text-xs font-bold uppercase tracking-wide text-blue-900">
                Anthropometrics
              </span>
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-red-100 text-red-600 px-2 py-0.5 text-[11px] font-semibold">
                  Required
                </span>
                {anthropometricsOpen ? (
                  <ChevronUp size={16} className="text-slate-400" />
                ) : (
                  <ChevronDown size={16} className="text-slate-400" />
                )}
              </span>
            </button>

            {anthropometricsOpen && (
              <div className="px-4 pb-4 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Measurement
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <Field label="Systolic" required>
                      <input
                        type="number"
                        value={form.systolic}
                        onChange={(e) => set("systolic", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Diastolic" required>
                      <input
                        type="number"
                        value={form.diastolic}
                        onChange={(e) => set("diastolic", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Heart Rate" required>
                      <input
                        type="number"
                        value={form.heartRate}
                        onChange={(e) => set("heartRate", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Respiratory Rate" required>
                      <input
                        type="number"
                        value={form.respiratoryRate}
                        onChange={(e) => set("respiratoryRate", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Temperature (°C)" required>
                      <input
                        type="number"
                        step="0.1"
                        value={form.temperature}
                        onChange={(e) => set("temperature", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Temperature (°F)" required>
                      <input
                        type="number"
                        step="0.1"
                        value={form.temperatureF}
                        onChange={(e) => set("temperatureF", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Height (cm)" required>
                      <input
                        type="number"
                        step="0.1"
                        value={form.height}
                        onChange={(e) => set("height", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Height (ft)" required>
                      <input
                        type="number"
                        step="0.01"
                        value={form.heightFt}
                        onChange={(e) => set("heightFt", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Weight (kg)" required>
                      <input
                        type="number"
                        step="0.1"
                        value={form.weight}
                        onChange={(e) => set("weight", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="BMI" required>
                      <input
                        type="text"
                        value={form.bmi}
                        readOnly
                        disabled
                        placeholder="Auto-calculated"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Vision
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <Field label="Left Vision">
                      <input
                        value={form.leftVision}
                        onChange={(e) => set("leftVision", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Right Vision">
                      <input
                        value={form.rightVision}
                        onChange={(e) => set("rightVision", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LABORATORY IMAGING */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="w-full flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.labImagingEnabled}
                  onClick={() => set("labImagingEnabled", !form.labImagingEnabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    form.labImagingEnabled ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.labImagingEnabled ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-xs font-bold uppercase tracking-wide text-blue-900">
                  Laboratory Imaging
                </span>
              </span>
              <button type="button" onClick={() => setLabImagingOpen((o) => !o)}>
                {labImagingOpen ? (
                  <ChevronUp size={16} className="text-slate-400" />
                ) : (
                  <ChevronDown size={16} className="text-slate-400" />
                )}
              </button>
            </div>

            {labImagingOpen && form.labImagingEnabled && (
              <div className="px-4 pb-4">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Fast Blood Sugar (FBS)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <Field label="Glucose in mg/dL" required>
                    <input
                      type="number"
                      value={form.fbsGlucoseMgDl}
                      onChange={(e) => set("fbsGlucoseMgDl", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Glucose in mmol/L" required>
                    <input
                      type="number"
                      step="0.01"
                      value={form.fbsGlucoseMmolL}
                      onChange={(e) => set("fbsGlucoseMmolL", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Date Performed" required>
                    <input
                      type="date"
                      value={form.fbsDatePerformed}
                      onChange={(e) => set("fbsDatePerformed", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column — history + appointment details */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
              <History size={15} className="text-blue-700" />
              Triage History
            </p>
            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                <UserCircle2 size={14} />
              </span>
              <div>
                <p className="text-xs text-slate-400">Created by</p>
                <p className="text-sm font-semibold text-slate-800">{triageCreatedBy || "—"}</p>
                <p className="text-[11px] text-slate-400">
                  {triageCreatedAt
                    ? `${formatDateCreated(triageCreatedAt)} ${new Date(triageCreatedAt).toLocaleTimeString(
                        "en-US",
                        { hour: "numeric", minute: "2-digit" }
                      )}`
                    : "Not yet recorded"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
              <ClipboardCheck size={15} className="text-blue-700" />
              Appointment Details
            </p>

            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Patient Name</p>
                <p className="font-semibold text-slate-800">{fullName || "—"}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">Age</p>
                  <p className="font-medium text-slate-700">{formatAge(patient.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">Sex</p>
                  <p className="font-medium text-blue-700 uppercase">{patient.sex || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Hospital No.</p>
                <p className="font-medium text-slate-700">{patient.hospitalNo || "—"}</p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Appointment ID</p>
                <p className="font-medium text-slate-700">{encounter.id}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">
                    Appointment Date
                  </p>
                  <p className="font-medium text-slate-700">
                    {encounter.appointmentDate
                      ? formatDateCreated(new Date(encounter.appointmentDate).toISOString())
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">Payment Type</p>
                  <p className="font-medium text-slate-700">{encounter.paymentType || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">
                  Consultation Type
                </p>
                <p className="font-medium text-slate-700">
                  {CONSULTATION_TYPES.find((c) => c.label === encounter.consultationType)?.code ||
                    encounter.consultationType ||
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Reason for Visit</p>
                <p className="font-medium text-slate-700">{encounter.reasonForVisiting || "—"}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpdateTriage}
              className="w-full mt-4 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-sm font-semibold px-4 py-2.5 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancelled ? "Registration Cancelled" : saved ? "Saved!" : "Update Triage"}
            </button>
          </div>
        </div>
      </div>
      </fieldset>
    </div>
  );
}