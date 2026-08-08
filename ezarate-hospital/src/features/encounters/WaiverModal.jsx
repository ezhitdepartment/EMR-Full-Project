import { useState } from "react";
import { X, FileSignature } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600";

export default function WaiverModal({ encounter, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    signed: encounter.waiver?.signed || false,
    signedBy: encounter.waiver?.signedBy || "",
    relationship: encounter.waiver?.relationship || "",
    date: encounter.waiver?.date || new Date().toISOString().slice(0, 10),
    reason: encounter.waiver?.reason || "",
  }));

  function handle(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileSignature size={18} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-slate-800">Waiver — {encounter.id}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.signed}
              onChange={(e) => setForm((f) => ({ ...f, signed: e.target.checked }))}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-600"
            />
            Waiver signed
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Signed By
              </label>
              <input name="signedBy" value={form.signedBy} onChange={handle} className={inputClass} disabled={!form.signed} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Relationship to Patient
              </label>
              <input
                name="relationship"
                value={form.relationship}
                onChange={handle}
                className={inputClass}
                placeholder="Self, Guardian, etc."
                disabled={!form.signed}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">Date</label>
            <input type="date" name="date" value={form.date} onChange={handle} className={inputClass} disabled={!form.signed} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
              Reason (if unable to sign / declined)
            </label>
            <textarea name="reason" value={form.reason} onChange={handle} rows={2} className={`${inputClass} resize-none`} />
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
              Save Waiver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
