// Medicines (formulary catalog) data layer — backed by the Spring Boot
// ReferenceDataController (/api/medicines) instead of Supabase's
// `medicine_catalog` table. Same pattern as utils/medicinePrescriptions.js /
// utils/patients.js: thin wrappers around the shared api client.
//
// Auth: reading is open to every authenticated role; adding/removing is
// @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')") on the backend (see
// ReferenceDataController) — matches the old "medicine_catalog: insert" /
// "medicine_catalog: delete" RLS policies. Anyone else calling
// addMedicine()/deleteMedicine() gets a 403 back as an Error.
//
// One behavior note versus the old Supabase version: `medicine_catalog.name`
// has no auto-generated id, so the backend's save() acts as an upsert on
// that primary key rather than raising a unique-violation on an exact
// duplicate. The case-insensitive pre-check below is what actually stops a
// duplicate entry now — there's no DB-level error to fall back on for that.

import { api } from "../lib/apiClient";

// Loads every medicine in the catalog, alphabetically (already sorted by
// the backend).
export async function loadMedicines() {
  const { data, error } = await api.get("/api/medicines");
  if (error) {
    console.error("loadMedicines failed:", error.message);
    return [];
  }
  return data || [];
}

// Adds a new medicine to the catalog. Trims whitespace and checks for a
// case-insensitive duplicate before hitting the DB. Throws a friendly
// Error on failure so the modal can just show err.message.
export async function addMedicine(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    throw new Error("Enter a medicine name.");
  }

  const existing = await loadMedicines();
  const alreadyExists = existing.some((n) => n.toLowerCase() === trimmed.toLowerCase());
  if (alreadyExists) {
    throw new Error(`"${trimmed}" is already in the formulary.`);
  }

  const { error } = await api.post("/api/medicines", trimmed);
  if (error) {
    throw new Error(error.message);
  }

  return trimmed;
}

// Removes a medicine from the catalog by its exact name.
export async function deleteMedicine(name) {
  const { error } = await api.del(`/api/medicines/${encodeURIComponent(name)}`);
  if (error) {
    throw new Error(error.message);
  }
}