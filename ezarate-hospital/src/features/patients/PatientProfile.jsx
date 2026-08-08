import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, MapPin, Users as UsersIcon, Ruler } from "lucide-react";
import AnthropometricsModal from "./AnthropometricsModal";

const STORAGE_KEY = "patientRecords";

function loadRecords() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
}

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2.5 border-b border-slate-100 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 col-span-1">
        {label}
      </p>
      <p className="text-sm text-slate-800 col-span-2">{value || "—"}</p>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-1">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(undefined); // undefined = loading, null = not found
  const [showAnthropometrics, setShowAnthropometrics] = useState(false);

  useEffect(() => {
    const records = loadRecords();
    setPatient(records.find((r) => r.hospitalRecordNo === id) || null);
  }, [id]);

  // Merge a patch into this patient's record, both in localStorage and in
  // local state, so the profile updates immediately without a refetch.
  function updatePatient(patch) {
    const records = loadRecords();
    const idx = records.findIndex((r) => r.hospitalRecordNo === id);
    if (idx === -1) return;
    const updated = { ...records[idx], ...patch };
    records[idx] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    setPatient(updated);
  }

  if (patient === undefined) {
    return null;
  }

  if (!patient) {
    return (
      <div className="max-w-3xl">
        <button
          type="button"
          onClick={() => navigate("/patients")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800 mb-6"
        >
          <ArrowLeft size={16} />
          Back to Patients
        </button>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 text-center">
          <p className="text-sm font-semibold text-slate-800 mb-1">Patient not found</p>
          <p className="text-xs text-slate-500">
            This record may have been removed, or the link is out of date.
          </p>
        </div>
      </div>
    );
  }

  const fullName = [patient.lastName, patient.firstName, patient.middleName]
    .filter(Boolean)
    .join(", ");
  const initials = `${patient.firstName?.[0] || ""}${patient.lastName?.[0] || ""}`.toUpperCase();
  const age = calcAge(patient.dateOfBirth);

  return (
    <div className="max-w-6xl">
      {/* Breadcrumb */}
      <Link
        to="/patients"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800 mb-6"
      >
        <ArrowLeft size={16} />
        Back to Patients
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Side panel */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col items-center text-center">
            {/* Placeholder for profile photo — swap for an <img> once photo
                upload is built. */}
            <div className="w-24 h-24 rounded-full bg-teal-50 border-2 border-dashed border-teal-200 flex items-center justify-center text-teal-700 text-2xl font-semibold mb-4">
              {initials || <User size={32} />}
            </div>
            <h1 className="text-base font-semibold text-slate-800">{fullName || "—"}</h1>
            <p className="text-xs text-slate-500 mt-0.5">Patient ID: {patient.hospitalRecordNo}</p>

            {patient.classification && (
              <span className="mt-3 inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200">
                {patient.classification}
              </span>
            )}

            <div className="w-full border-t border-slate-100 mt-5 pt-4 space-y-2.5 text-left">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <UsersIcon size={14} className="text-slate-400 shrink-0" />
                {patient.gender || "—"} {age !== null ? `· ${age} yrs old` : ""}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Mail size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{patient.email || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Phone size={14} className="text-slate-400 shrink-0" />
                {patient.phoneCell || patient.phoneHome || "—"}
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <span>{patient.residentialAddress || "—"}</span>
              </div>
            </div>
          </div>

          {/* Anthropometrics — opens the measurement/vision modal */}
          <button
            type="button"
            onClick={() => setShowAnthropometrics(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 text-sm font-medium shadow-sm transition-colors"
          >
            <Ruler size={16} />
            Anthropometrics
          </button>
        </div>

        {/* Main content */}
        <div className="space-y-5">
          <Card title="Basic Information">
            <InfoRow label="Last Name" value={patient.lastName} />
            <InfoRow label="First Name" value={patient.firstName} />
            <InfoRow label="Middle Name" value={patient.middleName} />
            <InfoRow label="Suffix" value={patient.suffix} />
            <InfoRow label="Sex" value={patient.gender} />
            <InfoRow label="Date of Birth" value={patient.dateOfBirth} />
            <InfoRow label="Age" value={age !== null ? `${age} years old` : "—"} />
            <InfoRow label="Email" value={patient.email} />
            <InfoRow label="Landline No." value={patient.phoneHome} />
            <InfoRow label="Mobile No." value={patient.phoneCell} />
          </Card>

          <Card title="Anthropometrics">
            {patient.anthropometrics ? (
              <>
                <InfoRow label="Systolic" value={patient.anthropometrics.systolic} />
                <InfoRow label="Diastolic" value={patient.anthropometrics.diastolic} />
                <InfoRow label="Heart Rate" value={patient.anthropometrics.heartRate} />
                <InfoRow label="Respiratory Rate" value={patient.anthropometrics.respiratoryRate} />
                <InfoRow label="Temperature" value={patient.anthropometrics.temperature} />
                <InfoRow label="Height (cm)" value={patient.anthropometrics.height} />
                <InfoRow label="Weight (kg)" value={patient.anthropometrics.weight} />
                <InfoRow label="BMI" value={patient.anthropometrics.bmi} />
                <InfoRow label="Left Vision" value={patient.anthropometrics.leftVision} />
                <InfoRow label="Right Vision" value={patient.anthropometrics.rightVision} />
              </>
            ) : (
              <p className="text-xs text-slate-400">
                No anthropometrics recorded yet. Use the Anthropometrics button on the left to add one.
              </p>
            )}
          </Card>

          <Card title="Address">
            <InfoRow label="Address" value={patient.residentialAddress} />
            <InfoRow label="Barangay" value={patient.barangay} />
            <InfoRow label="City" value={patient.city} />
            <InfoRow label="Province" value={patient.province} />
            <InfoRow label="Region" value={patient.region} />
          </Card>

          {patient.hasGuardian && (
            <Card title="Guardian Details">
              <InfoRow
                label="Name"
                value={[patient.guardianLastName, patient.guardianFirstName, patient.guardianMiddleName]
                  .filter(Boolean)
                  .join(", ")}
              />
              <InfoRow label="Sex" value={patient.guardianGender} />
              <InfoRow label="Date of Birth" value={patient.guardianDateOfBirth} />
              <InfoRow label="Landline No." value={patient.guardianPhoneHome} />
              <InfoRow label="Mobile No." value={patient.guardianPhoneCell} />
            </Card>
          )}

          {/* Clinical modules (encounters, lab orders, etc.) will surface
              here once those features are built. */}
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
            Registrations, lab results, and visit history will appear here once those modules are connected.
          </div>
        </div>
      </div>

      {showAnthropometrics && (
        <AnthropometricsModal
          initialValues={patient.anthropometrics}
          onClose={() => setShowAnthropometrics(false)}
          onSave={(values) => {
            updatePatient({ anthropometrics: values });
            setShowAnthropometrics(false);
          }}
        />
      )}
    </div>
  );
}