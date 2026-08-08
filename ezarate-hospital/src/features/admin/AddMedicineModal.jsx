import { useState } from "react";
import { X, Pill, ShieldAlert } from "lucide-react";
import { addMedicine } from "../../utils/medicines";

export default function AddMedicineModal({ onClose, onAdded }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Enter a medicine name.");
      return;
    }

    setSubmitting(true);
    try {
      const added = await addMedicine(name);
      onAdded(added);
    } catch (err) {
      setError(err.message || "Something went wrong adding this medicine.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 text-teal-700">
              <Pill size={16} />
            </span>
            <h2 className="text-base font-semibold text-slate-800">Add Medicine</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            Add a new medicine to the formulary. It will immediately be available to anyone
            prescribing medicines.
          </p>

          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">
              Medicine Name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Paracetamol 500mg (Biogesic)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </label>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <ShieldAlert size={13} />
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
            >
              <Pill size={15} />
              {submitting ? "Adding…" : "Add Medicine"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
