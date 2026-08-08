// Clinical-document data-layer helpers — backed by the Spring Boot
// PatientDocumentController (/api/patients/{hospitalNo}/documents/**)
// instead of Supabase's `patient_documents` table. Covers the six
// documents keyed off a single patient: the EMR (Visit-OPD Record), ER
// Discharge Instructions, the Konsulta/Yakap Referral, the Medical
// Certificate, the Medical Abstract, and the Admission & Discharge Record.
//
// Every screen that reads/writes one of these documents should import
// from HERE rather than talking to the backend directly.
//
// ONE CONTRACT DIFFERENCE FROM SUPABASE, worth knowing before touching this
// file again: the backend stores/returns `data` as a raw JSON STRING (see
// PatientDocumentRequest/Response — Postgres jsonb, but exposed over the
// wire as text), not an already-parsed object the way supabase-js used to
// hand it back. So every read here JSON.parses it and every write
// JSON.stringifies it before sending.
//
// The backend also never 404s on a document that hasn't been saved yet —
// GET returns a 200 "empty shell" (`data: "{}"`) instead (see
// PatientDocumentResponse.empty()). Every caller in this app branches on
// `if (existing) { ...autofill... }`, so loadPatientDocument() treats that
// empty shell the same way Supabase's "no row" case used to: returns null.

import { api } from "../lib/apiClient";

export const DOC_TYPES = {
  EMR: "emr",
  DISCHARGE: "discharge",
  KONSULTA: "konsulta",
  MEDCERT: "medcert",
  MEDABSTRACT: "medabstract",
  ADMITDISCHARGE: "admitdischarge",
};

function parseDocData(raw) {
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  // Empty shell ("{}") means "never saved" — same as a missing row used to.
  if (!parsed || Object.keys(parsed).length === 0) return null;
  return parsed;
}

// Loads a single document for a patient, or null if it hasn't been saved
// yet (brand-new patient, or this particular form was never opened).
export async function loadPatientDocument(hospitalNo, docType) {
  if (!hospitalNo) return null;
  const { data, error } = await api.get(`/api/patients/${hospitalNo}/documents/${docType}`);
  if (error) {
    console.error(`Loading ${docType} document failed:`, error.message);
    return null;
  }
  return parseDocData(data?.data);
}

// Loads all six documents for a patient in a single round trip — used by
// the Patient Profile's initial load and by Encounter Files, which both
// need every document at once rather than one at a time.
export async function loadAllPatientDocuments(hospitalNo) {
  const empty = {
    emr: null, discharge: null, konsulta: null, medcert: null, medabstract: null, admitdischarge: null,
  };
  if (!hospitalNo) return empty;

  const { data, error } = await api.get(`/api/patients/${hospitalNo}/documents`);
  if (error) {
    console.error("Loading patient documents failed:", error.message);
    return empty;
  }

  const byType = { ...empty };
  for (const row of data || []) {
    byType[row.docType] = parseDocData(row.data);
  }
  return byType;
}

// Upserts one document for a patient and returns the saved value (with
// updatedAt stamped in, same shape the old localStorage/Supabase version
// returned). `userId` is accepted for backward compatibility with every
// call site but is unused now — the backend stamps `updated_by` itself
// from the signed-in user's JWT (see PatientDocumentService.save).
export async function savePatientDocument(hospitalNo, docType, formData, _userId = null) {
  const updated = { ...formData, updatedAt: new Date().toISOString() };
  const { data, error } = await api.put(`/api/patients/${hospitalNo}/documents/${docType}`, {
    data: JSON.stringify(updated),
  });
  if (error) {
    console.error(`Saving ${docType} document failed:`, error.message);
    throw new Error(error.message);
  }
  return parseDocData(data.data);
}

// Thin, named wrappers — kept so callers (Patient Profile, Encounter
// Files) can import the same familiar loadEmr/loadDischarge/... names
// they've always used, unchanged.
export const loadEmr = (hospitalNo) => loadPatientDocument(hospitalNo, DOC_TYPES.EMR);
export const loadDischarge = (hospitalNo) => loadPatientDocument(hospitalNo, DOC_TYPES.DISCHARGE);
export const loadKonsultaReferral = (hospitalNo) => loadPatientDocument(hospitalNo, DOC_TYPES.KONSULTA);
export const loadMedicalCertificate = (hospitalNo) => loadPatientDocument(hospitalNo, DOC_TYPES.MEDCERT);
export const loadMedicalAbstract = (hospitalNo) => loadPatientDocument(hospitalNo, DOC_TYPES.MEDABSTRACT);
export const loadAdmissionDischargeRecord = (hospitalNo) =>
  loadPatientDocument(hospitalNo, DOC_TYPES.ADMITDISCHARGE);

export const saveEmr = (hospitalNo, formData, userId) =>
  savePatientDocument(hospitalNo, DOC_TYPES.EMR, formData, userId);
export const saveDischarge = (hospitalNo, formData, userId) =>
  savePatientDocument(hospitalNo, DOC_TYPES.DISCHARGE, formData, userId);
export const saveKonsultaReferral = (hospitalNo, formData, userId) =>
  savePatientDocument(hospitalNo, DOC_TYPES.KONSULTA, formData, userId);
export const saveMedicalCertificate = (hospitalNo, formData, userId) =>
  savePatientDocument(hospitalNo, DOC_TYPES.MEDCERT, formData, userId);
export const saveMedicalAbstract = (hospitalNo, formData, userId) =>
  savePatientDocument(hospitalNo, DOC_TYPES.MEDABSTRACT, formData, userId);
export const saveAdmissionDischargeRecord = (hospitalNo, formData, userId) =>
  savePatientDocument(hospitalNo, DOC_TYPES.ADMITDISCHARGE, formData, userId);