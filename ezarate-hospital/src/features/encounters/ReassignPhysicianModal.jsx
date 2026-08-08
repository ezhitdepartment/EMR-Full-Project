import { useEffect, useState } from "react";
import { X, UserCog } from "lucide-react";
import SearchableSelect from "../../components/common/SearchableSelect";
import { loadDoctors } from "../../utils/encounters";

export default function ReassignPhysicianModal({ encounter, onClose, onSave }) {
  const [doctor, setDoctor] = useState(encounter.doctor || "");
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    loadDoctors().then(setDoctors);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!doctor) return;
    onSave(doctor);
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <UserCog size={18} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-slate-800">Reassign Physician</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <p className="text-xs text-slate-500">
            {encounter.id} — currently assigned to{" "}
            <span className="font-semibold text-slate-700">{encounter.doctor || "—"}</span>
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
              New Doctor
            </label>
            <SearchableSelect
              value={doctor}
              onChange={setDoctor}
              options={doctors}
              getValue={(d) => d}
              getLabel={(d) => d}
              placeholder="Select a doctor"
              required
            />
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
              Reassign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}