// Reports — now pulls from real Supabase data (patients + the full
// consultation history) instead of localStorage, via fetchReportSourceData()
// below. Same rationale as utils/patients.js, utils/encounters.js, and
// utils/consultations.js: the "Reports" feature never actually connected to
// real data before, so every report on this page has always been empty in
// practice, no matter how many patients/consultations existed.
//
// Design carried over unchanged from before:
//   - "Encounter Report" reflects each saved consultation record, one row
//     per save (not per registration) — that's the data available; a
//     patient with 3 consultation saves this year shows up 3 times.
//   - "Diagnosis Report" parses the free-text Active Diagnoses field
//     (doctors write prose, not a coded list) by splitting on commas /
//     semicolons / line breaks — best-effort, not a precise clinical code.
//   - "ICD-10 Diagnosis Report" is the coded counterpart — it counts
//     distinct patients per ICD-10 code from the structured diagnosis
//     picker on the Consultation Form (form.icdDiagnoses), backed by
//     src/data/icd10Codes.js (the DOH Philippine ICD-10 Modifications
//     Handbook's common-diagnoses table). Only visits where the doctor
//     actually picked a code show up here — it won't backfill older
//     free-text-only diagnoses.
//   - "Yakap Report" approximates the DOH Yakap program's target
//     population (senior citizens, NCD risk factors) from the closest
//     existing fields, since there's no dedicated Yakap dataset yet.
//
// One thing that DID change along with the data source: consultation
// entries were previously (mis)matched by c.updatedAt, a field consultation
// saves never actually set (that's an EMR/Discharge/Konsulta/MedCert-only
// field) — so every date-filtered report silently returned zero rows
// before, regardless of how much real data existed. This version matches
// on c.createdAt, which every consultation row actually has.

import { api } from "../lib/apiClient";
import { loadPatients } from "./patients";
import { loadAllConsultations } from "./consultations";
import { loadEncounters } from "./encounters";
import { loadLabOrders, FORM_TYPE_BY_TEST } from "./labOrders";

export const REPORT_TYPES = [
  "Encounter Report",
  "Diagnosis Report",
  "ICD-10 Diagnosis Report",
  "Yakap Report",
  "Lab Order Report",
  "X-Ray Order Report",
];

// Which lab_test_catalog formTypes count as "Lab Orders" vs "X-Ray Orders"
// on this page — mirrors LabOrders.jsx / XRayOrders.jsx's own `formTypes`
// scoping exactly, so "Lab Order Report" here always lines up with what
// the Lab Orders tab shows, same for X-Ray.
export const LAB_FORM_TYPES = ["Laboratory"];
export const XRAY_FORM_TYPES = ["X-Ray", "Ultrasound & Imaging"];

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Fetches all source datasets once. Call this on mount and whenever the
// person hits Refresh, then pass the result into every function below
// instead of each one re-querying Supabase on its own — same reasoning as
// Encounters.jsx loading encounters/prescriptions once per refresh() and
// filtering/sorting them client-side from there.
export async function fetchReportSourceData() {
  const [patients, consultations, encounters, labOrders] = await Promise.all([
    loadPatients(),
    loadAllConsultations(),
    loadEncounters(),
    loadLabOrders(),
  ]);
  return { patients, consultations, encounters, labOrders };
}

function yearOf(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d.getFullYear();
}

function monthOf(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d.getMonth();
}

function patientName(patient, fallbackId) {
  if (!patient) return fallbackId || "—";
  return [patient.lastName, patient.firstName].filter(Boolean).join(", ") || fallbackId;
}

function ageOf(dateOfBirth) {
  if (!dateOfBirth) return null;
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

export function parseDiagnoses(text) {
  if (!text) return [];
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, " "));
}

export function getAvailableYears({ patients, consultations, encounters = [], labOrders = [] }) {
  const years = new Set([new Date().getFullYear()]);
  consultations.forEach((c) => {
    const y = yearOf(c.createdAt);
    if (y) years.add(y);
  });
  patients.forEach((p) => {
    const y = yearOf(p.createdAt);
    if (y) years.add(y);
  });
  encounters.forEach((e) => {
    const y = yearOf(e.dateCreated);
    if (y) years.add(y);
  });
  labOrders.forEach((o) => {
    const y = yearOf(o.dateCreated);
    if (y) years.add(y);
  });
  return Array.from(years).sort((a, b) => b - a);
}

function getEncountersForYear(consultations, year) {
  return consultations.filter((c) => yearOf(c.createdAt) === Number(year));
}

// Patients CREATED per month/year — distinct from encounters. A patient is
// only created once (via CreatePatientModal), so unlike consultations this
// reflects real, non-overwritten history — every patient ever registered
// shows up here, keyed by their record's createdAt.
export function getMonthlyPatientCounts(patients, year) {
  const counts = Array(12).fill(0);
  patients.forEach((p) => {
    if (yearOf(p.createdAt) === Number(year)) {
      const m = monthOf(p.createdAt);
      if (m !== null) counts[m] += 1;
    }
  });
  return MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }));
}

export function getYearlyPatientCounts(patients) {
  const counts = {};
  patients.forEach((p) => {
    const y = yearOf(p.createdAt);
    if (y) counts[y] = (counts[y] || 0) + 1;
  });
  const years = Object.keys(counts).map(Number).sort((a, b) => a - b);
  return years.map((year) => ({ label: String(year), value: counts[year] }));
}

// Total ER Patient vs OPD Patient registrations for a given year — this is
// per REGISTRATION (encounters.patientType), not per patient, since the
// same patient can be an ER case one visit and an OPD case the next (see
// the "Patient Type moves from Patients to Registration" schema addendum).
// Cancelled registrations are excluded — they never actually happened as a
// real visit, same reasoning Census No. discards them.
export function getPatientTypeCounts(encounters, year) {
  let er = 0;
  let opd = 0;
  encounters.forEach((e) => {
    if (e.status === "CANCELLED") return;
    if (yearOf(e.dateCreated) !== Number(year)) return;
    if (e.patientType === "ER Patient") er += 1;
    else if (e.patientType === "OPD Patient") opd += 1;
  });
  return { er, opd, total: er + opd };
}

// Same breakdown, month-by-month, for the ER vs OPD bar chart.
export function getMonthlyPatientTypeCounts(encounters, year, patientType) {
  const counts = Array(12).fill(0);
  encounters.forEach((e) => {
    if (e.status === "CANCELLED") return;
    if (e.patientType !== patientType) return;
    if (yearOf(e.dateCreated) === Number(year)) {
      const m = monthOf(e.dateCreated);
      if (m !== null) counts[m] += 1;
    }
  });
  return MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }));
}

// --- Lab Orders / X-Ray Orders analytics ------------------------------------
// `labOrders` is the shape utils/labOrders.js's loadLabOrders() returns:
// one row per ORDER, with `order.diagnostics` (array of test names on that
// order) and `order.tests[testName]` (that test's own status/queueStatus/
// etc). There's no per-test createdAt exposed here, so — same as
// getPatientTypeCounts keying off the encounter's own dateCreated rather
// than anything nested — every test on an order is counted against that
// order's single `dateCreated`.
//
// A CANCELLED test is excluded from every count below: it was ordered and
// then called off, so it never actually happened as a real diagnostic —
// same reasoning getPatientTypeCounts uses to drop CANCELLED encounters.
function testEntriesForYear(labOrders, year, formTypes) {
  const rows = [];
  labOrders.forEach((order) => {
    if (yearOf(order.dateCreated) !== Number(year)) return;
    (order.diagnostics || []).forEach((testName) => {
      if (formTypes && !formTypes.includes(FORM_TYPE_BY_TEST[testName])) return;
      const test = order.tests?.[testName];
      if (test?.status === "CANCELLED") return;
      rows.push({ testName, order });
    });
  });
  return rows;
}

// Total test-orders (not lab-order rows, individual diagnostics) for a
// year, scoped to formTypes — feeds the "Total Lab Tests" / "Total X-Ray
// Tests" stat cards.
export function getLabOrderTestTotal(labOrders, year, formTypes) {
  return testEntriesForYear(labOrders, year, formTypes).length;
}

// Month-by-month total (every test in the scope combined) — same shape as
// getMonthlyPatientTypeCounts, for the Lab/X-Ray "Monthly" bar chart.
export function getMonthlyLabOrderTestCounts(labOrders, year, formTypes) {
  const counts = Array(12).fill(0);
  testEntriesForYear(labOrders, year, formTypes).forEach(({ order }) => {
    const m = monthOf(order.dateCreated);
    if (m !== null) counts[m] += 1;
  });
  return MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }));
}

// Breakdown by individual test name for a year (e.g. how many CBC, how
// many Chest PA, etc.) scoped to formTypes — same row shape as
// getDiagnosisBreakdown (label/count/patientCount/patientNames/hospitalNos)
// so it plugs into the same bar chart + Excel export pattern.
export function getLabTestBreakdown(labOrders, year, formTypes) {
  const counts = new Map(); // testName -> { label, count, patients: Map(hospitalNo -> name) }
  testEntriesForYear(labOrders, year, formTypes).forEach(({ testName, order }) => {
    const entry = counts.get(testName) || { label: testName, count: 0, patients: new Map() };
    entry.count += 1;
    if (order.hospitalNo && !entry.patients.has(order.hospitalNo)) {
      const p = order.patient || {};
      const name = [p.lastName, p.firstName].filter(Boolean).join(", ") || order.hospitalNo;
      entry.patients.set(order.hospitalNo, name);
    }
    counts.set(testName, entry);
  });
  return Array.from(counts.values())
    .map((e) => {
      const hospitalNos = Array.from(e.patients.keys());
      const patientNames = hospitalNos.map((no) => e.patients.get(no));
      return {
        label: e.label,
        count: e.count,
        patientCount: hospitalNos.length,
        patientNames: patientNames.join("; "),
        hospitalNos: hospitalNos.join("; "),
      };
    })
    .sort((a, b) => b.count - a.count);
}

// Month-by-month count for ONE specific test name in a given year — this
// is the "how many CBC this month" / "how many patients ordered a CBC"
// answer the Reports page's test-trend picker uses.
export function getMonthlyLabTestCounts(labOrders, year, testName) {
  const counts = Array(12).fill(0);
  labOrders.forEach((order) => {
    if (yearOf(order.dateCreated) !== Number(year)) return;
    if (!(order.diagnostics || []).includes(testName)) return;
    if (order.tests?.[testName]?.status === "CANCELLED") return;
    const m = monthOf(order.dateCreated);
    if (m !== null) counts[m] += 1;
  });
  return MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }));
}

// Year-by-year count for ONE specific test name, across every year on
// record — the "how many CBC this year (and past years)" counterpart.
export function getYearlyLabTestCounts(labOrders, testName) {
  const counts = {};
  labOrders.forEach((order) => {
    if (!(order.diagnostics || []).includes(testName)) return;
    if (order.tests?.[testName]?.status === "CANCELLED") return;
    const y = yearOf(order.dateCreated);
    if (y) counts[y] = (counts[y] || 0) + 1;
  });
  const years = Object.keys(counts).map(Number).sort((a, b) => a - b);
  return years.map((year) => ({ label: String(year), value: counts[year] }));
}

// One row per distinct free-text diagnosis phrase found in Active
// Diagnoses this year — `label`/`count` stay as-is (the bar chart on the
// Reports page maps straight off those two), with `patientNames`/
// `hospitalNos` added alongside so the exported report also shows who
// those patients actually are, same as the ICD-10 report below.
export function getDiagnosisBreakdown(consultations, year) {
  const counts = new Map(); // key -> { label, count, patients: Map(hospitalNo -> displayName) }
  getEncountersForYear(consultations, year).forEach((c) => {
    parseDiagnoses(c.activeDiagnoses).forEach((dx) => {
      const key = dx.toLowerCase();
      const entry = counts.get(key) || { label: dx, count: 0, patients: new Map() };
      entry.count += 1;
      if (c.hospitalNo && !entry.patients.has(c.hospitalNo)) {
        entry.patients.set(c.hospitalNo, patientName(c.patient, c.hospitalNo));
      }
      counts.set(key, entry);
    });
  });
  return Array.from(counts.values())
    .map((e) => {
      const hospitalNos = Array.from(e.patients.keys());
      const patientNames = hospitalNos.map((no) => e.patients.get(no));
      return {
        label: e.label,
        count: e.count,
        patientCount: hospitalNos.length,
        patientNames: patientNames.join("; "),
        hospitalNos: hospitalNos.join("; "),
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function getEncounterReportRows(consultations, year) {
  return getEncountersForYear(consultations, year).map((c) => ({
    hospitalNo: c.hospitalNo,
    patientName: patientName(c.patient, c.hospitalNo),
    date: c.createdAt ? c.createdAt.slice(0, 10) : "",
    chiefComplaint: c.chiefComplaint || "",
    diagnosis: c.activeDiagnoses || "",
  }));
}

export function getYakapReportRows(consultations, year) {
  return getEncountersForYear(consultations, year)
    .filter((c) => {
      const age = ageOf(c.patient?.dateOfBirth);
      return (
        (age !== null && age >= 60) ||
        c.diagnosedDiabetes === "YES" ||
        c.anginaOrHeartAttack === "YES" ||
        c.strokeOrTIA === "YES"
      );
    })
    .map((c) => ({
      hospitalNo: c.hospitalNo,
      patientName: patientName(c.patient, c.hospitalNo),
      date: c.createdAt ? c.createdAt.slice(0, 10) : "",
      age: ageOf(c.patient?.dateOfBirth) ?? "",
      riskLevel: c.riskLevel || "",
      diabetes: c.diagnosedDiabetes || "",
      cardiac: c.anginaOrHeartAttack || "",
      stroke: c.strokeOrTIA || "",
    }));
}

// One row per ICD-10 code that's actually been assigned this year — how
// many distinct patients carry it ("how many patients have that disease",
// not a raw count of every time it was picked), plus who those patients
// actually are (name + Hospital No.), so the report is usable on its own
// without cross-referencing another list.
export function getIcd10DiagnosisReportRows(consultations, year) {
  const byCode = new Map(); // code -> { code, name, patients: Map(hospitalNo -> displayName) }
  getEncountersForYear(consultations, year).forEach((c) => {
    (c.icdDiagnoses || []).forEach((dx) => {
      if (!dx?.code) return;
      const entry = byCode.get(dx.code) || { code: dx.code, name: dx.name || "", patients: new Map() };
      if (!entry.name && dx.name) entry.name = dx.name;
      if (c.hospitalNo && !entry.patients.has(c.hospitalNo)) {
        entry.patients.set(c.hospitalNo, patientName(c.patient, c.hospitalNo));
      }
      byCode.set(dx.code, entry);
    });
  });
  return Array.from(byCode.values())
    .map((e) => {
      // Keep name/hospitalNo pairs in the same order across both lists, so
      // the Nth name always lines up with the Nth Hospital No.
      const hospitalNos = Array.from(e.patients.keys());
      const patientNames = hospitalNos.map((no) => e.patients.get(no));
      return {
        code: e.code,
        name: e.name,
        patientCount: hospitalNos.length,
        patientNames: patientNames.join("; "),
        hospitalNos: hospitalNos.join("; "),
      };
    })
    .sort((a, b) => b.patientCount - a.patientCount);
}

export function getReportRows(reportType, year, { consultations, labOrders = [] }) {
  if (reportType === "Diagnosis Report") return getDiagnosisBreakdown(consultations, year);
  if (reportType === "ICD-10 Diagnosis Report") return getIcd10DiagnosisReportRows(consultations, year);
  if (reportType === "Yakap Report") return getYakapReportRows(consultations, year);
  if (reportType === "Lab Order Report") return getLabTestBreakdown(labOrders, year, LAB_FORM_TYPES);
  if (reportType === "X-Ray Order Report") return getLabTestBreakdown(labOrders, year, XRAY_FORM_TYPES);
  return getEncounterReportRows(consultations, year);
}

// --- Generated-report ledger ("Recent Reports" table) ----------------------
// Backed by the `generated_reports` table via the Spring Boot backend's
// ReportController (GET/POST /api/reports — see
// modules/report/controller/ReportController.java). The API already
// returns/accepts camelCase field names matching what this file and
// Reports.jsx/Archive.jsx expect, so no row-shape translation is needed
// here anymore (rowToReport() is gone — the backend's ReportResponse *is*
// that shape).

export async function loadReports() {
  const { data, error } = await api.get("/api/reports");
  if (error) {
    console.error("loadReports failed:", error.message);
    return [];
  }
  return data || [];
}

// Kept for backward compatibility with any existing call sites — the id
// is no longer sent to the backend (ReportService generates it atomically
// via the same generate_daily_sequence_id('RPT-') Postgres function
// encounters/lab_orders/consultations already use), so this value is
// effectively unused now.
export function generateReportId() {
  return `RPT-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

// `report` is shaped exactly like Reports.jsx's handleGenerate already
// builds it (reportType, year, generatedBy, rowCount, status).
// generatedById is accepted for backward compatibility but ignored — the
// backend derives "who generated this" from the caller's own JWT
// (CurrentUserProvider) rather than trusting a client-supplied id.
export async function addReport(report, generatedById = null) { // eslint-disable-line no-unused-vars
  const { data, error } = await api.post("/api/reports", {
    reportType: report.reportType,
    year: Number(report.year),
    generatedBy: report.generatedBy || null,
    rowCount: report.rowCount || 0,
    status: report.status || "Completed",
  });
  if (error) throw new Error(error.message);
  return data;
}

// Archive.jsx's "Delete Permanently" button on the Archived Generated
// Reports tab. Admin-only, enforced server-side.
export async function deleteReport(id) {
  const { error } = await api.del(`/api/reports/${encodeURIComponent(id)}`);
  if (error) throw new Error(error.message);
}