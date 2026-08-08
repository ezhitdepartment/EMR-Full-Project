// Shared patients data-layer helpers — now backed by the Spring Boot
// backend (Postgres `patients` table) instead of Supabase directly. Every
// screen that touches patient data should import from HERE rather than
// keeping a private copy, so there's one place that knows how to talk to
// the API and one place to fix if the backend's shape changes.
//
// The backend's PatientResponse/PatientRequest DTOs already use camelCase
// field names matching what the rest of the app expects (hospitalNo,
// firstName, lastName, etc. — see CreatePatientModal.jsx's `emptyForm`),
// so unlike the old Supabase version, there's very little translation
// needed here anymore. The two real differences from the old snake_case
// row shape are called out below.

import { api } from "../lib/apiClient";

// Backend's guardian shape (GuardianDto) already matches this 1:1 — this
// just guarantees "always an object, never null/undefined" so components
// that do `patient.guardian.firstName` don't need an extra null check,
// same contract rowToGuardian used to guarantee.
function normalizeGuardian(g) {
  if (!g) return {};
  return {
    firstName: g.firstName || "",
    lastName: g.lastName || "",
    middleName: g.middleName || "",
    suffix: g.suffix || "",
    sex: g.sex || "",
    dateOfBirth: g.dateOfBirth || "",
    pin: g.pin || "",
    landline: g.landline || "",
    mobile: g.mobile || "",
  };
}

// Backend's PatientResponse fields already match this shape almost
// exactly (camelCase, same names) — this mostly just fills in "" for
// nulls and normalizes guardian. Two real differences from the old
// rowToPatient:
//   1. `id` (the uuid) is now included — the old version never exposed
//      it since Supabase let you .eq("hospital_no", ...) directly, but
//      the backend's update/photo endpoints are keyed by uuid, so
//      updatePatient()/savePatientPhoto() below need it. Purely
//      additive — nothing that read the old shape breaks.
//   2. `patientType` is dropped. It used to live on `patients` but was
//      moved to `encounters.patientType` (decided per-registration, not
//      once at patient creation) — see PATIENT_TYPE_BY_ROLE in
//      utils/encounters.js. Nothing should still be reading
//      patient.patientType; if something breaks because of this, that
//      call site needs to read it from the encounter instead.
function responseToPatient(data) {
  if (!data) return null;
  return {
    id: data.id,
    hospitalNo: data.hospitalNo || "",
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    middleName: data.middleName || "",
    suffix: data.suffix || "",
    sex: data.sex || "",
    dateOfBirth: data.dateOfBirth || "",
    email: data.email || "",
    landline: data.landline || "",
    mobile: data.mobile || "",
    photo: data.photo || "",

    hasGuardian: data.hasGuardian || false,
    guardian: normalizeGuardian(data.guardian),

    address: data.address || "",
    region: data.region || "",
    regionCode: data.regionCode || "",
    province: data.province || "",
    provinceCode: data.provinceCode || "",
    city: data.city || "",
    cityCode: data.cityCode || "",
    barangay: data.barangay || "",
    zipCode: data.zipCode || "",

    motherName: data.motherName || "",
    motherContact: data.motherContact || "",
    fatherName: data.fatherName || "",
    fatherContact: data.fatherContact || "",
    nationality: data.nationality || "",
    religion: data.religion || "",
    maritalStatus: data.maritalStatus || "",

    emergencyName: data.emergencyName || "",
    emergencyAddress: data.emergencyAddress || "",
    emergencyRelationship: data.emergencyRelationship || "",
    emergencyPhoneHome: data.emergencyPhoneHome || "",
    emergencyPhoneCell: data.emergencyPhoneCell || "",

    konsultaEligibility: data.konsultaEligibility || "Not Set",
    createdAt: data.createdAt,
  };
}

// Inverse of responseToPatient — builds the body for POST/PUT. Backend's
// PatientRequest validates firstName/lastName/sex/dateOfBirth/address as
// required (matching the old NOT NULL columns), and never accepts
// hospitalNo — it's always DB-assigned (generate_hospital_no()), same
// "00001", "00002", ... behavior as before, just enforced entirely
// server-side now instead of by omitting the key from a Postgres insert.
function patientToRequestBody(p) {
  const body = {
    firstName: p.firstName,
    lastName: p.lastName,
    middleName: p.middleName || "",
    suffix: p.suffix || "",
    sex: p.sex || "",
    dateOfBirth: p.dateOfBirth || null,
    email: p.email || "",
    landline: p.landline || "",
    mobile: p.mobile || "",
    photo: p.photo || null,

    hasGuardian: !!p.hasGuardian,

    address: p.address || "",
    region: p.region || "",
    regionCode: p.regionCode || "",
    province: p.province || "",
    provinceCode: p.provinceCode || "",
    city: p.city || "",
    cityCode: p.cityCode || "",
    barangay: p.barangay || "",
    zipCode: p.zipCode || "",

    motherName: p.motherName || "",
    motherContact: p.motherContact || "",
    fatherName: p.fatherName || "",
    fatherContact: p.fatherContact || "",
    nationality: p.nationality || "",
    religion: p.religion || "",
    maritalStatus: p.maritalStatus || "",

    emergencyName: p.emergencyName || "",
    emergencyAddress: p.emergencyAddress || "",
    emergencyRelationship: p.emergencyRelationship || "",
    emergencyPhoneHome: p.emergencyPhoneHome || "",
    emergencyPhoneCell: p.emergencyPhoneCell || "",

    konsultaEligibility: p.konsultaEligibility || "Not Set",
  };

  // Backend deletes/keeps the guardian row purely based on this boolean
  // (see PatientService.update()) — it ignores `guardian` entirely when
  // this is false, so it's safe to always include whatever's on `p`.
  if (p.hasGuardian && p.guardian) {
    body.guardian = {
      firstName: p.guardian.firstName || "",
      lastName: p.guardian.lastName || "",
      middleName: p.guardian.middleName || "",
      suffix: p.guardian.suffix || "",
      sex: p.guardian.sex || null,
      dateOfBirth: p.guardian.dateOfBirth || null,
      pin: p.guardian.pin || "",
      landline: p.guardian.landline || "",
      mobile: p.guardian.mobile || "",
    };
  }

  return body;
}

// Every other table (encounters, lab_orders, medicine_prescriptions) FKs to
// patients.id (the internal uuid), but the rest of the app only ever deals
// in hospitalNo (the human-readable Hospital No., e.g. "00001") — this
// is the one place that bridges the two, so every other data-layer file
// can resolve "which patient row do I attach this to" without duplicating
// the lookup.
export async function getPatientUuid(hospitalNo) {
  const { data, error } = await api.get(`/api/patients/by-hospital-no/${encodeURIComponent(hospitalNo)}`);
  if (error) return null;
  return data.id;
}

// Fetches every patient. Returns [] on failure (network hiccup, expired
// token, etc.) rather than throwing, so a failed fetch degrades to an
// empty list instead of crashing the page — same "never throw" contract
// the old localStorage/Supabase versions had.
//
// NOTE: the backend's list endpoint is paginated (default 25/page) — this
// requests a large page size to approximate "load everything" and keep
// this function's contract unchanged for now. Worth revisiting with real
// pagination in the Patients list UI if the patient count grows large.
// Also: ordering changed from newest-first (created_at DESC) to
// alphabetical (last name, first name) — that's what the backend's search
// query currently sorts by. Flag if any screen depended on newest-first.
export async function loadPatients() {
  const { data, error } = await api.get("/api/patients?size=1000");
  if (error) {
    console.error("loadPatients failed:", error.message);
    return [];
  }
  return (data.content || []).map(responseToPatient);
}

// "By id" here means by Hospital No. — the sole patient identifier the
// app uses (routes, search, lookups). Kept the name findPatientById since
// every screen already calls it that; only what counts as "the id" changed.
export async function findPatientById(hospitalNo) {
  const { data, error } = await api.get(`/api/patients/by-hospital-no/${encodeURIComponent(hospitalNo)}`);
  if (error) return null;
  return responseToPatient(data);
}

// Looks for an existing patient with the same identity as the one about
// to be created — same first name + last name (case-insensitive) AND the
// same date of birth. That combination is what CreatePatientModal.jsx
// checks right before insert, to catch a nurse accidentally re-registering
// someone who already has a Hospital No. rather than reusing their
// existing record. See PatientRepository.findDuplicates() for the exact
// (deliberately narrow, not fuzzy) match logic.
//
// Returns the first match (camelCase, same shape as loadPatients()/
// findPatientById()) or null if nothing matches. Never throws — a failed
// lookup (network hiccup, etc.) degrades to "no duplicate found" rather
// than blocking patient creation entirely.
export async function findDuplicatePatient({ firstName, lastName, dateOfBirth }) {
  if (!firstName?.trim() || !lastName?.trim() || !dateOfBirth) return null;

  const params = new URLSearchParams({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    dateOfBirth,
  });
  const { data, error } = await api.get(`/api/patients/duplicate-check?${params}`);

  if (error) {
    console.error("findDuplicatePatient failed:", error.message);
    return null;
  }
  // 204 No Content (no match) comes back as data: null, error: null.
  return data ? responseToPatient(data) : null;
}

// Creates a brand-new patient record. hospitalNo is intentionally NOT
// expected on `patient` — the database assigns it automatically, simply
// "00001", "00002", "00003", ... climbing forever. The assigned value
// comes back on the returned record below.
//
// Unlike the old Supabase version, the guardian (when hasGuardian is
// true) is created atomically as part of this same call — see
// PatientService.create()'s saveGuardianIfPresent() — so there's no
// second network round-trip needed here anymore.
export async function createPatient(patient) {
  const { data, error } = await api.post("/api/patients", patientToRequestBody(patient));
  if (error) throw new Error(error.message);
  return responseToPatient(data);
}

// Read-modify-write a single patient by hospital no. Unlike Supabase's
// partial `.update(patch)` (which only touched the columns you sent),
// the backend's PUT replaces the whole record — so this fetches the
// current record first, merges `updates` on top of it, and sends the
// full merged object. Net effect on callers is identical: passing a
// partial patch (e.g. the Consultation Form only sending
// name/DOB/address/contacts) still can't accidentally wipe out
// region/city/guardian/photo/etc., since anything not in `updates`
// just carries over from `current`.
export async function updatePatient(hospitalNo, updates) {
  const current = await findPatientById(hospitalNo);
  if (!current) throw new Error("Patient not found.");

  const merged = { ...current, ...updates };
  // Explicit clear, matching the old behavior: turning hasGuardian off
  // drops any stale guardian data from the merged object being returned
  // to the caller (the backend already deletes the row regardless of
  // what `guardian` contains once hasGuardian is false).
  if (updates.hasGuardian === false) {
    merged.guardian = {};
  }

  const { data, error } = await api.put(`/api/patients/${current.id}`, patientToRequestBody(merged));
  if (error) throw new Error(error.message);

  return responseToPatient(data);
}

// Updates just the `photo` field for one patient and returns the updated
// record (or null if the patient no longer exists / the update fails).
// Kept as its own function (rather than making every caller build a full
// patient object) since Create Registration and the Patient Profile page
// both call this directly whenever a photo is captured, and neither has
// the rest of the patient record loaded at that point. Reuses
// updatePatient()'s read-modify-write above rather than duplicating it.
export async function savePatientPhoto(hospitalNo, photoDataUrl) {
  try {
    return await updatePatient(hospitalNo, { photo: photoDataUrl });
  } catch (err) {
    console.error("savePatientPhoto failed:", err.message);
    return null;
  }
}