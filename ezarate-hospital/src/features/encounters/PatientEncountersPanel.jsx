import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  MoreVertical,
  Stethoscope,
  PlayCircle,
  ArrowLeftRight,
  CalendarX,
  FileSignature,
  Folder,
  ClipboardCheck,
} from "lucide-react";
import ReassignPhysicianModal from "./ReassignPhysicianModal";
import WaiverModal from "./WaiverModal";
import {
  STATUS,
  STATUS_STYLES,
  loadEncounters,
  updateEncounter,
  formatDateCreated,
} from "../../utils/encounters";

const TABS = ["ALL", STATUS.PENDING, STATUS.COMPLETED, STATUS.CANCELLED];

function ActionButton({ title, icon: Icon, colorClass, onClick, disabled }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 ${colorClass}`}
    >
      <Icon size={15} />
    </button>
  );
}

// Registration tab — this is the same table/actions as the dashboard's
// Registration page (Encounters.jsx), just scoped to one patient's own
// records (no Patient column, no cross-patient filters). "Registration
// Files" jumps to the Patient Files tab on this same page instead of
// navigating away, since we're already on that patient's profile.
export default function PatientEncountersPanel({ hospitalNo, onOpenPatientFiles }) {
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState([]);
  const [tab, setTab] = useState("ALL");
  const [rowMenuId, setRowMenuId] = useState(null);
  const [activeAction, setActiveAction] = useState(null); // "reassign" | "waiver"
  const [activeEncounter, setActiveEncounter] = useState(null);

  async function refresh() {
    setEncounters((await loadEncounters()).filter((e) => e.hospitalNo === hospitalNo));
  }

  useEffect(() => {
    refresh();
    // No more "storage" event — encounters live in Supabase now, not
    // localStorage. "focus" still catches "came back to this tab".
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalNo]);

  function openAction(action, encounter) {
    setActiveEncounter(encounter);
    setActiveAction(action);
    setRowMenuId(null);
  }

  function closeAction() {
    setActiveAction(null);
    setActiveEncounter(null);
  }

  async function handleCancel(encounter) {
    if (!window.confirm(`Cancel encounter ${encounter.id}? This can't be undone.`)) return;
    try {
      await updateEncounter(encounter.id, (e) => ({ ...e, status: STATUS.CANCELLED }));
      refresh();
    } catch (err) {
      alert(`Couldn't cancel this registration: ${err.message || "unknown error"}`);
    }
    setRowMenuId(null);
  }

  function handleStartConsultation(encounter) {
    navigate(`/patients/${encounter.hospitalNo}`, {
      state: {
        openConsultation: true,
        consultationEncounterId: encounter.id,
        consultationReadOnly: encounter.status === STATUS.CANCELLED,
      },
    });
  }

  const filtered = useMemo(() => {
    const list = tab === "ALL" ? encounters : encounters.filter((e) => e.status === tab);
    return [...list].sort(
      (a, b) => new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime()
    );
  }, [encounters, tab]);

  return (
    <div className="h-full min-h-[240px] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Registration</p>
          <p className="text-xs text-slate-400">This patient's registration / encounter history</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            title="Refresh list"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={() => navigate("/encounters/create", { state: { presetHospitalNo: hospitalNo } })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus size={14} />
            Create Registration
          </button>
        </div>
      </div>

      <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden self-start">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t ? "bg-teal-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 bg-white border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center gap-2 p-8">
          <ClipboardCheck size={28} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No registration records yet</p>
          <p className="text-xs text-slate-400">
            Create a registration to log a visit/encounter for this patient.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-900 text-left text-xs uppercase tracking-wide text-white">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">ID</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Apt Date</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Pay Type</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Doctor</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Created By</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="sticky right-0 z-10 bg-teal-900 px-4 py-3 font-semibold whitespace-nowrap shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.25)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-teal-50/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-teal-700 whitespace-nowrap align-top">{e.id}</td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">
                      {e.appointmentDate
                        ? formatDateCreated(new Date(e.appointmentDate).toISOString())
                        : "—"}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">{e.paymentType || "—"}</td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">{e.consultationType || "—"}</td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">{e.doctor || "—"}</td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-slate-700">{e.createdBy || "—"}</td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[e.status]}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="sticky right-0 z-10 bg-white px-4 py-3 align-top whitespace-nowrap shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
                      <div className="flex items-center gap-1.5">
                        <ActionButton
                          title="Triage"
                          icon={Stethoscope}
                          colorClass="bg-orange-500"
                          onClick={() => navigate(`/encounters/${e.id}/triage`)}
                        />
                        <ActionButton
                          title="Start Consultation"
                          icon={PlayCircle}
                          colorClass="bg-blue-800"
                          onClick={() => handleStartConsultation(e)}
                        />
                        <ActionButton
                          title="Reassign Physician"
                          icon={ArrowLeftRight}
                          colorClass="bg-sky-500"
                          onClick={() => openAction("reassign", e)}
                          disabled={e.status === STATUS.CANCELLED}
                        />
                        <ActionButton
                          title="Cancel"
                          icon={CalendarX}
                          colorClass="bg-red-500"
                          onClick={() => handleCancel(e)}
                          disabled={e.status === STATUS.CANCELLED}
                        />
                        <div className="relative">
                          <button
                            type="button"
                            title="More Actions"
                            onClick={() => setRowMenuId(rowMenuId === e.id ? null : e.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-100 transition-colors"
                          >
                            <MoreVertical size={15} />
                          </button>
                          {rowMenuId === e.id && (
                            <div className="absolute right-0 mt-1 w-44 rounded-lg border border-slate-200 bg-white shadow-lg z-10 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  setRowMenuId(null);
                                  onOpenPatientFiles?.();
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Folder size={13} />
                                Registration Files
                              </button>
                              <button
                                type="button"
                                onClick={() => openAction("waiver", e)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <FileSignature size={13} />
                                Waiver
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeAction === "reassign" && activeEncounter && (
        <ReassignPhysicianModal
          encounter={activeEncounter}
          onClose={closeAction}
          onSave={async (doctor) => {
            try {
              await updateEncounter(activeEncounter.id, (e) => ({ ...e, doctor }));
              refresh();
              closeAction();
            } catch (err) {
              alert(`Couldn't reassign the physician: ${err.message || "unknown error"}`);
            }
          }}
        />
      )}

      {activeAction === "waiver" && activeEncounter && (
        <WaiverModal
          encounter={activeEncounter}
          onClose={closeAction}
          onSave={async (waiver) => {
            try {
              await updateEncounter(activeEncounter.id, (e) => ({ ...e, waiver }));
              refresh();
              closeAction();
            } catch (err) {
              alert(`Couldn't save the waiver: ${err.message || "unknown error"}`);
            }
          }}
        />
      )}
    </div>
  );
}