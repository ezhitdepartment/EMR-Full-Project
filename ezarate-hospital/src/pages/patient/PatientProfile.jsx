import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasFeatureAccess } from "../../data/roles";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  Users,
  HeartPulse,
  Activity,
  Siren,
  IdCard,
  ClipboardCheck,
  Camera,
  X,
  FlaskConical,
  Pill,
  Folder,
  FolderOpen,
  Home,
  LayoutGrid,
  List,
  Table2,
  Share2,
  ChevronDown,
  ChevronLeft,
  MoreVertical,
  Plus,
  Copy,
  Pencil,
  FileQuestion,
  Cigarette,
  Armchair,
  Beer,
  Syringe,
  Heart,
  Loader2,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import PatientRegistration from "./PatientRegistration";
import PatientEncountersPanel from "../../features/encounters/PatientEncountersPanel";
import PatientRecordPDF from "./PatientRecordPDF";
import ErDischargeForm, { ANCILLARY_TEST_NAMES } from "./ErDischargeForm";
import ErDischargePDF from "./ErDischargePDF";
import KonsultaReferralModal, { deriveKonsultaFieldsFromDoctorEntry } from "./KonsultaReferralModal";
import KonsultaReferralPDF from "./KonsultaReferralPDF";
import MedicalCertificateForm from "./MedicalCertificateForm";
import MedicalCertificatePDF from "./MedicalCertificatePDF";
import ConsultationForm, { NURSE_ROLES } from "./ConsultationForm";
import NurseConsultationPDF from "./NurseConsultationPDF";
import DoctorConsultationPDF from "./DoctorConsultationPDF";
import CF4PDF from "./CF4PDF";
import CreateLabOrderModal from "../../features/lab-orders/CreateLabOrderModal";
import ViewMedicinePrescriptionModal from "../../features/medicine-prescriptions/ViewMedicinePrescriptionModal";
import {
  findEncounterById,
  loadEncounters,
  loadTriageForEncounter,
  updateEncounter,
  matchEncounterForConsultation,
  STATUS as ENCOUNTER_STATUS,
} from "../../utils/encounters";
import { loadLabOrders, upsertLabOrderForEncounter, formatDateCreated, DIAGNOSTIC_GROUPS } from "../../utils/labOrders";
import { getOrderStatus, ORDER_STATUS_STYLES } from "../../utils/labOrderDiagnostics";
import { loadMedicinePrescriptions, upsertMedicinePrescriptionForEncounter } from "../../utils/medicinePrescriptions";
import {
  loadSharedClinical,
  saveSharedClinical,
  extractSharedFields,
  fillBlanksFromShared,
} from "./sharedClinicalFields";
import { findPatientById, updatePatient, savePatientPhoto } from "../../utils/patients";
import { loadConsultationHistory, saveConsultationEntry, formatDiagnosisText, formatEdManagementText, formatPhysicalExamText, resolveConsultationInitialValues } from "../../utils/consultations";
import {
  loadAllPatientDocuments,
  saveEmr,
  saveDischarge,
  saveKonsultaReferral,
  saveMedicalCertificate,
} from "../../utils/patientDocuments";

// loadConsultationHistory / saveConsultationEntry now live in
// utils/consultations.js (imported above) so the Registration table's
// Diagnosis column can read the same data — see loadDiagnosesByEncounter().

// "DIMAS, ROBETH O." — used to name downloaded files after the patient.
function patientFileLabel(patient) {
  const last = (patient.lastName || "").trim().toUpperCase();
  const first = (patient.firstName || "").trim().toUpperCase();
  const mi = patient.middleName ? `${patient.middleName.trim().charAt(0).toUpperCase()}.` : "";
  const firstPart = [first, mi].filter(Boolean).join(" ");
  return [last, firstPart].filter(Boolean).join(", ") || patient.hospitalNo;
}

function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// "19 YR(S) 5 MO(S) 11 DAY(S)" — years/months/days breakdown for the
// profile header, rather than just a plain year count.
function formatDetailedAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const daysInPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += daysInPrevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return null;

  return `${years} YR(S) ${months} MO(S) ${days} DAY(S)`;
}

// Seed the EMR / Visit-OPD Record form with what we already know about the
// patient the first time it's opened — just identity, for the read-only
// header. Personal Details / Health Coverage / Emergency Contact now live
// in the Consultation Form. Anything still blank in the Clinical Notes
// fields gets one more pass from the shared clinical store.
function patientToEmrSeed(patient, shared = {}) {
  const seed = {
    lastName: patient.lastName || "",
    firstName: patient.firstName || "",
    middleName: patient.middleName || "",
    dateOfBirth: patient.dateOfBirth || "",
    gender: patient.sex || "",
    chiefComplaints: "",
    objectiveFindings: "",
    physicianImpression: "",
    followUpExamination: "",
  };
  return fillBlanksFromShared(seed, "emr", shared).patched;
}

// Seed the Consultation Form with what we already know about the patient —
// Personal Details / Health Coverage / Emergency Contact were captured once
// in Create Patient, so there's no reason to retype them here. Anything
// still blank afterward gets one more pass from the shared clinical store.
function patientToConsultationSeed(patient, shared = {}) {
  const age = calculateAge(patient.dateOfBirth);
  const seed = {
    lastName: patient.lastName || "",
    firstName: patient.firstName || "",
    middleName: patient.middleName || "",
    dateOfBirth: patient.dateOfBirth || "",
    gender: patient.sex || "",
    age: age !== null ? String(age) : "",
    residentialAddress: patient.address || "",
    email: patient.email || "",
    phoneCell: patient.mobile || "",
    phoneHome: patient.landline || "",
    philhealthPin: "",
    motherName: patient.motherName || "",
    motherContact: patient.motherContact || "",
    fatherName: patient.fatherName || "",
    fatherContact: patient.fatherContact || "",
    nationality: patient.nationality || "",
    religion: patient.religion || "",
    maritalStatus: patient.maritalStatus || "",
    emergencyName: patient.emergencyName || "",
    emergencyRelationship: patient.emergencyRelationship || "",
    emergencyAddress: patient.emergencyAddress || "",
    emergencyPhoneHome: patient.emergencyPhoneHome || "",
    emergencyPhoneCell: patient.emergencyPhoneCell || "",
  };
  return fillBlanksFromShared(seed, "consultation", shared).patched;
}

// test_name -> ancillary checkbox key (the reverse of ANCILLARY_TEST_NAMES),
// so a Consultation's ordered diagnostics can auto-check the matching box.
const ANCILLARY_KEY_BY_TEST_NAME = Object.fromEntries(
  Object.entries(ANCILLARY_TEST_NAMES).map(([key, testName]) => [testName, key])
);

// Seed the ER Discharge form from everything already on hand for this
// visit — the patient's profile, their EMR (if any), the Consultation Form
// entry for this visit (if any), and finally the shared clinical store —
// so none of it needs to be retyped by whoever opens this form first.
// Order of precedence, field by field: whichever source actually captured
// that concept wins; the shared-clinical-store pass at the end only fills
// in whatever is STILL blank.
//
//   Field                | Comes from
//   chiefComplaints       | consultation.chiefComplaint, then emr
//   finalDiagnosis        | consultation's Diagnosis + any ICD-10 codes
//                         | picked (formatDiagnosisText — same helper the
//                         | Registration table's Diagnosis column uses)
//   treatmentGiven        | consultation.medicationOrders ("Medication
//                         | Orders" from the Consultation Form)
//   disposition           | consultation.disposition, then emr
//   ancillaries / xray /  | consultation.diagnosticsSelected — whatever
//   others                | tests the doctor checked in "Diagnostics /
//                         | Tests Ordered" are matched against the same
//                         | ANCILLARY_TEST_NAMES lookup the checkboxes use;
//                         | anything in DIAGNOSTIC_GROUPS["X-Ray"] checks
//                         | Xray instead; anything left over (Ultrasound &
//                         | Imaging, other Lab tests with no matching box,
//                         | plus any free-text diagnosticsNotes) goes into
//                         | Others.
//   medications           | consultation.prescriptionItems, one row each
//   dateTimeAttended /     | the matched registration's own appointment
//   erPhysician            | date/time and assigned doctor, when this
//                         | consultation was saved from a specific
//                         | registration (see consultationEncounter in
//                         | handleSaveConsultation) — falls back to the EMR
//                         | otherwise.
// Sort whatever the doctor ordered in the Consultation Form's Diagnostics
// section into: a matching ancillary checkbox, an X-Ray, or "Others"
// (Ultrasound & Imaging, or any Laboratory test with no checkbox of its
// own on the printed Discharge form) — shared by both the Discharge seed
// and the Medical Certificate seed below, since they draw from the exact
// same "what did the doctor order" data.
function sortOrderedDiagnostics(consultation) {
  const ancillaries = {};
  const xrayTests = [];
  const otherTests = [];
  for (const testName of consultation?.diagnosticsSelected || []) {
    const ancillaryKey = ANCILLARY_KEY_BY_TEST_NAME[testName];
    if (ancillaryKey) {
      ancillaries[ancillaryKey] = true;
    } else if ((DIAGNOSTIC_GROUPS["X-Ray"] || []).includes(testName)) {
      xrayTests.push(testName);
    } else {
      otherTests.push(testName);
    }
  }
  if (consultation?.diagnosticsNotes) otherTests.push(consultation.diagnosticsNotes);
  return { ancillaries, xrayTests, otherTests };
}

// The doctor- and nurse-authored fields the ER Discharge Instruction Form
// shares with the Consultation Form — computed straight from the doctor's/
// nurse's latest saved entry, same treatment deriveMedCertFieldsFromEntries
// (below) already gets, and for the same reason: a couple of these
// (Ancillaries Done, the take-home medication rows) aren't single plain
// fields SHARED_FIELD_MAP/fillBlanksFromShared could point at.
//
//   Field                | Comes from                                    | Authored by
//   dateTimeAttended      | the matched registration's own appointment   |
//                         | date/time, falling back to the EMR's date of |
//                         | visit                                        |
//   nurseOnDuty           | consultation.nurseOnDuty ("Visit" admin      | Nurse
//                         | metadata on the OPD Consultation Record),    |
//                         | falling back to the EMR                      |
//   chiefComplaints       | consultation.chiefComplaint, then emr        | Nurse/Doctor
//   ancillaries/xray/     | consultation.diagnosticsSelected — same      | Doctor
//   others                | sortOrderedDiagnostics() helper the Medical  |
//                         | Certificate seed uses                        |
//   finalDiagnosis        | consultation's Diagnosis + any ICD-10 codes  | Doctor
//                         | picked (formatDiagnosisText)                 |
//   treatmentGiven         | consultation.medicationOrders                | Doctor
//   dateTimeDischarge      | consultation.dateDischarged + timeDischarged | Doctor
//                         | (CF4 "Date/Time Discharged", Diagnosis        |
//                         | section) — no EMR fallback exists for this    |
//   conditionUponDischarge| consultation.outcomeOfTreatment (CF4         | Doctor
//                         | "Outcome of Treatment" radio group, plus its |
//                         | paired reason text for Absconded/Transferred/|
//                         | Expired), Disposition section                |
//   disposition           | consultation.disposition, then emr           | Doctor
//   medications           | consultation.prescriptionItems (the Medicine | Doctor
//                         | Prescription section), one row each          |
//   followUpExamination   | consultation.followUpExamination (the paper  | Doctor
//                         | form's own post-Disposition field), then emr |
//   erPhysician           | consultation.attendingPrintedName (CF4       | Doctor
//                         | Certification's printed name), falling back  |
//                         | to the matched registration's assigned       |
//                         | doctor, then the EMR                         |
//
// Exported so PatientProfile.jsx's handleSaveConsultation() can push a
// fresh value into an ALREADY-SAVED ER Discharge form the instant a nurse
// or doctor saves the Consultation Form — not just the first time this
// modal happens to be opened (same precedent as
// deriveMedCertFieldsFromEntries / deriveKonsultaFieldsFromDoctorEntry).
export function deriveDischargeFieldsFromEntries(consultation, emr, matchedEncounter) {
  const { ancillaries, xrayTests, otherTests } = sortOrderedDiagnostics(consultation);

  // NOTE: prescriptionItems' actual line-item shape is { medicineName,
  // quantity, instructions, milligram } (see ConsultationForm.jsx's
  // addPrescriptionItem) — not { medicine, dosage }. Reading the wrong
  // keys here silently filtered every row out, which is why Take Home
  // Medications never showed up even when a doctor had prescribed
  // something.
  const medications = Array.isArray(consultation?.prescriptionItems)
    ? consultation.prescriptionItems
        .filter((item) => item?.medicineName?.trim())
        .map((item) => ({
          medicine: item.medicineName || "",
          dosage: [item.milligram, item.instructions].filter(Boolean).join(" — "),
          time: "",
        }))
    : [];

  const attendedAt = matchedEncounter?.dateCreated ? new Date(matchedEncounter.dateCreated) : null;

  // Date/Time of Discharge — comes from the CF4 "Date Discharged" / "Time
  // Discharged" fields (form.dateDischarged / form.timeDischarged, in the
  // Diagnosis section's PhilHealth CF4 block — doctor-authored). There's
  // no equivalent field anywhere on the EMR to fall back to, so this stays
  // blank until a doctor fills in at least the date.
  let dateTimeDischarge = "";
  if (consultation?.dateDischarged) {
    const dischargedAt = new Date(`${consultation.dateDischarged}T${consultation.timeDischarged || "00:00"}`);
    if (!isNaN(dischargedAt)) {
      dateTimeDischarge = consultation.timeDischarged
        ? `${dischargedAt.toLocaleDateString("en-PH")} ${dischargedAt.toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : dischargedAt.toLocaleDateString("en-PH");
    }
  }

  // Condition Upon Discharge — comes from the CF4 "Outcome of Treatment"
  // radio group (Discharged / Improved / HAMA / Absconded / Transferred /
  // Expired), in the same Disposition section as `disposition` itself
  // (doctor-authored). Its paired "Specify reason" text is appended for
  // the three outcomes that require one, same as the printed form would
  // read it (e.g. "Transferred — no ICU bed available").
  const conditionUponDischarge = consultation?.outcomeOfTreatment
    ? [
        consultation.outcomeOfTreatment,
        ["Absconded", "Transferred", "Expired"].includes(consultation.outcomeOfTreatment)
          ? consultation.outcomeOfTreatmentReason
          : null,
      ]
        .filter(Boolean)
        .join(" — ")
    : "";

  return {
    dateTimeAttended: attendedAt
      ? `${attendedAt.toLocaleDateString("en-PH")} ${attendedAt.toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : emr?.dateOfVisit
      ? `${emr.dateOfVisit}${emr.timeOfVisit ? " " + emr.timeOfVisit : ""}`
      : "",
    nurseOnDuty: consultation?.nurseOnDuty || emr?.nurseOnDuty || "",
    chiefComplaints: consultation?.chiefComplaint || emr?.chiefComplaints || "",
    ancillaries,
    xray: xrayTests.length > 0,
    xrayNote: xrayTests.join(", "),
    others: otherTests.length > 0,
    othersNote: otherTests.join(", "),
    finalDiagnosis: consultation ? formatDiagnosisText(consultation) : "",
    treatmentGiven: consultation?.medicationOrders || "",
    dateTimeDischarge,
    conditionUponDischarge,
    disposition: consultation?.disposition || emr?.disposition || "",
    medications,
    followUpExamination: consultation?.followUpExamination || emr?.followUpExamination || "",
    erPhysician: consultation?.attendingPrintedName || matchedEncounter?.doctor || emr?.physician || "",
  };
}

function buildDischargeSeed(patient, emr, consultation, encounters, shared = {}) {
  const fullAddress = [patient.address, patient.barangay, patient.city, patient.province]
    .filter(Boolean)
    .join(", ");
  const age = calculateAge(patient.dateOfBirth);

  const matchedEncounter = matchEncounterForConsultation(consultation, encounters);

  const seed = {
    hospitalNo: emr?.hospitalRecordNo || patient.hospitalNo || "",
    patientName: [patient.firstName, patient.middleName, patient.lastName, patient.suffix]
      .filter(Boolean)
      .join(" "),
    address: fullAddress,
    age: age !== null ? String(age) : "",
    sex: patient.sex || "",
    dob: patient.dateOfBirth || "",
    ...deriveDischargeFieldsFromEntries(consultation, emr, matchedEncounter),
  };
  return fillBlanksFromShared(seed, "discharge", shared).patched;
}

// The doctor- and nurse-authored fields the Medical Certificate shares
// with the Consultation Form — computed straight from the doctor's/
// nurse's latest saved entry, not through SHARED_FIELD_MAP (see
// sharedClinicalFields.js), since a couple of these (Ancillary
// Examination Done, Medicine Prescription, License No./PTR split into two
// printed-form lines) aren't single plain fields a generic map entry
// could point at.
//
//   Field                         | Comes from                                   | Authored by
//   occupation                    | consultation.occupation ("Personal Details") | Nurse
//   inclusiveDatesOfTreatment     | the matched registration's own appointment   |
//                                 | date, falling back to the EMR's date of visit|
//   subjectiveComplaints          | consultation.chiefComplaint, then emr        | Nurse/Doctor
//   pertinentPhysicalExamination-  | consultation's CF4 "Pertinent Physical      | Doctor
//     Findings                    | Examination on Admission" checklist (General |
//                                 | Survey, HEENT, Chest/Lungs, CVS, Abdomen,    |
//                                 | GU/OB, Skin/Extremities, Neuro Exam),        |
//                                 | flattened to narrative text via              |
//                                 | formatPhysicalExamText() — same helper and   |
//                                 | same source the Konsulta/Yakap Referral's    |
//                                 | own Physical Examination field already uses  |
//                                 | — falling back to the EMR's Objective        |
//                                 | Findings                                     |
//   ancillaryExaminationDone      | consultation.diagnosticsSelected — the same  | Doctor
//                                 | tests/x-ray/others sorting the Discharge     |
//                                 | form uses, flattened to text                 |
//   clinicalDiagnosis             | consultation's Diagnosis + ICD-10 codes      | Doctor
//                                 | (formatDiagnosisText)                        |
//   medicinePrescription          | consultation.prescriptionItems (the Medicine | Doctor
//                                 | Prescription section) — one medicine per     |
//                                 | line, same source the ER Discharge form's    |
//                                 | Take Home Medications table reads, just      |
//                                 | flattened to text since this field is a      |
//                                 | single ruled block rather than a table       |
//   disposition                   | consultation.disposition + " - " +           | Doctor
//     (labeled "Disposition/       | consultation.dispositionNotes ("Recommend-   |
//      Recommendations" on the     | ations" in the Consultation Form's           |
//      printed certificate)        | Disposition section), e.g. "Discharged -     |
//                                 | Rest with medication x 4 days", falling back |
//                                 | to emr.disposition only when consultation has|
//                                 | neither piece                                |
//   classification                | consultation.classification, then emr        | Nurse
//   attendingPhysician            | consultation.attendingPrintedName (CF4       | Doctor
//                                 | Certification), falling back to the matched  |
//                                 | registration's assigned doctor, then the EMR |
//   licNo                         | consultation.attendingLicenseNumber (CF4     | Doctor
//                                 | Certification's combined "License Number /   |
//                                 | PTR" field)                                  |
//   ptrNo                         | always blank — left for manual entry on the  |
//                                 | printed certificate, never auto-filled       |
//
// Exported so PatientProfile.jsx's handleSaveConsultation() can push a
// fresh value into an ALREADY-SAVED Medical Certificate the instant a
// nurse or doctor saves the Consultation Form — not just the first time
// this modal happens to be opened (same precedent as
// deriveKonsultaFieldsFromDoctorEntry in KonsultaReferralModal.jsx).

// Shared with deriveDischargeFieldsFromEntries's own medications array
// above, just flattened into one readable line per medicine instead of
// table rows — the Medical Certificate's Medicine Prescription field is a
// single ruled text block, not a row-per-medicine table like the ER
// Discharge form's Take Home Medications.
function formatPrescriptionItemsText(consultation) {
  if (!Array.isArray(consultation?.prescriptionItems)) return "";
  return consultation.prescriptionItems
    .filter((item) => item?.medicineName?.trim())
    .map((item) => {
      const strength = item.milligram ? ` ${item.milligram}` : "";
      const sig = item.instructions ? ` — ${item.instructions}` : "";
      return `${item.medicineName}${strength}${sig}`;
    })
    .join("; ");
}

export function deriveMedCertFieldsFromEntries(consultation, emr, matchedEncounter) {
  const { ancillaries, xrayTests, otherTests } = sortOrderedDiagnostics(consultation);
  const ancillaryNames = Object.keys(ancillaries)
    .map((key) => ANCILLARY_TEST_NAMES[key])
    .filter(Boolean);
  const ancillaryExaminationDone = [...ancillaryNames, ...xrayTests, ...otherTests].join(", ");

  const attendedAt = matchedEncounter?.dateCreated ? new Date(matchedEncounter.dateCreated) : null;
  const inclusiveDatesOfTreatment = attendedAt
    ? attendedAt.toLocaleDateString("en-PH")
    : emr?.dateOfVisit || "";

  const licenseNumber = consultation?.attendingLicenseNumber || "";

  // Disposition/Recommendations — "Discharged - Rest with medication x 4
  // days" — the doctor's Disposition select (e.g. "Discharged") plus their
  // Recommendations note (dispositionNotes), joined with " - ". Falls back
  // to the EMR's disposition only when the consultation has neither piece.
  const disposition =
    [consultation?.disposition, consultation?.dispositionNotes].filter(Boolean).join(" - ") ||
    emr?.disposition ||
    "";

  return {
    occupation: consultation?.occupation || emr?.occupation || "",
    classification: consultation?.classification || emr?.classification || "",
    inclusiveDatesOfTreatment,
    subjectiveComplaints: consultation?.chiefComplaint || emr?.chiefComplaints || "",
    pertinentPhysicalExaminationFindings: formatPhysicalExamText(consultation) || emr?.objectiveFindings || "",
    ancillaryExaminationDone,
    clinicalDiagnosis: consultation ? formatDiagnosisText(consultation) : "",
    medicinePrescription: formatPrescriptionItemsText(consultation),
    disposition,
    attendingPhysician: consultation?.attendingPrintedName || matchedEncounter?.doctor || emr?.physician || "",
    licNo: licenseNumber,
    // PTR No. is intentionally left blank — filled in by hand on the
    // printed certificate rather than auto-filled from the license number.
    ptrNo: "",
  };
}

// Seed the Medical Certificate from the patient's profile, their EMR (if
// it exists), and — same "matched fields don't need to be retyped"
// approach as the ER Discharge seed above — the Consultation Form entry
// and matched registration for this visit (via deriveMedCertFieldsFromEntries
// above), plus a shared-clinical-store pass for anything still blank.
function buildMedicalCertificateSeed(patient, emr, consultation, encounters, shared = {}) {
  const fullAddress = [patient.address, patient.barangay, patient.city, patient.province]
    .filter(Boolean)
    .join(", ");
  const age = calculateAge(patient.dateOfBirth);

  const matchedEncounter = matchEncounterForConsultation(consultation, encounters);

  const seed = {
    patientName: [patient.firstName, patient.middleName, patient.lastName, patient.suffix]
      .filter(Boolean)
      .join(" "),
    age: age !== null ? String(age) : "",
    date: new Date().toISOString().slice(0, 10),
    address: fullAddress,
    ...deriveMedCertFieldsFromEntries(consultation, emr, matchedEncounter),
  };
  return fillBlanksFromShared(seed, "medcert", shared).patched;
}

function Card({ title, icon, children, action }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-teal-700">{icon}</span>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
        </div>
        {action}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm overflow-y-auto">{children}</dl>
    </div>
  );
}

function Row({ label, value, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-slate-800 font-medium leading-snug wrap-break-word">{value || "—"}</dd>
    </div>
  );
}

// Side panel navigation — "Profile" renders the existing info-card body;
// the rest are placeholders ready for their respective features later.
// `feature` matches the keys in data/roles.js' ROLE_FEATURE_ACCESS so a
// role that can't reach a feature from the dashboard doesn't see (or get
// silently redirected out of) its tab here either. `null` = always visible.
const PROFILE_NAV_ITEMS = [
  { id: "profile", label: "Profile", icon: User, feature: null },
  { id: "registration", label: "Registration", icon: ClipboardCheck, feature: "registration" },
  // Split into "labOrders"/"xrayOrders" on the dashboard sidebar (see
  // data/roles.js), but this tab stays a single "Lab Orders" entry here —
  // whichever of the two features the role has, they can still see this
  // patient's lab/x-ray order history in one place.
  { id: "lab-orders", label: "Lab Orders", icon: FlaskConical, feature: ["labOrders", "xrayOrders"] },
  {
    id: "medicine-prescription",
    label: "Medicine Prescriptions",
    icon: Pill,
    feature: "medicinePrescriptions",
  },
  { id: "patient-files", label: "Patient Files", icon: Folder, feature: null },
];

function ComingSoonPanel({ label, icon }) {
  return (
    <div className="h-full min-h-[240px] bg-white border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center gap-2 p-8">
      <span className="text-slate-300">{icon}</span>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="text-xs text-slate-400">This section isn't set up yet. Coming soon.</p>
    </div>
  );
}

// Lab Order tab — this patient's own lab order history, same look as the
// main Lab Orders table but scoped to just their orders, plus a "Create
// Lab Order" button that opens the create modal with the patient locked in.
const CONSULTATION_ROLE_LABELS = {
  er_nurse: "ER Nurse",
  opd_nurse: "OPD Nurse",
  doctor: "Doctor",
  admin: "Admin",
  med_tech: "Med Tech",
  xray_tech: "X-ray Tech",
};

function SummaryRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function SummaryList({ label, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <ul className="list-disc list-inside text-sm text-slate-800 space-y-0.5">
        {items.map((item, i) => (
          <li key={item.id || i}>{item.text || item.condition || String(item)}</li>
        ))}
      </ul>
    </div>
  );
}

function PatientLabOrdersPanel({ orders, onCreate, onOpenOrder, canCreate }) {
  return (
    <div className="h-full min-h-[240px] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Lab Orders</p>
          <p className="text-xs text-slate-400">This patient's lab order history</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus size={14} />
            Create Lab Order
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="flex-1 bg-white border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center gap-2 p-8">
          <FlaskConical size={28} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No lab orders yet</p>
          <p className="text-xs text-slate-400">
            Lab orders created for this patient will show up here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">ID</th>
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Diagnostics</th>
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Date Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => onOpenOrder(o.id)}
                    className="border-b border-slate-100 hover:bg-teal-50/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium text-teal-700 whitespace-nowrap align-top">
                      {o.id}
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {(o.diagnostics || []).map((d) => (
                          <span
                            key={d}
                            className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 uppercase whitespace-nowrap"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          ORDER_STATUS_STYLES[getOrderStatus(o)]
                        }`}
                      >
                        {getOrderStatus(o)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap text-slate-600">
                      {formatDateCreated(o.dateCreated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Medicine Prescriptions tab — this patient's own medicine-prescription history,
// same look/columns as the main Medicine Prescriptions table but scoped to
// just their records, plus an "Add Prescription" button that jumps to the
// prescription flow with this patient already selected.
function PatientMedicinePrescriptionsPanel({ records, onCreate, onOpenRecord }) {
  return (
    <div className="h-full min-h-[240px] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Medicine Prescriptions</p>
          <p className="text-xs text-slate-400">This patient's prescribed medicine history</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus size={14} />
          Add Prescription
        </button>
      </div>

      {records.length === 0 ? (
        <div className="flex-1 bg-white border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center gap-2 p-8">
          <Pill size={28} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No prescribed medicines yet</p>
          <p className="text-xs text-slate-400">
            Medicines prescribed to this patient will show up here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">ID</th>
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Medicine Count</th>
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Prescribed By</th>
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Date Created</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onOpenRecord(r)}
                    className="border-b border-slate-100 hover:bg-teal-50/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium text-teal-700 whitespace-nowrap align-top">
                      {r.id}
                    </td>
                    <td className="px-4 py-2.5 align-top text-center text-slate-700">
                      {r.items?.length || 0}
                    </td>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap text-slate-700">
                      {r.prescribedBy || "—"}
                    </td>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap text-slate-600">
                      {formatDateCreated(r.dateCreated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Patient Files tab — folder browser matching the reference design.
// Each folder maps to a document type; folders with no form/data yet show
// "0 file(s)" and are ready to be wired up once that form exists.
const VIEW_MODES = [
  { id: "grid", icon: LayoutGrid, label: "Grid view" },
  { id: "list", icon: List, label: "List view" },
  { id: "table", icon: Table2, label: "Table view (coming soon)", disabled: true },
];

function FileFolderCard({ folder, selected, checked, onToggleCheck, onSelect }) {
  return (
    <div
      onClick={() => onSelect(folder.id)}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-3 cursor-pointer border transition-colors ${
        selected ? "bg-teal-50 border-teal-300" : "bg-slate-50/60 border-transparent hover:bg-slate-100"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggleCheck(folder.id)}
        className="shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
      />
      <Folder size={18} className="shrink-0 text-teal-700" />
      <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-700">{folder.label}</span>
      <span
        className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          folder.count > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"
        }`}
      >
        {folder.count} file(s)
      </span>
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 text-slate-400 hover:text-slate-600"
        aria-label="More options"
      >
        <MoreVertical size={16} />
      </button>
    </div>
  );
}

function PatientFilesPanel({
  emr,
  discharge,
  konsultaReferral,
  medicalCertificate,
  consultationHistory,
  downloadingPdf,
  downloadingDischargePdf,
  downloadingKonsultaPdf,
  downloadingMedCertPdf,
  downloadingCF4Pdf,
  onEditEmr,
  onEditDischarge,
  onDownloadEmr,
  onDownloadDischarge,
  onOpenKonsultaReferral,
  onDownloadKonsultaReferral,
  onOpenMedicalCertificate,
  onDownloadMedicalCertificate,
  onViewConsultationEntry,
  onViewCF4,
  onDownloadCF4,
}) {
  const [viewMode, setViewMode] = useState("grid");
  const [checkedIds, setCheckedIds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const year = new Date().getFullYear();

  const erEntries = (consultationHistory || []).filter((e) => e.authorRole === "er_nurse");
  const opdEntries = (consultationHistory || []).filter((e) => e.authorRole === "opd_nurse");
  const doctorEntries = (consultationHistory || []).filter((e) => e.authorRole === "doctor");

  function entryLabel(entry) {
    const dt = entry.createdAt ? new Date(entry.createdAt) : null;
    return dt
      ? dt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
      : "Undated entry";
  }

  function toHistoryList(entryList, roleLabel) {
    return entryList.map((entry, i) => ({
      id: entry.id || i,
      label: entryLabel(entry),
      sublabel: i === 0 ? `Latest ${roleLabel}` : roleLabel,
      onClick: () => onViewConsultationEntry(entry),
    }));
  }

  const folders = [
    {
      id: "medical-record",
      label: "Medical Record",
      count: doctorEntries.length,
      description: "The doctor's consultation records for this patient — diagnosis, medication, and disposition.",
      historyList: toHistoryList(doctorEntries, "consultation"),
    },
    {
      id: "er-consultation",
      label: "ER Consultation",
      count: erEntries.length,
      description: "Every consultation an ER nurse recorded for this patient, newest first.",
      historyList: toHistoryList(erEntries, "ER consultation"),
    },
    {
      id: "opd-consultation",
      label: "OPD Consultation",
      count: opdEntries.length,
      description: "Every consultation an OPD nurse recorded for this patient, newest first.",
      historyList: toHistoryList(opdEntries, "OPD consultation"),
    },
    {
      id: "medical-certificate",
      label: "Medical Certificate",
      count: medicalCertificate ? 1 : 0,
      description: "Medical certificate for this patient's diagnosis and treatment.",
      actions: medicalCertificate
        ? [
            { label: "View / Edit", onClick: onOpenMedicalCertificate },
            {
              label: downloadingMedCertPdf ? "Preparing…" : "Download PDF",
              onClick: onDownloadMedicalCertificate,
              disabled: downloadingMedCertPdf,
            },
          ]
        : [{ label: "Add Medical Certificate", onClick: onOpenMedicalCertificate }],
    },
    {
      id: "er-discharge",
      label: "Emergency Room Discharged Instruction Form",
      count: discharge ? 1 : 0,
      description: "Discharge summary and follow-up instructions for this ER visit.",
      actions: discharge
        ? [
            { label: "View / Edit", onClick: onEditDischarge },
            {
              label: downloadingDischargePdf ? "Preparing…" : "Download PDF",
              onClick: onDownloadDischarge,
              disabled: downloadingDischargePdf,
            },
          ]
        : [{ label: "Add Discharge Instructions", onClick: onEditDischarge }],
    },
    {
      id: "konsulta-referral",
      label: "Emergency Care Benefit Referral to Konsulta/Yakap",
      count: konsultaReferral ? 1 : 0,
      description: "Referral form for the Emergency Care Benefit under Konsulta/Yakap.",
      actions: konsultaReferral
        ? [
            { label: "View / Edit", onClick: onOpenKonsultaReferral },
            {
              label: downloadingKonsultaPdf ? "Preparing…" : "Download PDF",
              onClick: onDownloadKonsultaReferral,
              disabled: downloadingKonsultaPdf,
            },
          ]
        : [{ label: "Create Referral", onClick: onOpenKonsultaReferral }],
    },
    {
      id: "cf4",
      label: "CF4",
      count: doctorEntries.length > 0 ? 1 : 0,
      description:
        "PhilHealth Claim Form 4 — auto-filled from the doctor's and ER nurse's consultation records for this patient. Nothing to fill out here manually.",
      actions:
        doctorEntries.length > 0
          ? [
              { label: "Preview", onClick: onViewCF4 },
              {
                label: downloadingCF4Pdf ? "Preparing…" : "Download PDF",
                onClick: onDownloadCF4,
                disabled: downloadingCF4Pdf,
              },
            ]
          : [{ label: "No consultation recorded yet", onClick: () => {}, disabled: true }],
    },
  ];

  const selectedFolder = folders.find((f) => f.id === selectedId) || null;
  const allChecked = checkedIds.length === folders.length;

  function toggleCheck(id) {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setCheckedIds(allChecked ? [] : folders.map((f) => f.id));
  }

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-start">
      <div className="flex-1 w-full min-w-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Breadcrumb / header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Home size={15} className="text-slate-400" />
            <span>Files</span>
          </div>
          <div className="flex items-center gap-1">
            {VIEW_MODES.map(({ id, icon: Icon, label, disabled }) => (
              <button
                key={id}
                type="button"
                title={label}
                disabled={disabled}
                onClick={() => setViewMode(id)}
                className={`p-1.5 rounded-md border transition-colors ${
                  viewMode === id
                    ? "bg-teal-700 border-teal-700 text-white"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <button
            type="button"
            title="Share (coming soon)"
            disabled
            className="p-2 rounded-lg bg-teal-700/40 text-white cursor-not-allowed"
          >
            <Share2 size={14} />
          </button>
          <button
            type="button"
            title="Filter by year (coming soon)"
            disabled
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 opacity-70 cursor-not-allowed"
          >
            {year}
            <ChevronDown size={13} />
          </button>
        </div>

        {/* Select all + folder list/grid */}
        <div className="p-4">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-600"
            />
            Select all
          </label>

          <div className={viewMode === "list" ? "flex flex-col gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-2"}>
            {folders.map((folder) => (
              <FileFolderCard
                key={folder.id}
                folder={folder}
                selected={selectedId === folder.id}
                checked={checkedIds.includes(folder.id)}
                onToggleCheck={toggleCheck}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Details panel */}
      <div className="w-full xl:w-80 shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col items-center justify-center text-center min-h-[220px]">
        {selectedFolder ? (
          <>
            <FolderOpen size={30} className="text-teal-700 mb-2" />
            <p className="text-sm font-semibold text-slate-800">{selectedFolder.label}</p>
            <p className="text-xs text-slate-400 mt-1">{selectedFolder.description}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-2">{selectedFolder.count} file(s)</p>

            {selectedFolder.historyList ? (
              <div className="mt-4 w-full text-left">
                {selectedFolder.historyList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center">
                    No consultations recorded yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                    {selectedFolder.historyList.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.onClick}
                        className="w-full text-left rounded-lg border border-slate-200 hover:bg-teal-50 hover:border-teal-200 px-3 py-2 transition-colors"
                      >
                        <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                        <p className="text-[11px] text-slate-400">{item.sublabel}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : selectedFolder.comingSoon ? (
              <p className="mt-4 text-xs text-slate-400 italic">Coming soon.</p>
            ) : (
              <div className="mt-4 w-full space-y-2">
                {selectedFolder.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    disabled={action.disabled}
                    onClick={action.onClick}
                    className="w-full rounded-lg bg-teal-700 text-white text-xs font-semibold px-3 py-2 hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <Folder size={30} className="text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-500">Select a file or folder to view details.</p>
            <p className="text-xs text-slate-400 mt-1">
              Choose a category from the left pane to start browsing files.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function PatientProfile() {
  const { hospitalNo } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const visibleNavItems = PROFILE_NAV_ITEMS.filter((item) => {
    if (!item.feature) return true;
    const required = Array.isArray(item.feature) ? item.feature : [item.feature];
    return required.some((f) => hasFeatureAccess(user?.role, f));
  });
  const [patient, setPatient] = useState(undefined); // undefined = loading, null = not found
  const [emr, setEmr] = useState(null);
  const [discharge, setDischarge] = useState(null);
  const [konsultaReferral, setKonsultaReferral] = useState(null);
  const [showKonsultaReferral, setShowKonsultaReferral] = useState(false);
  const [medicalCertificate, setMedicalCertificate] = useState(null);
  const [showMedicalCertificate, setShowMedicalCertificate] = useState(false);
  const [consultation, setConsultation] = useState(null);
  const [consultationHistoryList, setConsultationHistoryList] = useState([]);
  // ConsultationForm reads its `initialValues` prop only once, at mount
  // (see the useState(() => ...) lazy initializer there) — it does NOT
  // re-sync if `consultation` finishes loading afterward. Since
  // `showConsultation` can flip to true from the "openConsultation"
  // navigation-state effect below independently of (and sometimes before)
  // the patient/consultation fetch below finishes, that used to let the
  // form mount with blank/seed data — which looked like "the nurse's
  // consultation isn't showing" for whoever opened it next (most visibly
  // across two different devices/sessions, but it could happen on one
  // device too if the click landed before the fetch resolved). This flag
  // gates the form's mount until the real data has actually arrived.
  const [consultationDataReady, setConsultationDataReady] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [consultationReturnTo, setConsultationReturnTo] = useState(null);
  const [consultationReadOnly, setConsultationReadOnly] = useState(false);
  const [consultationEncounter, setConsultationEncounter] = useState(null);
  const [sharedClinical, setSharedClinical] = useState({});
  const [showEmr, setShowEmr] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [zoomPhotoOpen, setZoomPhotoOpen] = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDischargePdf, setDownloadingDischargePdf] = useState(false);
  const [downloadingKonsultaPdf, setDownloadingKonsultaPdf] = useState(false);
  const [downloadingMedCertPdf, setDownloadingMedCertPdf] = useState(false);
  const [downloadingCF4Pdf, setDownloadingCF4Pdf] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const fromUrl = searchParams.get("tab");
    const fromState = location.state?.initialTab;
    const requested = fromUrl || fromState;
    const isValid = visibleNavItems.some((item) => item.id === requested);
    return isValid ? requested : "profile";
  });

  // Belt-and-suspenders: if the ?tab= param changes while this page is
  // already mounted (e.g. clicking "Registration Files" for the same
  // patient a second time, or a browser back/forward), react to it instead
  // of only reading it once at mount.
  useEffect(() => {
    const fromUrl = searchParams.get("tab");
    if (fromUrl && visibleNavItems.some((item) => item.id === fromUrl)) {
      setActiveTab(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Arriving here via Registration's "Start Consultation" button — open the
  // Consultation Form directly (it's a modal, so it opens on top of
  // whatever tab is already active). Consumes the navigation state once so
  // a page refresh doesn't reopen it.
  useEffect(() => {
    if (location.state?.openConsultation) {
      setShowConsultation(true);
      setConsultationReadOnly(!!location.state?.consultationReadOnly);
      setConsultationReturnTo(location.state?.returnTo || null);
      const encId = location.state?.consultationEncounterId;
      if (encId) {
        findEncounterById(encId).then(setConsultationEncounter);
      } else {
        setConsultationEncounter(null);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [historyTab, setHistoryTab] = useState("past");
  const [copiedField, setCopiedField] = useState("");
  const [labOrders, setLabOrders] = useState([]);
  const [showCreateLabOrder, setShowCreateLabOrder] = useState(false);
  const [medicinePrescriptions, setMedicinePrescriptions] = useState([]);
  // This patient's registrations — loaded so the Vital Signs card below can
  // pull the most recently-recorded triage (BP/HR/RR/Temp/Height/Weight/
  // BMI/Vision), the same data Registration -> Triage actually saves. The
  // card used to only ever read from the separate, manually-typed EMR
  // document, so vitals captured at Registration never showed up here even
  // though they were saved correctly on the encounter itself.
  const [encounters, setEncounters] = useState([]);
  const [viewPrescribedRecord, setViewPrescribedRecord] = useState(null);

  async function refreshLabOrders(pid) {
    setLabOrders((await loadLabOrders()).filter((o) => o.hospitalNo === pid));
  }

  async function refreshMedicinePrescriptions(pid) {
    setMedicinePrescriptions((await loadMedicinePrescriptions()).filter((r) => r.hospitalNo === pid));
  }

  useEffect(() => {
    let active = true;
    setPatient(undefined); // "still loading" sentinel — see the render guard below
    setConsultationDataReady(false);
    findPatientById(hospitalNo).then(async (found) => {
      if (!active) return;
      setPatient(found);
      const docs = found ? await loadAllPatientDocuments(hospitalNo) : { emr: null, discharge: null, konsulta: null, medcert: null };
      if (!active) return;
      setEmr(docs.emr);
      setDischarge(docs.discharge);
      setKonsultaReferral(docs.konsulta);
      setMedicalCertificate(docs.medcert);
      const history = found ? await loadConsultationHistory(hospitalNo) : [];
      setConsultationHistoryList(history);
      setConsultation(history[0] || null);
      setConsultationDataReady(true);
      setSharedClinical(found ? await loadSharedClinical(hospitalNo) : {});
      setLabOrders(found ? (await loadLabOrders()).filter((o) => o.hospitalNo === hospitalNo) : []);
      setMedicinePrescriptions(
        found ? (await loadMedicinePrescriptions()).filter((r) => r.hospitalNo === hospitalNo) : []
      );
      const patientEncounters = found ? (await loadEncounters()).filter((e) => e.hospitalNo === hospitalNo) : [];
      // loadEncounters() deliberately never attaches triage (see its
      // comment — avoiding an N+1 fetch across the whole system). Here
      // we're already scoped to just this one patient's encounters, so
      // fetching triage per-row is cheap and safe, and is what lets the
      // Vital Signs card below actually find e.triage on each row.
      const encountersWithTriage = await Promise.all(
        patientEncounters.map(async (e) => ({ ...e, triage: await loadTriageForEncounter(e.id) }))
      );
      if (!active) return;
      setEncounters(encountersWithTriage);
    });
    return () => {
      active = false;
    };
  }, [hospitalNo]);

  // "Add Prescription" navigates to the standalone add-prescription page
  // (unlike Lab Orders, which uses an in-page modal) — so pick up any new
  // records when the person returns to this tab/window.
  useEffect(() => {
    function onFocus() {
      refreshMedicinePrescriptions(hospitalNo);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [hospitalNo]);

  useEffect(() => {
    if (!cameraStream || !videoRef.current) return;

    videoRef.current.srcObject = cameraStream;
    videoRef.current.play().catch((err) => console.error("Error playing camera stream:", err));

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // After saving any one of the four clinical forms, pull its shared-concept
  // fields into the shared store, then immediately patch any BLANK fields
  // in the other forms' already-saved records — so filling one form in
  // fills the others in right away, without waiting for someone to reopen
  // them. A field some other form already has a value for is left alone.
  async function syncSharedClinical(formKey, formData) {
    const contributed = extractSharedFields(formData, formKey);
    if (Object.keys(contributed).length === 0) return;
    const merged = await saveSharedClinical(hospitalNo, contributed);
    setSharedClinical(merged);

    const siblings = [
      ["emr", emr, setEmr, saveEmr],
      ["discharge", discharge, setDischarge, saveDischarge],
      ["konsulta", konsultaReferral, setKonsultaReferral, saveKonsultaReferral],
      ["medcert", medicalCertificate, setMedicalCertificate, saveMedicalCertificate],
    ];
    for (const [key, record, setter, saveFn] of siblings) {
      if (key === formKey || !record) continue;
      const { patched, changed } = fillBlanksFromShared(record, key, merged);
      if (!changed) continue;
      const saved = await saveFn(hospitalNo, patched, user?.id ?? null);
      setter(saved);
    }
  }

  async function handleSaveEmr(formData) {
    const updatedEmr = await saveEmr(hospitalNo, formData, user?.id ?? null);
    setEmr(updatedEmr);
    await syncSharedClinical("emr", formData);
  }

  async function handleSaveConsultation(formData) {
    // consultationEncounter is only set when this form was opened from a
    // specific registration (Registration's "Start Consultation" button) —
    // see the effect above that resolves consultationEncounterId. Saves
    // made from the general Patient Profile aren't tied to a registration,
    // so they simply won't show up in the Registration table's Diagnosis
    // column, same as they don't count toward that registration's
    // auto-completion below.
    let entry;
    try {
      entry = await saveConsultationEntry(
        hospitalNo,
        formData,
        user?.role,
        consultationEncounter?.id ?? null,
        user?.id ?? null
      );
    } catch (err) {
      alert(`Couldn't save the consultation: ${err.message || "unknown error"}`);
      return;
    }

    // Sync a Lab Order for whatever the doctor checked off in the
    // "Diagnostics / Tests Ordered" section, so the nurse/tech side of the
    // workflow doesn't need a second manual step to place the same order
    // the doctor already specified here. Only doctors ever see/edit this
    // section (see DOCTOR_SECTIONS in ConsultationForm.jsx). Uses
    // upsertLabOrderForEncounter (keyed on consultationEncounter?.id) so
    // re-saving the same registration's consultation updates that one lab
    // order/x-ray order instead of stacking up a duplicate per save — same
    // guarantee Medicine Prescriptions gets below via
    // upsertMedicinePrescriptionForEncounter.
    if (user?.role === "doctor" && formData.diagnosticsSelected?.length > 0) {
      try {
        await upsertLabOrderForEncounter({
          encounterId: consultationEncounter?.id ?? null,
          hospitalNo,
          diagnostics: formData.diagnosticsSelected,
          testDetails: formData.diagnosticsTestDetails || {},
        });
      } catch (err) {
        // The consultation itself already saved successfully above — don't
        // let a lab-order failure look like the whole save failed, just
        // surface it so the doctor knows to place the order manually.
        alert(
          `The consultation was saved, but the lab order couldn't be created automatically: ${
            err.message || "unknown error"
          }`
        );
      }
    }

    // Sync the "Medicine Prescription" section of this consultation into
    // the real Medicine Prescriptions feature (medicine_prescriptions /
    // prescription_items tables). Without this, what a doctor prescribes
    // here only ever lived inside the consultation record itself (details
    // jsonb) — it never actually reached the Medicine Prescriptions
    // list/side-panel/PDF, which is a completely separate table. Only
    // doctors have a Medicine Prescription section on this form (see
    // DOCTOR_SECTIONS in ConsultationForm.jsx), and this only fires when
    // at least one medicine was actually selected. upsertMedicinePrescriptionForEncounter
    // keys off consultationEncounter?.id, so re-saving the same
    // registration's consultation updates that one prescription instead of
    // stacking up duplicates (same guarantee Lab Orders already has above).
    if (user?.role === "doctor") {
      const rxItems = (formData.prescriptionItems || []).filter((it) => it.medicineName?.trim());
      if (rxItems.length > 0) {
        const prescribedBy = [user?.prefix, user?.firstName, user?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        try {
          await upsertMedicinePrescriptionForEncounter({
            hospitalNo,
            encounterId: consultationEncounter?.id ?? null,
            prescribedBy: prescribedBy || "—",
            createdBy: user?.id ?? null,
            items: rxItems,
          });
          await refreshMedicinePrescriptions(hospitalNo);
        } catch (err) {
          // The consultation itself already saved successfully above —
          // same "don't let this look like the whole save failed" treatment
          // the lab-order auto-create gets.
          alert(
            `The consultation was saved, but the medicine prescription couldn't be synced to the Medicine Prescriptions list: ${
              err.message || "unknown error"
            }`
          );
        }
      }
    }

    // Personal Details / Health Coverage / Emergency Contact live here now
    // (moved from the EMR) — keep the patient master record's overlapping
    // fields in sync so the rest of the profile updates immediately too.
    let updatedPatient = patient;
    if (patient) {
      const patch = {
        firstName: formData.firstName || patient.firstName,
        lastName: formData.lastName || patient.lastName,
        middleName: formData.middleName,
        dateOfBirth: formData.dateOfBirth || patient.dateOfBirth,
        sex: formData.gender || patient.sex,
        address: formData.residentialAddress || patient.address,
        email: formData.email,
        mobile: formData.phoneCell,
        landline: formData.phoneHome,
        motherName: formData.motherName,
        motherContact: formData.motherContact,
        fatherName: formData.fatherName,
        fatherContact: formData.fatherContact,
        nationality: formData.nationality,
        religion: formData.religion,
        maritalStatus: formData.maritalStatus,
        emergencyName: formData.emergencyName,
        emergencyRelationship: formData.emergencyRelationship,
        emergencyAddress: formData.emergencyAddress,
        emergencyPhoneHome: formData.emergencyPhoneHome,
        emergencyPhoneCell: formData.emergencyPhoneCell,
      };
      try {
        updatedPatient = await updatePatient(hospitalNo, patch);
      } catch {
        // Consultation record still saved above even if this sync fails —
        // surface it quietly rather than losing the consultation save.
        updatedPatient = { ...patient, ...patch };
      }
    }

    setPatient(updatedPatient);
    setConsultation(entry);
    // Replace the existing row for this (encounter, author role) instead
    // of blindly prepending — saveConsultationEntry() upserts, so without
    // this the SAME row would show up twice in Patient Files' history
    // (the stale pre-save copy plus the fresh one) every time the same
    // registration's consultation was saved a second time.
    setConsultationHistoryList((list) => [entry, ...list.filter((e) => e.id !== entry.id)]);
    await syncSharedClinical("consultation", formData);

    // Push straight into an already-saved Konsulta/Yakap Referral, too —
    // Physical Examination, Initial Impression, Management at ED (Course
    // in the Ward + ED Management + Surgical Procedure/RVS Code), and
    // Final Diagnosis are each computed from a checklist or a combination
    // of several Consultation Form sections, not a single plain field, so
    // they can't go through the generic shared-clinical-fields sync above
    // (see deriveKonsultaFieldsFromDoctorEntry in KonsultaReferralModal.jsx
    // and the "impression"/"diagnosis" mappings in sharedClinicalFields.js,
    // which already cover the plain-field concepts). These only fill
    // fields that are still blank on the saved referral — a value staff
    // already typed directly into the referral is never overwritten, same
    // rule every other shared field in this app follows. Only doctors
    // author these CF4 sections (see DOCTOR_SECTIONS in
    // ConsultationForm.jsx), so this only needs to run on a doctor's save.
    //
    // Emergency Department Attending Physician is the one exception to
    // "blank only": it's always kept in lockstep with whichever doctor is
    // selected in the Consultation Form's own Attending Physician dropdown
    // (attendingPrintedName), even if the referral already had a name in
    // it — the referral should never point at a different/outdated doctor
    // than the one who actually attended the patient this visit.
    if (user?.role === "doctor" && konsultaReferral) {
      const derived = deriveKonsultaFieldsFromDoctorEntry(entry, emr);
      const patch = {};
      for (const [key, value] of Object.entries(derived)) {
        if (key === "attendingPhysician") {
          if (value) patch[key] = value;
          continue;
        }
        if (!konsultaReferral[key]?.trim?.() && value) patch[key] = value;
      }
      if (Object.keys(patch).length > 0) {
        const updatedReferral = await saveKonsultaReferral(
          hospitalNo,
          { ...konsultaReferral, ...patch },
          user?.id ?? null
        );
        setKonsultaReferral(updatedReferral);
      }
    }

    // Same live push into an already-saved Medical Certificate — see
    // deriveMedCertFieldsFromEntries above. Unlike the Konsulta block,
    // this runs on BOTH a nurse's save (occupation, from the "Personal
    // Details" section) and a doctor's save (subjective complaints,
    // ancillary exams, diagnosis, treatment, disposition, attending
    // physician, license/PTR, from the CF4 sections), since the matching
    // fields on the Medical Certificate are split between the two roles.
    //
    // INTENTIONALLY OVERWRITES, doesn't just fill blanks: every time a
    // nurse or doctor saves the Consultation Form, the Medical
    // Certificate's matched fields are refreshed to whatever the
    // Consultation Form now says, even if the certificate already had a
    // (now-outdated) value there. Only the handful of fields
    // deriveMedCertFieldsFromEntries actually derives are touched —
    // anything staff typed directly onto the certificate that has no
    // Consultation Form counterpart (Patient's Name, Age, Date, Address,
    // etc.) is left completely alone.
    if (medicalCertificate) {
      const derived = deriveMedCertFieldsFromEntries(entry, emr, consultationEncounter);
      const patch = {};
      for (const [key, value] of Object.entries(derived)) {
        if (value) patch[key] = value;
      }
      if (Object.keys(patch).length > 0) {
        const updatedCertificate = await saveMedicalCertificate(
          hospitalNo,
          { ...medicalCertificate, ...patch },
          user?.id ?? null
        );
        setMedicalCertificate(updatedCertificate);
      }
    }

    // Same live push into an already-saved ER Discharge Instruction Form —
    // see deriveDischargeFieldsFromEntries above. Nurse on Duty, Chief
    // Complaint/s, and Follow-up Examination can come from either role's
    // save; Ancillaries Done, Final Diagnosis, Treatment/Medication Given,
    // Take Home Medications, and E.R. Physician on Duty only ever have a
    // real value once a doctor has saved. Every field (plain text,
    // checkboxes, and the medication rows) only fills in what's still
    // blank on the saved form — a value staff already typed directly onto
    // the Discharge form is never overwritten, same rule every other
    // shared field in this app follows.
    if (discharge) {
      const matchedEncounterForDischarge = consultationEncounter || matchEncounterForConsultation(entry, encounters);
      const derived = deriveDischargeFieldsFromEntries(entry, emr, matchedEncounterForDischarge);
      const patch = {};

      for (const key of [
        "dateTimeAttended",
        "nurseOnDuty",
        "chiefComplaints",
        "finalDiagnosis",
        "treatmentGiven",
        "dateTimeDischarge",
        "conditionUponDischarge",
        "disposition",
        "followUpExamination",
        "erPhysician",
        "xrayNote",
        "othersNote",
      ]) {
        const current = discharge[key];
        const value = derived[key];
        if ((!current || !String(current).trim()) && value) patch[key] = value;
      }

      if (derived.xray && !discharge.xray) patch.xray = true;
      if (derived.others && !discharge.others) patch.others = true;

      if (Object.values(derived.ancillaries || {}).some(Boolean)) {
        const mergedAncillaries = { ...discharge.ancillaries };
        let ancillariesChanged = false;
        for (const [key, value] of Object.entries(derived.ancillaries)) {
          if (value && !mergedAncillaries[key]) {
            mergedAncillaries[key] = true;
            ancillariesChanged = true;
          }
        }
        if (ancillariesChanged) patch.ancillaries = mergedAncillaries;
      }

      // Take Home Medications is a list of rows, not a single blank/filled
      // field — only replace it if nothing has been typed into any row yet,
      // so a nurse/doctor's manual edits here are never clobbered by a
      // later re-save of the Consultation Form's Rx section.
      const hasExistingMedRows =
        Array.isArray(discharge.medications) && discharge.medications.some((row) => row?.medicine?.trim());
      if (!hasExistingMedRows && derived.medications.length > 0) {
        patch.medications = derived.medications;
      }

      if (Object.keys(patch).length > 0) {
        const updatedDischarge = await saveDischarge(hospitalNo, { ...discharge, ...patch }, user?.id ?? null);
        setDischarge(updatedDischarge);
      }
    }

    // Registration auto-completion: once both a nurse and a doctor have
    // saved their part of this encounter's Consultation Form, flip its
    // status to Completed. Only applies when the form was opened for a
    // specific registration (via "Start Consultation" from the
    // Registration list/table) — consultationEncounter is null when opened
    // from the general Patient Profile "Add/Update consultation" shortcuts,
    // which aren't tied to any one registration.
    if (consultationEncounter) {
      const isNurse = NURSE_ROLES.includes(user?.role);
      const isDoctor = user?.role === "doctor";

      if (isNurse || isDoctor) {
        const updatedEncounter = await updateEncounter(consultationEncounter.id, (e) => {
          const next = { ...e };
          if (isNurse) next.nurseConsultationDone = true;
          if (isDoctor) next.doctorConsultationDone = true;
          if (
            next.nurseConsultationDone &&
            next.doctorConsultationDone &&
            next.status !== ENCOUNTER_STATUS.CANCELLED
          ) {
            next.status = ENCOUNTER_STATUS.COMPLETED;
          }
          return next;
        });
        if (updatedEncounter) setConsultationEncounter(updatedEncounter);
      }
    }
  }

  async function handleSaveDischarge(formData) {
    const updated = await saveDischarge(hospitalNo, formData, user?.id ?? null);
    setDischarge(updated);
    await syncSharedClinical("discharge", formData);
  }

  async function handleSaveKonsultaReferral(formData) {
    const updated = await saveKonsultaReferral(hospitalNo, formData, user?.id ?? null);
    setKonsultaReferral(updated);
    await syncSharedClinical("konsulta", formData);
  }

  async function handleSaveMedicalCertificate(formData) {
    const updated = await saveMedicalCertificate(hospitalNo, formData, user?.id ?? null);
    setMedicalCertificate(updated);
    await syncSharedClinical("medcert", formData);
  }

  async function startCamera() {
    setIsCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setIsCameraReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function capturePhoto() {
    if (!videoRef.current) {
      alert("Video reference not found");
      return;
    }
    if (!isCameraReady) {
      alert("Camera is still warming up. Please wait a moment and try again.");
      return;
    }

    const video = videoRef.current;
    const context = canvasRef.current.getContext("2d");

    if (typeof video.requestVideoFrameCallback === "function") {
      await new Promise((resolve) => video.requestVideoFrameCallback(() => resolve()));
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width === 0 || height === 0 || video.readyState < 2) {
      alert("Camera is still loading. Please wait a moment and try again.");
      return;
    }

    try {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      context.drawImage(video, 0, 0, width, height);
      const photoDataUrl = canvasRef.current.toDataURL("image/jpeg", 0.95);

      if (!photoDataUrl || photoDataUrl === "data:,") {
        alert("Failed to capture photo. Please try again.");
        return;
      }

      const updatedPatient = await savePatientPhoto(hospitalNo, photoDataUrl);
      if (updatedPatient) {
        setPatient(updatedPatient);
      }
      stopCamera();
    } catch (err) {
      console.error("Error capturing photo:", err);
      alert("Error capturing photo: " + err.message);
    }
  }

  async function startCamera() {
    setIsCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setIsCameraReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function capturePhoto() {
    if (!videoRef.current) {
      alert("Video reference not found");
      return;
    }
    if (!isCameraReady) {
      alert("Camera is still warming up. Please wait a moment and try again.");
      return;
    }

    const video = videoRef.current;
    const context = canvasRef.current.getContext("2d");

    if (typeof video.requestVideoFrameCallback === "function") {
      await new Promise((resolve) => video.requestVideoFrameCallback(() => resolve()));
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width === 0 || height === 0 || video.readyState < 2) {
      alert("Camera is still loading. Please wait a moment and try again.");
      return;
    }

    try {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      context.drawImage(video, 0, 0, width, height);
      const photoDataUrl = canvasRef.current.toDataURL("image/jpeg", 0.95);

      if (!photoDataUrl || photoDataUrl === "data:,") {
        alert("Failed to capture photo. Please try again.");
        return;
      }

      const updatedPatient = await savePatientPhoto(hospitalNo, photoDataUrl);
      if (updatedPatient) {
        setPatient(updatedPatient);
      }
      stopCamera();
    } catch (err) {
      console.error("Error capturing photo:", err);
      alert("Error capturing photo: " + err.message);
    }
  }

  async function handleDownloadEmr() {
    if (!emr) return;
    setDownloadingPdf(true);
    try {
      const blob = await pdf(<PatientRecordPDF form={emr} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${patientFileLabel(patient)} EMR.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleDownloadDischarge() {
    if (!discharge) return;
    setDownloadingDischargePdf(true);
    try {
      const blob = await pdf(<ErDischargePDF form={discharge} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${patientFileLabel(patient)} ER Discharge Instructions.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingDischargePdf(false);
    }
  }

  async function handleDownloadKonsultaReferral() {
    if (!konsultaReferral) return;
    setDownloadingKonsultaPdf(true);
    try {
      const blob = await pdf(<KonsultaReferralPDF form={konsultaReferral} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${patientFileLabel(patient)} Konsulta-Yakap Referral.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingKonsultaPdf(false);
    }
  }

  async function handleDownloadMedicalCertificate() {
    if (!medicalCertificate) return;
    setDownloadingMedCertPdf(true);
    try {
      const blob = await pdf(<MedicalCertificatePDF form={medicalCertificate} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${patientFileLabel(patient)} Medical Certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingMedCertPdf(false);
    }
  }

  async function handleViewConsultationEntryPdf(entry) {
    // Nurse-authored entries (ER/OPD) print as the paper-form replica —
    // see NurseConsultationPDF.jsx. Doctor/admin entries print as the
    // OPD Consultation Record paper-form replica instead — see
    // DoctorConsultationPDF.jsx, which also needs that visit's Triage
    // vitals (Temperature/Cardiac Rate/Respiratory Rate/Blood Pressure/
    // Weight) for its Vital Signs table; those live on the encounter, not
    // on the consultation entry itself, so they're fetched here rather
    // than being part of `entry`.
    const isNurseEntry = NURSE_ROLES.includes(entry?.authorRole);
    let triage = null;
    if (!isNurseEntry && entry?.encounterId) {
      const encounter = await findEncounterById(entry.encounterId);
      triage = encounter?.triage || null;
    }
    const PdfComponent = isNurseEntry ? NurseConsultationPDF : DoctorConsultationPDF;
    const blob = await pdf(
      <PdfComponent patient={patient} form={entry} triage={triage} generatedBy={user?.username} />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  // The Konsulta/Yakap Referral needs data that lives on TWO different
  // roles' consultation entries — the nurse's intake (PhilHealth PIN, under
  // Health Coverage) and the doctor's clinical assessment (Chief Complaint,
  // History of Present Illness, Diagnosis, Medication, Disposition — see
  // DOCTOR_SECTIONS in ConsultationForm.jsx). Reading from whichever entry
  // happened to save most recently (the single `consultation` state) is
  // exactly what caused prescriptions/diagnoses to go missing from this
  // referral: if the nurse saves after the doctor, `consultation` becomes
  // the nurse's entry, which has none of the doctor's clinical fields. This
  // resolves both, matched to the SAME registration whenever possible —
  // same "doctor entry + matching nurse entry" pairing CF4 already uses
  // above, just without needing the triage fetch.
  function resolveKonsultaSources() {
    const doctorEntries = (consultationHistoryList || []).filter(
      (e) => e.authorRole === "doctor" || e.authorRole === "admin"
    );
    const nurseEntries = (consultationHistoryList || []).filter((e) => NURSE_ROLES.includes(e.authorRole));
    // Prefer the doctor entry for whichever registration is currently open
    // (e.g. via "Start Consultation") over just the most-recently-created
    // one on file — otherwise a doctor's fresh save can be invisible to
    // this referral if a newer registration happens to exist for the same
    // patient. Falls back to the old "most recent overall" behavior when
    // there's no specific registration in context.
    const doctorEntry =
      (consultationEncounter?.id &&
        doctorEntries.find((e) => e.encounterId === consultationEncounter.id)) ||
      doctorEntries[0] ||
      null;
    const nurseEntry =
      (doctorEntry?.encounterId && nurseEntries.find((e) => e.encounterId === doctorEntry.encounterId)) ||
      nurseEntries[0] ||
      null;
    const encounter =
      (doctorEntry?.encounterId && encounters.find((e) => e.id === doctorEntry.encounterId)) ||
      matchEncounterForConsultation(consultation, encounters);
    return { doctorEntry, nurseEntry, encounter };
  }

  // CF4 has no form of its own — it's assembled from whatever the doctor
  // and the ER nurse have already saved on this patient's consultation
  // history, plus that encounter's triage vitals. This resolves those
  // three inputs; returns null if there's nothing to build a CF4 from yet
  // (no doctor/admin consultation entry recorded).
  //
  // "doctor" AND "admin" both count as a doctor-section source here — this
  // mirrors ConsultationForm.jsx's own canEdit(), which explicitly grants
  // Admin full access to DOCTOR_SECTIONS (Signs & Symptoms, Physical Exam,
  // Diagnosis, Certification, etc.) so an admin account can act as a
  // stand-in doctor. Filtering this list down to authorRole === "doctor"
  // only used to silently drop any admin-authored save — the checkboxes
  // saved fine in the DB, CF4 just never looked at that row.
  async function resolveCF4Sources() {
    const doctorEntries = (consultationHistoryList || []).filter(
      (e) => e.authorRole === "doctor" || e.authorRole === "admin"
    );
    const erEntries = (consultationHistoryList || []).filter((e) => e.authorRole === "er_nurse");
    // Same reasoning as resolveKonsultaSources above — prefer the doctor
    // entry for the registration currently open on this page (this is
    // what makes a just-saved "Medicine Given at ER" show up in CF4's
    // Drugs/Medicines table right away) rather than whichever doctor
    // entry happens to be newest across every registration this patient
    // has ever had.
    const doctorEntry =
      (consultationEncounter?.id &&
        doctorEntries.find((e) => e.encounterId === consultationEncounter.id)) ||
      doctorEntries[0];
    if (!doctorEntry) return null;

    // Prefer the ER nurse entry from the SAME registration as the
    // doctor's entry (Course in the Ward / Surgical Procedure / Past
    // Medical History / OB-GYN History should describe the same visit
    // being claimed) — fall back to the most recent ER entry on file if
    // this consultation wasn't tied to a specific registration.
    const erEntry =
      (doctorEntry.encounterId && erEntries.find((e) => e.encounterId === doctorEntry.encounterId)) ||
      erEntries[0] ||
      {};

    let triage = null;
    if (doctorEntry.encounterId) {
      const encounter = await findEncounterById(doctorEntry.encounterId);
      triage = encounter?.triage || null;
    }

    return { doctorEntry, erEntry, triage };
  }

  async function handleViewCF4() {
    const sources = await resolveCF4Sources();
    if (!sources) return;
    const blob = await pdf(
      <CF4PDF
        patient={patient}
        doctorEntry={sources.doctorEntry}
        erEntry={sources.erEntry}
        triage={sources.triage}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function handleDownloadCF4() {
    const sources = await resolveCF4Sources();
    if (!sources) return;
    setDownloadingCF4Pdf(true);
    try {
      const blob = await pdf(
        <CF4PDF
          patient={patient}
          doctorEntry={sources.doctorEntry}
          erEntry={sources.erEntry}
          triage={sources.triage}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${patientFileLabel(patient)} CF4.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingCF4Pdf(false);
    }
  }

  function handleCopy(field, value) {
    if (!value) return;
    navigator.clipboard?.writeText(String(value)).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(""), 1500);
    });
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const photoDataUrl = reader.result;
      if (!photoDataUrl) return;

      const updatedPatient = await savePatientPhoto(hospitalNo, photoDataUrl);
      if (updatedPatient) {
        setPatient(updatedPatient);
      }
    };
    reader.readAsDataURL(file);
  }

  // Loading
  if (patient === undefined) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  // Not found — still a standalone page, still only one way out
  if (patient === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center max-w-sm">
          <p className="text-sm font-semibold text-slate-800 mb-1">Patient not found</p>
          <p className="text-xs text-slate-500 mb-4">
            We couldn't find a patient with Hospital No. "{hospitalNo}". It may have been removed.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Patients
          </button>
        </div>
      </div>
    );
  }

  const fullName = [patient.firstName, patient.middleName, patient.lastName, patient.suffix]
    .filter(Boolean)
    .join(" ");

  // Vital Signs card, below — prefer the most recently recorded Triage
  // (Registration -> Triage saves straight to the encounter's
  // `encounter_triage` row) over the EMR document's own vitals fields,
  // which are only ever filled in manually and separately. Falls back to
  // the EMR values so nothing regresses for patients who only ever had
  // vitals entered there.
  const triageEncountersDesc = encounters
    .filter(
      (e) =>
        e.triage &&
        (e.triage.systolic ||
          e.triage.diastolic ||
          e.triage.heartRate ||
          e.triage.respiratoryRate ||
          e.triage.temperature ||
          e.triage.height ||
          e.triage.weight ||
          e.triage.leftVision ||
          e.triage.rightVision)
    )
    .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
  const latestTriage = triageEncountersDesc[0]?.triage || null;

  const vitals = {
    bloodPressure:
      latestTriage?.systolic && latestTriage?.diastolic
        ? `${latestTriage.systolic}/${latestTriage.diastolic}`
        : emr?.bloodPressure || "",
    cardiacRate: latestTriage?.heartRate || emr?.cardiacRate || "",
    respiratoryRate: latestTriage?.respiratoryRate || emr?.respiratoryRate || "",
    temperature: latestTriage?.temperature || emr?.temperature || "",
    leftVision: latestTriage?.leftVision || emr?.leftVision || "",
    rightVision: latestTriage?.rightVision || emr?.rightVision || "",
    height: latestTriage?.height || emr?.height || "",
    weight: latestTriage?.weight || emr?.weight || "",
    bmi: latestTriage?.bmi || emr?.bmi || "",
  };
  const age = calculateAge(patient.dateOfBirth);
  const detailedAge = formatDetailedAge(patient.dateOfBirth);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Slim top bar — this page has no dashboard chrome by design */}
      <div className="shrink-0 bg-teal-700 text-white px-4 md:px-6 py-3 flex items-center justify-between shadow">
        <div>
          <p className="text-sm font-semibold leading-tight">E. ZARATE HOSPITAL</p>
          <p className="text-teal-200 text-[11px]">Patient Profile</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold leading-tight">{fullName || "Unnamed Patient"}</p>
          <p className="text-teal-200 text-[11px]">{patient.hospitalNo}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 p-3 md:p-4">
        <div
          className={`grid grid-cols-1 gap-3 md:gap-4 h-full min-h-0 transition-[grid-template-columns] duration-200 ${
            sidebarCollapsed ? "md:grid-cols-[64px_1fr]" : "md:grid-cols-[260px_1fr]"
          }`}
        >
          {/* Side panel */}
          <div
            className={`bg-teal-800 text-white rounded-xl shadow-sm flex flex-col overflow-hidden transition-all duration-200 ${
              sidebarCollapsed ? "w-16" : ""
            }`}
          >
            <div className="p-4 border-b border-teal-700/60 relative">
              {!sidebarCollapsed && (
                <>
                  <p className="text-sm font-bold uppercase leading-snug pr-6 break-words">
                    {fullName || "Unnamed Patient"}
                  </p>
                  <p className="text-[11px] text-teal-200 mt-1.5">{detailedAge || "—"}</p>
                  <p className="text-[11px] text-teal-200 uppercase">{patient.sex || "—"}</p>
                  <p className="text-[11px] text-teal-200">Hospital No.: {patient.hospitalNo || "—"}</p>
                </>
              )}
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className={`absolute top-4 w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors ${
                  sidebarCollapsed ? "left-1/2 -translate-x-1/2" : "right-3"
                }`}
              >
                <ChevronLeft
                  size={14}
                  className={`transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {!sidebarCollapsed && (
                <p className="text-[10px] font-bold uppercase tracking-wide text-teal-300 px-3 mb-1.5">
                  Menu
                </p>
              )}
              <nav className="space-y-1">
                {visibleNavItems.map(({ id, label, icon: Icon }) => {
                  const active = activeTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveTab(id)}
                      title={label}
                      className={`w-full inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        sidebarCollapsed ? "justify-center" : ""
                      } ${active ? "bg-white text-teal-800 shadow-sm" : "text-teal-100 hover:bg-teal-700/60"}`}
                    >
                      <Icon size={16} />
                      {!sidebarCollapsed && label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-3 border-t border-teal-700/60">
              <button
                type="button"
                onClick={() => navigate(-1)}
                title="Back to Portal"
                className={`w-full inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-teal-100 hover:bg-teal-700/60 transition-colors ${
                  sidebarCollapsed ? "justify-center" : ""
                }`}
              >
                <ArrowLeft size={14} />
                {!sidebarCollapsed && "Back to Portal"}
              </button>
            </div>
          </div>

          {/* Info cards */}
          {activeTab === "profile" ? (
            <div className="flex flex-col gap-3 md:gap-4 overflow-y-auto pr-0.5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Profile</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Detailed patient record and clinical summary</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmr(true)}
                  title="Edit patient record"
                  className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-500 hover:text-teal-700 hover:border-teal-300 flex items-center justify-center transition-colors shrink-0"
                >
                  <Pencil size={14} />
                </button>
              </div>

              {/* Info card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-5">
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="flex flex-col items-center text-center shrink-0">
                    <button
                      type="button"
                      onClick={() => patient.photo && setZoomPhotoOpen(true)}
                      className="relative w-20 h-20 rounded-full overflow-hidden border border-slate-200 shadow-sm bg-slate-100 hover:opacity-80 transition-opacity"
                    >
                      {patient.photo ? (
                        <img src={patient.photo} alt={`${fullName} profile`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <User size={28} />
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Camera size={11} />
                      Capture
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </div>

                  <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="col-span-2 sm:col-span-2">
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">Full Name</p>
                      <p className="text-sm font-semibold text-slate-800">{fullName || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">Age</p>
                      <p className="text-sm font-semibold text-slate-800">{detailedAge || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">Hospital No.</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-800 truncate">{patient.hospitalNo || "—"}</p>
                        <button
                          type="button"
                          onClick={() => handleCopy("hospitalNo", patient.hospitalNo)}
                          title="Copy Hospital No."
                          className="text-slate-300 hover:text-teal-700 shrink-0"
                        >
                          <Copy size={12} />
                        </button>
                        {copiedField === "hospitalNo" && <span className="text-[10px] text-teal-600">Copied</span>}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">Sex</p>
                      <p className="text-sm font-semibold text-pink-600">{(patient.sex || "—").toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Risk Factors</p>
                      <div className="flex items-center gap-1.5">
                        {[
                          {
                            key: "Senior Citizen",
                            icon: Armchair,
                            active: age !== null && age >= 60,
                          },
                          {
                            key: "With History of NCD",
                            icon: HeartPulse,
                            // Any diagnosed non-communicable disease from the Consultation Form's
                            // NCD High-Risk Assessment counts — diabetes, angina/heart attack, or stroke/TIA.
                            active:
                              consultation?.diagnosedDiabetes === "YES" ||
                              consultation?.anginaOrHeartAttack === "YES" ||
                              consultation?.strokeOrTIA === "YES",
                          },
                          {
                            key: "Smoker",
                            icon: Cigarette,
                            // Current or former smoker both count as a smoking-related risk history.
                            active: consultation?.isSmoker === "YES" || consultation?.isSmoker === "USED TO SMOKE",
                          },
                          {
                            key: "Drinker",
                            icon: Beer,
                            active: consultation?.isDrinker === "YES" || consultation?.isDrinker === "USED TO DRINK",
                          },
                          {
                            key: "Illegal Drug User",
                            icon: Syringe,
                            active: consultation?.isDrugUser === "YES",
                          },
                          {
                            key: "Sexually Active",
                            icon: Heart,
                            active: consultation?.isSexuallyActive === "YES",
                          },
                        ].map(({ key, icon: Icon, active }) => (
                          <span
                            key={key}
                            className={active ? "text-red-500" : "text-slate-300"}
                            title={key}
                          >
                            <Icon size={14} />
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">Address</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {[patient.address, patient.barangay, patient.city, patient.region]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {zoomPhotoOpen && patient.photo && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
                  onClick={() => setZoomPhotoOpen(false)}
                >
                  <img
                    src={patient.photo}
                    alt={`${fullName} zoomed profile`}
                    className="max-h-full max-w-full rounded-3xl shadow-2xl border border-white"
                  />
                </div>
              )}

              {/* Full Medical Record */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Full Medical Record</h2>
                  <p className="text-xs text-slate-500">
                    Latest Consultation Date:{" "}
                    <span className="font-semibold text-teal-700">
                      {consultation?.dateOfVisit || emr?.dateOfVisit || "No consultation yet"}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConsultationReadOnly(false);
                    setConsultationReturnTo(null);
                    setConsultationEncounter(null);
                    setShowConsultation(true);
                  }}
                  title="Add consultation"
                  className="w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-sm transition-colors shrink-0"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                {/* Vital Signs */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3 flex items-center gap-1.5">
                    <HeartPulse size={14} className="text-teal-700" />
                    Vital Signs
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-slate-400 uppercase">BP</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {vitals.bloodPressure ? `${vitals.bloodPressure} mmHg` : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-slate-400 uppercase">Heart Rate</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {vitals.cardiacRate ? `${vitals.cardiacRate} bpm` : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-slate-400 uppercase">Resp Rate</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {vitals.respiratoryRate ? `${vitals.respiratoryRate} rpm` : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-slate-400 uppercase">Temp</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {vitals.temperature ? `${vitals.temperature}°C` : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-slate-400 uppercase">Vision</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {vitals.leftVision || vitals.rightVision
                          ? `${vitals.leftVision || "—"} / ${vitals.rightVision || "—"}`
                          : "— / —"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-slate-400 uppercase">Height / Weight / BMI</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {[
                          vitals.height ? `${vitals.height} cm` : null,
                          vitals.weight ? `${vitals.weight} kg` : null,
                          vitals.bmi || null,
                        ]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Medical History tabs — pulled straight from this patient's
                    Consultation Form record (Past/Family Medical History,
                    Surgical History, Immunizations), so filling those in
                    during a consultation shows up here automatically. */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
                  <div className="flex items-center gap-4 border-b border-slate-100 mb-3 overflow-x-auto">
                    {[
                      { id: "past", label: "Past Medical History" },
                      { id: "family", label: "Family Medical History" },
                      { id: "surgical", label: "Surgical History" },
                      { id: "immunizations", label: "Immunizations" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setHistoryTab(tab.id)}
                        className={`pb-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                          historyTab === tab.id
                            ? "text-teal-700 border-teal-700"
                            : "text-slate-400 border-transparent hover:text-slate-600"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const emptyCopy = {
                      past: "past medical history",
                      family: "family medical history",
                      surgical: "surgical history",
                      immunizations: "immunizations",
                    }[historyTab];

                    let listItems = null;
                    let detailsText = null;

                    if (historyTab === "past") {
                      listItems = consultation?.pastMedicalHistory || [];
                    } else if (historyTab === "family") {
                      listItems = consultation?.familyMedicalHistory || [];
                    } else if (historyTab === "surgical") {
                      detailsText = consultation?.surgicalHistoryEnabled
                        ? consultation.surgicalHistoryDetails
                        : "";
                    } else if (historyTab === "immunizations") {
                      detailsText = consultation?.immunizationsEnabled
                        ? consultation.immunizationsDetails
                        : "";
                    }

                    const isEmpty = listItems ? listItems.length === 0 : !detailsText?.trim();

                    if (isEmpty) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-6">
                          <FileQuestion size={28} className="text-slate-300" />
                          <p className="text-xs text-slate-400">No {emptyCopy} recorded.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setConsultationReadOnly(false);
                              setConsultationReturnTo(null);
                              setConsultationEncounter(null);
                              setShowConsultation(true);
                            }}
                            className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                          >
                            {consultation ? "Update in Consultation Form" : "Record in Consultation Form"}
                          </button>
                        </div>
                      );
                    }

                    if (listItems) {
                      return (
                        <ul className="divide-y divide-slate-100">
                          {listItems.map((item) => (
                            <li key={item.id} className="py-2 text-sm text-slate-700">
                              {item.text}
                            </li>
                          ))}
                        </ul>
                      );
                    }

                    return (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap py-2">{detailsText}</p>
                    );
                  })()}
                </div>
              </div>

              {/* Consultation Summary — chief complaint, history of present
                  illness, diagnosis, disposition, allergies, blood type, and
                  medication orders from this patient's most recently saved
                  Consultation Form entry (see `consultation` above). These
                  fields were already being captured and saved — they were
                  just never displayed anywhere on the profile itself, even
                  though a nurse or doctor had already filled them in. */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1.5">
                    <ClipboardCheck size={14} className="text-teal-700" />
                    Consultation Summary
                  </p>
                  {consultation && (
                    <button
                      type="button"
                      onClick={() => {
                        setConsultationReadOnly(false);
                        setConsultationReturnTo(null);
                        setConsultationEncounter(null);
                        setShowConsultation(true);
                      }}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                    >
                      Update in Consultation Form
                    </button>
                  )}
                </div>
                {consultation ? (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] text-slate-400 uppercase tracking-wide">Chief Complaint</dt>
                      <dd className="text-slate-800 font-medium leading-snug whitespace-pre-wrap">
                        {consultation.chiefComplaint || "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] text-slate-400 uppercase tracking-wide">
                        History of Present Illness
                      </dt>
                      <dd className="text-slate-800 font-medium leading-snug whitespace-pre-wrap">
                        {consultation.historyOfPresentIllness || "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] text-slate-400 uppercase tracking-wide">Diagnosis</dt>
                      <dd className="text-slate-800 font-medium leading-snug whitespace-pre-wrap">
                        {formatDiagnosisText(consultation) || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-slate-400 uppercase tracking-wide">Disposition</dt>
                      <dd className="text-slate-800 font-medium leading-snug">
                        {consultation.disposition || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-slate-400 uppercase tracking-wide">Blood Type</dt>
                      <dd className="text-slate-800 font-medium leading-snug">
                        {consultation.bloodType || "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] text-slate-400 uppercase tracking-wide">Allergies</dt>
                      <dd className="text-slate-800 font-medium leading-snug whitespace-pre-wrap">
                        {consultation.allergies || "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] text-slate-400 uppercase tracking-wide">ED Management</dt>
                      <dd className="text-slate-800 font-medium leading-snug whitespace-pre-wrap">
                        {formatEdManagementText(consultation) || "—"}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <div className="flex flex-col items-start gap-2 py-1">
                    <p className="text-xs text-slate-400">No consultation recorded yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setConsultationReadOnly(false);
                        setConsultationReturnTo(null);
                        setConsultationEncounter(null);
                        setShowConsultation(true);
                      }}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                    >
                      Record in Consultation Form
                    </button>
                  </div>
                )}
              </div>

              {/* Additional information */}
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mt-2">
                Additional Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 auto-rows-fr">
              <Card title="Contact" icon={<Phone size={15} />}>
                <Row label="Email" value={patient.email} full />
                <Row label="Landline" value={patient.landline} />
                <Row label="Mobile" value={patient.mobile ? `+63 ${patient.mobile}` : ""} />
              </Card>

              <Card title="Address" icon={<MapPin size={15} />}>
                <Row label="Address" value={patient.address} full />
                <Row label="Barangay" value={patient.barangay} />
                <Row label="City" value={patient.city} />
                <Row label="Province" value={patient.province} />
                <Row label="Region" value={patient.region} full />
              </Card>

              <Card title="Guardian" icon={<ShieldCheck size={15} />}>
                {patient.hasGuardian && patient.guardian ? (
                  <>
                    <Row
                      label="Name"
                      value={[patient.guardian.firstName, patient.guardian.lastName]
                        .filter(Boolean)
                        .join(" ")}
                      full
                    />
                    <Row label="Sex" value={patient.guardian.sex} />
                    <Row label="DOB" value={patient.guardian.dateOfBirth} />
                    <Row label="PIN" value={patient.guardian.pin} />
                    <Row
                      label="Mobile"
                      value={patient.guardian.mobile ? `+63 ${patient.guardian.mobile}` : ""}
                    />
                  </>
                ) : (
                  <p className="col-span-2 text-xs text-slate-400">No guardian on file.</p>
                )}
              </Card>

              <Card title="Family Background" icon={<Users size={15} />}>
                <Row label="Name of Mother" value={patient.motherName} />
                <Row label="Contact No." value={patient.motherContact} />
                <Row label="Name of Father" value={patient.fatherName} />
                <Row label="Contact No." value={patient.fatherContact} />
                <Row label="Nationality" value={patient.nationality} />
                <Row label="Religion" value={patient.religion} />
                <Row label="Marital Status" value={patient.maritalStatus} />
              </Card>

              <Card title="Emergency Contact" icon={<Siren size={15} />}>
                <Row label="Name" value={patient.emergencyName} />
                <Row label="Relationship to Patient" value={patient.emergencyRelationship} />
                <Row label="Address" value={patient.emergencyAddress} full />
                <Row label="Phone (Home)" value={patient.emergencyPhoneHome} />
                <Row label="Phone (Cell)" value={patient.emergencyPhoneCell} />
              </Card>

              {emr && (
                <>
                  <Card title="Health Coverage" icon={<IdCard size={15} />}>
                    <Row label="PhilHealth Member" value={emr.philhealthMember} />
                    <Row label="PhilHealth PIN" value={emr.philhealthPin} />
                    <Row label="HMO" value={emr.hmo} />
                    <Row label="HMO Type / Cert." value={[emr.hmoType, emr.certNo].filter(Boolean).join(" / ")} />
                  </Card>

                  <Card title="Emergency Contact" icon={<Siren size={15} />}>
                    <Row label="Name" value={emr.emergencyName} />
                    <Row label="Relationship" value={emr.emergencyRelationship} />
                    <Row
                      label="Phone"
                      value={[emr.emergencyPhoneHome, emr.emergencyPhoneCell].filter(Boolean).join(" / ")}
                      full
                    />
                  </Card>
                </>
              )}
              </div>
            </div>
          ) : activeTab === "patient-files" ? (
            <div className="h-full min-h-0 overflow-y-auto pr-0.5">
              <PatientFilesPanel
                emr={emr}
                discharge={discharge}
                konsultaReferral={konsultaReferral}
                medicalCertificate={medicalCertificate}
                consultationHistory={consultationHistoryList}
                downloadingPdf={downloadingPdf}
                downloadingDischargePdf={downloadingDischargePdf}
                downloadingKonsultaPdf={downloadingKonsultaPdf}
                downloadingMedCertPdf={downloadingMedCertPdf}
                downloadingCF4Pdf={downloadingCF4Pdf}
                onEditEmr={() => setShowEmr(true)}
                onEditDischarge={() => setShowDischarge(true)}
                onDownloadEmr={handleDownloadEmr}
                onDownloadDischarge={handleDownloadDischarge}
                onOpenKonsultaReferral={() => setShowKonsultaReferral(true)}
                onDownloadKonsultaReferral={handleDownloadKonsultaReferral}
                onOpenMedicalCertificate={() => setShowMedicalCertificate(true)}
                onDownloadMedicalCertificate={handleDownloadMedicalCertificate}
                onViewConsultationEntry={handleViewConsultationEntryPdf}
                onViewCF4={handleViewCF4}
                onDownloadCF4={handleDownloadCF4}
              />
            </div>
          ) : activeTab === "registration" ? (
            <div className="h-full min-h-0 overflow-y-auto pr-0.5">
              <PatientEncountersPanel
                hospitalNo={hospitalNo}
                onOpenPatientFiles={() => setActiveTab("patient-files")}
              />
            </div>
          ) : activeTab === "lab-orders" ? (
            <div className="h-full min-h-0 overflow-y-auto pr-0.5">
              <PatientLabOrdersPanel
                orders={labOrders}
                onCreate={() => setShowCreateLabOrder(true)}
                onOpenOrder={(orderId) => navigate(`/lab-orders/${orderId}`)}
                canCreate={!["med_tech", "xray_tech"].includes(user?.role)}
              />
            </div>
          ) : activeTab === "medicine-prescription" ? (
            <div className="h-full min-h-0 overflow-y-auto pr-0.5">
              <PatientMedicinePrescriptionsPanel
                records={medicinePrescriptions}
                onCreate={() =>
                  navigate("/medicine-prescriptions/create", { state: { presetHospitalNo: hospitalNo } })
                }
                onOpenRecord={(record) => setViewPrescribedRecord(record)}
              />
            </div>
          ) : (
            <div className="h-full min-h-0 overflow-y-auto pr-0.5">
              {(() => {
                const navItem = PROFILE_NAV_ITEMS.find((item) => item.id === activeTab);
                const Icon = navItem?.icon ?? Folder;
                return <ComingSoonPanel label={navItem?.label ?? ""} icon={<Icon size={28} />} />;
              })()}
            </div>
          )}
        </div>
      </div>

      {/* EMR editor — same PatientRegistration form, pre-filled, save overwrites */}
      {showEmr && (
        <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto">
          <PatientRegistration
            embedded
            mode="edit"
            initialValues={emr || patientToEmrSeed(patient, sharedClinical)}
            onSave={handleSaveEmr}
            onClose={() => setShowEmr(false)}
          />
        </div>
      )}

      {/* Consultation Form (Encounter) — Patient Information through Consent,
          plus history-taking and NCD risk assessment. Each save appends a
          new history entry (see saveConsultationEntry) rather than
          overwriting — that's what populates the Medical Record / ER
          Consultation / OPD Consultation folders in Patient Files. */}
      {showConsultation && !consultationDataReady && (
        <div className="fixed inset-0 z-50 bg-slate-50/90 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 size={18} className="animate-spin" />
            Loading consultation…
          </div>
        </div>
      )}
      {showConsultation && consultationDataReady && (
        <ConsultationForm
          initialValues={
            resolveConsultationInitialValues(
              consultationHistoryList,
              consultationEncounter?.id ?? null,
              user?.role
            ) || patientToConsultationSeed(patient, sharedClinical)
          }
          readOnly={consultationReadOnly}
          onSave={handleSaveConsultation}
          onClose={() => {
            setShowConsultation(false);
            if (consultationReturnTo) {
              navigate(consultationReturnTo);
            }
          }}
          patient={patient}
          encounter={consultationEncounter}
        />
      )}

      {/* Create Lab Order — same modal the main Lab Orders page uses, but
          with the patient locked in since we're already on their profile. */}
      {showCreateLabOrder && (
        <CreateLabOrderModal
          presetHospitalNo={hospitalNo}
          onClose={() => setShowCreateLabOrder(false)}
          onCreated={() => {
            setShowCreateLabOrder(false);
            refreshLabOrders(hospitalNo);
          }}
        />
      )}

      {/* View Medicine Prescription — same modal the main Medicine Prescriptions
          page uses, opened from a row in this patient's history. */}
      {viewPrescribedRecord && (
        <ViewMedicinePrescriptionModal
          record={viewPrescribedRecord}
          onClose={() => setViewPrescribedRecord(null)}
        />
      )}

      {/* ER Discharge Instructions editor — pre-filled from patient + EMR +
          the most recent saved Consultation (chief complaint, diagnosis,
          disposition, medication orders, diagnostics ordered, and Rx —
          see buildDischargeSeed above), save overwrites */}
      {showDischarge && (
        <ErDischargeForm
          initialValues={discharge || buildDischargeSeed(patient, emr, consultation, encounters, sharedClinical)}
          onSave={handleSaveDischarge}
          onClose={() => setShowDischarge(false)}
        />
      )}

      {/* Emergency Care Benefit Referral to Konsulta/Yakap — Save Changes here; PDF download lives in the folder panel */}
      {showKonsultaReferral && (() => {
        const { doctorEntry, nurseEntry, encounter } = resolveKonsultaSources();
        return (
          <KonsultaReferralModal
            patient={patient}
            emr={emr}
            doctorEntry={doctorEntry}
            nurseEntry={nurseEntry}
            encounter={encounter}
            shared={sharedClinical}
            initialValues={konsultaReferral || undefined}
            onSave={handleSaveKonsultaReferral}
            onClose={() => setShowKonsultaReferral(false)}
          />
        );
      })()}

      {/* Medical Certificate editor — pre-filled from patient + EMR, save overwrites */}
      {showMedicalCertificate && (
        <MedicalCertificateForm
          initialValues={
            medicalCertificate || buildMedicalCertificateSeed(patient, emr, consultation, encounters, sharedClinical)
          }
          onSave={handleSaveMedicalCertificate}
          onClose={() => setShowMedicalCertificate(false)}
        />
      )}

      {/* Camera modal for live photo capture */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-slate-900 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden">
            <div className="bg-teal-700 text-white px-4 py-3 flex items-center justify-between">
              <p className="font-semibold">Take Photo</p>
              <button
                type="button"
                onClick={stopCamera}
                className="text-white hover:opacity-80 transition-opacity"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => {
                  setIsCameraReady(true);
                  if (videoRef.current) {
                    videoRef.current.play().catch((err) => console.error("Error playing video:", err));
                  }
                }}
                width={400}
                height={400}
                style={{
                  display: "block",
                  backgroundColor: "#000",
                  borderRadius: "0.5rem",
                  width: "100%",
                  height: "auto",
                }}
              />

              <div className="mt-4 flex gap-2 w-full">
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!isCameraReady}
                  className="flex-1 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera size={16} />
                  {isCameraReady ? "Capture Photo" : "Preparing…"}
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for capturing photos */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}