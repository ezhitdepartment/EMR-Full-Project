import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PhoneCall, RotateCcw, ExternalLink, Users2, Clock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { formatAge } from "../../utils/age";
import {
  getQueueEntries,
  callNext,
  returnToQueue,
  defaultQueueGroup,
  formatWaitTime,
} from "../../utils/labQueue";

function patientName(patient) {
  if (!patient) return "—";
  return [patient.lastName, patient.firstName, patient.middleName].filter(Boolean).join(", ");
}

export default function LabQueuePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(() => defaultQueueGroup(user?.role));
  const [entries, setEntries] = useState([]);
  const [tick, setTick] = useState(0); // forces the "waiting for" times to refresh

  async function refresh() {
    setEntries(await getQueueEntries(group));
  }

  useEffect(() => {
    refresh();
  }, [group]);

  // Keep wait times honest without the person needing to hit refresh.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const serving = entries.find((e) => e.queueStatus === "SERVING") || null;
  const waiting = entries.filter((e) => e.queueStatus !== "SERVING");

  async function handleCallNext() {
    await callNext(group);
    refresh();
  }

  async function handleReturnToQueue(entry) {
    await returnToQueue(entry.orderId, entry.diagnosticName);
    refresh();
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            {group === "Imaging" ? "Imaging Queue" : "Laboratory Queue"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Who's next for testing, oldest order first</p>
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

      {/* Laboratory / Imaging toggle — defaults to the logged-in role's own
          queue, but anyone with Lab Orders access can check the other one. */}
      <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 mb-5">
        {["Laboratory", "Imaging"].map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              group === g ? "bg-teal-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Now Serving */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Now Serving</p>

        {serving ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xl font-bold text-slate-800">{patientName(serving.patient)}</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {serving.diagnosticName} <span className="text-slate-300">·</span> {serving.code}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {formatAge(serving.patient?.dateOfBirth)} · {serving.patient?.sex || "—"} · Order{" "}
                {serving.orderId}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleReturnToQueue(serving)}
                title="Send back to the waiting list"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw size={14} />
                Return to Queue
              </button>
              <button
                type="button"
                onClick={() => navigate(`/lab-orders/${serving.orderId}`)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors"
              >
                <ExternalLink size={14} />
                Open & Record Result
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 mb-3">No one is currently being served.</p>
        )}

        <button
          type="button"
          onClick={handleCallNext}
          disabled={waiting.length === 0}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 shadow-sm transition-colors"
        >
          <PhoneCall size={15} />
          Call Next Patient
        </button>
      </div>

      {/* Waiting list */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
          <Users2 size={15} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-800">Waiting ({waiting.length})</p>
        </div>

        {waiting.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            {entries.length === 0 ? "Queue is empty." : "Everyone in the queue is currently being served."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap w-12">#</th>
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Patient</th>
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Test</th>
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Order ID</th>
                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Waiting For</th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((entry, i) => (
                  <tr
                    key={`${entry.orderId}-${entry.diagnosticName}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 align-top font-semibold text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-slate-800">{patientName(entry.patient)}</p>
                      <p className="text-xs text-slate-400">
                        {formatAge(entry.patient?.dateOfBirth)} · {entry.patient?.sex || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-700">{entry.diagnosticName}</td>
                    <td className="px-4 py-3 align-top text-slate-500">{entry.orderId}</td>
                    <td className="px-4 py-3 align-top text-slate-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        {formatWaitTime(entry.dateCreated)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}