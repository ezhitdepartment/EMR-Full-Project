// Lab Orders data layer — backed by the Spring Boot LabOrderController
// (/api/lab-orders, /api/encounters/{id}/lab-order,
// /api/lab-orders/{id}/files, /api/lab-order-files/{id}) instead of
// Supabase (`lab_orders` + `lab_order_tests` + `lab_order_files` +
// the "lab-order-files" Storage bucket).
//
// The rest of the app keeps working against the same shape it always has:
//   order.diagnostics -> array of test names on this order
//   order.testDetails -> { [testName]: freeTextDetail }
//   order.tests        -> { [testName]: testRecord }
//   order.files        -> [...] — ONE shared list of result files for the
//                          whole order, not nested per test anymore. Every
//                          diagnostic on the order shares this same list
//                          (see ViewLabOrderPage.jsx's Files section).
// testRecord shape (code, status, queueStatus, isReferred, performedBy,
// datePerformed, fee, results: { remarks }) no longer carries its own
// `files` — that moved up to order.files above. Each file lives on local
// disk / the NAS mount via FileStorageService instead of Supabase Storage,
// and viewing/downloading one goes through an authenticated streaming
// endpoint instead of a signed URL. See uploadLabOrderFile / deleteLabOrderFile
// / getLabOrderFileUrl below for the new file flow.
//
// Role-based scoping that used to be enforced by RLS (a med_tech only ever
// seeing Laboratory orders, an xray_tech only X-Ray/Ultrasound & Imaging)
// is now enforced server-side in LabOrderService — nothing extra needs to
// happen here for that. The old Cashier payment-status gate has been
// removed entirely: Med Tech/X-ray Tech can see and work an order as soon
// as it's created, no "must be marked Paid" step in between.

import { api, getToken, BASE_URL } from "../lib/apiClient";
import { getPatientUuid } from "./patients";

export const DIAGNOSTIC_GROUPS = {
  Hematology: ["CBC", "CBC w/ PC", "ESR", "Platelet Count", "Differential Count", "PT", "aPTT"],
  "Blood Chemistry": [
    "Hgt", "FBS", "Lipid Profile", "SGPT", "SGOT", "Cholesterol", "Triglyceride",
    "HbA1c", "BUN", "Creatinine", "BUA",
  ],
  "Cardiac Markers": ["CK-MB", "CPK", "CPK-MM", "Troponin I", "Troponin T"],
  Cardiology: ["ECG"],
  Electrolytes: [
    "Sodium Na+", "Potassium K+", "Chloride Cl-", "Ionized Calcium", "Lithium",
    "Inorganic Phosphorous", "Magnesium",
  ],
  Hepatitis: ["Anti HAV IgG", "Anti HAV IgM", "HBcAb", "HBcAb IgM", "HBsAb", "HBsAg"],
  Thyroid: ["T3", "T4", "TSH", "Free T3", "Free T4"],
  "Other Laboratory Tests": [
    "Urinalysis", "Fecalysis", "Occult Blood",
    "Drug Test - Methamphetamine/Marijuana", "Others (Laboratory)",
  ],
  "X-Ray": [
    "Chest PA (Adult)", "AP/LAT (Adult)", "AP/LAT (Pedia)", "Plain Abdomen",
    "Apico-Lordotic", "Thoracic Cage", "Skull X-Ray", "Lumbo-Sacral AP/LAT (Adult)",
    "Lumbo-Sacral AP/LAT (Pedia)", "Pelvic X-Ray", "Extremities", "Others (X-Ray)",
  ],
  "Ultrasound & Imaging": [
    "Whole Abdominal Ultrasound", "HBT Ultrasound", "KUB", "KUB w/ Prostate",
    "TransVaginal Ultrasound", "Pelvic Ultrasound", "Bio-Physical Score",
    "2D Echocardiogram", "CT Scan", "MRI", "Others (Ultrasound & Imaging)",
  ],
};

export const DIAGNOSTIC_OPTIONS = Object.values(DIAGNOSTIC_GROUPS).flat();

// Which request-slip formType each group belongs to — mirrors
// lab_test_catalog.form_type / current_user_can_access_form_type() in the
// original SQL schema (now LabOrderService's ROLE_FORM_TYPES), so a Med
// Tech only ever sees Laboratory and an X-ray Tech only sees
// X-Ray/Ultrasound & Imaging.
export const FORM_TYPE_BY_GROUP = {
  Hematology: "Laboratory",
  "Blood Chemistry": "Laboratory",
  "Cardiac Markers": "Laboratory",
  Cardiology: "Laboratory",
  Electrolytes: "Laboratory",
  Hepatitis: "Laboratory",
  Thyroid: "Laboratory",
  "Other Laboratory Tests": "Laboratory",
  "X-Ray": "X-Ray",
  "Ultrasound & Imaging": "Ultrasound & Imaging",
};

export const FORM_TYPE_BY_TEST = {};
Object.entries(DIAGNOSTIC_GROUPS).forEach(([group, tests]) => {
  tests.forEach((t) => (FORM_TYPE_BY_TEST[t] = FORM_TYPE_BY_GROUP[group]));
});

// Which formTypes a role is allowed to work on — mirrors
// LabOrderService.ROLE_FORM_TYPES exactly. Admin and nurses aren't
// restricted (nurses only ever create orders, never touch results), only
// the two tech roles are scoped.
export const ROLE_TEST_TYPES = {
  med_tech: ["Laboratory"],
  xray_tech: ["X-Ray", "Ultrasound & Imaging"],
};

export const STATUS_OPTIONS = ["PENDING", "DONE", "CANCELLED"];

export const STATUS_STYLES = {
  PENDING: "bg-amber-100 text-amber-700",
  DONE: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function rowToTestRecord(t) {
  return {
    id: t.id, // uuid — needed for the tests PATCH endpoint
    code: t.code || "",
    status: t.status || "PENDING",
    queueStatus: t.queueStatus || "WAITING",
    isReferred: t.isReferred || "",
    performedBy: t.performedBy || "",
    datePerformed: t.datePerformed || "",
    fee: t.fee ?? "",
    testDetail: t.testDetail || "",
    results: { remarks: t.remarks || "" },
  };
}

function rowToOrder(row) {
  if (!row) return null;
  const tests = {};
  const diagnostics = [];
  const testDetails = {};
  (row.tests || []).forEach((t) => {
    diagnostics.push(t.testName);
    tests[t.testName] = rowToTestRecord(t);
    if (t.testDetail) testDetails[t.testName] = t.testDetail;
  });

  return {
    id: row.id,
    encounterId: row.encounterId || null,
    hospitalNo: row.hospitalNo || "",
    patient: {
      firstName: row.patientFirstName || "",
      lastName: row.patientLastName || "",
      middleName: row.patientMiddleName || "",
      sex: row.patientSex || "",
      dateOfBirth: row.patientDateOfBirth || "",
    },
    diagnostics,
    testDetails,
    tests,
    // One shared list of uploaded result files for the WHOLE order, not
    // per diagnostic test — see ViewLabOrderPage.jsx's Files section.
    files: (row.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      storagePath: f.storagePath,
      uploadedAt: f.uploadedAt,
    })),
    createdBy: row.createdByUsername || "—",
    dateCreated: row.dateCreated,
  };
}

// The list endpoint is paginated (default 25/page) and already scoped by
// role/formType server-side (LabOrderService.search()) — this requests a
// large page size to approximate "load everything", same pattern
// utils/patients.js's loadPatients() uses. Ordering (newest first) is the
// backend's default too, so no client-side sort is needed.
export async function loadLabOrders() {
  const { data, error } = await api.get("/api/lab-orders?size=10000");
  if (error) {
    console.error("loadLabOrders failed:", error.message);
    return [];
  }
  return (data.content || []).map(rowToOrder);
}

export async function findLabOrderById(orderId) {
  const { data, error } = await api.get(`/api/lab-orders/${encodeURIComponent(orderId)}`);
  if (error) return null;
  return rowToOrder(data);
}

// Creates a new order plus one lab_order_tests row per selected diagnostic.
// `tests` is keyed by test name and only needs `code` at creation time
// (CreateLabOrderModal.jsx pre-generates each code via
// generateDiagnosticCode before calling this) — everything else defaults
// on the backend side (status PENDING, queueStatus WAITING).
export async function createLabOrder({
  hospitalNo,
  diagnostics,
  testDetails,
  tests,
  createdBy,
  encounterId = null,
}) {
  const patientUuid = await getPatientUuid(hospitalNo);
  if (!patientUuid) throw new Error(`No patient found with Hospital No. "${hospitalNo}"`);

  // createdBy is accepted for signature compatibility with existing call
  // sites, but is no longer sent — the backend derives the creator from
  // the authenticated request (CurrentUserProvider) instead of trusting a
  // client-supplied id.
  void createdBy;

  const testCodes = {};
  (diagnostics || []).forEach((name) => {
    const code = tests?.[name]?.code;
    if (code) testCodes[name] = code;
  });

  const { data, error } = await api.post("/api/lab-orders", {
    patientId: patientUuid,
    encounterId: encounterId || null,
    diagnostics,
    testDetails: testDetails || {},
    testCodes,
  });
  if (error) throw new Error(error.message);

  return rowToOrder(data);
}

// Same job as createLabOrder(), but scoped to a single registration
// (encounter) instead of always inserting a fresh order: doctors can save
// the Consultation Form's Diagnostics/Tests Ordered section as many times
// as they like for the same visit and it will only ever affect ONE lab
// order, syncing that order's tests to match whatever is currently
// checked rather than stacking up a duplicate order per save.
//
// `encounterId` is what "one lab order per registration" is actually keyed
// on — lab_orders.encounter_id has a unique index (uq_lab_orders_one_per_encounter)
// so at most one order can ever exist per encounter. When encounterId is
// null (the Consultation Form was opened outside of a specific
// registration), this just falls back to the old always-insert behavior,
// since there's no registration to scope an upsert to.
//
// The add/remove/refresh-testDetail sync logic that used to live here now
// lives entirely in LabOrderService.upsertForEncounter() on the backend —
// this is a single PUT call.
export async function upsertLabOrderForEncounter({
  encounterId,
  hospitalNo,
  diagnostics,
  testDetails,
  createdBy,
}) {
  if (!encounterId) {
    return createLabOrder({ hospitalNo, diagnostics, testDetails, createdBy });
  }

  const patientUuid = await getPatientUuid(hospitalNo);
  if (!patientUuid) throw new Error(`No patient found with Hospital No. "${hospitalNo}"`);

  const { data, error } = await api.put(`/api/encounters/${encodeURIComponent(encounterId)}/lab-order`, {
    patientId: patientUuid,
    diagnostics: diagnostics || [],
    testDetails: testDetails || {},
  });
  if (error) throw new Error(error.message);

  return rowToOrder(data);
}

// Read-modify-write a single order by id — same call shape as before
// (`updater` receives the current order, returns the patch). Every
// existing call site only ever replaces ONE test's entry inside
// `order.tests` with a new object (spreading the rest), so a test is only
// PATCHed back to the backend if its reference actually changed.
// Order-level fields (diagnostics/testDetails) aren't mutated after
// creation by anything currently in the app, so there's nothing else to
// diff here.
//
// NOTE on clearing a field: LabOrderTestUpdateRequest only applies fields
// that are non-null (see LabOrderService.updateTest) — so for any of the
// fields below, sending null/undefined (e.g. an empty `fee`, `testDetail`,
// `performedBy`, etc.) leaves whatever was already saved untouched rather
// than clearing it back to blank. `remarks` is the one exception: it's
// read via `?? null` instead of `|| null`, so an explicit "" IS sent
// through and does clear it — matching how the Results panel's textarea
// is actually used (clearing Remarks is a real action; the other fields
// are set-once-and-done in practice). That's a backend partial-patch
// design choice, not something this function can fully work around on its
// own — flag it if any screen needs to genuinely blank out one of the
// other fields.
export async function updateLabOrder(orderId, updater) {
  const current = await findLabOrderById(orderId);
  if (!current) return null;

  const next = updater({ ...current });
  const nextTests = next.tests || {};
  const prevTests = current.tests || {};

  for (const testName of Object.keys(nextTests)) {
    if (nextTests[testName] === prevTests[testName]) continue;

    const rec = nextTests[testName];
    const testId = rec.id || prevTests[testName]?.id;
    if (!testId) continue; // no backend row to PATCH yet (shouldn't normally happen)

    const { error } = await api.patch(
      `/api/lab-orders/${encodeURIComponent(orderId)}/tests/${encodeURIComponent(testId)}`,
      {
        status: rec.status || null,
        queueStatus: rec.queueStatus || null,
        isReferred: rec.isReferred || null,
        performedBy: rec.performedBy || null,
        datePerformed: rec.datePerformed || null,
        fee: rec.fee === "" || rec.fee == null ? null : Number(rec.fee),
        remarks: rec.results?.remarks ?? null,
        testDetail: rec.testDetail || null,
      }
    );
    if (error) console.error("updateLabOrder failed:", error.message);
  }

  return findLabOrderById(orderId);
}

// ---------------------------------------------------------------------
// Result files — now stored on local disk / the NAS mount via the
// backend's FileStorageService ("lab-order-files" bucket), not Supabase
// Storage. One shared set of files per ORDER (not per individual
// diagnostic test) — every test listed on the order shares the same
// upload area, addressed by the order's own `id`.
//
// Upload and download both need to bypass apiClient's JSON-only
// request() helper — upload is multipart, download needs the raw
// Response body, not a parsed JSON payload — so both build their own
// fetch() call here, attaching the same Bearer token apiClient uses.
// ---------------------------------------------------------------------

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadLabOrderFile(orderId, file, uploadedBy) {
  // uploadedBy is accepted for signature compatibility with existing call
  // sites, but is no longer sent — the backend derives the uploader from
  // the authenticated request instead.
  void uploadedBy;

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/lab-orders/${encodeURIComponent(orderId)}/files`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    let message = res.statusText || `Upload failed (${res.status})`;
    try {
      const payload = await res.json();
      message = payload?.error || message;
    } catch {
      // response wasn't JSON — fall back to statusText above
    }
    throw new Error(message);
  }
}

export async function deleteLabOrderFile(fileId, storagePath) {
  // storagePath is accepted for signature compatibility with existing
  // call sites, but is no longer needed — the backend looks up and
  // deletes the file's on-disk path itself from just the id.
  void storagePath;

  const { error } = await api.del(`/api/lab-order-files/${encodeURIComponent(fileId)}`);
  if (error) throw new Error(error.message);
}

// Files are served from an authenticated streaming endpoint now, not a
// signed Storage URL — a plain window.open(url) can't attach the Bearer
// token, so this fetches the file as a blob and hands back a short-lived
// local object URL instead. Call this right before opening/viewing the
// file; the caller is responsible for the resulting object URL (it isn't
// auto-revoked), same lifetime expectation the old hour-long signed URL
// had in practice.
export async function getLabOrderFileUrl(fileId) {
  try {
    const res = await fetch(`${BASE_URL}/api/lab-order-files/${encodeURIComponent(fileId)}/download`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      console.error("getLabOrderFileUrl failed:", res.statusText || `status ${res.status}`);
      return null;
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error("getLabOrderFileUrl failed:", err.message);
    return null;
  }
}

// Archive.jsx's "Delete Permanently" button on the Cancelled Lab Orders
// tab. Admin-only, and only allowed once every test on the order is
// CANCELLED — the backend enforces both (see LabOrderService.deletePermanently)
// and returns a clear error message otherwise, which this throws.
export async function deleteLabOrder(orderId) {
  const { error } = await api.del(`/api/lab-orders/${encodeURIComponent(orderId)}`);
  if (error) throw new Error(error.message);
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