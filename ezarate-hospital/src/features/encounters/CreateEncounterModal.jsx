import { useEffect, useState } from "react";
import { X, CalendarPlus } from "lucide-react";
import SearchableSelect from "../../components/common/SearchableSelect";
import { useAuth } from "../../context/AuthContext";
import {
  CONSULTATION_TYPE_OPTIONS,
  loadDoctors,
  STATUS,
  createEncounter,
  PATIENT_TYPE_BY_ROLE,
} from "../../utils/encounters";
import { loadPatients } from "../../utils/patients";

function patientLabel(p) {
  const name = [p.lastName, p.firstName].filter(Boolean).join(", ");
  const idLine = p.hospitalNo || "";
  return idLine ? `${name} — ${idLine}` : name || p.hospitalNo;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600";

export default function CreateEncounterModal({ onClose, onCreated, presetHospitalNo = null }) {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitalNo, setHospitalNo] = useState(presetHospitalNo || "");
  const [doctor, setDoctor] = useState("");
  const [consultationType, setConsultationType] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPatients().then(setPatients);
    loadDoctors().then(setDoctors);
  }, []);

  const selectedPatient = patients.find((p) => p.hospitalNo === hospitalNo) || null;
  const patientLocked = Boolean(presetHospitalNo);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!hospitalNo) {
      setError("Please select a patient.");
      return;
    }
    if (!doctor) {
      setError("Please select a doctor.");
      return;
    }
    if (!consultationType) {
      setError("Please fill in the consultation type.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const encounter = await createEncounter({
        hospitalNo,
        appointmentDate,
        doctor,
        consultationType,
        fee: 0,
        reasonForVisiting: "",
        photo: null,
        createdBy: user?.id || null,
        status: STATUS.PENDING,
        // Same rule CreateEncounterPage.jsx uses: the registering nurse's
        // role decides ER vs OPD for this visit; anyone else (doctor,
        // admin, etc.) defaults to OPD Patient.
        patientType: PATIENT_TYPE_BY_ROLE[user?.role] || "OPD Patient",
        nurseConsultationDone: false,
        doctorConsultationDone: false,
        migratedStatus: "Not Migrated",
        pcuStatus: "N/A",
      });
      onCreated(encounter);
    } catch (err) {
      setError("Could not create the registration: " + err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <CalendarPlus size={18} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-slate-800">Create Registration</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
              Patient
            </label>
            <SearchableSelect
              value={hospitalNo}
              onChange={setHospitalNo}
              options={patients}
              getValue={(p) => p.hospitalNo}
              getLabel={patientLabel}
              placeholder="Select a patient"
              disabled={patientLocked}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
              Doctor
            </label>
            <SearchableSelect
              value={doctor}
              onChange={setDoctor}
              options={doctors}
              getValue={(d) => d}
              getLabel={(d) => d}
              placeholder="Select a doctor"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
              Appointment Date
            </label>
            <input
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
              Consultation Type
            </label>
            <select
              value={consultationType}
              onChange={(e) => setConsultationType(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select</option>
              {CONSULTATION_TYPE_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-medium shadow-sm transition-colors"
            >
              {submitting ? "Creating…" : "Create Registration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}