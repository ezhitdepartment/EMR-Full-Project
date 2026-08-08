// Several clinical concepts show up, under different labels, across five
// different forms: the EMR / Visit-OPD Record (PatientRegistration), the
// Consultation Form (Encounter), ER Discharge Instructions, the
// Konsulta/Yakap Referral, and the Medical Certificate. Filling one of them
// in should fill the others in too — but only where the destination field
// is still BLANK. A value someone deliberately typed into one specific
// document is never silently overwritten by an older value carried over
// from another; these are separate legal/clinical documents, not copies of
// each other.
//
//   Shared key    | What it is                         | EMR field(s)          | Consultation field  | Discharge field     | Konsulta field      | Medical Certificate field
//   chiefComplaint| Chief Complaint                    | chiefComplaints        | chiefComplaint      | chiefComplaints      | chiefComplaint       | subjectiveComplaints
//   physicalExam  | Physical Exam / Objective Findings | objectiveFindings      | — (read-only source — see note below) | — | physicalExamination | pertinentPhysicalExaminationFindings
//   impression    | Initial / Physician's Impression / Diagnosis | physicianImpression | diagnosis    | —                    | initialImpression    | —
//   management    | Management at ED / Treatment given | treatmentLeft + treatmentRight (read-only source — split per eye, so a combined value never writes back into it) | medicationOrders | treatmentGiven | managementAtED | — (see note below)
//   diagnosis     | Final / Active / Clinical Diagnosis| —                      | activeDiagnoses     | finalDiagnosis       | finalDiagnosis       | clinicalDiagnosis
//   disposition   | Disposition                        | disposition            | disposition         | disposition          | —                    | disposition
//   followUp      | Follow-up / Recommendations        | followUpExamination    | —                   | followUpExamination  | recommendations      | —
//
// The Consultation Form is the richest single source of what actually
// happened during a visit (chief complaint, active diagnoses, medication
// orders, and — now that a doctor's Disposition select was added there —
// the final disposition too), so it now contributes chiefComplaint,
// management, and disposition here in addition to diagnosis. That means:
// the moment a nurse/doctor saves a Consultation, ER Discharge (and,
// where applicable, Konsulta/Medical Certificate) gets those blanks
// filled in immediately via PatientProfile.jsx's syncSharedClinical() —
// no need to retype anything already captured during the consultation.
//
// "impression" now also pulls from the Consultation Form's own Diagnosis
// field (form.diagnosis — distinct from Active Diagnoses/activeDiagnoses,
// which feeds the separate "diagnosis" key above): the doctor's Diagnosis,
// EMR's Physician's Impression, and Konsulta's Initial Impression are
// treated as the same clinical judgment under three different names, so
// whichever one gets filled in first auto-fills the still-blank other two
// (never overwrites one that's already been typed into, same "blanks
// only" rule as every other shared field).
//
// NOTE on "physicalExam": the Consultation Form's matching concept — the
// CF4 "Pertinent Physical Examination on Admission" checklist (General
// Survey, HEENT, Chest/Lungs, CVS, Abdomen, GU/OB, Skin/Extremities, Neuro
// Exam) — is eight separate checkbox groups plus their own "specify"/
// "Others" text, not one field extractSharedFields could read a value out
// of. It's intentionally left out of `consultation` below (same reason
// EMR's split treatmentLeft/treatmentRight is left out of "management")
// and instead read directly, formatted into narrative text via
// formatPhysicalExamText() in utils/consultations.js, by
// KonsultaReferralModal.jsx's buildAutoFilled() — a live read of the
// doctor's latest exam every time the referral is opened, rather than a
// value that only syncs at save time.
// NOTE on medcert's "management": the Medical Certificate's equivalent
// field used to be treatmentDoneMedicationGiven, a free-text "treatment
// given" box that pulled from the Consultation Form's Medication Orders —
// same as every other form's "management" field still does. It's since
// been replaced with medicinePrescription, which reads the Consultation
// Form's structured Medicine Prescription section (prescriptionItems)
// instead — the same real Rx data the ER Discharge form's Take Home
// Medications table reads, just flattened to one line of text per
// medicine. Because that's a list being formatted, not a single blank/
// filled text value, it's computed directly in
// deriveMedCertFieldsFromEntries (PatientProfile.jsx) rather than through
// this generic map — same treatment the Discharge form's own `medications`
// array already gets.
export const SHARED_FIELD_MAP = {
  emr: {
    chiefComplaint: "chiefComplaints",
    physicalExam: "objectiveFindings",
    impression: "physicianImpression",
    disposition: "disposition",
    followUp: "followUpExamination",
  },
  consultation: {
    chiefComplaint: "chiefComplaint",
    diagnosis: "activeDiagnoses",
    impression: "diagnosis",
    management: "medicationOrders",
    disposition: "disposition",
  },
  discharge: {
    chiefComplaint: "chiefComplaints",
    management: "treatmentGiven",
    diagnosis: "finalDiagnosis",
    disposition: "disposition",
    followUp: "followUpExamination",
  },
  konsulta: {
    chiefComplaint: "chiefComplaint",
    physicalExam: "physicalExamination",
    impression: "initialImpression",
    management: "managementAtED",
    diagnosis: "finalDiagnosis",
    followUp: "recommendations",
  },
  medcert: {
    chiefComplaint: "subjectiveComplaints",
    physicalExam: "pertinentPhysicalExaminationFindings",
    diagnosis: "clinicalDiagnosis",
    disposition: "disposition",
  },
};

// Backed by the Spring Boot backend's PatientController shared-clinical
// endpoints (/api/patients/by-hospital-no/{hospitalNo}/shared-clinical),
// which read/write the `patients.shared_clinical` jsonb column — instead
// of Supabase directly, and instead of the old `patientSharedClinical`
// localStorage blob before that. Genuinely 1:1 with a patient, so it
// rides along on the same row rather than its own table.
import { api } from "../../lib/apiClient";

export async function loadSharedClinical(hospitalNo) {
  if (!hospitalNo) return {};
  const { data, error } = await api.get(
    `/api/patients/by-hospital-no/${encodeURIComponent(hospitalNo)}/shared-clinical`
  );
  if (error) {
    console.error("Loading shared clinical fields failed:", error.message);
    return {};
  }
  return data || {};
}

// The merge (only filling still-blank keys is handled by the callers via
// fillBlanksFromShared() below — this just persists whatever `patch`
// contributes) now happens server-side in one request instead of a
// client-side GET-then-merge-then-PUT, so a concurrent save from another
// screen can no longer be silently clobbered by a stale `current` read.
export async function saveSharedClinical(hospitalNo, patch) {
  const { data, error } = await api.patch(
    `/api/patients/by-hospital-no/${encodeURIComponent(hospitalNo)}/shared-clinical`,
    patch
  );
  if (error) {
    console.error("Saving shared clinical fields failed:", error.message);
    return {};
  }
  return data || {};
}

// Pulls this form's mapped fields OUT into the shared-value shape. Blank
// fields are skipped so an empty field in one form never erases a value
// another form already contributed.
export function extractSharedFields(formData, formKey) {
  const map = SHARED_FIELD_MAP[formKey] || {};
  const out = {};
  for (const [sharedKey, fieldName] of Object.entries(map)) {
    const value = formData?.[fieldName];
    if (value && String(value).trim()) out[sharedKey] = value;
  }
  return out;
}

// Fills any still-BLANK mapped fields in formData from the shared store.
// `changed` is false when nothing needed filling, so callers can skip a
// write entirely.
export function fillBlanksFromShared(formData, formKey, shared) {
  const map = SHARED_FIELD_MAP[formKey] || {};
  const patched = { ...formData };
  let changed = false;
  for (const [sharedKey, fieldName] of Object.entries(map)) {
    const current = patched[fieldName];
    const sharedValue = shared?.[sharedKey];
    if ((!current || !String(current).trim()) && sharedValue) {
      patched[fieldName] = sharedValue;
      changed = true;
    }
  }
  return { patched, changed };
}