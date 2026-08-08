import { useState } from "react";
import { X, Trash2, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { deleteAccount } from "../../utils/adminUsers";

export default function DeleteAccountModal({ user, onClose, onDeleted }) {
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm(e) {
    e.preventDefault();
    setError("");

    if (!adminUsername.trim() || !adminPassword) {
      setError("Enter your own username and password to confirm.");
      return;
    }

    setSubmitting(true);
    try {
      await deleteAccount({
        targetUserId: user.id,
        adminUsername: adminUsername.trim(),
        adminPassword,
      });
      onDeleted();
    } catch (err) {
      setError(err.message || "Something went wrong deleting this account.");
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
            <h2 className="text-base font-semibold text-slate-800">Delete Account</h2>
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
            <span className="font-semibold text-slate-800">{user.username}</span>'s account. This
            can't be undone. Enter <span className="font-medium">your own</span> username and
            password to confirm.
          </p>

          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">
              Your Username <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">
              Your Password <span className="text-red-500">*</span>
            </span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
            >
              <Trash2 size={15} />
              {submitting ? "Deleting…" : "Delete Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
