import { useEffect, useMemo, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  Activity,
  FlaskConical,
  History,
  ShieldAlert,
  HeartPulse,
  Cigarette,
  Droplet,
  User,
  FileText,
  Paperclip,
  Loader2,
  ClipboardCheck,
  Stethoscope,
  Pill,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import AddressFields from "../../components/common/AddressFields";
import Icd10Autocomplete from "../../components/common/Icd10Autocomplete";
import RvsAutocomplete from "../../components/common/RvsAutocomplete";
import DiagnosticTestChecklist from "../../components/common/DiagnosticTestChecklist";
import SearchableSelect from "../../components/common/SearchableSelect";
import { useAuth } from "../../context/AuthContext";
import { loadEncounters, formatDateCreated, loadDoctorsDirectory } from "../../utils/encounters";
import { loadLabOrders, getLabOrderFileUrl } from "../../utils/labOrders";
import { MEDICINE_CATALOG } from "../../utils/medicinePrescriptions";
import { formatAge } from "../../utils/age";
import ConsultationPatientInfoPDF from "./ConsultationPatientInfoPDF";
import ConsultationHistoryPDF from "./ConsultationHistoryPDF";

// ─────────────────────────────────────────────────────────────────────────
// Shared visual primitives (mirrors PatientRegistration's styling so the
// two forms feel like one continuous system even though they're now split
// across files).
// ─────────────────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div className="bg-teal-700 text-white px-4 py-3 rounded-md mb-4 shadow-sm flex items-center justify-between">
      <h2 className="text-sm font-semibold tracking-wide uppercase">{title}</h2>
    </div>
  );
}

function Field({ label, required, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white";

const textareaClass =
  "border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white resize-none";

let uidCounter = 0;
function nextId() {
  uidCounter += 1;
  return `row-${Date.now()}-${uidCounter}`;
}

// PhilHealth CF4 (Claim Form 4), item 3 — Pertinent Signs and Symptoms on
// Admission. Transcribed from the hospital's paper CF4; double-check
// against a physical copy before relying on this list for PhilHealth
// claim compliance, since a couple of the checkbox labels were faint on
// the scan this was taken from.
export const SIGNS_AND_SYMPTOMS_OPTIONS = [
  "Altered mental sensorium",
  "Abdominal cramp/pain",
  "Anorexia",
  "Bleeding gums",
  "Body weakness",
  "Blurring of vision",
  "Chest pain/discomfort",
  "Constipation",
  "Cough",
  "Delirium",
  "Diarrhea",
  "Dizziness",
  "Dysphagia",
  "Dyspnea",
  "Dysuria",
  "Epistaxis",
  "Fever",
  "Frequency of urination",
  "Headache",
  "Hematemesis",
  "Hematuria",
  "Hemoptysis",
  "Irritability",
  "Jaundice",
  "Lower extremity edema",
  "Myalgia",
  "Orthopnea",
  "Pain",
  "Palpitations",
  "Seizures",
  "Skin rashes",
  "Skin bleeding/black tarry/bloody stool",
  "Sore throat",
  "Sweating",
  "Urgency",
  "Vomiting",
  "Weight loss",
  "Others",
];

// PhilHealth CF4, item 5 — Physical Examination on Admission: General
// Survey and HEENT. Rendered as their own checklists (not part of
// PE_SYSTEMS below) since General Survey's "Altered sensorium" pairs with
// a dedicated specify field rather than the generic "Others" catch-all
// every other system uses. "In respiratory distress" / "Weak-looking"
// confirmed against the hospital's physical Medical Abstract form.
export const GENERAL_SURVEY_OPTIONS = [
  "Awake and alert",
  "Altered sensorium",
  "In respiratory distress",
  "Weak-looking",
];

export const HEENT_OPTIONS = [
  "Essentially normal",
  "Icteric sclerae",
  "Abnormal pupillary reaction",
  "Pale conjunctivae",
  "Cervical lymphadenopathy",
  "Sunken eyeballs",
  "Dry mucous membrane",
  "Sunken fontanelle",
];

// PhilHealth CF4, item 5 — Physical Examination on Admission (pertinent
// findings per system). Same caveat as SIGNS_AND_SYMPTOMS_OPTIONS above —
// this is a best-effort transcription from a photographed form; please
// proofread against the physical CF4 before treating it as authoritative.
export const PE_SYSTEMS = [
  {
    key: "peChestLungs",
    othersKey: "peChestLungsOthers",
    label: "Chest / Lungs",
    options: [
      "Essentially normal",
      "Asymmetrical chest expansion",
      "Decreased breath sounds",
      "Wheezes",
      "Rales/crackles/rhonchi",
      "Intercostal/subclavicular retraction",
      "Lump/s over Breast(s)",
    ],
  },
  {
    key: "peCvs",
    othersKey: "peCvsOthers",
    label: "CVS",
    options: [
      "Essentially normal",
      "Displaced apex beat",
      "Muffled heart sounds",
      "Murmur",
      "Irregular rhythm",
      "Heaves and/or thrills",
      "Pericardial bulge",
    ],
  },
  {
    key: "peAbdomen",
    othersKey: "peAbdomenOthers",
    label: "Abdomen",
    options: [
      "Essentially normal",
      "Abdominal tenderness",
      "Abdominal rigidity",
      "Hyperactive bowel sounds",
      "Palpable mass(es)",
      "Tympanitic/dull abdomen",
      "Uterine contraction",
    ],
  },
  {
    key: "peGuOb",
    othersKey: "peGuObOthers",
    label: "GU / OB",
    options: [
      "Essentially normal",
      "Blood stained in exam finger",
      "Cervical dilatation",
      "Presence of abnormal discharge",
    ],
  },
  {
    key: "peSkinExtremities",
    othersKey: "peSkinExtremitiesOthers",
    label: "Skin / Extremities",
    options: [
      "Essentially normal",
      "Clubbing",
      "Cold clammy skin",
      "Cyanosis/mottled skin",
      "Decreased mobility",
      "Edema/swelling",
      "Pale nailbeds",
      "Poor skin turgor",
      "Rashes/petechiae",
      "Weak pulses",
    ],
  },
  {
    key: "peNeuroExam",
    othersKey: "peNeuroExamOthers",
    label: "Neuro Exam",
    options: [
      "Essentially normal",
      "Abnormal gait",
      "Abnormal position sense",
      "Abnormal/decreased sensation",
      "Abnormal reflex(es)",
      "Poor muscle tone/strength",
      "Poor coordination",
      "Poor/altered memory",
    ],
  },
];

// Simple multi-select checkbox grid — used for the CF4 Signs & Symptoms
// and Physical Examination checklists below. `selected` is the plain
// array of checked option labels; toggling just adds/removes from it,
// same shape diagnosticsSelected already uses for the Diagnostics
// checklist elsewhere in this form.
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

// A "Required" accordion section — Past Medical History, Family Medical
// History, Social History. Always reachable, just collapsible.
function RequiredSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-blue-50 hover:bg-blue-100/70 px-4 py-3 transition-colors"
      >
        <span className="text-sm font-bold text-blue-900 tracking-wide">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 border border-blue-200 rounded-full px-2.5 py-0.5">
            Required
          </span>
          <ChevronDown size={16} className={`text-blue-700 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && <div className="p-4 space-y-4 bg-white">{children}</div>}
    </div>
  );
}

// A toggle-driven section — Surgical History, Immunizations, Review of
// Systems, Blood Type. Off by default; flipping the switch reveals the
// fields below it.
function ToggleSection({ title, enabled, onToggle, children }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
          enabled ? "bg-blue-50" : "bg-slate-50"
        }`}
      >
        <span className={`flex items-center gap-3 text-sm font-bold tracking-wide ${enabled ? "text-blue-900" : "text-slate-400"}`}>
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              enabled ? "bg-blue-700" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-4.5 ml-0.5" : "translate-x-0.5"
              }`}
            />
          </span>
          {title}
        </span>
        <ChevronDown size={16} className={`transition-transform ${enabled ? "rotate-180 text-blue-700" : "text-slate-400"}`} />
      </button>
      {enabled && <div className="p-4 space-y-4 bg-white">{children}</div>}
    </div>
  );
}

// Dynamic condition list — used for both Past Medical History and Family
// Medical History (image 1). Empty state matches the reference design.
function ConditionListEditor({ items, onChange, addLabel, emptyTitle, emptySubtitle, placeholder, conditionsLabel }) {
  function addRow() {
    onChange([...items, { id: nextId(), text: "" }]);
  }
  function updateRow(id, text) {
    onChange(items.map((row) => (row.id === id ? { ...row, text } : row)));
  }
  function removeRow(id) {
    onChange(items.filter((row) => row.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          {conditionsLabel} <span className="text-slate-400 font-normal normal-case">(Skip this if patient has no history)</span>
        </p>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
        >
          {addLabel}
          <Plus size={14} className="rounded-full border border-teal-700" />
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 px-4">
            <p className="text-sm font-bold text-slate-700">{emptyTitle}</p>
            <p className="text-xs text-slate-400 mt-0.5">{emptySubtitle}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {items.map((row) => (
              <div key={row.id} className="flex items-center gap-2 px-3 py-2">
                <input
                  value={row.text}
                  onChange={(e) => updateRow(row.id, e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="text-slate-400 hover:text-red-600 shrink-0"
                  aria-label="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// A single Question / Answer row for the NCD High-Risk Assessment tables.
function YesNoRow({ question, value, onChange, disabled = false, includeDontKnow = false, subdued = false }) {
  const options = includeDontKnow ? ["YES", "NO", "DON'T KNOW"] : ["YES", "NO"];
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 py-2.5 ${subdued ? "opacity-40" : ""}`}>
      <p className={`flex-1 text-sm ${disabled ? "text-slate-400" : "text-slate-700"}`}>{question}</p>
      <div className="flex items-center gap-4 shrink-0">
        {options.map((opt) => (
          <label
            key={opt}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
              disabled ? "text-slate-300 cursor-not-allowed" : "text-slate-600 cursor-pointer"
            }`}
          >
            <input
              type="radio"
              disabled={disabled}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="accent-blue-700"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function QuestionTable({ title, children }) {
  return (
    <div>
      {title && <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">{title}</p>}
      <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 bg-white">
        <div className="hidden sm:flex px-3 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
          <span className="flex-1">Question</span>
          <span className="shrink-0">Answer</span>
        </div>
        <div className="divide-y divide-slate-200">{children}</div>
      </div>
    </div>
  );
}

const RISK_LEVEL_OPTIONS = ["Less than 10%", "10% to 20%", "20% to 30%", "30% to 40%", "40% and above"];

// ─────────────────────────────────────────────────────────────────────────
// Role-based section access.
//
// ER/OPD nurses handle patient intake — identity, contact, and history —
// plus getting the consent form signed. Doctors handle the clinical
// assessment and plan. Any other role (admin, med_tech, xray_tech, etc.)
// gets the whole consultation as view-only for now; extend NURSE_SECTIONS/
// DOCTOR_SECTIONS (or add a new role bucket) if that needs to change.
// ─────────────────────────────────────────────────────────────────────────
export const NURSE_ROLES = ["er_nurse", "opd_nurse"];

const NURSE_SECTIONS = new Set([
  "patientInformation",
  "personalDetails",
  "healthCoverage",
  "emergencyContact",
  "allergies",
  "pastMedicalHistory",
  "familyHistory",
  "socialHistory",
  // Adjacent intake fields not explicitly called out but gathered as part
  // of the same nurse history-taking workflow.
  "sexuallyActive",
  "obGyneHistory",
  "surgicalHistory",
  "immunizations",
  "reviewOfSystems",
  "bloodType",
  "activeDiagnoses",
  "activeMedication",
  // NCD High-Risk Assessment — moved here from DOCTOR_SECTIONS so nurses
  // capture it as part of intake/history-taking instead of doctors
  // capturing it during the clinical assessment.
  "ncdAssessment",
  // Last page: Date + printed name/signature (and the consent note that
  // goes with them).
  "consentSignoff",
]);

const DOCTOR_SECTIONS = new Set([
  "diagnosis",
  "surgicalProcedure",
  "disposition",
  "medicinePrescription",
  "diagnostics",
  "subjectiveComplaints",
  "signsAndSymptoms",
  "physicalExamination",
  "certification",
  // Course in the Ward (Doctor's Order/Action) — moved here from the ER
  // Nurse's section set. It's the attending physician's running log of
  // orders/actions taken during the patient's stay, so it belongs on the
  // doctor's half of the form, not the nurse's.
  "courseInWard",
  // Medicine Given at ER — sits right after Course in the Ward, same
  // doctor-authored section (see erMedicineItems below).
  "erMedicine",
]);

export const initialConsultationForm = {
  // Identity — pre-filled from the patient record
  hospitalRecordNo: "",
  lastName: "",
  firstName: "",
  middleName: "",
  age: "",
  gender: "",
  dateOfBirth: "",

  // Personal Details
  residentialAddress: "",
  region: "",
  regionCode: "",
  province: "",
  provinceCode: "",
  city: "",
  cityCode: "",
  barangay: "",
  zipCode: "",
  phoneHome: "",
  phoneWork: "",
  phoneCell: "",
  email: "",
  occupation: "",
  employerName: "",
  employerContact: "",
  workAddress: "",
  nationality: "",
  religion: "",
  maritalStatus: "",
  spouseName: "",
  spouseContact: "",
  motherName: "",
  motherContact: "",
  fatherName: "",
  fatherContact: "",

  // Health Coverage
  philhealthMember: "",
  philhealthPin: "",
  hmo: "",
  hmoType: "",
  certNo: "",

  // Emergency Contact
  emergencyName: "",
  emergencyRelationship: "",
  emergencyAddress: "",
  emergencyPhoneHome: "",
  emergencyPhoneWork: "",
  emergencyPhoneCell: "",

  // Allergies
  allergies: "",

  // Active Diagnoses / Active Medication
  activeDiagnoses: "",
  activeMedication1: "",
  activeMedication2: "",

  // Diagnosis — the doctor's clinical diagnosis for this visit (distinct
  // from Active Diagnoses, which is the patient's existing/chronic list
  // taken during nurse intake). icdDiagnoses is the structured ICD-10
  // companion to the free-text field below — reports count by code, not
  // by free-text string.
  diagnosis: "",
  icdDiagnoses: [],

  // PhilHealth CF4 (Claim Form 4) — Admitting/Discharge Diagnosis and case
  // rate codes are distinct from "Diagnosis" above (that's this visit's
  // clinical diagnosis in the doctor's own words; these are the specific
  // fields CF4 asks for on ER/admitted cases for PhilHealth claims).
  admittingDiagnosis: "",
  dischargeDiagnosis: "",
  caseRateCode1: "",
  caseRateCode2: "",

  // PhilHealth CF4 — admission/discharge date & time, and whether this
  // patient was referred in from another health care institution.
  dateAdmitted: "",
  timeAdmitted: "",
  dateDischarged: "",
  timeDischarged: "",
  referredFromOtherHCI: "",
  referringHCIName: "",

  // Medication — legacy field from consultations recorded before Surgical
  // Procedure took its place in the doctor's section (see
  // surgicalProcedureRvsCode/Notes below). No longer has an input in this
  // form; kept only so older saved consultations that have a value here
  // still display correctly (Consultation Record PDF, Patient Profile).
  medicationOrders: "",

  // Disposition
  disposition: "",
  dispositionNotes: "",

  // PhilHealth CF4 — Outcome of Treatment. Distinct from Disposition
  // above: Disposition is the administrative next step (discharged,
  // admitted, transferred...); this is CF4's specific clinical-outcome
  // field (Improved / HAMA / Absconded / Transferred / Expired), with a
  // reason required for the last three.
  outcomeOfTreatment: "",
  outcomeOfTreatmentReason: "",

  // Diagnostics ordered for this visit — same selectable checklist as
  // Lab Orders (utils/labOrders.js DIAGNOSTIC_GROUPS), plus free-text notes
  // for anything not on that list.
  diagnosticsSelected: [],
  diagnosticsTestDetails: {},
  diagnosticsNotes: "",

  // Medicine Prescription issued during this visit — structured line items
  // (medicine, quantity, Sig/instructions), same shape as the standalone
  // Medicine Prescriptions module's Rx pad, kept with the consultation
  // record itself so the doctor doesn't have to re-enter it there too.
  prescriptionItems: [],

  // Consent
  consentNotes: "",
  consentDate: "",
  consentSignature: "",

  // Subjective
  chiefComplaint: "",
  historyOfPresentIllness: "",

  // E. Zarate Hospital OPD Consultation Record (paper form) — the fields
  // below exist ONLY to back that paper form's replica on page 1 of
  // DoctorConsultationPDF.jsx. objectiveFindings is the doctor's narrative
  // "Pertinent P.E. / Objective Findings" box (distinct from the
  // structured PhilHealth CF4 Physical Examination checklist below, which
  // has no free-narrative equivalent on the paper form). visitTime/
  // nurseOnDuty/residentOnDuty/classification are this visit's admin
  // metadata; o2Sat is recorded here (not on Triage) since on the paper
  // form it's taken alongside the rest of this visit's vitals by whoever
  // is on duty at consult time. referredTo/followUpExamination are the
  // paper form's post-Disposition fields.
  objectiveFindings: "",
  visitTime: "",
  nurseOnDuty: "",
  residentOnDuty: "",
  classification: "",
  o2Sat: "",
  referredTo: "",
  followUpExamination: "",


  // PhilHealth CF4 — Pertinent Signs and Symptoms on Admission (checklist,
  // item 3 on the form). "Pain" and "Others" are also selectable options
  // in the list itself; these two fields hold the accompanying free text
  // ("specify site" / "specify") when they're checked.
  admissionSigns: [],
  admissionSignsPainSite: "",
  admissionSignsOthers: "",

  // PhilHealth CF4 — Physical Examination on Admission (pertinent findings
  // per system, item 5 on the form). General Survey and HEENT are
  // checklists too, same shape as the other six systems below —
  // "Altered sensorium" pairs with a free-text specify field the same way
  // "Pain"/"Others" do in the admission signs/symptoms checklist above.
  peGeneralSurvey: [],
  peGeneralSurveyAlteredSensoriumSpecify: "",
  peHeent: [],
  peHeentOthers: "",
  peChestLungs: [],
  peChestLungsOthers: "",
  peCvs: [],
  peCvsOthers: "",
  peAbdomen: [],
  peAbdomenOthers: "",
  peGuOb: [],
  peGuObOthers: "",
  peSkinExtremities: [],
  peSkinExtremitiesOthers: "",
  peNeuroExam: [],
  peNeuroExamOthers: "",

  // PhilHealth CF4 — Certification of Attending Health Care Professional.
  attendingCertifiedDate: "",
  attendingPrintedName: "",
  attendingLicenseNumber: "",
  attendingSignature: "",

  // PhilHealth CF4 — Course in the Ward (Doctor's Order/Action, a running
  // dated log), captured by the Doctor role (see DOCTOR_SECTIONS below).
  // ED Management used to be its own separate free-text box; the two are
  // the same concept, so they're merged into this one running log now —
  // there's no separate edManagement field anymore. Every other
  // form/PDF that used to read ED Management (Konsulta/Yakap Referral's
  // "Management at ED", the CF4 PDF, etc.) reads this same
  // courseInWardEntries data instead — see formatCourseInWardText /
  // formatManagementAtEdText in utils/consultations.js.
  courseInWardEntries: [],

  // PhilHealth CF4 — Medicine Given at ER, right after Course in the
  // Ward. Same "Generic Name / Quantity-Dosage-Route / Total Cost" table
  // CF4's own "V. Drugs / Medicines" section asks for — distinct from
  // prescriptionItems above (the take-home Rx pad the Medicine
  // Prescriptions module also reads from). This is what actually feeds
  // CF4's Drugs/Medicines table now; prescriptionItems no longer does.
  erMedicineItems: [],

  // Surgical Procedure/RVS Code — now captured by the Doctor role, in the
  // spot the Medication field used to occupy (see DOCTOR_SECTIONS below).
  surgicalProcedureRvsCode: "",
  surgicalProcedureNotes: "",

  // Past / Family Medical History — dynamic condition lists
  pastMedicalHistory: [],
  familyMedicalHistory: [],

  // Social History — Smoking
  isSmoker: "",
  quitSmokingDate: "",
  cigaretteType: "",
  cigarettesPerDay: "",
  yearsSmoking: "",
  cigarettePackYear: "",
  // Social History — Alcohol
  isDrinker: "",
  quitDrinkingDate: "",
  alcoholType: "",
  numberOfBottles: "",
  // Social History — Drugs
  isDrugUser: "",
  drugRemarks: "",

  // Sexually Active
  isSexuallyActive: "",
  sexualActivityRemarks: "",

  // OB-GYNE History (female patients only)
  noOfPregnancies: "",
  noOfDeliveries: "",
  typeOfDelivery: "",
  fullTerm: "",
  premature: "",
  noOfAbortions: "",
  ageOfFirstMenstruation: "",
  lastMenstrualPeriod: "",
  menstrualDuration: "",
  menstrualInterval: "",
  padsPerDay: "",
  ageOfFirstSexualIntercourse: "",

  // Toggle sections
  surgicalHistoryEnabled: false,
  surgicalHistoryDetails: "",
  immunizationsEnabled: false,
  immunizationsDetails: "",
  reviewOfSystemsEnabled: false,
  reviewOfSystemsDetails: "",
  bloodTypeEnabled: false,
  bloodType: "",
  bloodTypeRemarks: "",

  // NCD High-Risk Assessment
  ncdAssessmentEnabled: true,
  eatsProcessedFastFoodsWeekly: "",
  eats3VegetablesDaily: "",
  eats2to3FruitsDaily: "",
  physicalActivity: "",
  diagnosedDiabetes: "",
  diabetesWithMedication: "",
  polyphagia: "",
  polydipsia: "",
  polyuria: "",
  raisedBloodGlucose: "",
  raisedBloodLipids: "",
  urineKetones: "",
  urineProtein: "",
  chestPainPressure: "",
  painCenterChestOrArm: "",
  painWalkingUphill: "",
  slowsDownWithPain: "",
  painGoesAwayRestOrTablet: "",
  painGoesAwayUnder10Min: "",
  severeChestPain30Min: "",
  anginaOrHeartAttack: "",
  strokeSymptoms: "",
  strokeOrTIA: "",
  riskLevel: "",
};

// ─────────────────────────────────────────────────────────────────────────
// Doctor's reference panel — everything the nurse captured during intake
// and triage, laid out beside the doctor's own (much shorter) form so
// nothing they need is hidden behind a section they can't open. Only
// rendered for the doctor role — canEdit() hides NURSE_SECTIONS from
// doctors (and DOCTOR_SECTIONS from nurses, see
// DoctorConsultationReferencePanel below) the same way, so admin is the
// only role that ever sees every section inline in the main form itself.
// ─────────────────────────────────────────────────────────────────────────
function RefCard({ title, icon: Icon, defaultOpen = false, children, empty }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <Icon size={15} className="text-blue-700 shrink-0" />
          <span className="text-sm font-semibold text-slate-800">{title}</span>
        </span>
        {open ? (
          <ChevronUp size={15} className="text-slate-400 shrink-0" />
        ) : (
          <ChevronDown size={15} className="text-slate-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-slate-700">
          {empty ? <p className="text-xs text-slate-400 italic">{empty}</p> : children}
        </div>
      )}
    </div>
  );
}

function RefRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="font-medium text-slate-800">{value || "—"}</p>
    </div>
  );
}

function ConsultationReferencePanel({ patient, encounter, form }) {
  const { user } = useAuth();
  const [downloadingDoc, setDownloadingDoc] = useState(null); // "patientInfo" | "history" | null
  const [registrations, setRegistrations] = useState([]);
  const [labResultFiles, setLabResultFiles] = useState([]);

  useEffect(() => {
    let active = true;
    if (encounter?.hospitalNo) {
      loadEncounters().then((all) => {
        if (!active) return;
        setRegistrations(
          all
            .filter((e) => e.hospitalNo === encounter.hospitalNo)
            .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
        );
      });
    } else {
      setRegistrations([]);
    }
    return () => {
      active = false;
    };
  }, [encounter?.hospitalNo]);

  // Every uploaded result file across this patient's lab orders — files
  // are shared per ORDER now (not per individual diagnostic test), so
  // this flattens order.files directly and tags each one with every
  // diagnostic that order covers.
  useEffect(() => {
    let active = true;
    if (patient.hospitalNo) {
      loadLabOrders().then((all) => {
        if (!active) return;
        setLabResultFiles(
          all
            .filter((order) => order.hospitalNo === patient.hospitalNo)
            .flatMap((order) =>
              (order.files || []).map((f) => ({
                ...f,
                diagnostics: (order.diagnostics || []).join(", "),
                orderId: order.id,
              }))
            )
        );
      });
    } else {
      setLabResultFiles([]);
    }
    return () => {
      active = false;
    };
  }, [patient.hospitalNo]);

  async function viewPdf(docElement, filename, key) {
    setDownloadingDoc(key);
    try {
      const blob = await pdf(docElement).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Revoke a little later so the new tab has time to load it.
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } finally {
      setDownloadingDoc(null);
    }
  }

  const triage = encounter?.triage;
  const fullName = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className="flex flex-col gap-3 lg:sticky lg:top-8">
      {/* Patient summary */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          {patient.photo ? (
            <img
              src={patient.photo}
              alt={fullName}
              className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-700 text-white text-sm font-bold shrink-0">
              {(patient.firstName?.[0] || "") + (patient.lastName?.[0] || "") || <User size={16} />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800 truncate">{fullName || "—"}</p>
            <p className="text-xs text-slate-500">
              {patient.hospitalNo || "—"} · {formatAge(patient.dateOfBirth)} ·{" "}
              {(patient.sex || "—").toUpperCase()}
            </p>
          </div>
          {form.bloodTypeEnabled && form.bloodType && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-2.5 py-1">
              <Droplet size={11} />
              {form.bloodType}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={downloadingDoc === "patientInfo"}
          onClick={() =>
            viewPdf(
              <ConsultationPatientInfoPDF patient={patient} form={form} generatedBy={user?.username} />,
              `${fullName || "Patient"} - Patient Information.pdf`,
              "patientInfo"
            )
          }
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal-700 text-teal-700 text-xs font-semibold px-3 py-2 hover:bg-teal-50 transition-colors disabled:opacity-50"
        >
          {downloadingDoc === "patientInfo" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          View Patient Information PDF
        </button>
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 px-1 -mb-1">
        Recorded by nursing staff
      </p>

      {/* Biometrics — from Triage */}
      <RefCard
        title="Biometrics"
        icon={Activity}
        defaultOpen
        empty={!triage ? "No triage recorded yet for this registration." : null}
      >
        {triage && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RefRow
              label="Blood Pressure"
              value={triage.systolic && triage.diastolic ? `${triage.systolic}/${triage.diastolic} mmHg` : null}
            />
            <RefRow label="Heart Rate" value={triage.heartRate ? `${triage.heartRate} bpm` : null} />
            <RefRow
              label="Respiratory Rate"
              value={triage.respiratoryRate ? `${triage.respiratoryRate} rpm` : null}
            />
            <RefRow label="Temperature" value={triage.temperature ? `${triage.temperature} °C` : null} />
            <RefRow
              label="Height / Weight"
              value={triage.height || triage.weight ? `${triage.height || "—"} cm / ${triage.weight || "—"} kg` : null}
            />
            <RefRow label="BMI" value={triage.bmi} />
            <RefRow
              label="Vision (L / R)"
              value={
                triage.leftVision || triage.rightVision
                  ? `${triage.leftVision || "—"} / ${triage.rightVision || "—"}`
                  : null
              }
            />
          </div>
        )}
      </RefCard>

      {/* Lab Results — Laboratory Imaging captured during Triage, plus any
          result files a med tech has uploaded against this patient's lab
          orders. */}
      <RefCard
        title="Lab Results"
        icon={FlaskConical}
        defaultOpen
        empty={!triage?.labImagingEnabled && labResultFiles.length === 0 ? "No lab results on file yet." : null}
      >
        {triage?.labImagingEnabled && (
          <div className="mb-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Fasting Blood Sugar (FBS) — from Triage
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RefRow label="Glucose (mg/dL)" value={triage.fbsGlucoseMgDl} />
              <RefRow label="Glucose (mmol/L)" value={triage.fbsGlucoseMmolL} />
              <RefRow
                label="Date Performed"
                value={triage.fbsDatePerformed ? formatDateCreated(new Date(triage.fbsDatePerformed).toISOString()) : null}
              />
            </div>
          </div>
        )}
        {labResultFiles.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Uploaded Results (from Med Tech)
            </p>
            <div className="flex flex-col divide-y divide-slate-100">
              {labResultFiles.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={async () => {
                    const url = await getLabOrderFileUrl(f.id);
                    if (url) window.open(url, "_blank");
                  }}
                  className="flex items-center justify-between gap-2 py-2 text-left hover:bg-slate-50 -mx-1 px-1 rounded transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Paperclip size={12} className="text-slate-400 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-800 truncate">{f.name}</span>
                      <span className="block text-[11px] text-slate-400">
                        {f.diagnostics} · {f.orderId}
                      </span>
                    </span>
                  </span>
                  <span className="text-[11px] text-teal-700 font-semibold shrink-0">View</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </RefCard>

      {/* Registration History */}
      <RefCard
        title="Registration History"
        icon={History}
        empty={registrations.length <= 1 ? "No prior registrations on file." : null}
      >
        <div className="flex flex-col divide-y divide-slate-100">
          {registrations
            .filter((r) => r.id !== encounter?.id)
            .map((r) => (
              <div key={r.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{r.consultationType || "—"}</p>
                  <p className="text-xs text-slate-400">{formatDateCreated(r.dateCreated)}</p>
                </div>
                <span className="text-[11px] font-semibold uppercase text-slate-500 shrink-0">
                  {r.status}
                </span>
              </div>
            ))}
        </div>
      </RefCard>

      {/* Allergies */}
      <RefCard title="Allergies" icon={ShieldAlert} defaultOpen empty={!form.allergies ? "No known allergies recorded." : null}>
        <p className="whitespace-pre-wrap">{form.allergies}</p>
      </RefCard>

      {/* Medical History — Past/Family Medical History, Surgical History,
          Social History, and OB-GYNE History (if applicable) all combined
          into a single PDF, rather than five separate cards to click
          through. Blood Type lives on the Patient Information PDF above,
          not here. */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-1">
          <HeartPulse size={15} className="text-blue-700 shrink-0" />
          Medical History
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Past &amp; family medical history, surgical history, social history
          {form.gender === "Female" ? ", and OB-GYNE history" : ""} — combined in one document.
        </p>
        <button
          type="button"
          disabled={downloadingDoc === "history"}
          onClick={() =>
            viewPdf(
              <ConsultationHistoryPDF patient={patient} form={form} generatedBy={user?.username} />,
              `${fullName || "Patient"} - Medical History.pdf`,
              "history"
            )
          }
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal-700 text-teal-700 text-xs font-semibold px-3 py-2 hover:bg-teal-50 transition-colors disabled:opacity-50"
        >
          {downloadingDoc === "history" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          View Medical History PDF
        </button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Nurse's reference panel — the doctor's clinical assessment and plan
// (Diagnosis, Disposition, Diagnostics Ordered, Medicine Prescription),
// laid out the same way ConsultationReferencePanel above shows the nurse's
// intake data to the doctor. Only rendered for nurse roles; admin already
// sees the full form (every section, doctor's included).
//
// Reads straight off the same shared `form` state the rest of the modal
// uses — that's already seeded from the patient's latest saved
// consultation entry (see initialValues in PatientProfile.jsx), so once a
// doctor has saved at least one consultation for this patient, their
// fields show up here automatically, with no separate fetch needed.
// ─────────────────────────────────────────────────────────────────────────
function DoctorConsultationReferencePanel({ patient, form }) {
  const fullName = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
  const hasDoctorRecord =
    form.diagnosis ||
    form.surgicalProcedureRvsCode ||
    form.surgicalProcedureNotes ||
    form.disposition ||
    (form.icdDiagnoses || []).length > 0 ||
    (form.diagnosticsSelected || []).length > 0 ||
    (form.prescriptionItems || []).length > 0;

  return (
    <aside className="flex flex-col gap-3 lg:sticky lg:top-8">
      {/* Patient summary — same header as the doctor's panel, so both
          sides of this form feel like one continuous system. */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          {patient.photo ? (
            <img
              src={patient.photo}
              alt={fullName}
              className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-700 text-white text-sm font-bold shrink-0">
              {(patient.firstName?.[0] || "") + (patient.lastName?.[0] || "") || <User size={16} />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800 truncate">{fullName || "—"}</p>
            <p className="text-xs text-slate-500">
              {patient.hospitalNo || "—"} · {formatAge(patient.dateOfBirth)} ·{" "}
              {(patient.sex || "—").toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 px-1 -mb-1">
        Recorded by the physician
      </p>

      {!hasDoctorRecord && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <p className="text-xs text-slate-400 italic">
            No physician consultation on file for this patient yet — this fills in automatically once a
            doctor saves their part of the Consultation Form.
          </p>
        </div>
      )}

      {/* Diagnosis */}
      <RefCard
        title="Diagnosis"
        icon={ClipboardCheck}
        defaultOpen
        empty={!form.diagnosis && (form.icdDiagnoses || []).length === 0 ? "No diagnosis recorded yet." : null}
      >
        {(form.icdDiagnoses || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {form.icdDiagnoses.map((d) => (
              <span
                key={d.code}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold px-2 py-1"
              >
                {d.code} — {d.name}
              </span>
            ))}
          </div>
        )}
        {form.diagnosis && <p className="whitespace-pre-wrap">{form.diagnosis}</p>}
      </RefCard>

      {/* Surgical Procedure/RVS Code (was labeled "ED Management") */}
      <RefCard
        title="Surgical Procedure/RVS Code"
        icon={Pill}
        empty={!form.surgicalProcedureRvsCode && !form.surgicalProcedureNotes ? "No surgical procedure recorded yet." : null}
      >
        {(form.surgicalProcedureRvsCode || form.surgicalProcedureNotes) && (
          <p className="whitespace-pre-wrap">
            {form.surgicalProcedureRvsCode}
            {form.surgicalProcedureRvsCode && form.surgicalProcedureNotes ? " — " : ""}
            {form.surgicalProcedureNotes}
          </p>
        )}
      </RefCard>

      {/* Disposition */}
      <RefCard
        title="Disposition"
        icon={Stethoscope}
        defaultOpen
        empty={!form.disposition ? "No disposition recorded yet." : null}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <RefRow label="Disposition" value={form.disposition} />
          <RefRow label="Recommendations" value={form.dispositionNotes} />
        </div>
      </RefCard>

      {/* Diagnostics / Tests Ordered — same checklist as Lab Orders, so a
          nurse can see at a glance what the doctor wants done without
          leaving this form. */}
      <RefCard
        title="Diagnostics Ordered"
        icon={FlaskConical}
        empty={(form.diagnosticsSelected || []).length === 0 && !form.diagnosticsNotes ? "No diagnostics ordered yet." : null}
      >
        {(form.diagnosticsSelected || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.diagnosticsSelected.map((name) => (
              <span
                key={name}
                className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold px-2 py-1"
              >
                {name}
                {form.diagnosticsTestDetails?.[name] ? ` — ${form.diagnosticsTestDetails[name]}` : ""}
              </span>
            ))}
          </div>
        )}
        {form.diagnosticsNotes && (
          <p className="text-xs text-slate-500 whitespace-pre-wrap">{form.diagnosticsNotes}</p>
        )}
      </RefCard>

      {/* Medicine Prescription */}
      <RefCard
        title="Medicine Prescription"
        icon={Pill}
        empty={(form.prescriptionItems || []).length === 0 ? "No medicine prescribed yet." : null}
      >
        <div className="flex flex-col divide-y divide-slate-100">
          {(form.prescriptionItems || []).map((item) => (
            <div key={item.id} className="py-2">
              <p className="font-medium text-slate-800">
                {item.medicineName || "—"}
                {item.milligram ? ` (${item.milligram})` : ""}
                {item.quantity ? ` × ${item.quantity}` : ""}
              </p>
              {item.instructions && <p className="text-xs text-slate-400">{item.instructions}</p>}
            </div>
          ))}
        </div>
      </RefCard>
    </aside>
  );
}

export default function ConsultationForm({
  initialValues,
  readOnly = false,
  onSave,
  onClose,
  patient = {},
  encounter = null,
}) {
  const { user } = useAuth();
  const isNurse = NURSE_ROLES.includes(user?.role);
  const isDoctor = user?.role === "doctor";

  // Whether the CURRENT user's role is allowed to edit (and therefore see)
  // a given section. Sections a role can't edit are hidden entirely rather
  // than shown grayed-out — see canEdit() usages below. Admin keeps full
  // access to every section, matching their "all" access everywhere else
  // in the app; otherwise they'd be left looking at a blank form once
  // view-only sections stop rendering at all.
  function canEdit(section) {
    if (user?.role === "admin") return true;
    if (isNurse) return NURSE_SECTIONS.has(section);
    if (isDoctor) return DOCTOR_SECTIONS.has(section);
    return false;
  }

  const [form, setForm] = useState(() => ({
    ...initialConsultationForm,
    ...(initialValues || {}),
  }));

  // Attending Physician (Certification section) — sourced from actual
  // doctor accounts (licenseNumber lives on the users table, entered once
  // in Account Settings) rather than the plain-name doctors_directory every
  // other "assign a doctor" dropdown uses, specifically so picking a name
  // here can auto-fill "License Number / PTR" below instead of it being
  // retyped by hand every time. Uppercased here, not just on selection, so
  // the option list and whatever's already saved in
  // form.attendingPrintedName always match — see the SearchableSelect
  // field below.
  const [doctors, setDoctors] = useState([]);
  useEffect(() => {
    let active = true;
    loadDoctorsDirectory().then((entries) => {
      if (active) {
        setDoctors(
          entries.map((d) => ({ name: d.name.toUpperCase(), licenseNumber: d.licenseNumber || "" }))
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // name (uppercased, matching `doctors` above) -> licenseNumber, so
  // picking a doctor can look its license number up in one step.
  const licenseByDoctorName = useMemo(() => {
    const map = new Map();
    doctors.forEach((d) => map.set(d.name, d.licenseNumber));
    return map;
  }, [doctors]);

  // Auto-fills License Number / PTR from the selected doctor's own account.
  // Only overwrites when a license number is actually on file for them —
  // if it's blank (e.g. never set in Account Settings), whatever's already
  // typed in the field is left alone rather than being cleared out.
  function handleAttendingPrintedNameChange(name) {
    set("attendingPrintedName", name);
    const licenseNumber = licenseByDoctorName.get(name);
    if (licenseNumber) {
      set("attendingLicenseNumber", licenseNumber);
    }
  }

  function handle(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleAddressChange(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function toggleDiagnosticTest(name) {
    setForm((f) => ({
      ...f,
      diagnosticsSelected: f.diagnosticsSelected.includes(name)
        ? f.diagnosticsSelected.filter((d) => d !== name)
        : [...f.diagnosticsSelected, name],
    }));
  }

  // Generic version of the toggle above, for any field that's a plain
  // array of selected strings — the CF4 Signs & Symptoms checklist and
  // each of the six Physical Examination system checklists all use this
  // instead of a one-off toggler each.
  function toggleListValue(field, value) {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value],
    }));
  }

  function setDiagnosticTestDetail(name, value) {
    setForm((f) => ({
      ...f,
      diagnosticsTestDetails: { ...f.diagnosticsTestDetails, [name]: value },
    }));
  }

  function addPrescriptionItem() {
    uidCounter += 1;
    set("prescriptionItems", [
      ...form.prescriptionItems,
      { id: `rx-${uidCounter}`, medicineName: "", quantity: 1, instructions: "", milligram: "" },
    ]);
  }

  function updatePrescriptionItem(id, patch) {
    set(
      "prescriptionItems",
      form.prescriptionItems.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function removePrescriptionItem(id) {
    set(
      "prescriptionItems",
      form.prescriptionItems.filter((item) => item.id !== id)
    );
  }

  // Surgical Procedure/RVS Code — stacks RVS codes/descriptions instead of
  // replacing whatever's already there, so picking 5 codes in a row builds
  // up all 5 rather than each pick overwriting the last one. Uses the
  // functional setForm updater (not the `set` helper, which closes over
  // the `form` from render time) so a doctor clicking through several
  // results in quick succession can't lose one to a stale-closure race.
  // surgicalProcedureRvsCode grows as a comma-separated list of codes;
  // surgicalProcedureNotes grows as one sentence per code, each ending in
  // its own period — "put a dot after the description of every RVS code".
  // Both fields stay plain, fully editable text afterward, so a doctor can
  // freely rewrite/trim/reorder them, or type in a code/procedure by hand
  // that isn't on the RVS list at all.
  function addSurgicalProcedureRvsCode(entry) {
    setForm((f) => {
      const prevCode = f.surgicalProcedureRvsCode.trim();
      const prevNotes = f.surgicalProcedureNotes.trim();
      const nextName = entry.name.trim();
      return {
        ...f,
        surgicalProcedureRvsCode: prevCode ? `${prevCode}, ${entry.code}` : entry.code,
        surgicalProcedureNotes: prevNotes
          ? `${prevNotes} ${nextName}.`
          : `${nextName}.`,
      };
    });
  }

  // PhilHealth CF4 — Course in the Ward: a running, dated log of the
  // Doctor's Order/Action (Doctor role — see DOCTOR_SECTIONS).
  // Same add/update/remove shape as the prescription items above.
  function addCourseInWardEntry() {
    set("courseInWardEntries", [...form.courseInWardEntries, { id: nextId(), date: "", orderAction: "" }]);
  }

  function updateCourseInWardEntry(id, patch) {
    set(
      "courseInWardEntries",
      form.courseInWardEntries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    );
  }

  function removeCourseInWardEntry(id) {
    set(
      "courseInWardEntries",
      form.courseInWardEntries.filter((entry) => entry.id !== id)
    );
  }

  // Medicine Given at ER — sits right after Course in the Ward. Same
  // add/update/remove shape as prescriptionItems, just with CF4's own
  // "Drugs / Medicines" columns (Generic Name / Quantity-Dosage-Route /
  // Total Cost) instead of the take-home Rx pad's fields.
  function addErMedicineItem() {
    set("erMedicineItems", [
      ...form.erMedicineItems,
      { id: nextId(), genericName: "", quantityDosageRoute: "", totalCost: "" },
    ]);
  }

  function updateErMedicineItem(id, patch) {
    set(
      "erMedicineItems",
      form.erMedicineItems.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function removeErMedicineItem(id) {
    set(
      "erMedicineItems",
      form.erMedicineItems.filter((item) => item.id !== id)
    );
  }

  // Cigarette Pack Year auto-calculates from cigarettes/day and years
  // smoking — same "auto-computed but still just a normal field" pattern
  // as BMI in PatientRegistration.
  useEffect(() => {
    const perDay = parseFloat(form.cigarettesPerDay);
    const years = parseFloat(form.yearsSmoking);
    if (!perDay || !years) return;
    const packYear = ((perDay / 20) * years).toFixed(1).replace(/\.0$/, "");
    setForm((prev) => (prev.cigarettePackYear === packYear ? prev : { ...prev, cigarettePackYear: packYear }));
  }, [form.cigarettesPerDay, form.yearsSmoking]);

  // "saving" while the request is in flight, "saved" for a few seconds
  // right after — Save no longer closes the form (see handleSubmit below),
  // this is just a quiet confirmation that the click actually went
  // through, since nothing else on screen changes.
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved"

  async function handleSubmit(e) {
    e.preventDefault();
    if (readOnly) return;
    // Staff now reaches Registration too, but they were never
    // meant to author a consultation — and the database's
    // consultation_author_role enum only knows er_nurse/opd_nurse/doctor/
    // admin, so letting this through for any other role would fail as a
    // confusing DB error instead of just... not happening.
    if (!isNurse && !isDoctor && user?.role !== "admin") return;
    setSaveStatus("saving");
    try {
      await onSave?.(form);
      // Deliberately NOT calling onClose() here anymore. Saving used to
      // immediately close (and therefore unmount) this form — the next
      // time it was opened, React re-mounted it from scratch and re-ran
      // its `useState(() => ({ ...initialConsultationForm, ...initialValues }))`
      // initializer, so it always looked "reset" even when the save itself
      // had worked. `form` is left completely untouched here — whatever
      // was just typed stays exactly as-is on screen. The person can keep
      // editing, or close manually with the Cancel/Close button whenever
      // they're actually done.
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 3000);
    } catch {
      // onSave (handleSaveConsultation) already alerts the user on
      // failure — just clear the "Saving…" state so the button isn't
      // stuck disabled.
      setSaveStatus("idle");
    }
  }

  const chestPainYes = form.chestPainPressure === "YES";

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto">
      <div className="bg-teal-700 text-white px-6 py-4 flex items-center justify-between gap-4 shadow">
        <div>
          <h1 className="text-lg font-semibold">E. ZARATE HOSPITAL</h1>
          <p className="text-teal-200 text-xs">Consultation Form</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
        >
          <X size={16} />
          Close
        </button>
      </div>

      <div
        className={`mx-auto my-8 px-4 items-start ${
          isDoctor || isNurse
            ? "max-w-7xl grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6"
            : "max-w-5xl"
        }`}
      >
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl shadow-sm px-4 py-8 space-y-10">
        {readOnly && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            This registration was cancelled — the consultation is now view-only and can no longer be edited.
          </div>
        )}
        <fieldset disabled={readOnly} className="contents">
        {/* ── PATIENT INFORMATION ── */}
        {canEdit("patientInformation") && (
        <div>
          <SectionHeader title="Patient Information" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Last Name">
              <input name="lastName" value={form.lastName} onChange={handle} className={inputClass} />
            </Field>
            <Field label="First Name">
              <input name="firstName" value={form.firstName} onChange={handle} className={inputClass} />
            </Field>
            <Field label="Middle Name">
              <input name="middleName" value={form.middleName} onChange={handle} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Field label="Age">
              <input name="age" value={form.age} onChange={handle} type="number" min="0" className={inputClass} />
            </Field>
            <Field label="Gender">
              <select name="gender" value={form.gender} onChange={handle} className={inputClass}>
                <option value="">Select</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </Field>
            <Field label="Date of Birth (MM/DD/YYYY)">
              <input name="dateOfBirth" value={form.dateOfBirth} onChange={handle} type="date" className={inputClass} />
            </Field>
          </div>
        </div>
        )}

        {/* ── PERSONAL DETAILS ── */}
        {canEdit("personalDetails") && (
        <div>
          <SectionHeader title="Personal Details" />
          <div className="space-y-4">
            <Field label="Residential Address">
              <input name="residentialAddress" value={form.residentialAddress} onChange={handle} className={inputClass} />
            </Field>
            <AddressFields value={form} onChange={handleAddressChange} Field={Field} inputClass={inputClass} required={false} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Phone No. (Home)">
                <input name="phoneHome" value={form.phoneHome} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Phone No. (Work)">
                <input name="phoneWork" value={form.phoneWork} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Cell No.">
                <input name="phoneCell" value={form.phoneCell} onChange={handle} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Email Address">
                <input name="email" value={form.email} onChange={handle} type="email" className={inputClass} />
              </Field>
              <Field label="Occupation">
                <input name="occupation" value={form.occupation} onChange={handle} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Employer's Name">
                <input name="employerName" value={form.employerName} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Employer's Contact Details">
                <input name="employerContact" value={form.employerContact} onChange={handle} className={inputClass} />
              </Field>
            </div>
            <Field label="Work Address">
              <input name="workAddress" value={form.workAddress} onChange={handle} className={inputClass} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Nationality">
                <input name="nationality" value={form.nationality} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Religion">
                <input name="religion" value={form.religion} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Marital Status">
                <select name="maritalStatus" value={form.maritalStatus} onChange={handle} className={inputClass}>
                  <option value="">Select</option>
                  <option>Single</option>
                  <option>Married</option>
                  <option>Separated</option>
                  <option>Widowed</option>
                  <option>Other</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Name of Spouse (if applicable)">
                <input name="spouseName" value={form.spouseName} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Spouse Contact No.">
                <input name="spouseContact" value={form.spouseContact} onChange={handle} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Name of Mother">
                <input name="motherName" value={form.motherName} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Mother's Contact No.">
                <input name="motherContact" value={form.motherContact} onChange={handle} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Name of Father">
                <input name="fatherName" value={form.fatherName} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Father's Contact No.">
                <input name="fatherContact" value={form.fatherContact} onChange={handle} className={inputClass} />
              </Field>
            </div>
          </div>
        </div>
        )}

        {/* ── HEALTH COVERAGE ── */}
        {canEdit("healthCoverage") && (
        <div>
          <SectionHeader title="Health Coverage" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="PhilHealth Member">
              <select name="philhealthMember" value={form.philhealthMember} onChange={handle} className={inputClass}>
                <option value="">Select</option>
                <option value="NN">NN</option>
                <option value="NH">NH</option>
              </select>
            </Field>
            <Field label="PhilHealth ID No. (PIN)">
              <input name="philhealthPin" value={form.philhealthPin} onChange={handle} className={inputClass} />
            </Field>
            <Field label="HMO">
              <input name="hmo" value={form.hmo} onChange={handle} className={inputClass} />
            </Field>
          </div>
          <div className={`grid grid-cols-1 ${isNurse ? "" : "md:grid-cols-2"} gap-4 mt-4`}>
            {/* Type of HMO Coverage is a doctor/admin-facing detail — not
                part of the nurse intake workflow, so it's left out here
                for the nurse role while staying available to admin. */}
            {!isNurse && (
              <Field label="Type of HMO Coverage">
                <input name="hmoType" value={form.hmoType} onChange={handle} className={inputClass} />
              </Field>
            )}
            <Field label="Cert. No.">
              <input name="certNo" value={form.certNo} onChange={handle} className={inputClass} />
            </Field>
          </div>
        </div>
        )}

        {/* ── EMERGENCY CONTACT ── */}
        {canEdit("emergencyContact") && (
        <div>
          <SectionHeader title="Emergency Contact Person" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Name">
              <input name="emergencyName" value={form.emergencyName} onChange={handle} className={inputClass} />
            </Field>
            <Field label="Relationship to Patient">
              <input name="emergencyRelationship" value={form.emergencyRelationship} onChange={handle} className={inputClass} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Address">
              <input name="emergencyAddress" value={form.emergencyAddress} onChange={handle} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Field label="Phone No. (Home)">
              <input name="emergencyPhoneHome" value={form.emergencyPhoneHome} onChange={handle} className={inputClass} />
            </Field>
            <Field label="Phone No. (Work)">
              <input name="emergencyPhoneWork" value={form.emergencyPhoneWork} onChange={handle} className={inputClass} />
            </Field>
            <Field label="Cell No.">
              <input name="emergencyPhoneCell" value={form.emergencyPhoneCell} onChange={handle} className={inputClass} />
            </Field>
          </div>
        </div>
        )}

        {/* ── ALLERGIES ── */}
        {canEdit("allergies") && (
        <div>
          <SectionHeader title="Allergies" />
          <Field label="List all known allergies">
            <textarea name="allergies" value={form.allergies} onChange={handle} rows={4} className={textareaClass} />
          </Field>
        </div>
        )}

        {/* ── SUBJECTIVE COMPLAINTS ── */}
        {canEdit("subjectiveComplaints") && (
        <div>
          <div className="flex items-start justify-between border border-slate-200 rounded-t-lg px-4 py-3 bg-white">
            <div>
              <p className="text-sm font-bold text-slate-800">Subjective Complaints</p>
              <p className="text-xs text-slate-400">Patient reported symptoms and history</p>
            </div>
            <MessageSquarePlus size={20} className="text-blue-600" />
          </div>
          <div className="border border-t-0 border-slate-200 rounded-b-lg p-4">
            <Field label="Chief Complaint" required>
              <textarea
                name="chiefComplaint"
                value={form.chiefComplaint}
                onChange={handle}
                rows={3}
                className={textareaClass}
              />
            </Field>
            <div className="mt-4">
              <Field label="History of Present Illness">
                <textarea
                  name="historyOfPresentIllness"
                  value={form.historyOfPresentIllness}
                  onChange={handle}
                  rows={4}
                  placeholder="Onset, duration, character, associated symptoms..."
                  className={textareaClass}
                />
              </Field>
            </div>
          </div>
        </div>
        )}

        {/* ── VISIT DETAILS (doctor) ──
            Backs the "Visit Details" box on the E. Zarate Hospital OPD
            Consultation Record paper form. O2 Sat and Pertinent P.E. /
            Objective Findings were removed from this section per request —
            Vital Signs otherwise come from Triage, shown read-only above.
            Gated by the same "physicalExamination" permission as the CF4
            PE checklist below it, since both describe the same physical
            exam. */}
        {canEdit("physicalExamination") && (
        <div>
          <div className="flex items-start justify-between border border-slate-200 rounded-t-lg px-4 py-3 bg-white">
            <div>
              <p className="text-sm font-bold text-slate-800">Visit Details</p>
              <p className="text-xs text-slate-400">Printed on the OPD Consultation Record paper form</p>
            </div>
            <Stethoscope size={20} className="text-blue-600" />
          </div>
          <div className="border border-t-0 border-slate-200 rounded-b-lg p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Time of Visit">
                <input type="time" name="visitTime" value={form.visitTime} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Nurse-on-Duty">
                <input name="nurseOnDuty" value={form.nurseOnDuty} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Resident-on-Duty">
                <input name="residentOnDuty" value={form.residentOnDuty} onChange={handle} className={inputClass} />
              </Field>
              <Field label="Classification">
                <input
                  name="classification"
                  value={form.classification}
                  onChange={handle}
                  placeholder="e.g. New, Follow-up"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>
        )}

        {/* ── PHILHEALTH CF4: SIGNS AND SYMPTOMS ON ADMISSION (doctor) ── */}
        {canEdit("signsAndSymptoms") && (
        <div>
          <SectionHeader title="Pertinent Signs and Symptoms on Admission" />
          <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-4">
            <CheckboxGroup
              options={SIGNS_AND_SYMPTOMS_OPTIONS}
              selected={form.admissionSigns}
              onToggle={(opt) => toggleListValue("admissionSigns", opt)}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <Field label="Pain — specify site">
                <input
                  name="admissionSignsPainSite"
                  value={form.admissionSignsPainSite}
                  onChange={handle}
                  disabled={!form.admissionSigns.includes("Pain")}
                  className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                />
              </Field>
              <Field label="Others — specify">
                <input
                  name="admissionSignsOthers"
                  value={form.admissionSignsOthers}
                  onChange={handle}
                  disabled={!form.admissionSigns.includes("Others")}
                  className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                />
              </Field>
            </div>
          </div>
        </div>
        )}

        {/* ── PHILHEALTH CF4: PHYSICAL EXAMINATION ON ADMISSION (doctor) ── */}
        {canEdit("physicalExamination") && (
        <div>
          <SectionHeader title="Pertinent Physical Examination on Admission" />
          <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">General Survey</p>
              <CheckboxGroup
                options={GENERAL_SURVEY_OPTIONS}
                selected={form.peGeneralSurvey}
                onToggle={(opt) => toggleListValue("peGeneralSurvey", opt)}
                columns="sm:grid-cols-2"
              />
              <Field label="Altered sensorium — specify" className="mt-3">
                <input
                  name="peGeneralSurveyAlteredSensoriumSpecify"
                  value={form.peGeneralSurveyAlteredSensoriumSpecify}
                  onChange={handle}
                  disabled={!form.peGeneralSurvey.includes("Altered sensorium")}
                  className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                />
              </Field>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">HEENT</p>
              <CheckboxGroup
                options={HEENT_OPTIONS}
                selected={form.peHeent}
                onToggle={(opt) => toggleListValue("peHeent", opt)}
              />
              <Field label="Others" className="mt-3">
                <input
                  name="peHeentOthers"
                  value={form.peHeentOthers}
                  onChange={handle}
                  className={inputClass}
                />
              </Field>
            </div>

            {PE_SYSTEMS.map((system) => (
              <div key={system.key} className="pt-4 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">{system.label}</p>
                <CheckboxGroup
                  options={system.options}
                  selected={form[system.key]}
                  onToggle={(opt) => toggleListValue(system.key, opt)}
                />
                <Field label="Others" className="mt-3">
                  <input
                    value={form[system.othersKey]}
                    onChange={(e) => set(system.othersKey, e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* ── PAST MEDICAL HISTORY ── */}
        {canEdit("pastMedicalHistory") && (
        <RequiredSection title="PAST MEDICAL HISTORY">
          <ConditionListEditor
            items={form.pastMedicalHistory}
            onChange={(items) => set("pastMedicalHistory", items)}
            addLabel="ADD PAST MEDICAL HX"
            emptyTitle="No Medical History"
            emptySubtitle="Patient has no recorded Medical History."
            placeholder="e.g. Hypertension, diagnosed 2019"
            conditionsLabel="Conditions"
          />
        </RequiredSection>
        )}

        {/* ── FAMILY MEDICAL HISTORY ── */}
        {canEdit("familyHistory") && (
        <RequiredSection title="FAMILY MEDICAL HISTORY">
          <ConditionListEditor
            items={form.familyMedicalHistory}
            onChange={(items) => set("familyMedicalHistory", items)}
            addLabel="ADD FAMILY MEDICAL HX"
            emptyTitle="No Family Medical History"
            emptySubtitle="Patient has no recorded Family Medical History."
            placeholder="e.g. Mother — Diabetes"
            conditionsLabel="Family Conditions"
          />
        </RequiredSection>
        )}

        {/* ── SOCIAL HISTORY ── */}
        {canEdit("socialHistory") && (
        <RequiredSection title="SOCIAL HISTORY">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Smoking</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <Field label="Is the patient a smoker?" required>
                <select name="isSmoker" value={form.isSmoker} onChange={handle} className={inputClass}>
                  <option value="">Select</option>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                  <option value="USED TO SMOKE">USED TO SMOKE</option>
                </select>
              </Field>
              <Field label="When did the patient quit smoking?">
                <input
                  name="quitSmokingDate"
                  value={form.quitSmokingDate}
                  onChange={handle}
                  type="date"
                  disabled={form.isSmoker !== "USED TO SMOKE"}
                  className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`}
                />
              </Field>
              {(form.isSmoker === "YES" || form.isSmoker === "USED TO SMOKE") && (
                <>
                  <Field label="Type of cigarette" required>
                    <select name="cigaretteType" value={form.cigaretteType} onChange={handle} className={inputClass}>
                      <option value="">Select</option>
                      <option>CIGARETTE</option>
                      <option>VAPE</option>
                      <option>CIGAR</option>
                      <option>OTHER</option>
                    </select>
                  </Field>
                  <Field label="No. of cigarettes per day" required>
                    <input
                      name="cigarettesPerDay"
                      value={form.cigarettesPerDay}
                      onChange={handle}
                      type="number"
                      min="0"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Years of smoking" required>
                    <input name="yearsSmoking" value={form.yearsSmoking} onChange={handle} type="number" min="0" className={inputClass} />
                  </Field>
                  <Field label="Cigarette Pack Year (autofill)" required>
                    <input name="cigarettePackYear" value={form.cigarettePackYear} readOnly className={`${inputClass} bg-slate-100`} />
                  </Field>
                </>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Alcohol</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <Field label="Is the patient a drinker?" required>
                <select name="isDrinker" value={form.isDrinker} onChange={handle} className={inputClass}>
                  <option value="">Select</option>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                  <option value="USED TO DRINK">USED TO DRINK</option>
                </select>
              </Field>
              <Field label="When did the patient quit drinking?">
                <input
                  name="quitDrinkingDate"
                  value={form.quitDrinkingDate}
                  onChange={handle}
                  type="date"
                  disabled={form.isDrinker !== "USED TO DRINK"}
                  className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`}
                />
              </Field>
              {(form.isDrinker === "YES" || form.isDrinker === "USED TO DRINK") && (
                <>
                  <Field label="Type of alcohol" required>
                    <select name="alcoholType" value={form.alcoholType} onChange={handle} className={inputClass}>
                      <option value="">Select</option>
                      <option>BEER</option>
                      <option>WINE</option>
                      <option>HARD LIQUOR</option>
                      <option>OTHER</option>
                    </select>
                  </Field>
                  <Field label="Number of bottles" required>
                    <input name="numberOfBottles" value={form.numberOfBottles} onChange={handle} type="number" min="0" className={inputClass} />
                  </Field>
                </>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Drugs</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <Field label="Is the patient an illegal drug user?" required>
                <select name="isDrugUser" value={form.isDrugUser} onChange={handle} className={inputClass}>
                  <option value="">Select</option>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </Field>
              <Field label="Remarks">
                <input name="drugRemarks" value={form.drugRemarks} onChange={handle} className={inputClass} />
              </Field>
            </div>
          </div>
        </RequiredSection>
        )}

        {/* ── SEXUALLY ACTIVE ── */}
        {canEdit("sexuallyActive") && (
        <div>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Sexually Active</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <Field label="Is the patient sexually active?" required>
              <select name="isSexuallyActive" value={form.isSexuallyActive} onChange={handle} className={inputClass}>
                <option value="">Select</option>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </Field>
            <Field label="Remarks">
              <input name="sexualActivityRemarks" value={form.sexualActivityRemarks} onChange={handle} className={inputClass} />
            </Field>
          </div>
        </div>
        )}

        {/* ── OB-GYNE HISTORY (female patients only) ── */}
        {canEdit("obGyneHistory") && form.gender === "Female" && (
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              OB-GYNE History
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-blue-900 mb-2">Pregnancy History</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <Field label="No. of Pregnancies">
                    <input
                      name="noOfPregnancies"
                      value={form.noOfPregnancies}
                      onChange={handle}
                      type="number"
                      min="0"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="No. of Deliveries">
                    <input
                      name="noOfDeliveries"
                      value={form.noOfDeliveries}
                      onChange={handle}
                      type="number"
                      min="0"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Type of Delivery">
                    <select name="typeOfDelivery" value={form.typeOfDelivery} onChange={handle} className={inputClass}>
                      <option value="">Select</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="CESAREAN SECTION">CESAREAN SECTION</option>
                      <option value="ASSISTED/FORCEPS">ASSISTED/FORCEPS</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </Field>
                  <Field label="Full Term">
                    <input
                      name="fullTerm"
                      value={form.fullTerm}
                      onChange={handle}
                      type="number"
                      min="0"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Premature">
                    <input
                      name="premature"
                      value={form.premature}
                      onChange={handle}
                      type="number"
                      min="0"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="No. of Abortions">
                    <input
                      name="noOfAbortions"
                      value={form.noOfAbortions}
                      onChange={handle}
                      type="number"
                      min="0"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-blue-900 mb-2">Menstrual History</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <Field label="Age of First Menstruation">
                    <input
                      name="ageOfFirstMenstruation"
                      value={form.ageOfFirstMenstruation}
                      onChange={handle}
                      type="number"
                      min="0"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Last Menstrual Period">
                    <input
                      name="lastMenstrualPeriod"
                      value={form.lastMenstrualPeriod}
                      onChange={handle}
                      type="date"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Duration">
                    <input
                      name="menstrualDuration"
                      value={form.menstrualDuration}
                      onChange={handle}
                      placeholder="e.g. 5 days"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Interval/Cycle">
                    <input
                      name="menstrualInterval"
                      value={form.menstrualInterval}
                      onChange={handle}
                      placeholder="e.g. 28 days"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Pads per Day">
                    <input
                      name="padsPerDay"
                      value={form.padsPerDay}
                      onChange={handle}
                      type="number"
                      min="0"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Age of First Sexual Intercourse">
                    <input
                      name="ageOfFirstSexualIntercourse"
                      value={form.ageOfFirstSexualIntercourse}
                      onChange={handle}
                      type="number"
                      min="0"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SURGICAL HISTORY / IMMUNIZATIONS / REVIEW OF SYSTEMS / BLOOD TYPE ── */}
        <div className="space-y-3">
          {canEdit("surgicalHistory") && (
          <ToggleSection
            title="SURGICAL HISTORY"
            enabled={form.surgicalHistoryEnabled}
            onToggle={() => set("surgicalHistoryEnabled", !form.surgicalHistoryEnabled)}
          >
            <Field label="Surgical History Details">
              <textarea
                name="surgicalHistoryDetails"
                value={form.surgicalHistoryDetails}
                onChange={handle}
                rows={3}
                placeholder="Procedure, year, hospital..."
                className={textareaClass}
              />
            </Field>
          </ToggleSection>
          )}

          {canEdit("immunizations") && (
          <ToggleSection
            title="IMMUNIZATIONS"
            enabled={form.immunizationsEnabled}
            onToggle={() => set("immunizationsEnabled", !form.immunizationsEnabled)}
          >
            <Field label="Immunizations Given">
              <textarea
                name="immunizationsDetails"
                value={form.immunizationsDetails}
                onChange={handle}
                rows={3}
                placeholder="Vaccine, date given..."
                className={textareaClass}
              />
            </Field>
          </ToggleSection>
          )}

          {canEdit("reviewOfSystems") && (
          <ToggleSection
            title="REVIEW OF SYSTEMS"
            enabled={form.reviewOfSystemsEnabled}
            onToggle={() => set("reviewOfSystemsEnabled", !form.reviewOfSystemsEnabled)}
          >
            <Field label="Findings by System">
              <textarea
                name="reviewOfSystemsDetails"
                value={form.reviewOfSystemsDetails}
                onChange={handle}
                rows={3}
                className={textareaClass}
              />
            </Field>
          </ToggleSection>
          )}

          {canEdit("bloodType") && (
          <ToggleSection
            title="BLOOD TYPE"
            enabled={form.bloodTypeEnabled}
            onToggle={() => set("bloodTypeEnabled", !form.bloodTypeEnabled)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Blood Type">
                <select name="bloodType" value={form.bloodType} onChange={handle} className={inputClass}>
                  <option value="">Select</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                    <option key={bt}>{bt}</option>
                  ))}
                </select>
              </Field>
              <Field label="Remarks">
                <input name="bloodTypeRemarks" value={form.bloodTypeRemarks} onChange={handle} className={inputClass} />
              </Field>
            </div>
          </ToggleSection>
          )}
        </div>

        {/* ── ACTIVE DIAGNOSES ── */}
        {canEdit("activeDiagnoses") && (
        <div>
          <SectionHeader title="Active Diagnoses" />
          <Field label="Active Diagnoses">
            <textarea name="activeDiagnoses" value={form.activeDiagnoses} onChange={handle} rows={4} className={textareaClass} />
          </Field>
        </div>
        )}

        {/* ── ACTIVE MEDICATION ── */}
        {canEdit("activeMedication") && (
        <div>
          <SectionHeader title="Active Medication" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Medication (Column 1)">
              <textarea name="activeMedication1" value={form.activeMedication1} onChange={handle} rows={5} className={textareaClass} />
            </Field>
            <Field label="Medication (Column 2)">
              <textarea name="activeMedication2" value={form.activeMedication2} onChange={handle} rows={5} className={textareaClass} />
            </Field>
          </div>
        </div>
        )}

        {/* ── DIAGNOSIS (doctor) ── */}
        {canEdit("diagnosis") && (
        <div>
          <SectionHeader title="Diagnosis" />
          <Field label="ICD-10 Diagnosis Code(s)">
            <Icd10Autocomplete
              value={form.icdDiagnoses}
              onChange={(codes) => set("icdDiagnoses", codes)}
            />
          </Field>
          <div className="mt-4">
            <Field label="Diagnosis" required>
              <textarea
                name="diagnosis"
                value={form.diagnosis}
                onChange={handle}
                rows={4}
                placeholder="Clinical diagnosis for this visit"
                className={textareaClass}
              />
            </Field>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 space-y-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">PhilHealth CF4</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Admitting Diagnosis">
                <textarea
                  name="admittingDiagnosis"
                  value={form.admittingDiagnosis}
                  onChange={handle}
                  rows={2}
                  className={textareaClass}
                />
              </Field>
              <Field label="Discharge Diagnosis">
                <textarea
                  name="dischargeDiagnosis"
                  value={form.dischargeDiagnosis}
                  onChange={handle}
                  rows={2}
                  className={textareaClass}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="1st Case Rate Code">
                <input name="caseRateCode1" value={form.caseRateCode1} onChange={handle} className={inputClass} />
              </Field>
              <Field label="2nd Case Rate Code">
                <input name="caseRateCode2" value={form.caseRateCode2} onChange={handle} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Date Admitted">
                <input name="dateAdmitted" value={form.dateAdmitted} onChange={handle} type="date" className={inputClass} />
              </Field>
              <Field label="Time Admitted">
                <input name="timeAdmitted" value={form.timeAdmitted} onChange={handle} type="time" className={inputClass} />
              </Field>
              <Field label="Date Discharged">
                <input name="dateDischarged" value={form.dateDischarged} onChange={handle} type="date" className={inputClass} />
              </Field>
              <Field label="Time Discharged">
                <input name="timeDischarged" value={form.timeDischarged} onChange={handle} type="time" className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Referred from another Health Care Institution?">
                <select
                  name="referredFromOtherHCI"
                  value={form.referredFromOtherHCI}
                  onChange={handle}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                </select>
              </Field>
              <Field label="Name of Originating HCI">
                <input
                  name="referringHCIName"
                  value={form.referringHCIName}
                  onChange={handle}
                  disabled={form.referredFromOtherHCI !== "YES"}
                  className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                />
              </Field>
            </div>
          </div>
        </div>
        )}

        {/* ── PHILHEALTH CF4: COURSE IN THE WARD / ED MANAGEMENT (Doctor only) ── */}
        {/* Course in the Ward and ED Management are the same running
            dated log of the doctor's orders/actions during the visit —
            merged into one section (one table, one set of entries)
            instead of a separate free-text ED Management box. Every other
            form/PDF that used to read "ED Management" now reads this same
            courseInWardEntries data (see formatCourseInWardText /
            formatManagementAtEdText in utils/consultations.js). Moved
            here, right after Diagnosis — comes before Medicine Given at
            ER and Surgical Procedure/RVS Code. */}
        {canEdit("courseInWard") && (
        <div>
          <SectionHeader title="Course in the Ward (Doctor's Order/Action) / ED Management" />
          <div className="border border-slate-200 rounded-lg p-4 bg-white">
            <p className="text-sm font-bold text-slate-800 mb-3">Doctor's Order/Action</p>
            <div className="flex flex-col gap-3">
              {form.courseInWardEntries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-1 md:grid-cols-[160px_1fr_32px] gap-3 items-start">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Date</p>
                    <input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateCourseInWardEntry(entry.id, { date: e.target.value })}
                      className={`${inputClass} w-full`}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Doctor's Order/Action
                    </p>
                    <textarea
                      value={entry.orderAction}
                      onChange={(e) => updateCourseInWardEntry(entry.id, { orderAction: e.target.value })}
                      rows={2}
                      className={`${textareaClass} w-full`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCourseInWardEntry(entry.id)}
                    className="mt-6 inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCourseInWardEntry}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              <Plus size={14} />
              Add entry
            </button>
          </div>
        </div>
        )}

        {/* ── MEDICINE GIVEN AT ER (doctor) ── */}
        {/* Right after Course in the Ward. Same "fill up" pattern as
            Medicine Prescription further down, but different content —
            this is CF4's own "V. Drugs / Medicines" table (Generic Name /
            Quantity-Dosage-Route / Total Cost), not a take-home Rx. See
            CF4PDF.jsx, which now reads erMedicineItems here instead of
            prescriptionItems for that section. */}
        {canEdit("erMedicine") && (
        <div>
          <SectionHeader title="Medicine Given at ER" />
          <div className="border border-slate-200 rounded-lg p-4 bg-white">
            <p className="text-sm font-bold text-slate-800 mb-3">Drugs / Medicines</p>
            <div className="flex flex-col gap-3">
              {form.erMedicineItems.map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_32px] gap-3 items-start">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Generic Name
                    </p>
                    <input
                      type="text"
                      list="medicine-catalog-options"
                      value={item.genericName}
                      onChange={(e) => updateErMedicineItem(item.id, { genericName: e.target.value })}
                      placeholder="Type or select a medicine"
                      className={`${inputClass} w-full`}
                    />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Quantity/Dosage/Route
                    </p>
                    <input
                      type="text"
                      value={item.quantityDosageRoute}
                      onChange={(e) => updateErMedicineItem(item.id, { quantityDosageRoute: e.target.value })}
                      placeholder="e.g. 1 amp IV"
                      className={`${inputClass} w-full`}
                    />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Total Cost
                    </p>
                    <input
                      type="text"
                      value={item.totalCost}
                      onChange={(e) => updateErMedicineItem(item.id, { totalCost: e.target.value })}
                      placeholder="e.g. 150.00"
                      className={`${inputClass} w-full`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeErMedicineItem(item.id)}
                    className="mt-6 inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addErMedicineItem}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              <Plus size={14} />
              Add medicine
            </button>
          </div>
        </div>
        )}

        {/* ── SURGICAL PROCEDURE / RVS CODE (doctor) ── */}
        {/* Was labeled "ED Management" historically — this is the RVS-coded
            field, distinct from the old free-text ED Management notes
            field (removed). RvsAutocomplete is a search-and-select picker,
            same idea as the ICD-10 picker in the Diagnosis section above:
            search by code, description, or section, then click a result.
            Picking one STACKS onto both fields below instead of replacing
            them — surgicalProcedureRvsCode grows as "10060, 11040, ..."
            and surgicalProcedureNotes grows one sentence per code, each
            ending in its own period, so picking 5 codes in a row builds up
            all 5 (see addSurgicalProcedureRvsCode). Both fields stay fully
            editable afterward. If a procedure isn't on the RVS list (or a
            newer code isn't in it yet), just type directly into either
            field instead; nothing here requires using the picker. */}
        {canEdit("surgicalProcedure") && (
        <div>
          <SectionHeader title="Surgical Procedure/RVS Code" />
          <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-4">
            <Field label="Search RVS Code / Procedure">
              <RvsAutocomplete onSelect={addSurgicalProcedureRvsCode} />
              <p className="mt-1 text-[11px] text-slate-400">
                PhilHealth RVS procedure list — pick as many as apply; each one stacks onto the RVS
                Code and Notes fields below. If a code you need isn't here, just type it in directly.
              </p>
            </Field>
            <Field label="RVS Code(s)">
              <input
                name="surgicalProcedureRvsCode"
                value={form.surgicalProcedureRvsCode}
                onChange={handle}
                className={inputClass}
              />
            </Field>
            <Field label="Notes (attach photocopy of OR technique separately)">
              <textarea
                name="surgicalProcedureNotes"
                value={form.surgicalProcedureNotes}
                onChange={handle}
                rows={5}
                className={textareaClass}
              />
            </Field>
          </div>
        </div>
        )}

        {/* ── DIAGNOSTICS (doctor) ── */}
        {canEdit("diagnostics") && (
        <div>
          <SectionHeader title="Diagnostics" />
          <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-4">
            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Diagnostics / Tests Ordered
                {form.diagnosticsSelected.length > 0 && (
                  <span className="ml-1 font-normal normal-case text-slate-400">
                    ({form.diagnosticsSelected.length} selected)
                  </span>
                )}
              </span>
              <DiagnosticTestChecklist
                selected={form.diagnosticsSelected}
                onToggle={toggleDiagnosticTest}
                testDetails={form.diagnosticsTestDetails}
                onDetailChange={setDiagnosticTestDetail}
              />
            </div>
            <Field label="Additional Notes">
              <textarea
                name="diagnosticsNotes"
                value={form.diagnosticsNotes}
                onChange={handle}
                rows={2}
                placeholder="Anything not covered by the checklist above"
                className={textareaClass}
              />
            </Field>
          </div>
        </div>
        )}

        {/* ── MEDICINE PRESCRIPTION (doctor) ── */}
        {canEdit("medicinePrescription") && (
        <div>
          <SectionHeader title="Medicine Prescription" />
          <datalist id="medicine-catalog-options">
            {MEDICINE_CATALOG.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="border border-slate-200 rounded-lg p-4 bg-white">
            <p className="text-sm font-bold text-slate-800 mb-3">
              Medicines <span className="text-red-500">*</span>
            </p>

            <div className="flex flex-col gap-3">
              {form.prescriptionItems.map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_110px_90px_1fr_32px] gap-3 items-start">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Medicine
                    </p>
                    <input
                      type="text"
                      list="medicine-catalog-options"
                      value={item.medicineName}
                      onChange={(e) => updatePrescriptionItem(item.id, { medicineName: e.target.value })}
                      placeholder="Type or select a medicine"
                      className={`${inputClass} w-full`}
                    />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Milligram
                    </p>
                    <input
                      type="text"
                      value={item.milligram ?? ""}
                      onChange={(e) => updatePrescriptionItem(item.id, { milligram: e.target.value })}
                      placeholder="e.g. 500mg"
                      className={`${inputClass} w-full`}
                    />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Qty
                    </p>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updatePrescriptionItem(item.id, { quantity: e.target.value })}
                      className={`${inputClass} w-full`}
                    />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Instructions (Sig)
                    </p>
                    <input
                      type="text"
                      value={item.instructions}
                      onChange={(e) => updatePrescriptionItem(item.id, { instructions: e.target.value })}
                      placeholder="e.g. 1 tablet 3x a day after meals for 7 days"
                      className={`${inputClass} w-full`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removePrescriptionItem(item.id)}
                    className="mt-6 inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addPrescriptionItem}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              <Plus size={14} />
              Add medicine
            </button>
          </div>
        </div>
        )}

        {/* ── NCD HIGH-RISK ASSESSMENT ── */}
        {canEdit("ncdAssessment") && (
        <ToggleSection
          title="NCD HIGH-RISK ASSESSMENT"
          enabled={form.ncdAssessmentEnabled}
          onToggle={() => set("ncdAssessmentEnabled", !form.ncdAssessmentEnabled)}
        >
          <QuestionTable title="High Fat / High Salt Food Intake">
            <YesNoRow
              question="Eats processed/fast foods (e.g. instant noodles, hamburgers, fries, fried chicken skin etc.) and ihaw-ihaw (e.g. isaw, adidas, etc.) weekly?"
              value={form.eatsProcessedFastFoodsWeekly}
              onChange={(v) => set("eatsProcessedFastFoodsWeekly", v)}
            />
          </QuestionTable>

          <QuestionTable title="Dietary Fiber Intake">
            <YesNoRow
              question="Eats 3 servings of vegetables daily?"
              value={form.eats3VegetablesDaily}
              onChange={(v) => set("eats3VegetablesDaily", v)}
            />
            <YesNoRow
              question="2-3 servings of fruits daily?"
              value={form.eats2to3FruitsDaily}
              onChange={(v) => set("eats2to3FruitsDaily", v)}
            />
          </QuestionTable>

          <QuestionTable title="Physical Activity">
            <YesNoRow
              question="Does at least 2.5 hours a week of moderate-intensity physical activity?"
              value={form.physicalActivity}
              onChange={(v) => set("physicalActivity", v)}
            />
          </QuestionTable>

          <QuestionTable title="Presence or Absence of Diabetes">
            <YesNoRow
              question="Was patient diagnosed as having diabetes?"
              value={form.diagnosedDiabetes}
              onChange={(v) => set("diagnosedDiabetes", v)}
              includeDontKnow
            />
            <YesNoRow
              question="With Medication?"
              value={form.diabetesWithMedication}
              onChange={(v) => set("diabetesWithMedication", v)}
              disabled={form.diagnosedDiabetes !== "YES"}
              subdued={form.diagnosedDiabetes !== "YES"}
            />
            <YesNoRow
              question="Does patient have symptoms of Polyphagia?"
              value={form.polyphagia}
              onChange={(v) => set("polyphagia", v)}
            />
            <YesNoRow
              question="Does patient have symptoms of Polydipsia?"
              value={form.polydipsia}
              onChange={(v) => set("polydipsia", v)}
            />
            <YesNoRow
              question="Does patient have symptoms of Polyuria?"
              value={form.polyuria}
              onChange={(v) => set("polyuria", v)}
            />
          </QuestionTable>

          <QuestionTable title="Blood Glucose Test Results">
            <YesNoRow question="Raised Blood Glucose?" value={form.raisedBloodGlucose} onChange={(v) => set("raisedBloodGlucose", v)} />
            <YesNoRow question="Raised Blood Lipids?" value={form.raisedBloodLipids} onChange={(v) => set("raisedBloodLipids", v)} />
            <YesNoRow question="Presence of Urine Ketones?" value={form.urineKetones} onChange={(v) => set("urineKetones", v)} />
            <YesNoRow question="Presence of Urine Protein?" value={form.urineProtein} onChange={(v) => set("urineProtein", v)} />
          </QuestionTable>

          <QuestionTable title="Angina, Heart Attack, Stroke or Transient Ischemic Attack Assessment">
            <YesNoRow
              question="Have you had any pain or discomfort or any pressure or heaviness in your chest?"
              value={form.chestPainPressure}
              onChange={(v) => set("chestPainPressure", v)}
            />
            <YesNoRow
              question="Do you get the pain in the center of the chest or left arm?"
              value={form.painCenterChestOrArm}
              onChange={(v) => set("painCenterChestOrArm", v)}
              disabled={!chestPainYes}
              subdued={!chestPainYes}
            />
            <YesNoRow
              question="Do you get it when you walk uphill or hurry?"
              value={form.painWalkingUphill}
              onChange={(v) => set("painWalkingUphill", v)}
              disabled={!chestPainYes}
              subdued={!chestPainYes}
            />
            <YesNoRow
              question="Do you slow down if you get the pain while walking?"
              value={form.slowsDownWithPain}
              onChange={(v) => set("slowsDownWithPain", v)}
              disabled={!chestPainYes}
              subdued={!chestPainYes}
            />
            <YesNoRow
              question="Does the pain go away if you stand still or if you take a tablet under the tongue?"
              value={form.painGoesAwayRestOrTablet}
              onChange={(v) => set("painGoesAwayRestOrTablet", v)}
              disabled={!chestPainYes}
              subdued={!chestPainYes}
            />
            <YesNoRow
              question="Does the pain go away in less than 10 minutes?"
              value={form.painGoesAwayUnder10Min}
              onChange={(v) => set("painGoesAwayUnder10Min", v)}
              disabled={!chestPainYes}
              subdued={!chestPainYes}
            />
            <YesNoRow
              question="Have you ever had a severe chest pain across the front of your chest lasting for half an hour or more?"
              value={form.severeChestPain30Min}
              onChange={(v) => set("severeChestPain30Min", v)}
              disabled={!chestPainYes}
              subdued={!chestPainYes}
            />
            <YesNoRow
              question="Is Patient have an Angina or Heart Attack?"
              value={form.anginaOrHeartAttack}
              onChange={(v) => set("anginaOrHeartAttack", v)}
            />
            <YesNoRow
              question="Have you ever had any of the following: difficulty in talking, weakness of arm and/or leg on one side of the body or numbness on one side of the body?"
              value={form.strokeSymptoms}
              onChange={(v) => set("strokeSymptoms", v)}
            />
            <YesNoRow
              question="Is Patient may have a Stroke or Transient Ischemic Attach?"
              value={form.strokeOrTIA}
              onChange={(v) => set("strokeOrTIA", v)}
            />
          </QuestionTable>

          <QuestionTable title="Risk Level">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 py-2.5">
              <p className="flex-1 text-sm text-slate-700">What is the risk level?</p>
              <select
                value={form.riskLevel}
                onChange={(e) => set("riskLevel", e.target.value)}
                className={`${inputClass} sm:w-56`}
              >
                <option value="">Select</option>
                {RISK_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </QuestionTable>
        </ToggleSection>
        )}

        {/* ── DISPOSITION (doctor) ── */}
        {/* Deliberately placed last among the doctor's editable sections,
            immediately before Certification (Printed Name / License /
            Signature / Date) — Disposition is meant to be the doctor's
            final call on the encounter, made only once everything else
            (diagnosis, diagnostics, prescriptions) is already recorded. */}
        {canEdit("disposition") && (
        <div>
          <SectionHeader title="Disposition" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Disposition">
              <select name="disposition" value={form.disposition} onChange={handle} className={inputClass}>
                <option value="">Select</option>
                <option>Discharged</option>
                <option>Admitted</option>
                <option>Transferred / Referred</option>
                <option>REFERRED TO YAKAP</option>
                <option>HAMA</option>
                <option>Absconded</option>
                <option>Expired</option>
              </select>
            </Field>
            <Field label="Recommendations">
              <input
                name="dispositionNotes"
                value={form.dispositionNotes}
                onChange={handle}
                placeholder="e.g. Rest with medication x 4 days"
                className={inputClass}
              />
            </Field>
            <Field label="Follow-up Examination">
              <input
                name="followUpExamination"
                value={form.followUpExamination}
                onChange={handle}
                placeholder="e.g. 1 week, PRN"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 space-y-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              PhilHealth CF4 — Outcome of Treatment
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {["Discharged", "Improved", "HAMA", "Absconded", "Transferred", "Expired", "REFERRED TO YAKAP"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="outcomeOfTreatment"
                    checked={form.outcomeOfTreatment === opt}
                    onChange={() => set("outcomeOfTreatment", opt)}
                    className="text-teal-700 focus:ring-teal-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
            <Field label="Specify reason (required for Absconded / Transferred / Expired)">
              <input
                name="outcomeOfTreatmentReason"
                value={form.outcomeOfTreatmentReason}
                onChange={handle}
                disabled={!["Absconded", "Transferred", "Expired"].includes(form.outcomeOfTreatment)}
                className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
              />
            </Field>
          </div>
        </div>
        )}

        {/* ── PHILHEALTH CF4: CERTIFICATION OF ATTENDING HEALTH CARE PROFESSIONAL (doctor) ── */}
        {canEdit("certification") && (
        <div>
          <SectionHeader title="Certification of Attending Health Care Professional" />
          <div className="border border-slate-200 rounded-lg p-4 space-y-4">
            <p className="text-xs text-slate-700 leading-relaxed italic">
              I certify that the above information given in this form, including all attachments, are true and
              correct.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Printed Name of Attending Health Care Professional">
                <SearchableSelect
                  value={form.attendingPrintedName}
                  onChange={handleAttendingPrintedNameChange}
                  options={doctors}
                  getValue={(d) => d.name}
                  getLabel={(d) => d.name}
                  placeholder="Select attending physician"
                  inputClass={inputClass}
                />
              </Field>
              <Field label="License Number / PTR">
                <input
                  name="attendingLicenseNumber"
                  value={form.attendingLicenseNumber}
                  onChange={handle}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Signature">
                <input
                  name="attendingSignature"
                  value={form.attendingSignature}
                  onChange={handle}
                  placeholder="Typed signature"
                  className={inputClass}
                />
              </Field>
              <Field label="Date">
                <input
                  name="attendingCertifiedDate"
                  value={form.attendingCertifiedDate}
                  onChange={handle}
                  type="date"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>
        )}

        {/* Course in the Ward (now merged with ED Management) moved to
            right after Diagnosis, ahead of Medicine Given at ER /
            Surgical Procedure — see that block above. */}

        {/* ── CONSENT ── */}
        {canEdit("consentSignoff") && (
        <>
        <div>
          <SectionHeader title="Consent" />
          <Field label="Consent Notes">
            <textarea name="consentNotes" value={form.consentNotes} onChange={handle} rows={3} className={textareaClass} />
          </Field>
        </div>

        <div className="border border-slate-200 rounded-lg p-4 space-y-4">
          <p className="text-xs text-slate-700 leading-relaxed text-center italic">
            E. ZARATE HOSPITAL collects your personal information to provide you with necessary health care, medical
            services, and directly related purposes. We strictly adhere to the Patient-Physician Confidentiality Rule
            and will not disclose any of your information to disinterested parties without your consent. I hereby
            consent the Hospital to collect, use and disclose my information as required for my Health care.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
            <Field label="Date">
              <input name="consentDate" value={form.consentDate} onChange={handle} type="date" className={inputClass} />
            </Field>
            <Field label="Printed Name and Signature of Patient or Authorized Representative" className="md:col-span-2">
              <input
                name="consentSignature"
                value={form.consentSignature}
                onChange={handle}
                placeholder="Full printed name"
                className={inputClass}
              />
            </Field>
          </div>
        </div>
        </>
        )}
        </fieldset>

        {/* ── SUBMIT ── */}
        <div className="flex items-center gap-4 justify-end pt-4 border-t border-slate-200">
          {saveStatus === "saved" && (
            <span className="text-sm font-medium text-emerald-600">Saved — you can keep editing or close.</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            {readOnly ? "Close" : "Cancel"}
          </button>
          {!readOnly && (isNurse || isDoctor || user?.role === "admin") && (
            <button
              type="submit"
              disabled={saveStatus === "saving"}
              className="px-8 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saveStatus === "saving" ? "Saving…" : "Save Changes"}
            </button>
          )}
        </div>
      </form>

      {isDoctor && (
        <ConsultationReferencePanel patient={patient} encounter={encounter} form={form} />
      )}
      {isNurse && <DoctorConsultationReferencePanel patient={patient} form={form} />}
      </div>
    </div>
  );
}