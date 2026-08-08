// Shared shape + auto-fill logic for the Medical Abstract, used by both
// MedicalAbstractPage.jsx (the editable form) and MedicalAbstractPDF.jsx
// (the printed output) — so the two can never drift apart on field names.
//
// The Medical Abstract used to be assembled fresh, every time, straight
// from the doctor/nurse's Consultation Form entries (see
// resolveMedicalAbstractSources() in utils/admittedPatients.js) with
// nowhere to edit it first. It's now a real, saved, editable document
// (patient_documents, doc_type "medabstract" — see
// supabase_addendum_medical_abstract.sql), the same pattern already used
// for the EMR / ER Discharge / Konsulta Referral / Medical Certificate.
//
// buildMedicalAbstractSeed() below is what powers the "basic information
// is filled up automatically" part of that: it flattens
// resolveMedicalAbstractSources()'s {patient, doctorEntry, erEntry,
// triage, ancillaries} into this flat, editable form shape, the FIRST
// time the form is opened for a given admission. Every field it fills is
// still just a normal, editable input — it's a starting point, not a
// locked value. Once the abstract has been saved once, later visits load
// the SAVED version instead of re-deriving from the consultation (so
// edits made here are never silently overwritten by a re-seed).

import { PE_SYSTEMS } from "./ConsultationForm";

// One entry per PE_SYSTEMS system, e.g. { peChestLungsOthers: "peChestLungsOthers" } —
// used generically by both the form and the PDF instead of hard-coding
// every system's key/othersKey pair in two places.
export const PE_SYSTEM_KEYS = PE_SYSTEMS.map((sys) => sys.key);

export function emptyMedicalAbstractForm() {
  const peSystemFields = {};
  for (const sys of PE_SYSTEMS) {
    peSystemFields[sys.key] = [];
    peSystemFields[sys.othersKey] = "";
  }

  return {
    // Patient / header — auto-filled from the patient's own record.
    hospitalNo: "",
    lastName: "",
    firstName: "",
    middleName: "",
    sex: "",
    dateOfBirth: "",
    address: "",

    // Admission
    admittingPhysician: "",
    admittingNurse: "",
    dateAdmitted: "",
    timeAdmitted: "",

    // Clinical narrative
    chiefComplaint: "",
    admittingDiagnosis: "",
    historyOfPresentIllness: "",
    pastMedicalHistory: "",

    // OB/GYN (only meaningful for female patients — left blank otherwise)
    noOfPregnancies: "",
    noOfDeliveries: "",
    fullTerm: "",
    premature: "",
    noOfAbortions: "",
    lastMenstrualPeriod: "",

    // Signs & symptoms on admission
    admissionSigns: [],
    admissionSignsPainSite: "",
    admissionSignsOthers: "",

    // Referral
    referredFromOtherHCI: "",
    referringHCIName: "",

    // Physical examination on admission
    vitalSigns: "",
    peGeneralSurvey: [],
    peGeneralSurveyAlteredSensoriumSpecify: "",
    peHeent: [],
    peHeentOthers: "",
    ...peSystemFields,

    surgicalProcedureRvsCode: "",

    // Course of admission
    ancillariesDone: "",
    medicationTreatmentDone: "",
    courseInWardEntries: [],

    // Discharge
    dischargeDiagnosis: "",
    icd10OrRvsCode: "",
    dateDischarged: "",
    timeDischarged: "",
    outcomeOfTreatment: "",
    disposition: "",
    takeHomeMedicines: [],

    // Certification
    attendingPrintedName: "",
    attendingCertifiedDate: "",
  };
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// "BP: 120/80   HR: 88   RR: 20   Temp: 36.8   Wt: 60   Ht: 165"
function formatVitals(triage) {
  if (!triage) return "";
  const bp = triage.systolic && triage.diastolic ? `${triage.systolic}/${triage.diastolic}` : "";
  const parts = [
    bp ? `BP: ${bp}` : "",
    triage.heartRate ? `HR: ${triage.heartRate}` : "",
    triage.respiratoryRate ? `RR: ${triage.respiratoryRate}` : "",
    triage.temperature ? `Temp: ${triage.temperature}` : "",
    triage.weight ? `Wt: ${triage.weight}` : "",
    triage.height ? `Ht: ${triage.height}` : "",
  ].filter(Boolean);
  return parts.join("   ");
}

// Flattens resolveMedicalAbstractSources()'s {patient, doctorEntry,
// erEntry, triage, ancillaries} into the flat, editable form shape above.
// Only ever used to seed the form the FIRST time it's opened for a given
// admission — see the file banner.
export function buildMedicalAbstractSeed({ patient = {}, doctorEntry = {}, erEntry = {}, triage = null, ancillaries = [] }) {
  const seed = emptyMedicalAbstractForm();

  Object.assign(seed, {
    hospitalNo: patient.hospitalNo || "",
    lastName: patient.lastName || "",
    firstName: patient.firstName || "",
    middleName: patient.middleName || "",
    sex: patient.sex || "",
    dateOfBirth: patient.dateOfBirth || "",
    address: patient.address || "",

    admittingPhysician: doctorEntry.attendingPrintedName || "",
    admittingNurse: "",
    dateAdmitted: doctorEntry.dateAdmitted || "",
    timeAdmitted: doctorEntry.timeAdmitted || "",

    chiefComplaint: doctorEntry.chiefComplaint || "",
    admittingDiagnosis: doctorEntry.admittingDiagnosis || "",
    historyOfPresentIllness: doctorEntry.historyOfPresentIllness || "",
    pastMedicalHistory: (erEntry.pastMedicalHistory || []).map((i) => i.text).filter(Boolean).join("; "),

    noOfPregnancies: erEntry.noOfPregnancies || "",
    noOfDeliveries: erEntry.noOfDeliveries || "",
    fullTerm: erEntry.fullTerm || "",
    premature: erEntry.premature || "",
    noOfAbortions: erEntry.noOfAbortions || "",
    lastMenstrualPeriod: erEntry.lastMenstrualPeriod || "",

    admissionSigns: doctorEntry.admissionSigns || [],
    admissionSignsPainSite: doctorEntry.admissionSignsPainSite || "",
    admissionSignsOthers: doctorEntry.admissionSignsOthers || "",

    referredFromOtherHCI: doctorEntry.referredFromOtherHCI || "",
    referringHCIName: doctorEntry.referringHCIName || "",

    vitalSigns: formatVitals(triage),
    peGeneralSurvey: doctorEntry.peGeneralSurvey || [],
    peGeneralSurveyAlteredSensoriumSpecify: doctorEntry.peGeneralSurveyAlteredSensoriumSpecify || "",
    peHeent: doctorEntry.peHeent || [],
    peHeentOthers: doctorEntry.peHeentOthers || "",

    surgicalProcedureRvsCode: doctorEntry.surgicalProcedureRvsCode || "",

    ancillariesDone: (ancillaries || [])
      .filter((a) => a.testName)
      .map((a) => `${a.testName}${a.datePerformed ? ` (${a.datePerformed})` : ""}`)
      .join("; "),
    medicationTreatmentDone: (doctorEntry.erMedicineItems || [])
      .filter((i) => i.genericName || i.quantityDosageRoute)
      .map((i) => [i.genericName, i.quantityDosageRoute].filter(Boolean).join(" — "))
      .join("; "),
    courseInWardEntries: (doctorEntry.courseInWardEntries || [])
      .filter((e) => e.date || e.orderAction)
      .map((e) => ({ id: e.id || uid(), date: e.date || "", orderAction: e.orderAction || "" })),

    dischargeDiagnosis: doctorEntry.dischargeDiagnosis || "",
    icd10OrRvsCode: [doctorEntry.caseRateCode1, doctorEntry.caseRateCode2].filter(Boolean).join(" / "),
    dateDischarged: doctorEntry.dateDischarged || "",
    timeDischarged: doctorEntry.timeDischarged || "",
    outcomeOfTreatment: doctorEntry.outcomeOfTreatment || "",
    disposition: doctorEntry.disposition || "",
    takeHomeMedicines: (doctorEntry.prescriptionItems || [])
      .filter((i) => i.medicineName || i.instructions)
      .map((i) => ({
        id: i.id || uid(),
        medicineName: i.medicineName || "",
        milligram: i.milligram || "",
        quantity: i.quantity || "",
        instructions: i.instructions || "",
      })),

    attendingPrintedName: doctorEntry.attendingPrintedName || "",
    attendingCertifiedDate: doctorEntry.attendingCertifiedDate || "",
  });

  for (const sys of PE_SYSTEMS) {
    seed[sys.key] = doctorEntry[sys.key] || [];
    seed[sys.othersKey] = doctorEntry[sys.othersKey] || "";
  }

  return seed;
}

export function newCourseInWardRow() {
  return { id: uid(), date: "", orderAction: "" };
}

export function newTakeHomeMedicineRow() {
  return { id: uid(), medicineName: "", milligram: "", quantity: "", instructions: "" };
}
