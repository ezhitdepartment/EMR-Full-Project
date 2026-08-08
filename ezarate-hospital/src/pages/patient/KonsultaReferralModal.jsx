import { useState } from "react";
import { X } from "lucide-react";
import logoImg from "../../assets/logo.jpg";
import { fillBlanksFromShared } from "./sharedClinicalFields";
import { formatDiagnosisText, formatPhysicalExamText, formatManagementAtEdText } from "../../utils/consultations";

function calcAge(dob) {
  if (!dob) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return String(age);
}

// The doctor-authored fields Konsulta shares with the Consultation Form —
// computed straight from the doctor's latest saved entry, not through
// SHARED_FIELD_MAP (see sharedClinicalFields.js), since each of these is
// either a multi-field checklist (Physical Examination), a combination of
// several sections (Management at ED = Course in the Ward + ED Management
// + Surgical Procedure/RVS Code), or benefits from the same
// doctor-entry-first precedence as Final Diagnosis — none of them is a
// single plain field a generic map entry could point at.
//
// Exported so PatientProfile.jsx's handleSaveConsultation() can push a
// fresh value into an ALREADY-SAVED Konsulta Referral the instant the
// doctor saves the Consultation Form — not just the first time this modal
// happens to be opened.
export function deriveKonsultaFieldsFromDoctorEntry(doctorEntry, emr) {
  return {
    // "Pertinent Physical Examination on Admission" (the doctor's CF4
    // checklist — General Survey, HEENT, Chest/Lungs, CVS, Abdomen, GU/OB,
    // Skin/Extremities, Neuro Exam) is the primary source, with every
    // checked finding (plus any "specify"/"Others" text) written out by
    // formatPhysicalExamText. Falls back to the EMR's "Objective Findings"
    // box only if the doctor hasn't examined the patient yet this visit.
    // Emergency Department Attending Physician — the doctor role's own
    // "Attending Physician" dropdown selection on the Consultation Form
    // (attendingPrintedName, sourced from doctors_directory — see
    // ConsultationForm.jsx) is the actual doctor who saw the patient THIS
    // visit, so it takes precedence over whichever doctor was merely
    // assigned to the encounter at registration time. Falls back to the
    // encounter's assigned doctor, then the EMR's physician, only if the
    // doctor hasn't saved a Consultation Form yet.
    attendingPhysician: doctorEntry?.attendingPrintedName || "",
    physicalExamination: (doctorEntry && formatPhysicalExamText(doctorEntry)) || emr?.objectiveFindings || "",
    // Initial Impression, Diagnosis, and Physician's Impression are the
    // same clinical concept captured on three different forms — the
    // doctor's live Diagnosis field (Consultation Form) wins when present,
    // same precedence Final Diagnosis below already gives it; EMR's
    // Physician's Impression is the fallback. (Kept in sync going forward
    // too, via the "impression" shared-clinical-fields mapping — see
    // sharedClinicalFields.js.)
    initialImpression: doctorEntry?.diagnosis || emr?.physicianImpression || "",
    // Course in the Ward + ED Management + Surgical Procedure/RVS Code,
    // combined by formatManagementAtEdText. Falls back to Medication
    // Orders, then EMR's per-eye treatment fields, only if the doctor
    // hasn't filled in any of those three CF4 sections yet.
    managementAtED:
      (doctorEntry && formatManagementAtEdText(doctorEntry)) ||
      doctorEntry?.medicationOrders ||
      [emr?.treatmentLeft, emr?.treatmentRight].filter(Boolean).join("\n"),
    finalDiagnosis: doctorEntry ? formatDiagnosisText(doctorEntry) : emr?.activeDiagnoses || "",
  };
}

// Everything here already exists somewhere in the patient's record — pulled
// in automatically so staff only have to type the handful of fields that
// are genuinely new to this specific referral (accreditation number,
// receiving provider, date received). This is the exact fix for "the
// consultation isn't showing up in the referral": the data below is now
// sourced from the DOCTOR's consultation entry (chiefComplaint, history of
// present illness, diagnosis, medication, disposition — see
// DOCTOR_SECTIONS in ConsultationForm.jsx) and the NURSE's entry
// (PhilHealth PIN, under Health Coverage — a NURSE_SECTIONS field), matched
// to the SAME registration wherever possible (see resolveKonsultaSources in
// PatientProfile.jsx). Reading from whichever entry simply saved last (the
// old behavior) is exactly what caused this to come up blank whenever a
// nurse saved after the doctor did.
function buildAutoFilled(patient, emr, doctorEntry, nurseEntry, encounter) {
  const fullName = [patient?.lastName, patient?.firstName, patient?.middleName]
    .filter(Boolean)
    .join(", ");
  const recommendations =
    [doctorEntry?.disposition, doctorEntry?.dispositionNotes].filter(Boolean).join(" — ") ||
    emr?.followUpExamination ||
    "";

  return {
    referringHospitalName: "E. ZARATE HOSPITAL",
    referringHospitalAddress: "16 J. Aguilar Avenue, Talon I, Las Piñas City, Metro Manila, Philippines",
    fullName,
    age: emr?.age || calcAge(patient?.dateOfBirth),
    sex: patient?.sex || emr?.gender || "",
    pin: nurseEntry?.philhealthPin || emr?.philhealthPin || "",
    chiefComplaint: doctorEntry?.chiefComplaint || emr?.chiefComplaints || "",
    historyOfPresentIllness: doctorEntry?.historyOfPresentIllness || "",
    ...deriveKonsultaFieldsFromDoctorEntry(doctorEntry, emr),
    // deriveKonsultaFieldsFromDoctorEntry only knows about doctorEntry/emr
    // (it's also called from the live-sync path in PatientProfile.jsx,
    // which has no `encounter` in hand) — so its attendingPhysician comes
    // back "" whenever the doctor hasn't saved a Consultation Form yet.
    // This re-applies the fuller fallback chain (encounter's assigned
    // doctor, then EMR physician) ONLY for that first-time seeding case,
    // without letting an empty spread value silently win.
    attendingPhysician: doctorEntry?.attendingPrintedName || encounter?.doctor || emr?.physician || "",
    recommendations,
  };
}

// Genuinely new to this referral — not tracked anywhere else in the app.
// Accreditation number and Receiving Konsulta provider are fixed hospital
// constants (there's only one accredited physician who signs these off),
// so they're pre-filled here instead of left blank for staff to retype on
// every single referral. Still a normal editable input on the form itself
// (see the <input name="accreditationNumber" .../> / receivingKonsultaProvider
// fields below), so it can still be corrected by hand in the rare case it
// needs to differ.
function emptyNewFields() {
  return {
    dateOfReferral: new Date().toISOString().slice(0, 10),
    accreditationNumber: "#92022797",
    receivingKonsultaProvider: "DR. EDGAR ZARATE",
    dateReceived: "",
  };
}

// Layers a previously-saved referral's fields on top of the freshly
// computed autofill — but only the fields that are actually non-blank.
// Without this, reopening a referral that was already saved once (even
// with some fields left blank) would let those saved blanks permanently
// mask the autofill forever, since a plain object spread can't tell "the
// saved value is blank" apart from "the saved value is blank ON PURPOSE".
// This is exactly why reconnecting Physical Examination/Management at
// ED/Initial Impression to the doctor's Consultation Form wouldn't show up
// on a referral that had already been created before: the modal was
// showing the old (blank) saved value instead of recomputing it. A field
// the person actually typed something into is still never overwritten.
function overlayNonBlank(base, overrides) {
  const out = { ...base };
  for (const [key, value] of Object.entries(overrides || {})) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      out[key] = value;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Paper-form styling — plain black-on-white, underline-style blanks and
// ruled boxes instead of the app's usual rounded/teal card look, so this
// reads as a faithful on-screen replica of the printed "Emergency Care
// Benefit Referral to KONSULTA / YAKAP" form (same treatment ErDischargeForm
// already gives the ER Discharge Instruction Form).
// ---------------------------------------------------------------------------
const lineInputClass =
  "flex-1 min-w-0 border-0 border-b border-slate-900 bg-transparent px-1 py-0.5 text-[13px] text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-teal-50/40";
const ruledTextareaStyle = {
  backgroundImage: "repeating-linear-gradient(#fff 0 27px, #94a3b8 27px 28px)",
  lineHeight: "28px",
  backgroundAttachment: "local",
};

function Line({ label, children, labelWidth = "auto", full }) {
  return (
    <div className={`flex items-end gap-2 ${full ? "col-span-full" : ""}`}>
      <span
        className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-900 pb-0.5"
        style={{ width: labelWidth }}
      >
        {label}:
      </span>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[11px] font-bold uppercase tracking-wide text-slate-900 mb-1.5">{children}:</p>;
}

function RuledField({ label, name, value, onChange, rows = 4 }) {
  return (
    <div className="pt-3 border-t border-slate-300">
      <SectionLabel>{label}</SectionLabel>
      <textarea
        name={name}
        rows={rows}
        value={value}
        onChange={onChange}
        style={ruledTextareaStyle}
        className="w-full resize-none border-0 bg-transparent text-[13px] text-slate-900 px-0.5 focus:outline-none"
      />
    </div>
  );
}

export default function KonsultaReferralModal({
  patient,
  emr,
  doctorEntry,
  nurseEntry,
  encounter,
  shared,
  initialValues,
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(() => {
    const autoFilled = buildAutoFilled(patient, emr, doctorEntry, nurseEntry, encounter);
    // Anything buildAutoFilled left blank (no matching consultation entry
    // yet, no EMR) gets one more pass from the shared clinical store — a
    // value someone already typed into Discharge or the Medical
    // Certificate for the same concept.
    const { patched } = fillBlanksFromShared(autoFilled, "konsulta", shared || {});
    return overlayNonBlank({ ...patched, ...emptyNewFields() }, initialValues);
  });

  function handle(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave?.(form);
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        {/* App chrome — not part of the printed form, just the modal's own
            close bar, kept visually separate (teal) from the plain
            black-on-white paper replica below it. */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-teal-700 text-white sticky top-0 z-10">
          <p className="text-xs font-medium text-teal-100">
            Emergency Care Benefit Referral to KONSULTA / YAKAP
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center gap-1.5 rounded border border-white/30 px-3 py-1 text-xs font-medium hover:bg-white/10 transition-colors"
          >
            <X size={14} />
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="text-slate-900">
          {/* ============================ THE PAPER ============================ */}
          <div className="px-8 sm:px-12 py-8 font-serif">
            {/* Letterhead */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <img
                  src={logoImg}
                  alt="E. Zarate Hospital seal"
                  className="w-14 h-14 rounded-full object-cover shrink-0 border border-slate-300"
                />
                <div>
                  <h1 className="text-xl font-bold tracking-wide">E. ZARATE HOSPITAL</h1>
                  <p className="text-[10px] text-slate-700 leading-snug">
                    16 J. Aguilar Avenue, Talon I, Las Piñas City, Metro Manila, Philippines
                  </p>
                  <p className="text-[10px] text-slate-700 leading-snug">
                    Tel. Nos.: (02) 871-1440 / (02) 873-5593 / (02) 874-6905
                  </p>
                  <p className="text-[10px] text-slate-700 leading-snug">E-mail: zarateclinic@yahoo.com</p>
                </div>
              </div>
            </div>

            {/* Title + Date of Referral */}
            <div className="text-center mb-1">
              <h2 className="text-[15px] font-bold uppercase tracking-wide underline underline-offset-4">
                Emergency Care Benefit Referral to KONSULTA / YAKAP
              </h2>
            </div>
            <div className="flex justify-end mb-4">
              <Line label="Date of Referral" labelWidth="100px">
                <input
                  type="date"
                  name="dateOfReferral"
                  value={form.dateOfReferral}
                  onChange={handle}
                  className={`${lineInputClass} max-w-[160px]`}
                />
              </Line>
            </div>

            {/* Referring Hospital */}
            <div className="pt-1 mb-4">
              <SectionLabel>Referring Hospital</SectionLabel>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                <Line label="Name of hospital" labelWidth="130px" full>
                  <input
                    name="referringHospitalName"
                    value={form.referringHospitalName}
                    onChange={handle}
                    className={lineInputClass}
                  />
                </Line>
                <Line label="Accreditation number" labelWidth="150px" full>
                  <input
                    name="accreditationNumber"
                    value={form.accreditationNumber}
                    onChange={handle}
                    className={lineInputClass}
                  />
                </Line>
                <Line label="Address of Hospital" labelWidth="130px" full>
                  <input
                    name="referringHospitalAddress"
                    value={form.referringHospitalAddress}
                    onChange={handle}
                    className={lineInputClass}
                  />
                </Line>
                <Line label="Emergency Department Attending Physician" labelWidth="150px" full>
                  <input
                    name="attendingPhysician"
                    value={form.attendingPhysician}
                    onChange={handle}
                    className={lineInputClass}
                  />
                </Line>
              </div>
            </div>

            {/* Patient Data */}
            <div className="pt-3 border-t border-slate-300 mb-1">
              <SectionLabel>Patient Data</SectionLabel>
              <Line label="Name" labelWidth="50px" full>
                <input name="fullName" value={form.fullName} onChange={handle} className={lineInputClass} />
              </Line>
              <div className="grid grid-cols-3 gap-x-6 mt-2.5">
                <Line label="Age" labelWidth="36px">
                  <input name="age" value={form.age} onChange={handle} className={lineInputClass} />
                </Line>
                <Line label="Sex" labelWidth="36px">
                  <input name="sex" value={form.sex} onChange={handle} className={lineInputClass} />
                </Line>
                <Line label="PIN" labelWidth="36px">
                  <input name="pin" value={form.pin} onChange={handle} className={lineInputClass} />
                </Line>
              </div>
            </div>

            {/* Clinical details — same field order as the printed form */}
            <RuledField
              label="Chief Complaint"
              name="chiefComplaint"
              value={form.chiefComplaint}
              onChange={handle}
              rows={2}
            />
            <RuledField
              label="History of Present illness"
              name="historyOfPresentIllness"
              value={form.historyOfPresentIllness}
              onChange={handle}
              rows={4}
            />
            <RuledField
              label="Physical Examination"
              name="physicalExamination"
              value={form.physicalExamination}
              onChange={handle}
              rows={4}
            />
            <RuledField
              label="Initial Impression"
              name="initialImpression"
              value={form.initialImpression}
              onChange={handle}
              rows={3}
            />
            <RuledField
              label="Management at ED"
              name="managementAtED"
              value={form.managementAtED}
              onChange={handle}
              rows={3}
            />
            <RuledField
              label="Final Diagnosis"
              name="finalDiagnosis"
              value={form.finalDiagnosis}
              onChange={handle}
              rows={3}
            />
            <RuledField
              label="Recommendations"
              name="recommendations"
              value={form.recommendations}
              onChange={handle}
              rows={3}
            />

            {/* Receiving Konsulta provider — bordered box, same as the
                printed form's bottom-most table row */}
            <div className="pt-4 mt-1">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr>
                    <th className="border border-slate-900 py-1 text-[10px] font-bold uppercase">
                      Receiving Konsulta provider
                    </th>
                    <th className="border border-slate-900 py-1 text-[10px] font-bold uppercase w-40">
                      Date Received
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-900 p-0">
                      <input
                        name="receivingKonsultaProvider"
                        value={form.receivingKonsultaProvider}
                        onChange={handle}
                        className="w-full border-0 bg-transparent px-2 py-1.5 text-[13px] focus:outline-none focus:bg-teal-50/40"
                      />
                    </td>
                    <td className="border border-slate-900 p-0">
                      <input
                        type="date"
                        name="dateReceived"
                        value={form.dateReceived}
                        onChange={handle}
                        className="w-full border-0 bg-transparent px-2 py-1.5 text-[13px] focus:outline-none focus:bg-teal-50/40"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {/* ========================== END OF THE PAPER ========================== */}

          {/* Save / Cancel — app chrome, not part of the printed form */}
          <div className="flex gap-4 justify-end px-8 sm:px-12 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}