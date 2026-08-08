// Single source of truth for the sidebar. Add a new page by adding one
// entry here plus the route in App.jsx — the sidebar updates automatically.
// `feature` maps each item to the access list in data/roles.js — that's
// what actually decides who sees it; this file is just labels/paths/icons.
export const navGroups = [
  {
    label: "Main",
    items: [
      // Feature key isn't listed for any staff role above, so — same as
      // everything else here — hasFeatureAccess() decides visibility:
      // admin's "all" access picks it up automatically, no staff role does.
      { label: "Dashboard", path: "/admin", icon: "LayoutDashboard", feature: "adminDashboard" },
      { label: "Registration", path: "/encounters", icon: "Stethoscope", feature: "registration" },
      { label: "Patients", path: "/patients", icon: "Users", feature: "patients" },
      { label: "Admitted Patients", path: "/admitted-patients", icon: "BedDouble", feature: "admittedPatients" },
      { label: "Lab Orders", path: "/lab-orders", icon: "FlaskConical", feature: "labOrders" },
      { label: "X-Ray Orders", path: "/xray-orders", icon: "Activity", feature: "xrayOrders" },
      {
        label: "Medicine Prescriptions",
        path: "/medicine-prescriptions",
        icon: "Pill",
        feature: "medicinePrescriptions",
      },
      { label: "Reports", path: "/reports", icon: "FileBarChart2", feature: "reports" },
      { label: "Archive", path: "/archive", icon: "Archive", feature: "archive" },
      // Its own "medicines" feature key (not "adminTools") so Pharmacist
      // can see it too — was previously bundled under the Admin group
      // below, which only ever included true admin-only tools.
      { label: "Medicines", path: "/admin/medicines", icon: "Package2", feature: "medicines" },
    ],
  },
  {
    label: "PHC",
    items: [
      { label: "Masterlist", path: "/phc/masterlist", icon: "ClipboardList", feature: "masterlist" },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Roles", path: "/admin/roles", icon: "ShieldCheck", feature: "adminTools" },
      { label: "Audit Logs", path: "/admin/audit-logs", icon: "History", feature: "adminTools" },
      { label: "Settings", path: "/admin/settings", icon: "Settings", feature: "adminTools" },
    ],
  },
];