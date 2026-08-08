// Single source of truth for the app's roles — Login.jsx uses ROLE_OPTIONS
// for the role selector, AppRoutes.jsx uses STAFF_ROLES to decide who gets
// the staff dashboard. Add a role here once and both places pick it up.

export const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "doctor", label: "Doctor" },
  { value: "er_nurse", label: "ER Nurse" },
  { value: "opd_nurse", label: "OPD Nurse" },
  { value: "med_tech", label: "Med Tech" },
  { value: "xray_tech", label: "X-ray Tech" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "staff", label: "Staff" },
];

// Every role except "admin" is a staff-dashboard role — used by AppRoutes.jsx
// to decide who gets the dashboard at all (before ROLE_FEATURE_ACCESS below
// decides *which parts* of it they see). Admin gets the dashboard too (see
// AppRoutes.jsx), just via its own check since it also keeps its separate
// /admin area.
export const STAFF_ROLES = [
  "doctor", "er_nurse", "opd_nurse", "med_tech", "xray_tech",
  "pharmacist", "staff",
];

// Which dashboard features (see the `feature` key on each item in
// data/navigation.js) each role can see/reach. "all" means unrestricted —
// currently only Admin. Add a new role's dashboard access here; Sidebar.jsx
// and AppRoutes.jsx both read from this so they can't drift apart.
// "labOrders" and "xrayOrders" are two SEPARATE sidebar tabs/pages (Lab
// Orders vs X-Ray Orders — see LabOrders.jsx / XRayOrders.jsx), even though
// under the hood they both read/write the same `lab_orders` /
// `lab_order_tests` tables, just scoped to a different set of diagnostic
// tests (Laboratory vs X-Ray/Ultrasound & Imaging — see FORM_TYPE_BY_TEST
// in utils/labOrders.js). A role can be granted one, the other, or both:
//   - med_tech only ever needs Laboratory results -> "labOrders" only.
//   - xray_tech only ever needs X-Ray/Ultrasound results -> "xrayOrders" only.
//   - everyone else who touches orders across both specialties (nurses,
//     admin) gets both, so nothing they created disappears from view
//     depending on which tab they happen to be on.
//
// NOTE: "xrayOrders" is a FRONTEND-ONLY distinction (which nav tab shows,
// which route a role can reach). It is intentionally NOT mirrored as its
// own row in the Supabase `role_feature_access` table — server-side RLS on
// lab_orders/lab_order_tests still checks the single 'labOrders' feature
// flag (see current_user_has_feature('labOrders') in the SQL schema) plus
// current_user_can_access_form_type() to scope which tests a tech role can
// see/edit. xray_tech already has a 'labOrders' row in that DB table from
// the original schema — leave it there; removing it would break xray_tech's
// actual data access even though their sidebar no longer shows a tab
// literally labeled "Lab Orders".
export const ROLE_FEATURE_ACCESS = {
  admin: "all",
  er_nurse: ["registration", "patients", "admittedPatients", "labOrders", "xrayOrders", "reports", "masterlist", "archive"],
  opd_nurse: ["registration", "patients", "admittedPatients", "labOrders", "xrayOrders", "reports", "masterlist", "archive"],
  doctor: ["registration", "patients", "admittedPatients", "labOrders", "xrayOrders", "medicinePrescriptions", "reports", "masterlist", "archive"],
  med_tech: ["patients", "labOrders", "reports", "masterlist", "archive"],
  xray_tech: ["patients", "xrayOrders", "reports", "masterlist", "archive"],
  pharmacist: ["medicinePrescriptions", "medicines", "reports", "archive"],
  staff: ["registration", "patients", "archive", "reports"],
};

// Explicit exceptions layered on top of ROLE_FEATURE_ACCESS above. Admin's
// "all" access is intentionally broad — new features show up for admin
// automatically without needing to be listed — so this is only for the rare
// case where a role should NOT see a feature despite otherwise having
// broad/full access to everything else. Yakap Tracker is retired for every
// role (see ROLE_FEATURE_ACCESS above); admin needs the explicit denial
// here too since "all" would otherwise still grant it.

export const ROLE_FEATURE_DENYLIST = {};

export function hasFeatureAccess(role, feature) {
  if (ROLE_FEATURE_DENYLIST[role]?.includes(feature)) return false;
  const allowed = ROLE_FEATURE_ACCESS[role];
  if (allowed === "all") return true;
  return Array.isArray(allowed) && allowed.includes(feature);
}