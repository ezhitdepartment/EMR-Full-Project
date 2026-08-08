import { useState } from "react";
import { X, KeyRound, ShieldAlert } from "lucide-react";
import { resetToOriginalPassword } from "../../utils/adminUsers";

export default function ResetPasswordModal({ user, onClose, onDone }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      await resetToOriginalPassword(user.id);
      onDone();
    } catch (err) {
      setError(err.message || "Something went wrong resetting this password.");
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
              <KeyRound size={16} />
            </span>
            <h2 className="text-base font-semibold text-slate-800">Reset Password</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            This will reset <span className="font-semibold text-slate-800">{user.username}</span>'s
            password to the temporary password{" "}
            <span className="font-mono font-semibold text-slate-800">Temporary123</span>. They should
            log in with it and change it right away. Are you sure?
          </p>

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
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
            >
              <KeyRound size={15} />
              {submitting ? "Resetting…" : "Reset Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}