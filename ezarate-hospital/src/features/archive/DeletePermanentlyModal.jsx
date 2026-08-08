import { useState } from "react";
import { X, Trash2, ShieldAlert } from "lucide-react";

// Shared confirmation modal for every "Delete Permanently" button in
// Archive.jsx (Cancelled Registrations, Cancelled Lab Orders, Archived
// Medicine Prescriptions, Archived Audit Logs, Archived Generated
// Reports). Requires typing DELETE to confirm — same "step-up" spirit as
// DeleteAccountModal's admin-credential requirement, just without needing
// a password since these are already-archived/cancelled records, not a
// live staff login.
//
// `label` is a short human-readable description of the one row being
// deleted (e.g. "registration E-20260706-0018" or "lab order LAB-...-0007")
// shown in the warning text. `onConfirm` does the actual delete call and
// should throw on failure (every deleteX() function in utils/*.js already
// does) — this catches it and shows err.message rather than closing.
export default function DeletePermanentlyModal({ label, onClose, onConfirm, onDeleted }) {
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = confirmText.trim().toUpperCase() === "DELETE" && !submitting;

  async function handleConfirm(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      await onConfirm();
      onDeleted();
    } catch (err) {
      setError(err.message || "Something went wrong deleting this record.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600">
              <Trash2 size={16} />
            </span>
            <h2 className="text-base font-semibold text-slate-800">Delete Permanently</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="px-5 py-4 flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            You're about to permanently delete{" "}
            <span className="font-semibold text-slate-800">{label}</span> from the database. This
            can't be undone. Type <span className="font-semibold text-red-600">DELETE</span> to
            confirm.
          </p>

          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">
              Type DELETE to confirm <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
            >
              <Trash2 size={15} />
              {submitting ? "Deleting…" : "Delete Permanently"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
