import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import PatientRecordPDF from "./PatientRecordPDF";

// Auto-generate unique Hospital Record No.
function generateRecordNo() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `${timestamp}${random}`;
}

const initialForm = {
  // Header / identity — read-only display here, editable in the Consultation Form
  hospitalRecordNo: generateRecordNo(),
  lastName: "",
  firstName: "",
  middleName: "",
  age: "",
  gender: "",
  dateOfBirth: "",

  // Visit Details
  dateOfVisit: "",
  timeOfVisit: "",
  nurseOnDuty: "",
  residentOnDuty: "",
  classification: "",

  // Vital Signs
  temperature: "",
  cardiacRate: "",
  respiratoryRate: "",
  bloodPressure: "",
  weight: "",
  height: "",
  bmi: "",
  o2sat: "",
  leftVision: "",
  rightVision: "",

  // Clinical Notes
  chiefComplaints: "",
  objectiveFindings: "",
  diagnosticLeft: "",
  diagnosticRight: "",
  physicianImpression: "",
  treatmentLeft: "",
  treatmentRight: "",
  disposition: "",
  referredTo: "",
  followUpExamination: "",
  opdNurse: "",
  physician: "",
};

function SectionHeader({ title }) {
  return (
    <div className="bg-teal-700 text-white px-4 py-3 rounded-md mb-4 shadow-sm">
      <h2 className="text-sm font-semibold tracking-wide uppercase">{title}</h2>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white";

const textareaClass =
  "border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white resize-none";

export default function PatientRegistration({
  embedded = false,
  initialClassification = "",
  onClose,
  mode = "create",
  initialValues = null,
  onSave,
} = {}) {
  // Lazy initializer so every mount (e.g. each time this is opened from the
  // Patients modal) gets its own fresh record number instead of sharing the
  // module-level `initialForm` object. In edit mode, `initialValues` seeds
  // the form with the patient's existing data instead.
  const [form, setForm] = useState(() => ({
    ...initialForm,
    ...(initialValues || {}),
    hospitalRecordNo:
      (initialValues && initialValues.hospitalRecordNo) || generateRecordNo(),
    classification:
      initialClassification ||
      (initialValues && initialValues.classification) ||
      initialForm.classification,
  }));
  const [submitted, setSubmitted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);

  function handle(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Auto-calculate BMI from Height (cm) and Weight (kg), same as the old
  // Anthropometrics modal did. Kept editable in case someone needs to
  // override it.
  useEffect(() => {
    const h = parseFloat(form.height);
    const w = parseFloat(form.weight);
    if (!h || !w) return;
    const meters = h / 100;
    const bmi = (w / (meters * meters)).toFixed(1);
    setForm((prev) => (prev.bmi === bmi ? prev : { ...prev, bmi }));
  }, [form.height, form.weight]);

  function handleSubmit(e) {
    e.preventDefault();

    if (mode === "edit") {
      // Editing an existing patient's EMR — hand the data back to the
      // caller to overwrite, no new ER record and no PDF preview.
      onSave?.(form);
      onClose?.();
      return;
    }

    setSubmitted(true);
    // NOTE: this "create" path (mode !== "edit") isn't wired up to any
    // route today — PatientProfile.jsx only ever mounts this component
    // with mode="edit" as the EMR editor, whose onSave hands the form back
    // to the caller (see the branch above). If a standalone "create a
    // fresh EMR record" flow gets built later, persist `form` via
    // src/utils/patientDocuments.js's saveEmr() here instead of writing to
    // localStorage.
    // Open the PDF preview instead of jumping straight to a download
    setShowPreview(true);
  }

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      const blob = await pdf(<PatientRecordPDF form={form} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `EZarateHospital_PatientRecord_${form.hospitalRecordNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  function handleReset() {
    setForm({ ...initialForm, hospitalRecordNo: generateRecordNo() });
    setSubmitted(false);
    setShowPreview(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const { logout } = useAuth();
  const navigate = useNavigate();

  const fullName =
    [form.lastName, form.firstName, form.middleName].filter(Boolean).join(", ") || "—";

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-teal-700 text-white px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow">
        <div>
          <h1 className="text-lg font-semibold">E. ZARATE HOSPITAL</h1>
          <p className="text-teal-200 text-xs">
            {mode === "edit" ? "Electronic Medical Record" : "Patient Registration Form"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-teal-200">Hospital Record No.</p>
          <p className="text-lg font-bold tracking-widest">{form.hospitalRecordNo}</p>
        </div>
        {embedded ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto md:ml-0 inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
            Close
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="ml-auto md:ml-0 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            Logout
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-sm px-4 py-8 space-y-10">

        {/* Patient Information, Personal Details, Health Coverage, Emergency
            Contact, Allergies, Past Medical History, Active Diagnoses,
            Active Medication, and Consent now live in the Consultation
            Form (Encounter) — this file only covers the Visit/OPD Record. */}

        {/* ════════════════════════════════════════
            FORM 2 — VISIT DETAILS (nurse fills)
            ════════════════════════════════════════ */}
        <div className="border-t-4 border-teal-700 pt-8">
          <div className="bg-teal-700 text-white px-4 py-3 rounded-md mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-wide uppercase">Visit / OPD Record</h2>
              <p className="text-teal-200 text-xs mt-0.5">Filled by nurse on duty</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-teal-200">Patient</p>
              <p className="text-sm font-semibold">{fullName}</p>
            </div>
          </div>

          {/* Auto-populated header — read only */}
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 mb-6">
            <p className="text-xs text-slate-600 mb-3 font-medium uppercase tracking-wide">
              Auto-filled from the patient's record
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-slate-600 text-xs">Last Name</span><p className="font-medium">{form.lastName || "—"}</p></div>
              <div><span className="text-slate-600 text-xs">First Name</span><p className="font-medium">{form.firstName || "—"}</p></div>
              <div><span className="text-slate-600 text-xs">Middle Name</span><p className="font-medium">{form.middleName || "—"}</p></div>
              <div><span className="text-slate-600 text-xs">Age</span><p className="font-medium">{form.age || "—"}</p></div>
              <div><span className="text-slate-600 text-xs">Gender</span><p className="font-medium">{form.gender || "—"}</p></div>
              <div><span className="text-slate-600 text-xs">Date of Birth</span><p className="font-medium">{form.dateOfBirth || "—"}</p></div>
              <div><span className="text-slate-600 text-xs">Record No.</span><p className="font-medium">{form.hospitalRecordNo}</p></div>
            </div>
          </div>
        </div>

        {/* ── VISIT DETAILS ── */}
        <div>
          <SectionHeader title="Visit Details" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Date of Visit">
              <input name="dateOfVisit" value={form.dateOfVisit} onChange={handle} type="date" className={inputClass} />
            </Field>
            <Field label="Time">
              <input name="timeOfVisit" value={form.timeOfVisit} onChange={handle} type="time" className={inputClass} />
            </Field>
            <Field label="Nurse on Duty">
              <input name="nurseOnDuty" value={form.nurseOnDuty} onChange={handle} className={inputClass} />
            </Field>
            <Field label="Resident on Duty">
              <input name="residentOnDuty" value={form.residentOnDuty} onChange={handle} className={inputClass} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Classification">
              <select name="classification" value={form.classification} onChange={handle} className={inputClass}>
                <option value="">Select</option>
                <option value="Inpatient">Inpatient</option>
                <option value="Outpatient">Outpatient</option>
                <option value="ER">ER</option>
              </select>
            </Field>
          </div>
        </div>

        {/* ── VITAL SIGNS ── */}
        <div>
          <SectionHeader title="Vital Signs" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Field label="Temperature (°C)">
              <input name="temperature" value={form.temperature} onChange={handle} className={inputClass} />
            </Field>
            <Field label="Cardiac Rate">
              <input name="cardiacRate" value={form.cardiacRate} onChange={handle} className={inputClass} />
            </Field>
            <Field label="Respiratory Rate">
              <input name="respiratoryRate" value={form.respiratoryRate} onChange={handle} className={inputClass} />
            </Field>
            <Field label="Blood Pressure">
              <input name="bloodPressure" value={form.bloodPressure} onChange={handle} className={inputClass} placeholder="120/80" />
            </Field>
            <Field label="Weight (kg)">
              <input name="weight" value={form.weight} onChange={handle} className={inputClass} />
            </Field>
            <Field label="O2 SAT (%)">
              <input name="o2sat" value={form.o2sat} onChange={handle} className={inputClass} />
            </Field>
            <Field label="Height (cm)">
              <input name="height" value={form.height} onChange={handle} className={inputClass} />
            </Field>
            <Field label="BMI">
              <input
                name="bmi"
                value={form.bmi}
                onChange={handle}
                placeholder="Auto-computed"
                className={`${inputClass} bg-slate-50`}
              />
            </Field>
            <Field label="Left Vision">
              <input name="leftVision" value={form.leftVision} onChange={handle} placeholder="e.g. 20/20" className={inputClass} />
            </Field>
            <Field label="Right Vision">
              <input name="rightVision" value={form.rightVision} onChange={handle} placeholder="e.g. 20/20" className={inputClass} />
            </Field>
          </div>
        </div>

        {/* ── CLINICAL NOTES ── */}
        <div>
          <SectionHeader title="Clinical Notes" />
          <div className="space-y-4">
            <Field label="Patient's Subjective / Chief Complaints">
              <textarea name="chiefComplaints" value={form.chiefComplaints} onChange={handle} rows={4} className={textareaClass} />
            </Field>
            <Field label="Pertinent P.E. / Objective Findings">
              <textarea name="objectiveFindings" value={form.objectiveFindings} onChange={handle} rows={4} className={textareaClass} />
            </Field>
          </div>
        </div>

        {/* ── DIAGNOSTICS ── */}
        <div>
          <SectionHeader title="Diagnostic, Ancillaries and Results" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Results (Column 1)">
              <textarea name="diagnosticLeft" value={form.diagnosticLeft} onChange={handle} rows={6} className={textareaClass} />
            </Field>
            <Field label="Results (Column 2)">
              <textarea name="diagnosticRight" value={form.diagnosticRight} onChange={handle} rows={6} className={textareaClass} />
            </Field>
          </div>
        </div>

        {/* ── PHYSICIAN'S IMPRESSION ── */}
        <div>
          <SectionHeader title="Physician's Impression / Diagnosis" />
          <Field label="Impression / Diagnosis">
            <textarea name="physicianImpression" value={form.physicianImpression} onChange={handle} rows={4} className={textareaClass} />
          </Field>
        </div>

        {/* ── TREATMENT ── */}
        <div>
          <SectionHeader title="Treatment Done & Medication Given" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Treatment (Column 1)">
              <textarea name="treatmentLeft" value={form.treatmentLeft} onChange={handle} rows={6} className={textareaClass} />
            </Field>
            <Field label="Treatment (Column 2)">
              <textarea name="treatmentRight" value={form.treatmentRight} onChange={handle} rows={6} className={textareaClass} />
            </Field>
          </div>
        </div>

        {/* ── DISPOSITION ── */}
        <div>
          <SectionHeader title="Disposition & Referral" />
          <div className="space-y-4">
            <Field label="Disposition">
              <textarea name="disposition" value={form.disposition} onChange={handle} rows={3} className={textareaClass} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Referred To">
                <input name="referredTo" value={form.referredTo} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Follow-up Examination">
                <input name="followUpExamination" value={form.followUpExamination} onChange={handle} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="OPD Nurse (Signature over Printed Name)">
                <input name="opdNurse" value={form.opdNurse} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Physician (Signature over Printed Name)">
                <input name="physician" value={form.physician} onChange={handle} className={inputClass} />
              </Field>
            </div>
          </div>
        </div>

        {/* ── SUBMIT ── */}
        <div className="flex gap-4 justify-end pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={mode === "edit" ? onClose : handleReset}
            className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            {mode === "edit" ? "Cancel" : "Clear Form"}
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium transition-colors"
          >
            {mode === "edit" ? "Save Changes" : "Submit Record"}
          </button>
        </div>
      </form>

      {/* ══════════════════════════════════
          LIVE PREVIEW — shows at bottom
          ══════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="border-t-4 border-teal-700 pt-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Live Preview</h2>
          <p className="text-xs text-slate-600 mb-6">
            Updates as you fill in the form above. This is what will be saved/printed.
          </p>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6 text-sm">

            {/* Preview Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <p className="font-bold text-base text-slate-800">E. ZARATE HOSPITAL</p>
                <p className="text-xs text-slate-600">DOH-Licensed & PhA-Member Level I Hospital</p>
                <p className="text-xs text-slate-600">16 J. Aguilar Ave., Talon, Las Piñas City</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600">Hospital Record No.</p>
                <p className="text-xl font-bold text-teal-700 tracking-widest">{form.hospitalRecordNo}</p>
              </div>
            </div>

            {/* Patient Name */}
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide font-medium mb-2">Patient's Name</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><p className="text-xs text-slate-600">Last Name</p><p className="font-medium">{form.lastName || "—"}</p></div>
                <div><p className="text-xs text-slate-600">First Name</p><p className="font-medium">{form.firstName || "—"}</p></div>
                <div><p className="text-xs text-slate-600">Middle Name</p><p className="font-medium">{form.middleName || "—"}</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div><p className="text-xs text-slate-600">Age</p><p className="font-medium">{form.age || "—"}</p></div>
                <div><p className="text-xs text-slate-600">Gender</p><p className="font-medium">{form.gender || "—"}</p></div>
                <div><p className="text-xs text-slate-600">Date of Birth</p><p className="font-medium">{form.dateOfBirth || "—"}</p></div>
              </div>
            </div>

            {/* Visit Details */}
            <div className="border-t pt-4">
              <p className="text-xs text-slate-600 uppercase tracking-wide font-medium mb-2">Visit Details</p>
              <div className="space-y-1">
                <PreviewRow label="Date / Time" value={[form.dateOfVisit, form.timeOfVisit].filter(Boolean).join(" at ")} />
                <PreviewRow label="Nurse on Duty" value={form.nurseOnDuty} />
                <PreviewRow label="Resident on Duty" value={form.residentOnDuty} />
                <PreviewRow label="Classification" value={form.classification} />
              </div>
            </div>

            {/* Vital Signs */}
            <div className="border-t pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">Vital Signs</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <VitalBox label="Temp (°C)" value={form.temperature} />
                <VitalBox label="Cardiac Rate" value={form.cardiacRate} />
                <VitalBox label="Resp. Rate" value={form.respiratoryRate} />
                <VitalBox label="Blood Pressure" value={form.bloodPressure} />
                <VitalBox label="Weight (kg)" value={form.weight} />
                <VitalBox label="O2 SAT (%)" value={form.o2sat} />
                <VitalBox label="Height (cm)" value={form.height} />
                <VitalBox label="BMI" value={form.bmi} />
                <VitalBox label="Left Vision" value={form.leftVision} />
                <VitalBox label="Right Vision" value={form.rightVision} />
              </div>
            </div>

            {/* Clinical Notes */}
            <div className="border-t pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">Clinical Notes</p>
              <PreviewBlock label="Chief Complaints" value={form.chiefComplaints} />
              <PreviewBlock label="Objective Findings" value={form.objectiveFindings} />
              <PreviewBlock label="Diagnostics (Col 1)" value={form.diagnosticLeft} />
              <PreviewBlock label="Diagnostics (Col 2)" value={form.diagnosticRight} />
              <PreviewBlock label="Physician's Impression" value={form.physicianImpression} />
              <PreviewBlock label="Treatment (Col 1)" value={form.treatmentLeft} />
              <PreviewBlock label="Treatment (Col 2)" value={form.treatmentRight} />
              <PreviewBlock label="Disposition" value={form.disposition} />
            </div>

            {/* Referral */}
            <div className="border-t pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">Referral & Signatures</p>
              <div className="space-y-1">
                <PreviewRow label="Referred To" value={form.referredTo} />
                <PreviewRow label="Follow-up Examination" value={form.followUpExamination} />
                <PreviewRow label="OPD Nurse" value={form.opdNurse} />
                <PreviewRow label="Physician" value={form.physician} />
              </div>
            </div>

          </div>

          {submitted && (
            <div className="mt-6 bg-teal-50 border border-teal-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-teal-800 font-semibold text-sm">Record submitted successfully.</p>
                <p className="text-teal-600 text-xs mt-0.5">
                  Record No. {form.hospitalRecordNo} has been saved locally.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(true)}
                  className="text-sm px-4 py-2 border border-teal-700 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors"
                >
                  View PDF Again
                </button>
                <button
                  onClick={handleReset}
                  className="text-sm px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors"
                >
                  New Patient
                </button>
                {embedded && (
                  <button
                    onClick={onClose}
                    className="text-sm px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Back to Patients
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════
          PDF PREVIEW MODAL
          Shows the Legal-size ("Long") PDF
          before it is downloaded.
          ══════════════════════════════════ */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="bg-teal-700 text-white px-5 py-3 flex items-center justify-between shrink-0">
              <div>
                <p className="font-semibold text-sm">PDF Preview</p>
                <p className="text-teal-200 text-xs">
                  Record No. {form.hospitalRecordNo} &middot; Legal size (Long, 8.5&quot; × 14&quot;)
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-teal-100 hover:text-white text-sm px-2 py-1"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>

            {/* PDF render */}
            <div className="flex-1 bg-slate-200 overflow-hidden">
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                <PatientRecordPDF form={form} />
              </PDFViewer>
            </div>

            {/* Modal actions */}
            <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-3 shrink-0 bg-slate-50">
              <button
                onClick={() => setShowPreview(false)}
                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="px-6 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {downloading ? "Preparing…" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PreviewRow({ label, value }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-slate-400 w-44 shrink-0">{label}:</span>
      <span className="text-slate-700 font-medium">{value || "—"}</span>
    </div>
  );
}

export function PreviewBlock({ label, value }) {
  return (
    <div className="mb-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 rounded p-2 text-sm min-h-8">
        {value || "—"}
      </p>
    </div>
  );
}

export function VitalBox({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-200">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-bold text-slate-800 text-sm mt-1">{value || "—"}</p>
    </div>
  );
}