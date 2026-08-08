// Admitted Patients — read-only list, derived entirely from data that
// already exists (consultations.disposition, plus the patients/encounters
// tables it's joined against). No new table or column is needed for this
// feature.
//
// WHY THIS WORKS WITHOUT ANY NEW STATE: saveConsultationEntry() (see
// utils/consultations.js) upserts ONE row per (encounter_id, author_role)
// — a doctor's second save of the same registration UPDATES their
// existing row instead of adding a new one. So the instant a doctor
// changes a patient's Disposition from "Admitted" to "Discharged" (or
// anything else) and saves, that same consultations row's `disposition`
// column changes in place — which means this list, simply filtered to
// `disposition = 'Admitted'`, is always exactly "every registration whose
// most recent doctor consultation says Admitted" with zero extra
// bookkeeping. A patient falls off this list the moment their disposition
// is updated to something else; nothing needs to be "closed out" by hand.
//
// Only doctor-authored consultations are considered — Disposition is a
// DOCTOR_SECTIONS field on the Consultation Form (see ConsultationForm.jsx),
// so a nurse's own consultation row for the same registration never has a
// disposition value to begin with.
//
// Now backed by the Spring Boot backend's AdmittedPatientController (see
// modules/admittedpatient/controller/AdmittedPatientController.java)
// instead of a direct Supabase query — the join/dedupe-by-patient logic
// that used to live in rowToAdmittedPatient()/loadAdmittedPatients() below
// now lives server-side in AdmittedPatientService, so GET /api/admitted-patients
// already comes back deduped and camelCase, ready to use as-is.

import { api } from "../lib/apiClient";
import { loadConsultationHistory } from "./consultations";
import { findEncounterById } from "./encounters";

// Returns [] on failure rather than throwing, same convention as
// loadEncounters()/loadPatients(), so a failed fetch degrades to an empty
// list instead of crashing the page.
export async function loadAdmittedPatients() {
  const { data, error } = await api.get("/api/admitted-patients");
  if (error) {
    console.error("loadAdmittedPatients failed:", error.message);
    return [];
  }
  return data || [];
}

// Resolves everything MedicalAbstractPDF needs beyond the flattened
// summary row this file already returns from loadAdmittedPatients() — the
// full doctor consultation entry (Signs & Symptoms, Physical Exam,
// Course in the Ward, etc.), the matching ER/OPD nurse entry (Past
// Medical History, OB/GYN History), that encounter's triage vitals, and
// any lab/x-ray/ultrasound tests ordered against the same admission (for
// "Ancillaries Done"). Same three-source resolution PatientProfile.jsx's
// resolveCF4Sources() already does for CF4 — a Medical Abstract summarizes
// the exact same admission, just laid out differently on paper.
export async function resolveMedicalAbstractSources(record) {
  const history = await loadConsultationHistory(record.hospitalNo);
  const doctorEntries = history.filter((e) => e.authorRole === "doctor" || e.authorRole === "admin");
  const nurseEntries = history.filter((e) => e.authorRole === "er_nurse" || e.authorRole === "opd_nurse");

  const doctorEntry =
    (record.encounterId && doctorEntries.find((e) => e.encounterId === record.encounterId)) ||
    doctorEntries.find((e) => e.id === record.consultationId) ||
    doctorEntries[0] ||
    {};

  const erEntry =
    (doctorEntry.encounterId && nurseEntries.find((e) => e.encounterId === doctorEntry.encounterId)) ||
    nurseEntries[0] ||
    {};

  const encounterId = doctorEntry.encounterId || record.encounterId || null;

  let triage = null;
  let ancillaries = [];
  if (encounterId) {
    const encounter = await findEncounterById(encounterId);
    triage = encounter?.triage || null;

    const { data, error } = await api.get(`/api/encounters/${encounterId}/lab-order/tests`);
    if (error) {
      console.error("resolveMedicalAbstractSources: loading ancillaries failed:", error.message);
    } else {
      ancillaries = data || [];
    }
  }

  return {
    patient: {
      hospitalNo: record.hospitalNo,
      lastName: record.lastName,
      firstName: record.firstName,
      middleName: record.middleName,
      sex: record.sex,
      dateOfBirth: record.dateOfBirth,
      address: record.address,
    },
    doctorEntry,
    erEntry,
    triage,
    ancillaries,
  };
}

// "Discharged" quick action from the Admitted Patients list itself — flips
// that patient's most recent doctor consultation Disposition away from
// "Admitted" without needing to open the full Consultation Form. Since
// this list is simply "every consultation row where disposition =
// 'Admitted'" (see the file banner above), updating that same row's
// disposition here is exactly what makes the patient drop off the list on
// the next refresh — nothing else needs to be touched.
export async function dischargeAdmittedPatient(consultationId) {
  const { error } = await api.patch(`/api/admitted-patients/${consultationId}/discharge`);
  if (error) {
    console.error("dischargeAdmittedPatient failed:", error.message);
    return { error: error.message };
  }
  return { error: null };
}