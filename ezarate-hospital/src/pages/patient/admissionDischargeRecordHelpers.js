// Shared shape + auto-fill logic for the Admission and Discharge Record,
// used by both AdmissionDischargeRecordPage.jsx (the editable form) and
// AdmissionDischargeRecordPDF.jsx (the printed output, laid out field-for-
// field after the hospital's pre-printed paper form) — so the two can
// never drift apart on field names. Same pattern medicalAbstractHelpers.js
// already uses for the Medical Abstract.
//
// This is now a real, saved, editable document (patient_documents,
// doc_type "admitdischarge" — see
// supabase_addendum_admission_discharge_record.sql), not a
// straight-to-PDF button: buildAdmissionDischargeRecordSeed() below only
// ever runs the FIRST time this page is opened for a given admission, to
// give the nurse/doctor a starting point auto-filled from the patient's
// record and their Consultation Form entries. Every field stays fully
// editable, and once saved once, later visits load the SAVED version
// instead of re-deriving from the consultation.

export function emptyAdmissionDischargeRecordForm() {
  return {
    // Header
    hospitalNo: "",
    medicalRecordNo: "",

    // Patient identity — auto-filled from the patient's own record,
    // read-only on the page (edit the patient's actual record instead).
    lastName: "",
    firstName: "",
    middleName: "",
    permanentAddress: "",
    telNo: "",
    age: "",
    sex: "",
    civilStatus: "",
    birthday: "",
    birthplace: "",
    nationality: "",
    religion: "",
    occupation: "",

    // Family background
    fatherName: "",
    fatherAddress: "",
    fatherTelNo: "",
    motherName: "",
    motherAddress: "",
    motherTelNo: "",
    spouseName: "",
    spouseAddress: "",
    spouseTelNo: "",

    // Confinement
    dateAdmitted: "",
    timeAdmitted: "",
    dateDischarged: "",
    timeDischarged: "",
    totalNoOfDays: "",

    admissionType: "", // "New" | "Old"
    referredBy: "",
    admittingPhysician: "",

    allergicTo: "",
    hmo: "",
    philhealth: "",

    // Informant
    dataFurnishedBy: "",
    addressOfInformant: "",
    relationToPatient: "",

    // Diagnosis
    admittingDiagnosis: "",
    admittingIcdCode: "",
    finalDiagnosis: "",

    // Accident / Injuries / Poisoning
    accidentInjuriesPoisoning: "",
    placeOfOccurrence: "",

    // Evaluation & Disposition
    evaluation: "",
    conditionOnDischarge: "", // Recovered | Improved | Died | Unimproved
    durationOfStayMarker: "", // "(-) 48 hours" | "(+) 48 hrs"
    autopsyStatus: "", // "Autopsy" | "No autopsy"
    dispositionType: "", // Discharge | Transferred | HAMA | Abscond

    // Certification
    attendingPhysicianName: "",
  };
}

// "2026-07-06" & "2026-07-09" -> "3" (nights/days confined). Blank if
// either date is missing/invalid, or discharge is before admission.
function computeTotalDays(dateAdmitted, dateDischarged) {
  if (!dateAdmitted || !dateDischarged) return "";
  const start = new Date(dateAdmitted);
  const end = new Date(dateDischarged);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diffDays >= 0 ? String(diffDays) : "";
}

// Maps a Consultation Form Outcome of Treatment value onto this form's
// (more granular, paper-form-shaped) Condition/Disposition checkboxes —
// just a convenience starting point; every one of these stays a normal
// editable radio choice on the page.
function seedFromOutcome(outcome) {
  switch (outcome) {
    case "Improved":
      return { conditionOnDischarge: "Improved", dispositionType: "Discharge" };
    case "Expired":
      return { conditionOnDischarge: "Died", dispositionType: "" };
    case "HAMA":
      return { conditionOnDischarge: "", dispositionType: "HAMA" };
    case "Absconded":
      return { conditionOnDischarge: "", dispositionType: "Abscond" };
    case "Transferred":
      return { conditionOnDischarge: "", dispositionType: "Transferred" };
    default:
      return { conditionOnDischarge: "", dispositionType: "" };
  }
}

// Flattens the same {patient, doctorEntry, erEntry} shape
// resolveMedicalAbstractSources() already resolves (see
// utils/admittedPatients.js) into this form's flat, editable shape. Only
// ever used to seed the form the FIRST time it's opened for a given
// admission — see the file banner above.
export function buildAdmissionDischargeRecordSeed({ patient = {}, doctorEntry = {}, erEntry = {} }) {
  const seed = emptyAdmissionDischargeRecordForm();

  const dateAdmitted = doctorEntry.dateAdmitted || "";
  const dateDischarged = doctorEntry.dateDischarged || "";

  Object.assign(seed, {
    hospitalNo: patient.hospitalNo || "",

    lastName: patient.lastName || "",
    firstName: patient.firstName || "",
    middleName: patient.middleName || "",
    permanentAddress: patient.address || "",
    telNo: patient.mobile || patient.landline || "",
    age: "", // derived from birthday at render/print time, not stored
    sex: patient.sex || "",
    civilStatus: patient.maritalStatus || "",
    birthday: patient.dateOfBirth || "",
    nationality: patient.nationality || "",
    religion: patient.religion || "",

    fatherName: patient.fatherName || "",
    fatherTelNo: patient.fatherContact || "",
    motherName: patient.motherName || "",
    motherTelNo: patient.motherContact || "",

    dateAdmitted,
    timeAdmitted: doctorEntry.timeAdmitted || "",
    dateDischarged,
    timeDischarged: doctorEntry.timeDischarged || "",
    totalNoOfDays: computeTotalDays(dateAdmitted, dateDischarged),

    referredBy:
      doctorEntry.referredFromOtherHCI === "YES" ? doctorEntry.referringHCIName || "Yes" : "",
    admittingPhysician: doctorEntry.attendingPrintedName || "",

    allergicTo: erEntry.allergies || doctorEntry.allergies || "",

    dataFurnishedBy: [patient.lastName, patient.firstName].filter(Boolean).join(", "),
    addressOfInformant: patient.emergencyAddress ? "" : patient.address || "",
    relationToPatient: patient.emergencyAddress ? "" : "Self",

    admittingDiagnosis: doctorEntry.admittingDiagnosis || "",
    admittingIcdCode: [doctorEntry.caseRateCode1, doctorEntry.caseRateCode2].filter(Boolean).join(" / "),
    finalDiagnosis: doctorEntry.dischargeDiagnosis || "",

    evaluation: doctorEntry.dispositionNotes || "",

    attendingPhysicianName: doctorEntry.attendingPrintedName || "",

    ...seedFromOutcome(doctorEntry.outcomeOfTreatment || ""),
  });

  return seed;
}
