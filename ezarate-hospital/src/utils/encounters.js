// Encounters data layer — now backed by the Spring Boot backend (Postgres
// `encounters` table + its `encounter_triage` / `encounter_waivers` 1:1
// child tables) instead of Supabase directly. Every screen that touches
// encounter data should import from HERE rather than keeping a private
// copy — same rationale as utils/patients.js.

import { api } from "../lib/apiClient";
import { getPatientUuid } from "./patients";

export const STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export const STATUS_STYLES = {
  [STATUS.PENDING]: "bg-amber-100 text-amber-700",
  [STATUS.COMPLETED]: "bg-emerald-100 text-emerald-700",
  [STATUS.CANCELLED]: "bg-red-100 text-red-700",
};

export const CONSULTATION_TYPES = [
  {
    code: "PCC",
    label: "PRIMARY CARE CONSULTATION",
    description:
      "Primary Care Consultation includes the First Patient Encounter (FPE), covering both initial profiling and diagnosis, treatment, and ongoing management of the patient's condition.",
    defaultFee: 600,
  },
  {
    code: "OPD",
    label: "OPD VISIT",
    description: "A standard outpatient department visit for follow-up or non-primary-care concerns.",
    defaultFee: 300,
  },
  {
    code: "ER",
    label: "ER VISIT",
    description: "An emergency room visit for urgent or acute concerns.",
    defaultFee: 500,
  },
  {
    code: "TELEMED",
    label: "TELEMEDICINE",
    description: "A remote consultation conducted online or by phone.",
    defaultFee: 250,
  },
];

// Flat list of labels — kept for the existing filter dropdowns that just
// need option strings, not the full description/fee.
export const CONSULTATION_TYPE_OPTIONS = CONSULTATION_TYPES.map((c) => c.label);

export const PAYMENT_TYPE_OPTIONS = ["PHIC PAY", "Cash", "HMO", "Company Sponsored"];

export const MIGRATED_STATUS_OPTIONS = ["Migrated", "Not Migrated"];

export const PCU_STATUS_OPTIONS = ["For PCU", "PCU Done", "N/A"];

// Registration's Patient Type filter (Doctor/Admin only — see Encounters.jsx.
// ER Nurse/OPD Nurse never need this dropdown themselves since the backend
// already scopes each of them to just their own type — see
// EncounterService.assertRoleCanAccessPatientType(), the Java port of the
// schema's old current_user_can_access_patient_type()).
export const PATIENT_TYPE_OPTIONS = ["ER Patient", "OPD Patient"];

// Which "Patient Type" gets stamped on a registration, based on the role
// of whoever's creating it. Any role not listed here (doctor, admin,
// med_tech, xray_tech, etc.) falls back to "OPD Patient" — the
// general, non-emergency case. Decided per-registration now, not once
// per-patient, since the same patient can be an ER case one visit and an
// OPD case the next.
export const PATIENT_TYPE_BY_ROLE = {
  er_nurse: "ER Patient",
  opd_nurse: "OPD Patient",
};

// GET /api/doctors already returns a sorted array of names directly.
export async function loadDoctors() {
  const { data, error } = await api.get("/api/doctors");
  if (error) {
    console.error("loadDoctors failed:", error.message);
    return [];
  }
  return data || [];
}

// GET /api/doctors/directory returns [{ name, licenseNumber }] sourced from
// actual doctor accounts (users table, role = "doctor") rather than the
// placeholder doctors_directory table — used by the Consultation Form's
// Certification section to auto-fill "License Number / PTR" once a doctor
// is chosen in "Printed Name of Attending Health Care Professional",
// instead of it being retyped by hand on every consultation.
export async function loadDoctorsDirectory() {
  const { data, error } = await api.get("/api/doctors/directory");
  if (error) {
    console.error("loadDoctorsDirectory failed:", error.message);
    return [];
  }
  return data || [];
}

function responseToTriage(data) {
  if (!data) return null;
  return {
    systolic: data.systolic ?? "",
    diastolic: data.diastolic ?? "",
    heartRate: data.heartRate ?? "",
    respiratoryRate: data.respiratoryRate ?? "",
    temperature: data.temperature ?? "",
    height: data.height ?? "",
    weight: data.weight ?? "",
    bmi: data.bmi ?? "",
    leftVision: data.leftVision || "",
    rightVision: data.rightVision || "",
    labImagingEnabled: data.labImagingEnabled ?? true,
    fbsGlucoseMgDl: data.fbsGlucoseMgDl ?? "",
    fbsGlucoseMmolL: data.fbsGlucoseMmolL ?? "",
    fbsDatePerformed: data.fbsDatePerformed || "",
    createdByUuid: data.createdById || null,
    createdBy: data.createdByUsername || data.createdById || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function triageToRequestBody(t) {
  return {
    systolic: t.systolic === "" ? null : Number(t.systolic),
    diastolic: t.diastolic === "" ? null : Number(t.diastolic),
    heartRate: t.heartRate === "" ? null : Number(t.heartRate),
    respiratoryRate: t.respiratoryRate === "" ? null : Number(t.respiratoryRate),
    temperature: t.temperature === "" ? null : Number(t.temperature),
    height: t.height === "" ? null : Number(t.height),
    weight: t.weight === "" ? null : Number(t.weight),
    bmi: t.bmi === "" ? null : Number(t.bmi),
    leftVision: t.leftVision || "",
    rightVision: t.rightVision || "",
    labImagingEnabled: t.labImagingEnabled ?? true,
    fbsGlucoseMgDl: t.fbsGlucoseMgDl === "" ? null : Number(t.fbsGlucoseMgDl),
    fbsGlucoseMmolL: t.fbsGlucoseMmolL === "" ? null : Number(t.fbsGlucoseMmolL),
    fbsDatePerformed: t.fbsDatePerformed || null,
    // createdBy is no longer sent from the client — the backend stamps it
    // itself, only the first time a triage row is created for an
    // encounter (see EncounterService.saveTriage()'s `isNew` check).
  };
}

function responseToWaiver(data) {
  if (!data) return null;
  return {
    signed: data.signed || false,
    signedBy: data.signedBy || "",
    relationship: data.relationship || "",
    date: data.waiverDate || "",
    reason: data.reason || "",
  };
}

function waiverToRequestBody(w) {
  return {
    signed: !!w.signed,
    signedBy: w.signedBy || "",
    relationship: w.relationship || "",
    waiverDate: w.date || null,
    reason: w.reason || "",
  };
}

// Backend's EncounterResponse only carries the patient's first/last name
// (see EncounterResponse.java) — middleName/sex/dateOfBirth are no longer
// part of this snapshot. Verified nothing outside this file ever read
// those three off encounter.patient, so this is a deliberate, checked
// simplification, not an oversight. If a screen ever needs them, look the
// patient up directly via findPatientById(hospitalNo) in utils/patients.js.
function responseToEncounter(data, extra = {}) {
  if (!data) return null;
  return {
    id: data.id,
    // Assigned by a DB trigger the moment either consultation-done flag
    // first flips to true (see trg_encounters_set_census_no in
    // V5__encounters.sql) — null until then. encounterToRequestBody()
    // below has no census_no field at all, so a plain updateEncounter()
    // call can never clobber it.
    censusNo: data.censusNo || null,
    hospitalNo: data.hospitalNo || "",
    patient: {
      firstName: data.patientFirstName || "",
      lastName: data.patientLastName || "",
      hospitalNo: data.hospitalNo || "",
    },
    patientType: data.patientType || "OPD Patient",
    appointmentDate: data.appointmentDate,
    consultationType: data.consultationType,
    reasonForVisiting: data.reasonForVisiting || "",
    doctor: data.doctor || "",
    fee: data.fee ?? 0,
    paymentType: data.paymentType || "",
    photo: data.photo || null,
    createdBy: data.createdByUsername || data.createdById || "—",
    status: data.status,
    nurseConsultationDone: data.nurseConsultationDone || false,
    doctorConsultationDone: data.doctorConsultationDone || false,
    migratedStatus: data.migratedStatus || "Not Migrated",
    pcuStatus: data.pcuStatus || "N/A",
    // Only populated when the caller asked for them (findEncounterById()
    // does; loadEncounters() deliberately doesn't, to avoid an N+1 fetch
    // across an entire list — see that function's comment).
    triage: extra.triage ?? null,
    waiver: extra.waiver ?? null,
    dateCreated: data.dateCreated,
  };
}

// Only the fields EncounterRequest actually accepts. census_no and
// patientType-via-this-path are deliberately absent — see the comments on
// censusNo above and transferPatientType() below.
function encounterToRequestBody(e) {
  return {
    appointmentDate: e.appointmentDate || null,
    consultationType: e.consultationType,
    reasonForVisiting: e.reasonForVisiting || "",
    doctor: e.doctor || "",
    fee: e.fee || 0,
    paymentType: e.paymentType || "",
    photo: e.photo || null,
    patientType: e.patientType || "OPD Patient", // only actually used by create(); update() ignores it — see transferPatientType()
    nurseConsultationDone: !!e.nurseConsultationDone,
    doctorConsultationDone: !!e.doctorConsultationDone,
    migratedStatus: e.migratedStatus || "Not Migrated",
    pcuStatus: e.pcuStatus || "N/A",
  };
}

// Fetches every encounter. Returns [] on failure rather than throwing, so
// a failed fetch degrades to an empty list instead of crashing the page.
//
// NOTE: unlike findEncounterById() below, this does NOT attach triage/
// waiver to each row — fetching both for every encounter in a whole list
// would mean 3 requests per row. Nothing in the Registrations/Encounters
// list currently reads .triage/.waiver off a loadEncounters() result; if
// that changes, that screen should call findEncounterById() for the one
// row it actually needs detail on, rather than this function growing an
// N+1 fetch.
//
// Also note: the backend's list endpoint is paginated (default 25/page) —
// this requests a large page size to approximate "load everything",
// same tradeoff utils/patients.js's loadPatients() makes.
export async function loadEncounters() {
  const { data, error } = await api.get("/api/encounters?size=1000");
  if (error) {
    console.error("loadEncounters failed:", error.message);
    return [];
  }
  return (data.content || []).map((row) => responseToEncounter(row));
}

export async function findEncounterById(encounterId) {
  const { data, error } = await api.get(`/api/encounters/${encodeURIComponent(encounterId)}`);
  if (error) return null;

  const [triageResult, waiverResult] = await Promise.all([
    api.get(`/api/encounters/${encodeURIComponent(encounterId)}/triage`),
    api.get(`/api/encounters/${encodeURIComponent(encounterId)}/waiver`),
  ]);

  return responseToEncounter(data, {
    triage: triageResult.error ? null : responseToTriage(triageResult.data),
    waiver: waiverResult.error ? null : responseToWaiver(waiverResult.data),
  });
}

// Fetches just the triage row for one encounter — used to enrich an
// already-loaded, patient-scoped list of encounters (e.g. Patient
// Profile's Vital Signs card) with triage data that loadEncounters()
// deliberately omits. Safe to call per-row here because that list is
// scoped to a single patient's encounters, not the whole system — see
// loadEncounters()'s comment for why it can't do this by default.
export async function loadTriageForEncounter(encounterId) {
  const { data, error } = await api.get(`/api/encounters/${encodeURIComponent(encounterId)}/triage`);
  return error ? null : responseToTriage(data);
}

// Creates a brand-new encounter. `encounter` is shaped exactly like
// CreateEncounterPage.jsx already builds it (hospitalNo, patient snapshot,
// appointmentDate, ...). Resolves hospitalNo -> the internal uuid FK
// (the backend's create route is nested under /api/patients/{patientId}/
// encounters), and returns the encounter the rest of the app expects.
// createdBy is no longer passed in — the backend stamps it itself from
// the request's JWT (see EncounterService.create()).
export async function createEncounter(encounter) {
  const patientUuid = await getPatientUuid(encounter.hospitalNo);
  if (!patientUuid) throw new Error(`No patient found with Hospital No. "${encounter.hospitalNo}"`);

  const { data, error } = await api.post(
    `/api/patients/${patientUuid}/encounters`,
    encounterToRequestBody(encounter)
  );
  if (error) throw new Error(error.message);
  return responseToEncounter(data);
}

// Read-modify-write a single encounter by id — same call shape as before
// (`updater` receives the current encounter and returns the patch), so
// every existing call site (status flips, doctor reassignment, triage
// save, waiver save, consultation-done flags) keeps working unchanged.
//
// Internally this now fans out to the backend's more granular endpoints:
// triage/waiver changes (detected by reference change, same pattern every
// caller already uses) go to their own dedicated PUT routes; a status
// change goes through the dedicated PATCH .../status route; everything
// else goes through the general PUT. All of that is invisible to callers
// — they still get back one fully-merged encounter at the end.
export async function updateEncounter(encounterId, updater) {
  const current = await findEncounterById(encounterId);
  if (!current) return null;

  const next = updater({ ...current });

  if (next.triage && next.triage !== current.triage) {
    const { error } = await api.put(`/api/encounters/${encounterId}/triage`, triageToRequestBody(next.triage));
    if (error) console.error("updateEncounter (triage) failed:", error.message);
  }

  if (next.waiver && next.waiver !== current.waiver) {
    const { error } = await api.put(`/api/encounters/${encounterId}/waiver`, waiverToRequestBody(next.waiver));
    if (error) console.error("updateEncounter (waiver) failed:", error.message);
  }

  if (next.status && next.status !== current.status) {
    const { error: statusError } = await api.patch(`/api/encounters/${encounterId}/status`, {
      status: next.status,
    });
    if (statusError) throw new Error(statusError.message);
  }

  const { error: rowError } = await api.put(`/api/encounters/${encounterId}`, encounterToRequestBody(next));
  if (rowError) {
    // Surface this instead of swallowing it — a silent failure here is
    // exactly how "the Census No. trigger didn't fire" or a role-scope
    // rejection ends up looking like nothing happened at all, with no
    // error visible anywhere in the UI. Callers (e.g. handleSaveConsultation
    // in PatientProfile.jsx) already wrap their updateEncounter() calls and
    // can alert the user with err.message.
    throw new Error(rowError.message);
  }

  return findEncounterById(encounterId);
}

// Flips OPD Patient <-> ER Patient on a registration (Encounters.jsx's
// "Transfer Patient" action). Deliberately NOT built on top of
// updateEncounter()/encounterToRequestBody(), for two reasons: (1) the
// backend's general PUT endpoint refuses to change patientType at all —
// only POST /api/encounters/{id}/transfer can (see
// EncounterService.transferPatientType()'s comment on why that's its own
// method rather than folded into the general one), and (2) that same
// backend method already handles discarding and reissuing the Census No.
// atomically — clearing it, then letting trg_encounters_set_census_no
// reissue a fresh number under the new type's own counter in the same
// write, if one had already been assigned. Nothing extra needed here for
// that part.
export async function transferPatientType(encounterId, nextType) {
  const { error } = await api.post(`/api/encounters/${encounterId}/transfer`, { patientType: nextType });
  if (error) {
    console.error("transferPatientType failed:", error.message);
    return null;
  }
  return findEncounterById(encounterId);
}

// Archive.jsx's "Delete Permanently" button on the Cancelled Registrations
// tab. Admin-only, and only allowed on a registration that's already
// CANCELLED — the backend enforces both and returns a clear error message
// otherwise (see EncounterService.deletePermanently), which this throws so
// the modal calling it can display it.
export async function deleteEncounter(encounterId) {
  const { error } = await api.del(`/api/encounters/${encodeURIComponent(encounterId)}`);
  if (error) throw new Error(error.message);
}

// Which registration (encounter) a saved Consultation entry belongs to —
// used by every clinical document (ER Discharge, Medical Certificate,
// Konsulta/Yakap Referral) that needs "the doctor/date for THIS visit"
// rather than just whatever's on the patient's general profile. Centralized
// here so all three forms resolve it the exact same way instead of each
// re-implementing its own `encounters.find(...)`.
export function matchEncounterForConsultation(consultation, encounters) {
  if (!consultation?.encounterId || !Array.isArray(encounters)) return null;
  return encounters.find((e) => e.id === consultation.encounterId) || null;
}

// "2026-07-06T09:15:00.000Z" -> "07/06/2026" (matches the reference screen).
export function formatDateCreated(iso) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const y = dt.getFullYear();
  return `${m}/${d}/${y}`;
}