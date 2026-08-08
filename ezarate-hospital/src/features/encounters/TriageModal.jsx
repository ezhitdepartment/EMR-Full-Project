import { useState } from "react";
import { X, Stethoscope } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600";

export default function TriageModal({ encounter, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    temperature: "",
    cardiacRate: "",
    respiratoryRate: "",
    bloodPressure: "",
    weight: "",
    o2sat: "",
    ...(encounter.triage || {}),
  }));

  function handle(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...form, recordedAt: new Date().toISOString() });
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-slate-800">Triage — {encounter.id}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <p className="text-xs text-slate-500">
            {[encounter.patient?.lastName, encounter.patient?.firstName].filter(Boolean).join(", ")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Temperature (°C)
              </label>
              <input name="temperature" value={form.temperature} onChange={handle} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Cardiac Rate
              </label>
              <input name="cardiacRate" value={form.cardiacRate} onChange={handle} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Respiratory Rate
              </label>
              <input name="respiratoryRate" value={form.respiratoryRate} onChange={handle} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Blood Pressure
              </label>
              <input name="bloodPressure" value={form.bloodPressure} onChange={handle} className={inputClass} placeholder="120/80" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Weight (kg)
              </label>
              <input name="weight" value={form.weight} onChange={handle} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                O2 Sat (%)
              </label>
              <input name="o2sat" value={form.o2sat} onChange={handle} className={inputClass} />
            </div>
          </div>

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
              className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium shadow-sm transition-colors"
            >
              Save Triage
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
