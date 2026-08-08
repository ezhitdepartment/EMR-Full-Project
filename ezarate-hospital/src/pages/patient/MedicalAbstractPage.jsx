// Medical Abstract — a real, saved, editable page instead of a
// straight-to-PDF button. Opened from the "Medical Abstract" action on
// Admitted Patients (see AdmittedPatients.jsx). Basic patient info and
// everything already captured on the Consultation Form are auto-filled
// the FIRST time this page is opened for a given admission (see
// buildMedicalAbstractSeed() in medicalAbstractHelpers.js); every field
// stays fully editable, and once saved once, re-opening this page loads
// the SAVED version so nothing gets silently re-derived over an edit.
//
// Saved via patient_documents (doc_type "medabstract") — same
// load/save-as-you-go pattern already used for the EMR / ER Discharge /
// Konsulta Referral / Medical Certificate (see utils/patientDocuments.js).

import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { pdf } from "@react-pdf/renderer";
import { ArrowLeft, Loader2, Plus, Trash2, Download, Save, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { findPatientById } from "../../utils/patients";
import { resolveMedicalAbstractSources } from "../../utils/admittedPatients";
import { loadMedicalAbstract, saveMedicalAbstract } from "../../utils/patientDocuments";
import MedicalAbstractPDF from "./MedicalAbstractPDF";
import {
  emptyMedicalAbstractForm,
  buildMedicalAbstractSeed,
  newCourseInWardRow,
  newTakeHomeMedicineRow,
} from "./medicalAbstractHelpers";
import {
  SIGNS_AND_SYMPTOMS_OPTIONS,
  GENERAL_SURVEY_OPTIONS,
  HEENT_OPTIONS,
  PE_SYSTEMS,
} from "./ConsultationForm";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600";
const readOnlyInputClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600";
const textareaClass = `${inputClass} resize-none`;

function Field({ label, children, full }) {
  return (
    <label className={`block ${full ? "col-span-full" : ""}`}>
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Same multi-select checkbox grid ConsultationForm.jsx uses — duplicated
// here (rather than exported/shared) since it's a small, self-contained
// piece of markup and ConsultationForm.jsx doesn't currently export it.
function CheckboxGroup({ options, selected, onToggle, columns = "sm:grid-cols-2 lg:grid-cols-3" }) {
  return (
    <div className={`grid grid-cols-1 ${columns} gap-2`}>
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
            className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

function RadioRow({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-4">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="text-teal-700 focus:ring-teal-600"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

// "DIMAS, ROBETH O." style filename label — same convention PatientProfile
// uses for its downloads.
function fileNameFor(form) {
  const parts = [form.lastName, form.firstName].filter(Boolean).join(", ");
  return parts || form.hospitalNo || "Patient";
}

export default function MedicalAbstractPage() {
  const { hospitalNo } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(emptyMedicalAbstractForm());
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const patient = await findPatientById(hospitalNo);
      if (!patient) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      const existing = await loadMedicalAbstract(hospitalNo);
      if (cancelled) return;

      if (existing) {
        // Already saved before — load exactly what was saved, patched
        // with any newer fields this version of the app knows about that
        // an older save wouldn't have (e.g. Admitting Nurse), and with
        // patient identity fields refreshed from the patient's own
        // record (name/sex/DOB/address are read-only on this form and
        // should always reflect Patients, not a stale snapshot).
        setForm((f) => ({
          ...emptyMedicalAbstractForm(),
          ...existing,
          hospitalNo: patient.hospitalNo,
          lastName: patient.lastName,
          firstName: patient.firstName,
          middleName: patient.middleName,
          sex: patient.sex,
          dateOfBirth: patient.dateOfBirth,
          address: patient.address,
        }));
      } else {
        // First time opening this page for this admission — auto-fill
        // from the patient's record plus their most recent Consultation
        // Form entries.
        const record = {
          hospitalNo: patient.hospitalNo,
          lastName: patient.lastName,
          firstName: patient.firstName,
          middleName: patient.middleName,
          sex: patient.sex,
          dateOfBirth: patient.dateOfBirth,
          address: patient.address,
          encounterId: location.state?.record?.encounterId || null,
          consultationId: location.state?.record?.consultationId || null,
        };
        const sources = await resolveMedicalAbstractSources(record);
        if (!cancelled) setForm(buildMedicalAbstractSeed(sources));
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalNo]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSavedAt(null);
  }

  function toggle(field, opt) {
    setForm((f) => {
      const current = f[field] || [];
      const next = current.includes(opt) ? current.filter((o) => o !== opt) : [...current, opt];
      return { ...f, [field]: next };
    });
    setSavedAt(null);
  }

  function updateRow(field, id, key, value) {
    setForm((f) => ({
      ...f,
      [field]: f[field].map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    }));
    setSavedAt(null);
  }

  function addRow(field, factory) {
    setForm((f) => ({ ...f, [field]: [...f[field], factory()] }));
    setSavedAt(null);
  }

  function removeRow(field, id) {
    setForm((f) => ({ ...f, [field]: f[field].filter((row) => row.id !== id) }));
    setSavedAt(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await saveMedicalAbstract(hospitalNo, form, user?.id ?? null);
      setForm((f) => ({ ...f, ...updated }));
      setSavedAt(new Date());
    } catch (err) {
      console.error("Saving Medical Abstract failed:", err);
      window.alert("Couldn't save the Medical Abstract. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await pdf(<MedicalAbstractPDF form={form} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileNameFor(form)} - Medical Abstract.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Medical Abstract PDF generation failed:", err);
      window.alert("Couldn't generate the Medical Abstract PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <div className="min-h-[50vh]" />;
  }

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
        <p className="text-sm font-semibold text-slate-800 mb-1">Patient not found</p>
        <p className="text-xs text-slate-500 mb-4">
          We couldn't find a patient with Hospital No. "{hospitalNo}".
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>
    );
  }

  const fullName = [form.lastName, form.firstName, form.middleName].filter(Boolean).join(", ");
  const isFemale = (form.sex || "").toLowerCase() === "female";

  return (
    <div className="max-w-5xl pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4 sticky top-0 z-10 bg-slate-50/95 backdrop-blur py-2 -mx-1 px-1">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Medical Abstract</h1>
          <p className="text-sm text-slate-500 mt-1">
            {fullName || "Unnamed patient"} · Hospital No. {form.hospitalNo || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 size={14} />
              Saved
            </span>
          )}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download PDF
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Patient Information — auto-filled from the patient's record,
            read-only here (edit the patient's actual record instead). */}
        <Section title="Patient Information" subtitle="Filled in automatically from this patient's record">
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Hospital No.">
              <input value={form.hospitalNo} readOnly className={readOnlyInputClass} />
            </Field>
            <Field label="Name" full>
              <input value={fullName} readOnly className={readOnlyInputClass} />
            </Field>
            <Field label="Sex">
              <input value={form.sex} readOnly className={readOnlyInputClass} />
            </Field>
            <Field label="Date of Birth">
              <input value={form.dateOfBirth} readOnly className={readOnlyInputClass} />
            </Field>
            <Field label="Address" full>
              <input value={form.address} readOnly className={readOnlyInputClass} />
            </Field>
          </div>
        </Section>

        {/* Admission Information */}
        <Section title="Admission Information">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Admitting Physician">
              <input
                value={form.admittingPhysician}
                onChange={(e) => set("admittingPhysician", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Admitting Nurse">
              <input
                value={form.admittingNurse}
                onChange={(e) => set("admittingNurse", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Date Admitted">
              <input
                type="date"
                value={form.dateAdmitted}
                onChange={(e) => set("dateAdmitted", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Time Admitted">
              <input
                type="time"
                value={form.timeAdmitted}
                onChange={(e) => set("timeAdmitted", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Clinical Summary */}
        <Section title="Clinical Summary">
          <div className="grid gap-3">
            <Field label="Chief Complaint" full>
              <textarea
                rows={2}
                value={form.chiefComplaint}
                onChange={(e) => set("chiefComplaint", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <Field label="Admitting Impression / Diagnosis" full>
              <textarea
                rows={2}
                value={form.admittingDiagnosis}
                onChange={(e) => set("admittingDiagnosis", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <Field label="Brief History of Present Illness" full>
              <textarea
                rows={4}
                value={form.historyOfPresentIllness}
                onChange={(e) => set("historyOfPresentIllness", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <Field label="Pertinent Past Medical History" full>
              <textarea
                rows={2}
                value={form.pastMedicalHistory}
                onChange={(e) => set("pastMedicalHistory", e.target.value)}
                className={textareaClass}
              />
            </Field>
          </div>
        </Section>

        {/* OB/GYN History — female patients only */}
        {isFemale && (
          <Section title="OB/GYN History">
            <div className="grid sm:grid-cols-3 md:grid-cols-6 gap-3">
              <Field label="No. of Pregnancies (G)">
                <input
                  value={form.noOfPregnancies}
                  onChange={(e) => set("noOfPregnancies", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="No. of Deliveries (P)">
                <input
                  value={form.noOfDeliveries}
                  onChange={(e) => set("noOfDeliveries", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Full Term">
                <input
                  value={form.fullTerm}
                  onChange={(e) => set("fullTerm", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Premature">
                <input
                  value={form.premature}
                  onChange={(e) => set("premature", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="No. of Abortions">
                <input
                  value={form.noOfAbortions}
                  onChange={(e) => set("noOfAbortions", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="LMP">
                <input
                  type="date"
                  value={form.lastMenstrualPeriod}
                  onChange={(e) => set("lastMenstrualPeriod", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>
        )}

        {/* Signs & Symptoms */}
        <Section title="Pertinent Signs and Symptoms on Admission">
          <CheckboxGroup
            options={SIGNS_AND_SYMPTOMS_OPTIONS.filter((o) => o !== "Pain" && o !== "Others")}
            selected={form.admissionSigns}
            onToggle={(opt) => toggle("admissionSigns", opt)}
          />
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.admissionSigns.includes("Pain")}
                onChange={() => toggle("admissionSigns", "Pain")}
                className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span className="flex-1">
                Pain — site
                <input
                  value={form.admissionSignsPainSite}
                  onChange={(e) => set("admissionSignsPainSite", e.target.value)}
                  className={`${inputClass} mt-1`}
                  placeholder="e.g. Right lower quadrant"
                />
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.admissionSigns.includes("Others")}
                onChange={() => toggle("admissionSigns", "Others")}
                className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span className="flex-1">
                Others — specify
                <input
                  value={form.admissionSignsOthers}
                  onChange={(e) => set("admissionSignsOthers", e.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </span>
            </label>
          </div>
        </Section>

        {/* Referral */}
        <Section title="Referred from Another Health Care Institution (HCI)?">
          <RadioRow
            options={["NO", "YES"]}
            value={form.referredFromOtherHCI}
            onChange={(v) => set("referredFromOtherHCI", v)}
          />
          {form.referredFromOtherHCI === "YES" && (
            <div className="mt-3">
              <Field label="Name of Originating HCI">
                <input
                  value={form.referringHCIName}
                  onChange={(e) => set("referringHCIName", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          )}
        </Section>

        {/* Physical Examination on Admission */}
        <Section title="Physical Examination on Admission" subtitle="Pertinent findings per system">
          <Field label="Vital Signs" full>
            <input
              value={form.vitalSigns}
              onChange={(e) => set("vitalSigns", e.target.value)}
              placeholder="BP: 120/80   HR: 88   RR: 20   Temp: 36.8   Wt: 60   Ht: 165"
              className={inputClass}
            />
          </Field>

          <div className="mt-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">General Survey</p>
            <CheckboxGroup
              options={GENERAL_SURVEY_OPTIONS}
              selected={form.peGeneralSurvey}
              onToggle={(opt) => toggle("peGeneralSurvey", opt)}
            />
            {form.peGeneralSurvey.includes("Altered sensorium") && (
              <input
                value={form.peGeneralSurveyAlteredSensoriumSpecify}
                onChange={(e) => set("peGeneralSurveyAlteredSensoriumSpecify", e.target.value)}
                placeholder="Specify"
                className={`${inputClass} mt-2 max-w-sm`}
              />
            )}
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">SHEENT</p>
            <CheckboxGroup options={HEENT_OPTIONS} selected={form.peHeent} onToggle={(opt) => toggle("peHeent", opt)} />
            <input
              value={form.peHeentOthers}
              onChange={(e) => set("peHeentOthers", e.target.value)}
              placeholder="Others — specify"
              className={`${inputClass} mt-2 max-w-sm`}
            />
          </div>

          {PE_SYSTEMS.map((system) => (
            <div key={system.key} className="mt-4">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">{system.label}</p>
              <CheckboxGroup
                options={system.options}
                selected={form[system.key] || []}
                onToggle={(opt) => toggle(system.key, opt)}
              />
              <input
                value={form[system.othersKey] || ""}
                onChange={(e) => set(system.othersKey, e.target.value)}
                placeholder="Others — specify"
                className={`${inputClass} mt-2 max-w-sm`}
              />
            </div>
          ))}
        </Section>

        <Section title="Surgical Procedures">
          <Field label="Surgical Procedure(s) — RVS Code" full>
            <textarea
              rows={2}
              value={form.surgicalProcedureRvsCode}
              onChange={(e) => set("surgicalProcedureRvsCode", e.target.value)}
              className={textareaClass}
            />
          </Field>
        </Section>

        {/* Ancillaries / Medication done */}
        <Section title="Ancillaries & Medication">
          <div className="grid gap-3">
            <Field label="Ancillaries Done" full>
              <textarea
                rows={2}
                value={form.ancillariesDone}
                onChange={(e) => set("ancillariesDone", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <Field label="Medication / Treatment Done" full>
              <textarea
                rows={3}
                value={form.medicationTreatmentDone}
                onChange={(e) => set("medicationTreatmentDone", e.target.value)}
                className={textareaClass}
              />
            </Field>
          </div>
        </Section>

        {/* Course in the Ward */}
        <Section title="Course in the Ward">
          <div className="flex flex-col gap-2">
            {form.courseInWardEntries.length === 0 && (
              <p className="text-xs text-slate-400 italic">No entries yet — add one below.</p>
            )}
            {form.courseInWardEntries.map((row) => (
              <div key={row.id} className="grid grid-cols-[140px_1fr_auto] gap-2 items-start">
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow("courseInWardEntries", row.id, "date", e.target.value)}
                  className={inputClass}
                />
                <input
                  value={row.orderAction}
                  onChange={(e) => updateRow("courseInWardEntries", row.id, "orderAction", e.target.value)}
                  placeholder="Doctor's order / action"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeRow("courseInWardEntries", row.id)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Remove row"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addRow("courseInWardEntries", newCourseInWardRow)}
              className="self-start inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors mt-1"
            >
              <Plus size={14} />
              Add Entry
            </button>
          </div>
        </Section>

        {/* Discharge */}
        <Section title="Discharge">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Final Diagnosis" full>
              <textarea
                rows={2}
                value={form.dischargeDiagnosis}
                onChange={(e) => set("dischargeDiagnosis", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <Field label="ICD 10 Code / RVS">
              <input
                value={form.icd10OrRvsCode}
                onChange={(e) => set("icd10OrRvsCode", e.target.value)}
                className={inputClass}
              />
            </Field>
            <div />
            <Field label="Date Discharged">
              <input
                type="date"
                value={form.dateDischarged}
                onChange={(e) => set("dateDischarged", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Time Discharged">
              <input
                type="time"
                value={form.timeDischarged}
                onChange={(e) => set("timeDischarged", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Outcome of Treatment</p>
            <RadioRow
              options={["Improved", "HAMA", "Expired", "Absconded", "Transferred"]}
              value={form.outcomeOfTreatment}
              onChange={(v) => set("outcomeOfTreatment", v)}
            />
          </div>

          <div className="mt-4">
            <Field label="Disposition">
              <input
                value={form.disposition}
                onChange={(e) => set("disposition", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Take Home Medicines */}
        <Section title="Take Home Medicines">
          <div className="flex flex-col gap-2">
            {form.takeHomeMedicines.length === 0 && (
              <p className="text-xs text-slate-400 italic">No medicines yet — add one below.</p>
            )}
            {form.takeHomeMedicines.map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr_110px_80px_1fr_auto] gap-2 items-start">
                <input
                  value={row.medicineName}
                  onChange={(e) => updateRow("takeHomeMedicines", row.id, "medicineName", e.target.value)}
                  placeholder="Medicine name"
                  className={inputClass}
                />
                <input
                  value={row.milligram}
                  onChange={(e) => updateRow("takeHomeMedicines", row.id, "milligram", e.target.value)}
                  placeholder="Milligram"
                  className={inputClass}
                />
                <input
                  value={row.quantity}
                  onChange={(e) => updateRow("takeHomeMedicines", row.id, "quantity", e.target.value)}
                  placeholder="Qty"
                  className={inputClass}
                />
                <input
                  value={row.instructions}
                  onChange={(e) => updateRow("takeHomeMedicines", row.id, "instructions", e.target.value)}
                  placeholder="Instructions (Sig)"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeRow("takeHomeMedicines", row.id)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Remove row"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addRow("takeHomeMedicines", newTakeHomeMedicineRow)}
              className="self-start inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors mt-1"
            >
              <Plus size={14} />
              Add Medicine
            </button>
          </div>
        </Section>

        {/* Certification */}
        <Section title="Certification of Attending Health Care Professional">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Name and Signature of Attending Physician, M.D.">
              <input
                value={form.attendingPrintedName}
                onChange={(e) => set("attendingPrintedName", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Date Signed">
              <input
                type="date"
                value={form.attendingCertifiedDate}
                onChange={(e) => set("attendingCertifiedDate", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Bottom actions — mirrors the header buttons so long forms don't
            require scrolling back to the top to save. */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 px-6 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download PDF
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-8 py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
