// Consultation history — backed by the Spring Boot ConsultationController
// (/api/patients/{patientId}/consultations, /api/consultations,
// /api/consultations/diagnoses-by-encounter) instead of Supabase. Same
// rationale/pattern as utils/patients.js and utils/encounters.js.
//
// The backend's `consultations` table splits each save into two parts:
//   - a handful of "promoted" columns (chiefComplaint, diagnosis, etc.)
//     that reports/lists/joins actually need to filter or display
//   - everything else in the 100+-field Consultation Form, stored as-is in
//     a `details` jsonb column
// ConsultationResponse already returns both halves as camelCase fields
// sitting alongside a `details` map — rowToEntry() below just flattens
// `details` and the promoted fields into one object, so the rest of the
// app (PatientProfile.jsx, the PDF renderers, etc.) can keep reading e.g.
// `entry.diagnosis` or `entry.pastMedicalHistory` exactly like it did
// before.
//
// One thing that's genuinely different from a typical list-backed
// resource: saveConsultationEntry() below hits a save endpoint that
// upserts per (encounterId, authorRole) on the SERVER, instead of the
// frontend deciding insert-vs-update itself. That's what gives Patient
// Files "one consultation history entry per registration, per author
// role" instead of a new entry stacking up every time the same nurse or
// doctor re-saves the same registration's Consultation Form — see
// ConsultationService.save() on the backend for the full rationale. (An
// entry saved with no encounterId — the standalone Patient Profile
// "Add/Update consultation" shortcut — still always inserts a fresh row
// there too, since there's no registration to key an update on.)

import { api } from "../lib/apiClient";
import { getPatientUuid, loadPatients } from "./patients";

// consultation_author_role check constraint in the DB — anyone else
// (staff, med_tech, xray_tech) should never actually reach a save
// action, but this keeps a bad save from failing silently as a confusing
// 400 deep in the backend instead of a clear error here. Mirrors
// ConsultationService's own VALID_AUTHOR_ROLES on the backend.
const VALID_AUTHOR_ROLES = ["er_nurse", "opd_nurse", "doctor", "admin"];

// camelCase form field -> camelCase ConsultationResponse field, for the
// fields promoted out of `details` (see the file banner above). Both
// sides are already camelCase since ConsultationRequest/Response use the
// same field names the Consultation Form does — this map just says which
// of the form's fields live as real columns instead of inside `details`.
const PROMOTED_FIELDS = [
  "chiefComplaint",
  "historyOfPresentIllness",
  "diagnosis",
  "medicationOrders",
  "disposition",
  "dispositionNotes",
  "allergies",
  "bloodType",

  // PhilHealth CF4 — see the backend's cf4-fields-addendum for why these
  // seven (and only these seven) of the new CF4 fields are promoted out
  // of `details`.
  "admittingDiagnosis",
  "dischargeDiagnosis",
  "caseRateCode1",
  "caseRateCode2",
  "dateAdmitted",
  "dateDischarged",
  "outcomeOfTreatment",
];

function rowToEntry(row) {
  if (!row) return null;
  const entry = { ...(row.details || {}) };
  for (const field of PROMOTED_FIELDS) {
    entry[field] = row[field] || "";
  }
  entry.id = row.id;
  entry.encounterId = row.encounterId || null;
  entry.authorRole = row.authorRole;
  entry.createdAt = row.createdAt;
  // Falls back to createdAt just in case — the backend always sends
  // updatedAt now, but this keeps the same defensive fallback the
  // Supabase version had.
  entry.updatedAt = row.updatedAt || row.createdAt;
  return entry;
}

// Builds the ConsultationRequest body: the promoted fields go through as
// their own top-level keys, everything else the 100+-field form captured
// goes into `details`.
function formDataToRequest({ encounterId, authorRole, formData }) {
  const rest = { ...formData };
  const request = {
    encounterId: encounterId || null,
    authorRole,
  };
  for (const field of PROMOTED_FIELDS) {
    request[field] = rest[field] || null;
    delete rest[field];
  }
  request.details = rest;
  return request;
}

// Loads every consultation entry for this patient — one row per
// registration per author role now (see saveConsultationEntry), plus any
// standalone entries saved with no encounter_id. Entries are tagged with
// who authored them (authorRole) so each Patient Files folder can filter
// to just its own kind, and with encounterId so a specific registration
// can be matched back to the diagnosis recorded against it (see
// loadDiagnosesByEncounter below).
//
// ORDERED BY updated_at, NOT created_at — this matters a lot here
// specifically because saveConsultationEntry() UPDATES an existing row
// (per encounter_id + author_role) on every re-save instead of always
// inserting. created_at is set once at the row's first INSERT and never
// changes again, so ordering by it means "most recent" silently drifts
// away from "most recently EDITED" the moment more than one registration
// or a second save exists — which is exactly what made a freshly-saved
// Medicine Given at ER / Surgical Procedure not show up in the CF4
// preview (CF4 picks its data from whichever doctor entry sorts first).
// updated_at is bumped by a DB trigger on every UPDATE (see
// consultations_set_updated_at in the schema), so this always reflects
// the true last-touched time.
export async function loadConsultationHistory(hospitalNo) {
  const patientUuid = await getPatientUuid(hospitalNo);
  if (!patientUuid) return [];

  const { data, error } = await api.get(`/api/patients/${patientUuid}/consultations`);
  if (error) {
    console.error("loadConsultationHistory failed:", error.message);
    return [];
  }
  // Backend already returns this list newest-edited-first (ORDER BY
  // updated_at DESC) — no re-sorting needed here.
  return (data || []).map(rowToEntry);
}

// One consultation record per (registration, author role) — re-saving the
// same registration's consultation (as either the nurse or the doctor)
// overwrites that role's existing entry instead of stacking a new one in
// Patient Files' history. A nurse's entry and a doctor's entry for the
// SAME registration are still two separate rows (that's the "one history
// per registration for doctor AND Nurse" the feature is meant to give
// you) — it's only a second save by the SAME role on the SAME
// registration that now overwrites instead of appending.
//
// Entries with no encounterId (the standalone "Add/Update consultation"
// shortcut on the general Patient Profile page, not opened from any one
// registration) are NOT deduplicated this way — there's no registration
// to key an update on, so those keep the old "always insert a fresh row"
// behavior, same as before.
export async function saveConsultationEntry(hospitalNo, formData, authorRole, encounterId = null, authorId = null) {
  if (!VALID_AUTHOR_ROLES.includes(authorRole)) {
    throw new Error(
      `Can't save a consultation authored by role "${authorRole}" — only ${VALID_AUTHOR_ROLES.join(
        ", "
      )} can author one.`
    );
  }

  const patientUuid = await getPatientUuid(hospitalNo);
  if (!patientUuid) throw new Error(`No patient found with Hospital No. "${hospitalNo}"`);

  // authorId is accepted for signature compatibility with existing call
  // sites, but is no longer sent from here — the backend now derives the
  // author from the authenticated request (CurrentUserProvider) rather
  // than trusting a client-supplied id.
  void authorId;

  const request = formDataToRequest({ encounterId, authorRole, formData });

  // The backend owns the upsert-per-(encounterId, authorRole) decision
  // (see ConsultationService.save()) and also flips the matching
  // encounter's nurse/doctor "consultation done" flag as part of the same
  // transaction — both used to be separate client-side steps here.
  const { data, error } = await api.post(`/api/patients/${patientUuid}/consultations`, request);
  if (error) throw new Error(error.message);

  return rowToEntry(data);
}

// Picks the right consultation entry to seed the Consultation Form with,
// given the specific registration (encounter) it was opened from and the
// role of whoever's opening it.
//
// Before this existed, PatientProfile.jsx just used `history[0]` — the
// single most-recently-created row across every registration AND every
// author role for this patient. That's what made doctor-only fields like
// Time of Visit / Medicine Given at ER (CF4's Drugs/Medicines table) look
// like they'd been wiped: the row saveConsultationEntry() upserts on is
// keyed per (encounter_id, author_role), so as soon as a SECOND
// registration existed for the patient, or the nurse saved after the
// doctor did, `history[0]` pointed at a completely different row than the
// one you were actually editing — the doctor's real data was still safely
// in the database, the form was just seeded from the wrong row.
//
// - Same registration + same author role already has a row -> that's the
//   one to edit (this is the normal "reopen and keep editing" case).
// - Same registration, but this role hasn't saved yet -> seed from
//   whichever role DID save for this registration, so shared
//   identification/context fields aren't blank (harmless even for
//   sections this role can't see, since canEdit() hides them anyway).
// - No registration in context at all (the standalone Patient Profile
//   "Add/Update consultation" shortcut) -> falls back to the single most
//   recent entry on file, same as the old behavior.
export function resolveConsultationInitialValues(historyList, encounterId, authorRole) {
  const list = historyList || [];
  if (encounterId) {
    const own = list.find((e) => e.encounterId === encounterId && e.authorRole === authorRole);
    if (own) return own;
    const sibling = list.find((e) => e.encounterId === encounterId);
    if (sibling) return sibling;
    return null;
  }
  return list[0] || null;
}

// "Common cold (J00)" — the free-text diagnosis with whatever ICD-10
// code(s) the doctor picked appended in parentheses. If only one of the
// two was filled in, that one alone is returned (no dangling "()" or
// stray comma). Whichever the doctor actually filled in on the
// Consultation Form's Diagnosis section.
export function formatDiagnosisText(entry) {
  if (!entry) return "";

  const text = (entry.diagnosis || "").trim();
  const codes = Array.isArray(entry.icdDiagnoses)
    ? entry.icdDiagnoses.map((d) => d.code).filter(Boolean)
    : [];

  if (text && codes.length > 0) return `${text} (${codes.join(", ")})`;
  if (text) return text;
  if (codes.length > 0) {
    // No free text at all — fall back to the fuller "code — name" form
    // so the column still reads clearly on its own.
    return entry.icdDiagnoses.map((d) => (d.name ? `${d.code} — ${d.name}` : d.code)).join(", ");
  }
  return "";
}

// "10060, 11040 — Incision and drainage of abscess. Debridement; skin,
// partial thickness." — the doctor's ED Management entry: whichever RVS
// code(s) were picked/typed into surgicalProcedureRvsCode, plus whatever
// ended up in surgicalProcedureNotes (auto-stacked, one sentence per code
// picked from the RVS list, but just as often edited/typed by hand). Same
// "single source of truth" role formatDiagnosisText plays for Diagnosis —
// used by the Consultation Form's own reference panel, the Patient
// Profile consultation summary, and (for the code/notes split, not this
// combined string) the CF4 PDF.
export function formatEdManagementText(entry) {
  if (!entry) return "";

  const code = (entry.surgicalProcedureRvsCode || "").trim();
  const notes = (entry.surgicalProcedureNotes || "").trim();

  if (code && notes) return `${code} — ${notes}`;
  return code || notes || "";
}

// PhilHealth CF4, item 5 — Physical Examination on Admission. Mirrors the
// six PE_SYSTEMS entries in ConsultationForm.jsx (label/key/othersKey only
// — the actual checkbox OPTIONS lists stay owned by the form itself; this
// util only needs to know which fields to read, not what's selectable).
// Kept in sync manually since the checklist rarely changes; if a system is
// ever added/renamed there, add it here too.
const PE_SYSTEM_LABELS = [
  { key: "peChestLungs", othersKey: "peChestLungsOthers", label: "Chest/Lungs" },
  { key: "peCvs", othersKey: "peCvsOthers", label: "CVS" },
  { key: "peAbdomen", othersKey: "peAbdomenOthers", label: "Abdomen" },
  { key: "peGuOb", othersKey: "peGuObOthers", label: "GU/OB" },
  { key: "peSkinExtremities", othersKey: "peSkinExtremitiesOthers", label: "Skin/Extremities" },
  { key: "peNeuroExam", othersKey: "peNeuroExamOthers", label: "Neuro Exam" },
];

// "General Survey: Awake and alert\nHEENT: Essentially normal\nChest/Lungs:
// Wheezes, Lump/s over Breast(s) (left, 2cm)\n..." — turns the doctor's
// structured CF4 "Pertinent Physical Examination on Admission" checklist
// (eight checkbox groups, each with its own free-text "specify"/"Others"
// field) into one readable narrative block. A system with nothing checked
// and no specify/Others text is left out entirely, so a mostly-blank exam
// doesn't produce a wall of empty headers. This is what feeds the
// Konsulta/Yakap Referral's "Physical Examination" field — that field is
// free narrative text, not a checklist, so there's no single form field to
// point a shared-clinical-fields mapping at (same reason the ED
// Management field pulls straight from source in KonsultaReferralModal.jsx
// instead of going through SHARED_FIELD_MAP — see sharedClinicalFields.js).
export function formatPhysicalExamText(entry) {
  if (!entry) return "";
  const lines = [];

  const generalSurvey = [...(entry.peGeneralSurvey || [])];
  const alteredIdx = generalSurvey.indexOf("Altered sensorium");
  if (alteredIdx !== -1 && entry.peGeneralSurveyAlteredSensoriumSpecify?.trim()) {
    generalSurvey[alteredIdx] = `Altered sensorium (${entry.peGeneralSurveyAlteredSensoriumSpecify.trim()})`;
  }
  if (generalSurvey.length) lines.push(`General Survey: ${generalSurvey.join(", ")}`);

  const heent = [...(entry.peHeent || [])];
  if (entry.peHeentOthers?.trim()) heent.push(entry.peHeentOthers.trim());
  if (heent.length) lines.push(`HEENT: ${heent.join(", ")}`);

  for (const { key, othersKey, label } of PE_SYSTEM_LABELS) {
    const findings = [...(entry[key] || [])];
    if (entry[othersKey]?.trim()) findings.push(entry[othersKey].trim());
    if (findings.length) lines.push(`${label}: ${findings.join(", ")}`);
  }

  return lines.join("\n");
}

// "07/06/2026 — Started IV fluids, ordered CBC" — the doctor's CF4
// "Course in the Ward" log (a running list of dated Doctor's Order/Action
// entries, see courseInWardEntries in ConsultationForm.jsx), one line per
// entry in the order they were added. An entry missing a date still shows
// (just without the leading date), rather than being silently dropped —
// better to see an undated note than lose it.
export function formatCourseInWardText(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return "";
  return entries
    .filter((e) => e?.date?.trim() || e?.orderAction?.trim())
    .map((e) => (e.date?.trim() ? `${e.date} — ${e.orderAction || ""}`.trim() : (e.orderAction || "").trim()))
    .filter(Boolean)
    .join("\n");
}

// "Management at ED" for the Konsulta/Yakap Referral — combines every
// doctor-entered management/intervention concept from the Consultation
// Form's CF4 section into one narrative block, under its own subheading:
// Course in the Ward (the dated order/action log above), ED Management
// (edManagement — free-text notes), and Surgical Procedure/RVS Code
// (formatEdManagementText above). Any piece that's empty is left out
// entirely, and the whole thing is blank only if all three are. This is
// what KonsultaReferralModal.jsx's buildAutoFilled() feeds "Management at
// ED" from, and what PatientProfile.jsx's handleSaveConsultation() uses to
// push a fresh value into an already-saved referral the instant the
// doctor saves — same "read straight from the doctor's latest entry"
// precedent as formatPhysicalExamText, since none of these three concepts
// is a single plain field a SHARED_FIELD_MAP entry could point at.
export function formatManagementAtEdText(entry) {
  if (!entry) return "";
  const parts = [];

  const courseInWard = formatCourseInWardText(entry.courseInWardEntries);
  if (courseInWard) parts.push(`Course in the Ward:\n${courseInWard}`);

  if (entry.edManagement?.trim()) parts.push(`ED Management:\n${entry.edManagement.trim()}`);

  const surgicalProcedure = formatEdManagementText(entry);
  if (surgicalProcedure) parts.push(`Surgical Procedure/RVS Code:\n${surgicalProcedure}`);

  return parts.join("\n\n");
}

// Every consultation ever saved, across every patient, with just enough
// patient info attached (name, date of birth) for reports to compute
// names/ages without a second round-trip per row. Used by utils/reports.js
// — the single-patient loadConsultationHistory() above is for the Patient
// Profile page instead.
export async function loadAllConsultations() {
  // /api/consultations is paginated (default 25/page) — request a large
  // page size to approximate "load everything", same pattern
  // utils/patients.js's loadPatients() already uses.
  //
  // ConsultationResponse carries hospitalNo directly on each row, but not
  // a nested patient object the way the old Supabase join
  // (`*, patients (...)`) did — so firstName/lastName/dateOfBirth are
  // joined back in here from loadPatients(), to keep this function's
  // return shape (entry.patient = { firstName, lastName, dateOfBirth })
  // unchanged for utils/reports.js, which reads exactly those three
  // fields off of it.
  const [{ data, error }, patients] = await Promise.all([
    api.get("/api/consultations?size=10000"),
    loadPatients(),
  ]);
  if (error) {
    console.error("loadAllConsultations failed:", error.message);
    return [];
  }

  const patientsByHospitalNo = new Map(patients.map((p) => [p.hospitalNo, p]));

  return (data.content || []).map((row) => {
    const entry = rowToEntry(row);
    entry.hospitalNo = row.hospitalNo || null;
    const p = patientsByHospitalNo.get(row.hospitalNo);
    entry.patient = {
      firstName: p?.firstName || "",
      lastName: p?.lastName || "",
      dateOfBirth: p?.dateOfBirth || "",
    };
    return entry;
  });
}

// One diagnosis per encounter, keyed by encounterId — for the Registration
// table's Diagnosis column. Same shape/usage pattern as
// medicinePrescriptions.js's loadMedicinePrescriptions(), which the
// Medication column already reads the same way.
//
// Only rows with an encounter_id are considered — a Consultation Form
// opened from the general Patient Profile "Add/Update consultation"
// shortcut isn't tied to any one registration, so it has nothing to show
// up against in this table (same rule handleSaveConsultation already uses
// for auto-completing a registration's status). If a registration has more
// than one save against it (e.g. nurse's part, then the doctor's), the
// most recent save that actually has a diagnosis wins.
export async function loadDiagnosesByEncounter() {
  // The backend's own getDiagnosesByEncounter() already does the "newest
  // save per encounter wins, formatted as diagnosis (+ codes)" logic
  // server-side (mirroring formatDiagnosisText below) and returns a plain
  // { encounterId: "diagnosis text" } map — no client-side reduction
  // needed anymore.
  const { data, error } = await api.get("/api/consultations/diagnoses-by-encounter");
  if (error) {
    console.error("loadDiagnosesByEncounter failed:", error.message);
    return {};
  }
  return data || {};
}