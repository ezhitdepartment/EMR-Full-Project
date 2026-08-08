import { useState } from "react";
import { X, Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const TABS = [
  { id: "personal", label: "Personal Information" },
  { id: "security", label: "Security Information" },
];

const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "At least one uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "At least one lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "At least one number", test: (v) => /[0-9]/.test(v) },
  {
    id: "special",
    label: "At least one special character",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

function PersonalInformationTab({ onClose }) {
  const { user, updateProfile } = useAuth();
  const initial = {
    prefix: user?.prefix || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    licenseNumber: user?.licenseNumber || "",
  };
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  function handleReset() {
    setForm(initial);
    setError("");
    setSaved(false);
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.licenseNumber.trim()) {
      setError("First name, last name, and license number are required.");
      return;
    }
    const result = await updateProfile({
      prefix: form.prefix.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      licenseNumber: form.licenseNumber.trim(),
    });
    if (!result.success) {
      setError(result.error);
      return;
    }
    setError("");
    setSaved(true);
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-teal-700">Personal Information</h3>
      <p className="text-xs text-slate-400 mb-5">Manage your account details here</p>

      <div className="flex flex-col gap-4 max-w-md">
        <label className="block">
          <span className="block text-sm text-slate-700 mb-1">Prefix</span>
          <input
            type="text"
            value={form.prefix}
            onChange={(e) => handleChange("prefix", e.target.value)}
            placeholder="e.g. Dr."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
          />
        </label>

        <label className="block">
          <span className="block text-sm text-slate-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
          />
        </label>

        <label className="block">
          <span className="block text-sm text-slate-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
          />
        </label>

        <label className="block">
          <span className="block text-sm text-slate-700 mb-1">
            License Number <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={form.licenseNumber}
            onChange={(e) => handleChange("licenseNumber", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
          />
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {saved && <p className="text-xs text-emerald-600">Changes saved.</p>}
      </div>

      <div className="flex items-center justify-between mt-8 max-w-md">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="block text-sm text-slate-700 mb-1">
        {label} <span className="text-red-500">*</span>
      </span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          tabIndex={-1}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </label>
  );
}

function SecurityInformationTab() {
  const { changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function resetForm() {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSaved(false);
  }

  async function handleSave() {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }
    if (!PASSWORD_RULES.every((rule) => rule.test(newPassword))) {
      setError("New password doesn't meet all the requirements below.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    const result = await changePassword(oldPassword, newPassword);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setError("");
    setSaved(true);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-teal-700">Security Information</h3>
      <p className="text-xs text-slate-400 mb-5">Manage your password and security settings here</p>

      <div className="flex flex-col gap-4 max-w-md">
        <PasswordField label="Old Password" value={oldPassword} onChange={setOldPassword} />
        <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} />
        <PasswordField
          label="Confirm New Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

        <div>
          <p className="text-xs text-slate-500 mb-1.5">Password must contain:</p>
          <ul className="flex flex-col gap-1">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(newPassword);
              return (
                <li
                  key={rule.id}
                  className={`flex items-center gap-1.5 text-xs ${
                    met ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full ${
                      met ? "bg-emerald-100" : "bg-slate-200"
                    }`}
                  >
                    {met && <Check size={9} strokeWidth={3} />}
                  </span>
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {saved && <p className="text-xs text-emerald-600">Password updated.</p>}
      </div>

      <div className="flex items-center justify-between mt-8 max-w-md">
        <button
          type="button"
          onClick={resetForm}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default function AccountSettingsModal({ onClose }) {
  const [tab, setTab] = useState("personal");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Account Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-6 px-6 py-5">
          <div className="w-52 shrink-0 flex flex-col gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-teal-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            {tab === "personal" ? <PersonalInformationTab /> : <SecurityInformationTab />}
          </div>
        </div>
      </div>
    </div>
  );
}