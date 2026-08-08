import { useState } from "react";
import { UserPlus, Eye, EyeOff, CheckCircle2, ShieldAlert } from "lucide-react";
import { ROLE_OPTIONS } from "../../data/roles";
import { createStaffAccount } from "../../utils/adminUsers";

const EMPTY_FORM = {
  username: "",
  email: "",
  password: "",
  role: "",
  prefix: "",
  firstName: "",
  lastName: "",
  licenseNumber: "",
};

export default function Settings() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null); // last successfully created account

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setCreated(null);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.username.trim() || !form.email.trim() || !form.password || !form.role) {
      setError("Full name, email, password, and role are all required.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await createStaffAccount({
        email: form.email.trim(),
        password: form.password,
        username: form.username.trim(),
        role: form.role,
        prefix: form.prefix.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        licenseNumber: form.licenseNumber.trim(),
      });
      setCreated({ username: form.username.trim(), email: form.email.trim(), role: form.role });
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message || "Something went wrong creating this account.");
    } finally {
      setSubmitting(false);
    }
  }

  const roleLabel = ROLE_OPTIONS.find((r) => r.value === created?.role)?.label || created?.role;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-1">Admin</p>
        <h1 className="text-2xl font-semibold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Create a new staff account and assign its role.</p>
      </div>

      {/* Create account card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 text-teal-700">
            <UserPlus size={16} />
          </span>
          <h2 className="text-sm font-semibold text-slate-800">Create Account</h2>
        </div>

        {created ? (
          <div className="flex flex-col items-center text-center gap-3 py-8">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={24} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Account created</p>
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-medium text-slate-700">{created.username}</span> can now log in
                as <span className="font-medium text-slate-700">{roleLabel}</span> with the email and
                password you set.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
            >
              <UserPlus size={15} />
              Create Another Account
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2">
                <span className="block text-xs font-medium text-slate-500 mb-1">
                  Full Name / Username <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setField("username", e.target.value)}
                  placeholder="e.g. Edward Chee"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  This is what they'll type into the Username field on the login screen.
                </span>
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-500 mb-1">
                  Email <span className="text-red-500">*</span>
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="name@ezaratehospital.ph"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-500 mb-1">
                  Password <span className="text-red-500">*</span>
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
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

              <label className="block sm:col-span-2">
                <span className="block text-xs font-medium text-slate-500 mb-1">
                  Role <span className="text-red-500">*</span>
                </span>
                <select
                  value={form.role}
                  onChange={(e) => setField("role", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                >
                  <option value="">Select a role</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-500 mb-1">Prefix</span>
                <input
                  type="text"
                  value={form.prefix}
                  onChange={(e) => setField("prefix", e.target.value)}
                  placeholder="e.g. Dr."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-500 mb-1">License Number</span>
                <input
                  type="text"
                  value={form.licenseNumber}
                  onChange={(e) => setField("licenseNumber", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-500 mb-1">First Name</span>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-500 mb-1">Last Name</span>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                />
              </label>
            </div>

            {error && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <ShieldAlert size={13} />
                {error}
              </p>
            )}

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
              >
                <UserPlus size={15} />
                {submitting ? "Creating…" : "Create Account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}