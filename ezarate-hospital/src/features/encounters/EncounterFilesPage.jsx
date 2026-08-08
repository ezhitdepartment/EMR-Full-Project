import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FolderOpen,
  Folder,
  CalendarCheck,
  Stethoscope,
  PlayCircle,
  FileSignature,
  FileText,
} from "lucide-react";
import {
  findEncounterById,
  formatDateCreated,
  CONSULTATION_TYPES,
} from "../../utils/encounters";
import { formatAge } from "../../utils/age";
import WaiverModal from "./WaiverModal";
import { updateEncounter } from "../../utils/encounters";
import { loadAllPatientDocuments } from "../../utils/patientDocuments";

export default function EncounterFilesPage() {
  const { encounterId } = useParams();
  const navigate = useNavigate();

  const [encounter, setEncounter] = useState(undefined); // undefined = loading, null = not found
  const [showWaiver, setShowWaiver] = useState(false);
  const [documents, setDocuments] = useState({
    emr: null,
    discharge: null,
    konsultaReferral: null,
    medicalCertificate: null,
  });

  useEffect(() => {
    findEncounterById(encounterId).then(setEncounter);
  }, [encounterId]);

  // These folders are the same documents shown on the patient's own
  // Patient Files tab — loading them here (instead of duplicating the
  // whole edit/download flow) is what "connects" the two: same underlying
  // record, same counts, and the folder cards below link straight into
  // that tab to actually view/edit/download.
  useEffect(() => {
    if (!encounter?.hospitalNo) return;
    let active = true;
    loadAllPatientDocuments(encounter.hospitalNo).then((docs) => {
      if (!active) return;
      setDocuments({
        emr: docs.emr,
        discharge: docs.discharge,
        konsultaReferral: docs.konsulta,
        medicalCertificate: docs.medcert,
      });
    });
    return () => {
      active = false;
    };
  }, [encounter?.hospitalNo]);

  async function handleSaveWaiver(waiver) {
    try {
      const updated = await updateEncounter(encounterId, (e) => ({ ...e, waiver }));
      if (updated) setEncounter(updated);
      setShowWaiver(false);
    } catch (err) {
      alert(`Couldn't save the waiver: ${err.message || "unknown error"}`);
    }
  }

  if (encounter === undefined) {
    return <div className="min-h-[50vh]" />;
  }

  if (encounter === null) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
        <p className="text-sm font-semibold text-slate-800 mb-1">Registration not found</p>
        <p className="text-xs text-slate-500 mb-4">
          We couldn't find an encounter with ID "{encounterId}".
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Registration
        </button>
      </div>
    );
  }

  const patient = encounter.patient || {};
  const fullName = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Registration Files</h1>
          <p className="text-sm text-slate-500 mt-1">Upload and manage encounter-related documents</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left column — this patient's actual document folders, same as their Patient Files tab */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 min-h-[420px]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">Patient Files</p>
            <button
              type="button"
              onClick={() =>
                navigate(`/patients/${encounter.hospitalNo}?tab=patient-files`)
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <FolderOpen size={13} />
              Open Full Patient Files
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: "opd-record", label: "OPD Record", doc: documents.emr },
              { id: "medical-certificate", label: "Medical Certificate", doc: documents.medicalCertificate },
              { id: "er-discharge", label: "ER Discharge Instructions", doc: documents.discharge },
              { id: "konsulta-referral", label: "Konsulta/Yakap Referral", doc: documents.konsultaReferral },
            ].map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() =>
                  navigate(`/patients/${encounter.hospitalNo}?tab=patient-files`)
                }
                className="flex items-center gap-3 text-left bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl px-4 py-3 transition-colors"
              >
                <Folder size={18} className="shrink-0 text-teal-700" />
                <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-700">
                  {folder.label}
                </span>
                <span
                  className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    folder.doc ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {folder.doc ? "1 file" : "0 files"}
                </span>
              </button>
            ))}
          </div>

          <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-4">
            <FileText size={13} />
            These are the same files as this patient's Patient Files tab — click any folder
            (or "Open Full Patient Files") to view, edit, or download them there.
          </p>
        </div>

        {/* Right column — appointment details */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
              <CalendarCheck size={15} className="text-blue-700" />
              Appointment Details
            </p>

            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Patient Name</p>
                <p className="font-semibold text-slate-800">{fullName || "—"}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">Age</p>
                  <p className="font-medium text-slate-700">{formatAge(patient.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">Sex</p>
                  <p className="font-medium text-blue-700 uppercase">{patient.sex || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Hospital No.</p>
                <p className="font-medium text-slate-700">{patient.hospitalNo || "—"}</p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Appointment ID</p>
                <p className="font-medium text-slate-700">{encounter.id}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">Appointment Date</p>
                  <p className="font-medium text-slate-700">
                    {encounter.appointmentDate
                      ? formatDateCreated(new Date(encounter.appointmentDate).toISOString())
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">Payment Type</p>
                  <p className="font-medium text-slate-700">{encounter.paymentType || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Consultation Type</p>
                <p className="font-medium text-slate-700">
                  {CONSULTATION_TYPES.find((c) => c.label === encounter.consultationType)?.code ||
                    encounter.consultationType ||
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">Reason for Visit</p>
                <p className="font-medium text-slate-700">{encounter.reasonForVisiting || "—"}</p>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-200">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Proceed To
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/patients/${encounter.hospitalNo}`, {
                      state: {
                        openConsultation: true,
                        consultationReadOnly: encounter.status === "CANCELLED",
                        consultationEncounterId: encounter.id,
                      },
                    })
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-sm font-medium px-3 py-2.5 transition-colors"
                >
                  <PlayCircle size={15} />
                  Consultation
                </button>
                <button
                  type="button"
                  onClick={() => setShowWaiver(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium px-3 py-2.5 transition-colors"
                >
                  <FileSignature size={15} />
                  Waiver
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/encounters/${encounter.id}/triage`)}
                className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 hover:opacity-90 text-white text-sm font-semibold px-3 py-2.5 transition-opacity"
              >
                <Stethoscope size={15} />
                Triage
              </button>
            </div>
          </div>
        </div>
      </div>

      {showWaiver && (
        <WaiverModal
          encounter={encounter}
          onClose={() => setShowWaiver(false)}
          onSave={handleSaveWaiver}
        />
      )}
    </div>
  );
}