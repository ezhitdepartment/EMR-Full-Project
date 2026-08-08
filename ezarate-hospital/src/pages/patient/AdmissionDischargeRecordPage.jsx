// Admission and Discharge Record — a real, saved, editable page instead
// of a straight-to-PDF button, same upgrade Medical Abstract already got
// (see MedicalAbstractPage.jsx). Opened from the "Admission and Discharge
// Record" action on Admitted Patients (see AdmittedPatients.jsx). Basic
// patient info and everything already captured on the Consultation Form
// are auto-filled the FIRST time this page is opened for a given
// admission (see buildAdmissionDischargeRecordSeed() in
// admissionDischargeRecordHelpers.js); every field stays fully editable,
// and once saved once, re-opening this page loads the SAVED version so
// nothing gets silently re-derived over an edit.
//
// Saved via patient_documents (doc_type "admitdischarge") — same
// load/save-as-you-go pattern already used for the EMR / ER Discharge /
// Konsulta Referral / Medical Certificate / Medical Abstract (see
// utils/patientDocuments.js).

import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { pdf } from "@react-pdf/renderer";
import { ArrowLeft, Loader2, Download, Save, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { findPatientById } from "../../utils/patients";
import { resolveMedicalAbstractSources } from "../../utils/admittedPatients";
import {
  loadAdmissionDischargeRecord,
  saveAdmissionDischargeRecord,
} from "../../utils/patientDocuments";
import AdmissionDischargeRecordPDF from "./AdmissionDischargeRecordPDF";
import {
  emptyAdmissionDischargeRecordForm,
  buildAdmissionDischargeRecordSeed,
} from "./admissionDischargeRecordHelpers";

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

// "DIMAS, ROBETH O." style filename label — same convention
// MedicalAbstractPage.jsx / PatientProfile.jsx use for their downloads.
function fileNameFor(form) {
  const parts = [form.lastName, form.firstName].filter(Boolean).join(", ");
  return parts || form.hospitalNo || "Patient";
}

export default function AdmissionDischargeRecordPage() {
  const { hospitalNo } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(emptyAdmissionDischargeRecordForm());
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

      const existing = await loadAdmissionDischargeRecord(hospitalNo);
      if (cancelled) return;

      if (existing) {
        // Already saved before — load exactly what was saved, patched
        // with any newer fields this version of the app knows about that
        // an older save wouldn't have, and with patient identity fields
        // refreshed from the patient's own record (name/sex/DOB/address
        // are read-only on this form and should always reflect Patients,
        // not a stale snapshot).
        setForm((f) => ({
          ...emptyAdmissionDischargeRecordForm(),
          ...existing,
          hospitalNo: patient.hospitalNo,
          lastName: patient.lastName,
          firstName: patient.firstName,
          middleName: patient.middleName,
          sex: patient.sex,
          birthday: patient.dateOfBirth,
          permanentAddress: patient.address,
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
        if (!cancelled) {
          setForm(buildAdmissionDischargeRecordSeed({ ...sources, patient }));
        }
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

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await saveAdmissionDischargeRecord(hospitalNo, form, user?.id ?? null);
      setForm((f) => ({ ...f, ...updated }));
      setSavedAt(new Date());
    } catch (err) {
      console.error("Saving Admission and Discharge Record failed:", err);
      window.alert("Couldn't save the Admission and Discharge Record. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await pdf(<AdmissionDischargeRecordPDF form={form} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileNameFor(form)} - Admission and Discharge Record.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Admission and Discharge Record PDF generation failed:", err);
      window.alert("Couldn't generate the Admission and Discharge Record PDF. Please try again.");
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

  return (
    <div className="max-w-5xl pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4 sticky top-0 z-10 bg-slate-50/95 backdrop-blur py-2 -mx-1 px-1">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Admission and Discharge Record</h1>
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
        {/* Header identifiers */}
        <Section title="Record Identifiers">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Hospital Code">
              <input value={form.hospitalNo} readOnly className={readOnlyInputClass} />
            </Field>
            <Field label="Medical Record No.">
              <input
                value={form.medicalRecordNo}
                onChange={(e) => set("medicalRecordNo", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Patient's Name / Permanent Address — auto-filled, read-only */}
        <Section title="Patient's Name" subtitle="Filled in automatically from this patient's record">
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Last">
              <input value={form.lastName} readOnly className={readOnlyInputClass} />
            </Field>
            <Field label="Given">
              <input value={form.firstName} readOnly className={readOnlyInputClass} />
            </Field>
            <Field label="Middle">
              <input value={form.middleName} readOnly className={readOnlyInputClass} />
            </Field>
            <Field label="Permanent Address" full>
              <input value={form.permanentAddress} readOnly className={readOnlyInputClass} />
            </Field>
          </div>
        </Section>

        {/* Personal information */}
        <Section title="Personal Information">
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Tel no">
              <input
                value={form.telNo}
                onChange={(e) => set("telNo", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Sex">
              <input value={form.sex} readOnly className={readOnlyInputClass} />
            </Field>
            <Field label="Civil Status">
              <input
                value={form.civilStatus}
                onChange={(e) => set("civilStatus", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Birthday">
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => set("birthday", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Birthplace">
              <input
                value={form.birthplace}
                onChange={(e) => set("birthplace", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Nationality">
              <input
                value={form.nationality}
                onChange={(e) => set("nationality", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Religion">
              <input
                value={form.religion}
                onChange={(e) => set("religion", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Occupation">
              <input
                value={form.occupation}
                onChange={(e) => set("occupation", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Family background */}
        <Section title="Family Background">
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Father's Name">
              <input
                value={form.fatherName}
                onChange={(e) => set("fatherName", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Address">
              <input
                value={form.fatherAddress}
                onChange={(e) => set("fatherAddress", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Tel no">
              <input
                value={form.fatherTelNo}
                onChange={(e) => set("fatherTelNo", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Mother's Name">
              <input
                value={form.motherName}
                onChange={(e) => set("motherName", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Address">
              <input
                value={form.motherAddress}
                onChange={(e) => set("motherAddress", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Tel no">
              <input
                value={form.motherTelNo}
                onChange={(e) => set("motherTelNo", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Spouse Name">
              <input
                value={form.spouseName}
                onChange={(e) => set("spouseName", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Address">
              <input
                value={form.spouseAddress}
                onChange={(e) => set("spouseAddress", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Tel no">
              <input
                value={form.spouseTelNo}
                onChange={(e) => set("spouseTelNo", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Confinement */}
        <Section title="Confinement">
          <div className="grid md:grid-cols-3 gap-3">
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
            <Field label="Total no. of days">
              <input
                value={form.totalNoOfDays}
                onChange={(e) => set("totalNoOfDays", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Type of Admission</p>
            <RadioRow options={["New", "Old"]} value={form.admissionType} onChange={(v) => set("admissionType", v)} />
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <Field label="Referred by">
              <input
                value={form.referredBy}
                onChange={(e) => set("referredBy", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Admitting Physician">
              <input
                value={form.admittingPhysician}
                onChange={(e) => set("admittingPhysician", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Alert / HMO / Philhealth */}
        <Section title="Alert & Coverage">
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Alert: Allergic to" full>
              <input
                value={form.allergicTo}
                onChange={(e) => set("allergicTo", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="HMO">
              <input value={form.hmo} onChange={(e) => set("hmo", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Philhealth">
              <input
                value={form.philhealth}
                onChange={(e) => set("philhealth", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Informant */}
        <Section title="Informant">
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Data furnished by">
              <input
                value={form.dataFurnishedBy}
                onChange={(e) => set("dataFurnishedBy", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Address of informant">
              <input
                value={form.addressOfInformant}
                onChange={(e) => set("addressOfInformant", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Relation to the patient">
              <input
                value={form.relationToPatient}
                onChange={(e) => set("relationToPatient", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Diagnosis */}
        <Section title="Diagnosis">
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Admitting Diagnosis" full>
              <textarea
                rows={2}
                value={form.admittingDiagnosis}
                onChange={(e) => set("admittingDiagnosis", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <Field label="ICD Code no.">
              <input
                value={form.admittingIcdCode}
                onChange={(e) => set("admittingIcdCode", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Final Diagnosis" full>
              <textarea
                rows={2}
                value={form.finalDiagnosis}
                onChange={(e) => set("finalDiagnosis", e.target.value)}
                className={textareaClass}
              />
            </Field>
          </div>
        </Section>

        {/* Accident / Injuries / Poisoning */}
        <Section title="Accident / Injuries / Poisoning">
          <div className="grid gap-3">
            <Field label="Description" full>
              <textarea
                rows={2}
                value={form.accidentInjuriesPoisoning}
                onChange={(e) => set("accidentInjuriesPoisoning", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <Field label="Place of occurrence" full>
              <input
                value={form.placeOfOccurrence}
                onChange={(e) => set("placeOfOccurrence", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Evaluation & Disposition */}
        <Section title="Evaluation & Disposition">
          <div className="grid gap-4">
            <Field label="Evaluation" full>
              <textarea
                rows={3}
                value={form.evaluation}
                onChange={(e) => set("evaluation", e.target.value)}
                className={textareaClass}
              />
            </Field>

            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Condition</p>
              <RadioRow
                options={["Recovered", "Improved", "Died", "Unimproved"]}
                value={form.conditionOnDischarge}
                onChange={(v) => set("conditionOnDischarge", v)}
              />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Duration of Stay</p>
              <RadioRow
                options={["(-) 48 hours", "(+) 48 hrs"]}
                value={form.durationOfStayMarker}
                onChange={(v) => set("durationOfStayMarker", v)}
              />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Autopsy</p>
              <RadioRow
                options={["Autopsy", "No autopsy"]}
                value={form.autopsyStatus}
                onChange={(v) => set("autopsyStatus", v)}
              />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Disposition</p>
              <RadioRow
                options={["Discharge", "Transferred", "HAMA", "Abscond"]}
                value={form.dispositionType}
                onChange={(v) => set("dispositionType", v)}
              />
            </div>
          </div>
        </Section>

        {/* Certification */}
        <Section title="Attending Physician">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Name and Signature of Attending Physician, M.D." full>
              <input
                value={form.attendingPhysicianName}
                onChange={(e) => set("attendingPhysicianName", e.target.value)}
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
