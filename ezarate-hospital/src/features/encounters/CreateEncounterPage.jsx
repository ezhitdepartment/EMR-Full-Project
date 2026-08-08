import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  FilterX,
  ChevronsUpDown,
  RefreshCw,
  Camera,
  Upload,
  User,
  CheckCircle2,
  Stethoscope,
  PlayCircle,
  ArrowLeftRight,
  FileSignature,
} from "lucide-react";
import CreatePatientModal from "../patients/CreatePatientModal";
import YearMonthFilter from "../../components/common/YearMonthFilter";
import ReassignPhysicianModal from "./ReassignPhysicianModal";
import WaiverModal from "./WaiverModal";
import { formatAge } from "../../utils/age";
import {
  CONSULTATION_TYPES,
  loadDoctors,
  STATUS,
  createEncounter,
  updateEncounter,
  PATIENT_TYPE_BY_ROLE,
} from "../../utils/encounters";
import { useAuth } from "../../context/AuthContext";
import { loadPatients, savePatientPhoto } from "../../utils/patients";

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap ${
        active ? "text-white" : "text-white/90"
      }`}
    >
      {label}
      <ChevronsUpDown size={12} />
    </button>
  );
}

function StepIndicator({ step }) {
  const steps = [
    { n: 1, label: "Search Patient" },
    { n: 2, label: "Appointment Details" },
    { n: 3, label: "Submission Result" },
  ];
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      {steps.map((s, idx) => {
        const active = step === s.n;
        const done = step > s.n;
        return (
          <div key={s.n} className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full border-2 text-sm font-semibold ${
                  active || done ? "border-teal-700 text-teal-700" : "border-slate-300 text-slate-400"
                }`}
              >
                {s.n}
              </span>
              <span className={`text-sm font-medium ${active || done ? "text-teal-700" : "text-slate-400"}`}>
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && <div className={`w-32 h-px ${step > s.n ? "bg-teal-700" : "bg-slate-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600";

export default function CreateEncounterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const presetHospitalNo = location.state?.presetHospitalNo || "";

  const [step, setStep] = useState(1);
  const [patientTab, setPatientTab] = useState("patients"); // "patients" | "masterlist"
  const [hideIneligible, setHideIneligible] = useState(false);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [sortField, setSortField] = useState("lastName");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedHospitalNo, setSelectedHospitalNo] = useState(presetHospitalNo);
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    loadDoctors().then(setDoctors);
  }, []);

  // Step 2 — appointment details
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [consultationTypeLabel, setConsultationTypeLabel] = useState(CONSULTATION_TYPES[0].label);
  const [reasonForVisiting, setReasonForVisiting] = useState("");
  const [doctor, setDoctor] = useState("");
  const [photo, setPhoto] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Step 3 — result
  const [createdEncounter, setCreatedEncounter] = useState(null);
  const [activeAction, setActiveAction] = useState(null); // "triage" | "reassign" | "waiver"

  useEffect(() => {
    if (presetHospitalNo && patients.some((p) => p.hospitalNo === presetHospitalNo)) {
      setStep(2);
    }
  }, [presetHospitalNo, patients]);

  // Pick up patient records changed elsewhere (e.g. a photo updated from
  // Patient Profile) so this stays in sync without needing a manual
  // refresh — same pattern used on the Medicine Prescriptions and Reports
  // pages. The "storage" event no longer applies now that patients live in
  // Supabase instead of localStorage, so only "focus" is kept.
  useEffect(() => {
    async function refreshPatients() {
      setPatients(await loadPatients());
    }
    refreshPatients();
    window.addEventListener("focus", refreshPatients);
    return () => {
      window.removeEventListener("focus", refreshPatients);
    };
  }, []);

  // THE FIX for the black camera preview: the old code tried to set
  // videoRef.current.srcObject = stream synchronously inside startCamera(),
  // but the <video> element only renders once cameraOn flips true — and
  // that render hasn't happened yet at that point, so videoRef.current was
  // still null and the stream never actually got attached. Binding it here,
  // reactively, once cameraStream changes (and therefore after the <video>
  // has mounted), is what makes PatientProfile.jsx's camera work — same
  // fix, same pattern, applied here.
  useEffect(() => {
    if (!cameraStream || !videoRef.current) return;

    videoRef.current.srcObject = cameraStream;
    videoRef.current.play().catch((err) => console.error("Error playing camera stream:", err));

    return () => {
      cameraStream.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  // If this patient already has a photo on file (taken/uploaded here or
  // from their Patient Profile page), reuse it here instead of asking staff
  // to take a new one every time. They can still retake/upload to replace
  // it. Also re-syncs if the record's photo changes underneath us (e.g. the
  // storage/focus refresh above picks up an update made in another tab).
  const selectedPatient = patients.find((p) => p.hospitalNo === selectedHospitalNo) || null;

  useEffect(() => {
    setPhoto(selectedPatient?.photo || null);
  }, [selectedHospitalNo, selectedPatient?.photo]);

  const availableYears = useMemo(() => {
    const s = new Set();
    for (const r of patients) {
      if (r.dateOfBirth) {
        const y = new Date(r.dateOfBirth).getFullYear();
        if (!Number.isNaN(y)) s.add(y);
      }
    }
    return Array.from(s).sort((a, b) => b - a);
  }, [patients]);

  const selectedConsultationType = CONSULTATION_TYPES.find((c) => c.label === consultationTypeLabel);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = patients.filter((p) => {
      if (hideIneligible && p.konsultaEligibility && p.konsultaEligibility !== "Eligible") return false;
      if (dobYear) {
        const y = p.dateOfBirth ? new Date(p.dateOfBirth).getFullYear().toString() : "";
        if (y !== dobYear) return false;
      }
      if (dobMonth) {
        const m = p.dateOfBirth ? new Date(p.dateOfBirth).getMonth() + 1 : null;
        if (!m || m !== Number(dobMonth)) return false;
      }
      if (!q) return true;
      const haystack = [p.hospitalNo, p.firstName, p.lastName, p.middleName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    result = [...result].sort((a, b) => {
      const av = (a[sortField] || "").toString().toLowerCase();
      const bv = (b[sortField] || "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [patients, search, dobYear, dobMonth, hideIneligible, sortField, sortDir]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function clearFilters() {
    setSearch("");
    setDobYear("");
    setDobMonth("");
  }

  function handlePatientCreated(patient) {
    setPatients((prev) => [patient, ...prev]);
    setSelectedHospitalNo(patient.hospitalNo);
    setShowCreatePatient(false);
  }

  function handleConsultationTypeChange(label) {
    setConsultationTypeLabel(label);
  }

  // --- Photo capture ---
  async function startCamera() {
    setIsCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setCameraOn(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Couldn't access the camera. You can upload a photo instead.");
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraOn(false);
    setIsCameraReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  // Saves a newly captured/uploaded photo onto the selected patient's own
  // record (not just onto this in-progress appointment) so it shows up on
  // their Patient Profile immediately — and vice versa, since Patient
  // Profile writes to the same `patients` table via the same
  // savePatientPhoto() helper.
  async function applyPhoto(photoDataUrl) {
    setPhoto(photoDataUrl);
    if (selectedPatient) {
      const updated = await savePatientPhoto(selectedPatient.hospitalNo, photoDataUrl);
      if (updated) {
        setPatients((prev) => prev.map((p) => (p.hospitalNo === updated.hospitalNo ? updated : p)));
      }
    }
  }

  async function capturePhoto() {
    if (!videoRef.current) {
      setError("Video reference not found.");
      return;
    }
    if (!isCameraReady) {
      setError("Camera is still warming up. Please wait a moment and try again.");
      return;
    }

    const video = videoRef.current;
    const context = canvasRef.current.getContext("2d");

    if (typeof video.requestVideoFrameCallback === "function") {
      await new Promise((resolve) => video.requestVideoFrameCallback(() => resolve()));
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width === 0 || height === 0 || video.readyState < 2) {
      setError("Camera is still loading. Please wait a moment and try again.");
      return;
    }

    try {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      context.drawImage(video, 0, 0, width, height);
      const photoDataUrl = canvasRef.current.toDataURL("image/jpeg", 0.95);

      if (!photoDataUrl || photoDataUrl === "data:,") {
        setError("Failed to capture photo. Please try again.");
        return;
      }

      applyPhoto(photoDataUrl);
      setError("");
      stopCamera();
    } catch (err) {
      console.error("Error capturing photo:", err);
      setError("Error capturing photo: " + err.message);
    }
  }

  function handleUploadPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  async function handleCreateEncounter() {
    if (submitting) return; // already in flight — ignore a second click
    if (!reasonForVisiting.trim()) {
      setError("Please fill in the reason for visiting.");
      return;
    }
    if (!doctor) {
      setError("Please select an attending physician.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const created = await createEncounter({
        hospitalNo: selectedPatient.hospitalNo,
        appointmentDate,
        consultationType: consultationTypeLabel,
        reasonForVisiting,
        doctor,
        photo,
        createdBy: user?.id || null,
        status: STATUS.PENDING,
        // Which type of nurse is doing THIS registration — an ER Nurse
        // registration marks the patient as an ER Patient for this visit,
        // an OPD Nurse registration marks it OPD, and every other role
        // (doctor, admin, etc.) defaults to OPD Patient. This is decided
        // fresh per registration, not inherited from the patient record —
        // see PATIENT_TYPE_BY_ROLE in utils/encounters.js.
        patientType: PATIENT_TYPE_BY_ROLE[user?.role] || "OPD Patient",
        // Flips to STATUS.COMPLETED automatically once both a nurse and a
        // doctor have saved their part of the Consultation Form for this
        // encounter — see handleSaveConsultation in pages/patient/PatientProfile.jsx.
        nurseConsultationDone: false,
        doctorConsultationDone: false,
        migratedStatus: "Not Migrated",
        pcuStatus: "N/A",
      });
      setCreatedEncounter(created);
      setStep(3);
    } catch (err) {
      setError("Could not create the registration: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshCreatedEncounter(patch) {
    const updated = await updateEncounter(createdEncounter.id, (e) => ({ ...e, ...patch }));
    setCreatedEncounter(updated);
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Create Appointment</h1>
          <p className="text-sm text-slate-500 mt-0.5">Fill in the details to create a new appointment</p>
        </div>
        {step < 3 && (
          <button
            type="button"
            onClick={() => (step === 1 ? navigate(-1) : setStep(step - 1))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        )}
      </div>

      <div className="border-t border-slate-200">
        <StepIndicator step={step} />
      </div>

      {/* ── STEP 1 — SEARCH PATIENT ── */}
      {step === 1 && (
        <>
          <div className="flex items-center gap-2 mb-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Name or Hospital No."
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              />
            </div>
            <YearMonthFilter
              label="Date of Birth"
              year={dobYear}
              month={dobMonth}
              years={availableYears}
              onYearChange={setDobYear}
              onMonthChange={setDobMonth}
            />
            <button
              type="button"
              title="Search"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors"
            >
              <Search size={16} />
            </button>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!search && !dobYear && !dobMonth}
              title="Clear filters"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FilterX size={16} />
            </button>
            <button
              type="button"
              onClick={async () => setPatients(await loadPatients())}
              title="Refresh"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw size={16} />
            </button>
            <div className="flex-1" />
            <button
              type="button"
              disabled={!selectedHospitalNo}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors whitespace-nowrap"
            >
              Next
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 border-b border-transparent">
                <button
                  type="button"
                  onClick={() => setPatientTab("patients")}
                  className={`pb-1 text-sm font-semibold border-b-2 transition-colors ${
                    patientTab === "patients"
                      ? "border-teal-700 text-teal-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Patients <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{patients.length}</span>
                </button>
                <button
                  type="button"
                  title="Coming soon"
                  onClick={() => setPatientTab("masterlist")}
                  className={`pb-1 text-sm font-semibold border-b-2 transition-colors ${
                    patientTab === "masterlist"
                      ? "border-teal-700 text-teal-700"
                      : "border-transparent text-slate-400 hover:text-slate-500"
                  }`}
                >
                  Masterlist
                </button>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={hideIneligible}
                  onChange={(e) => setHideIneligible(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                />
                Hide Inactive/Ineligible Patients
              </label>
            </div>
            <button
              type="button"
              onClick={() => setShowCreatePatient(true)}
              className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors"
            >
              Create Patient
            </button>
          </div>

          {patientTab === "masterlist" ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center gap-2 p-10">
              <p className="text-sm font-semibold text-slate-500">Masterlist isn't wired up here yet</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Once the PHC Masterlist has real enrolled-patient data, this tab will search it directly.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {filteredPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
                  <p className="text-sm font-medium">No patients found</p>
                  <p className="text-xs text-slate-400">
                    {patients.length === 0
                      ? 'No patients yet — click "Create Patient" to add one.'
                      : "Try a different search or filter."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-teal-900 text-left text-xs uppercase tracking-wide text-white">
                        <th className="px-4 py-3 w-10" />
                        <th className="px-4 py-3">
                          <SortHeader label="Hospital No." field="hospitalNo" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        </th>
                        <th className="px-4 py-3">
                          <SortHeader label="Last Name" field="lastName" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        </th>
                        <th className="px-4 py-3">
                          <SortHeader label="First Name" field="firstName" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        </th>
                        <th className="px-4 py-3">
                          <SortHeader label="Middle Name" field="middleName" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        </th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">Sex</th>
                        <th className="px-4 py-3">
                          <SortHeader label="Date of Birth" field="dateOfBirth" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        </th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">Contact Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((p) => (
                        <tr
                          key={p.hospitalNo}
                          onClick={() => setSelectedHospitalNo(p.hospitalNo)}
                          className="border-b border-slate-100 hover:bg-teal-50/60 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 align-top">
                            <input
                              type="radio"
                              name="selectedPatient"
                              checked={selectedHospitalNo === p.hospitalNo}
                              onChange={() => setSelectedHospitalNo(p.hospitalNo)}
                              className="w-4 h-4 text-teal-700 focus:ring-teal-600"
                            />
                          </td>
                          <td className="px-4 py-3 align-top whitespace-nowrap text-slate-600">{p.hospitalNo || "—"}</td>
                          <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">{p.lastName}</td>
                          <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">{p.firstName}</td>
                          <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">{p.middleName || "—"}</td>
                          <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700 uppercase">{p.sex || "—"}</td>
                          <td className="px-4 py-3 align-top whitespace-nowrap text-slate-600">{p.dateOfBirth || "—"}</td>
                          <td className="px-4 py-3 align-top whitespace-nowrap text-slate-600">
                            {p.mobile ? `+63 ${p.mobile}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── STEP 2 — APPOINTMENT DETAILS ── */}
      {step === 2 && selectedPatient && (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
          {/* Patient Information */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 h-fit">
            <p className="text-sm font-semibold text-teal-700 mb-3">Patient Information</p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Name</p>
                <p className="font-medium text-slate-800">
                  {[selectedPatient.lastName, selectedPatient.firstName, selectedPatient.middleName]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Age</p>
                <p className="font-medium text-slate-800">{formatAge(selectedPatient.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Date of Birth</p>
                <p className="font-medium text-slate-800">{selectedPatient.dateOfBirth || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Hospital No.</p>
                <p className="font-medium text-slate-800">{selectedPatient.hospitalNo || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Contact Number</p>
                <p className="font-medium text-slate-800">
                  {selectedPatient.mobile ? `+63 ${selectedPatient.mobile}` : "—"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-4 text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              Change patient
            </button>
          </div>

          {/* Appointment Details */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <p className="text-sm font-semibold text-teal-700">Appointment Details</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                  Date of Appointment <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                  Consultation Type
                </label>
                <select
                  value={consultationTypeLabel}
                  onChange={(e) => handleConsultationTypeChange(e.target.value)}
                  className={inputClass}
                >
                  {CONSULTATION_TYPES.map((c) => (
                    <option key={c.code} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedConsultationType?.description && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                <RefreshCw size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">
                    {selectedConsultationType.code === "PCC" ? "Primary Care Consultation (PCC)" : selectedConsultationType.label}
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">{selectedConsultationType.description}</p>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Reason for Visiting <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reasonForVisiting}
                onChange={(e) => setReasonForVisiting(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Attending Physician <span className="text-red-500">*</span>
              </label>
              <select value={doctor} onChange={(e) => setDoctor(e.target.value)} className={inputClass}>
                <option value="">Select</option>
                {doctors.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Patient Photo <span className="text-slate-400 normal-case font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-4 rounded-lg border border-slate-200 p-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                  {photo ? (
                    <img src={photo} alt="Patient" className="w-full h-full object-cover" />
                  ) : (
                    <User size={28} className="text-slate-300" />
                  )}
                </div>
                {cameraOn ? (
                  <div className="flex flex-col gap-2">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={() => {
                        setIsCameraReady(true);
                        if (videoRef.current) {
                          videoRef.current.play().catch((err) => console.error("Error playing video:", err));
                        }
                      }}
                      className="w-40 h-28 rounded-md bg-black object-cover"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        disabled={!isCameraReady}
                        className="rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCameraReady ? "Capture" : "Preparing…"}
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="rounded-lg border border-slate-300 text-slate-600 text-xs font-medium px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium px-3 py-1.5"
                      >
                        <Camera size={13} />
                        Take Photo
                      </button>
                      <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-medium px-3 py-1.5 cursor-pointer">
                        <Upload size={13} />
                        Upload Photo
                        <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Please ensure the patient's face is clearly visible for identification purposes.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateEncounter}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
              >
                {submitting ? "Creating…" : "Next"}
                {!submitting && <ArrowRight size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3 — SUBMISSION RESULT ── */}
      {step === 3 && createdEncounter && (
        <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-8 flex flex-col items-center text-center gap-2 mt-4">
          <CheckCircle2 size={40} className="text-emerald-500" />
          <p className="text-lg font-semibold text-slate-800">Registration Created Successfully</p>
          <p className="text-sm text-slate-500">
            {createdEncounter.id} for{" "}
            <span className="font-medium text-slate-700">
              {[createdEncounter.patient.lastName, createdEncounter.patient.firstName].filter(Boolean).join(", ")}
            </span>{" "}
            has been posted to the Registration list.
          </p>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4">What's next?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mt-1">
            <button
              type="button"
              onClick={() => navigate(`/encounters/${createdEncounter.id}/triage`)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 hover:opacity-90 text-white text-sm font-medium px-3 py-2.5 transition-opacity"
            >
              <Stethoscope size={15} />
              Triage
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(`/patients/${createdEncounter.hospitalNo}`, {
                  state: { openConsultation: true, consultationEncounterId: createdEncounter.id },
                })
              }
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-800 hover:opacity-90 text-white text-sm font-medium px-3 py-2.5 transition-opacity"
            >
              <PlayCircle size={15} />
              Start Consultation
            </button>
            <button
              type="button"
              onClick={() => setActiveAction("reassign")}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 hover:opacity-90 text-white text-sm font-medium px-3 py-2.5 transition-opacity"
            >
              <ArrowLeftRight size={15} />
              Reassign Physician
            </button>
            <button
              type="button"
              onClick={() => setActiveAction("waiver")}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium px-3 py-2.5 transition-colors"
            >
              <FileSignature size={15} />
              Waiver
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Registration
          </button>
        </div>
      )}

      {showCreatePatient && (
        <CreatePatientModal onClose={() => setShowCreatePatient(false)} onCreated={handlePatientCreated} />
      )}

      {activeAction === "reassign" && createdEncounter && (
        <ReassignPhysicianModal
          encounter={createdEncounter}
          onClose={() => setActiveAction(null)}
          onSave={(newDoctor) => {
            refreshCreatedEncounter({ doctor: newDoctor });
            setActiveAction(null);
          }}
        />
      )}

      {activeAction === "waiver" && createdEncounter && (
        <WaiverModal
          encounter={createdEncounter}
          onClose={() => setActiveAction(null)}
          onSave={(waiver) => {
            refreshCreatedEncounter({ waiver });
            setActiveAction(null);
          }}
        />
      )}

      {/* Hidden canvas for capturing photos */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}