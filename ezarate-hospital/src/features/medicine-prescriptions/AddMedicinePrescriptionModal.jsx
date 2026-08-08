import { useMemo, useState } from "react";
import { X, Pill, Plus, Trash2 } from "lucide-react";
import SearchableSelect from "../../components/common/SearchableSelect";
import {
  MEDICINE_CATALOG,
  STATUS_OPTIONS,
  generateMedicinePrescriptionId,
  getMedicineUnitPrice,
  loadMedicinePrescriptions,
  saveMedicinePrescriptions,
  formatCurrency,
} from "../../utils/medicinePrescriptions";

function loadPatients() {
  try {
    const raw = JSON.parse(localStorage.getItem("patients") || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function patientLabel(p) {
  const name = [p.lastName, p.firstName].filter(Boolean).join(", ");
  const idLine = p.hospitalNo || "";
  return idLine ? `${name} — ${idLine}` : name || p.hospitalNo;
}

let rowSeq = 0;
function newRow() {
  rowSeq += 1;
  return { rowId: `row-${rowSeq}`, medicineName: "", quantity: 1, unitPrice: 0 };
}

export default function AddMedicinePrescriptionModal({ onClose, onCreated }) {
  const patients = useMemo(loadPatients, []);
  const [hospitalNo, setHospitalNo] = useState("");
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [rows, setRows] = useState([newRow()]);
  const [error, setError] = useState("");

  const selectedPatient = patients.find((p) => p.hospitalNo === hospitalNo) || null;

  const total = rows.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
    0
  );

  function updateRow(rowId, patch) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function selectMedicine(rowId, name) {
    updateRow(rowId, { medicineName: name, unitPrice: getMedicineUnitPrice(name) });
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(rowId) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.rowId !== rowId) : prev));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!hospitalNo) {
      setError("Please select a patient.");
      return;
    }
    const items = rows.filter((r) => r.medicineName.trim() !== "");
    if (items.length === 0) {
      setError("Please add at least one medicine.");
      return;
    }

    const existing = loadMedicinePrescriptions();
    const record = {
      id: generateMedicinePrescriptionId(existing),
      hospitalNo,
      patient: {
        firstName: selectedPatient?.firstName || "",
        lastName: selectedPatient?.lastName || "",
        middleName: selectedPatient?.middleName || "",
        sex: selectedPatient?.sex || "",
        dateOfBirth: selectedPatient?.dateOfBirth || "",
      },
      status,
      items: items.map((r) => ({
        medicineName: r.medicineName,
        quantity: Number(r.quantity) || 0,
        unitPrice: Number(r.unitPrice) || 0,
      })),
      dateCreated: new Date().toISOString(),
    };

    saveMedicinePrescriptions([record, ...existing]);
    onCreated(record);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 text-teal-700">
              <Pill size={16} />
            </span>
            <h2 className="text-base font-semibold text-slate-800">Add Prescription</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient */}
            <label className="block">
              <span className="block text-xs font-medium text-slate-500 mb-1">
                Patient <span className="text-red-500">*</span>
              </span>
              <SearchableSelect
                value={hospitalNo}
                onChange={setHospitalNo}
                options={patients}
                getValue={(p) => p.hospitalNo}
                getLabel={patientLabel}
                placeholder={
                  patients.length === 0 ? "No patients yet — create one first" : "Select patient"
                }
                disabled={patients.length === 0}
                inputClass="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              />
            </label>

            {/* Status */}
            <label className="block">
              <span className="block text-xs font-medium text-slate-500 mb-1">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Medicine line items */}
          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1">
              Medicines <span className="text-red-500">*</span>
            </span>
            <div className="flex flex-col gap-2">
              {rows.map((row) => {
                const subtotal = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
                return (
                  <div
                    key={row.rowId}
                    className="grid grid-cols-[1fr_46px_64px_56px_24px] gap-1.5 items-center sm:grid-cols-[1fr_70px_100px_90px_28px] sm:gap-2"
                  >
                    <select
                      value={row.medicineName}
                      onChange={(e) => selectMedicine(row.rowId, e.target.value)}
                      className="min-w-0 rounded-lg border border-slate-300 px-1.5 py-2 text-xs sm:px-2 sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    >
                      <option value="">Select medicine</option>
                      {MEDICINE_CATALOG.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.rowId, { quantity: e.target.value })}
                      className="min-w-0 rounded-lg border border-slate-300 px-1 py-2 text-xs sm:px-2 sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.unitPrice}
                      onChange={(e) => updateRow(row.rowId, { unitPrice: e.target.value })}
                      className="min-w-0 rounded-lg border border-slate-300 px-1 py-2 text-xs sm:px-2 sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    />
                    <p className="text-xs sm:text-sm text-slate-600 text-right pr-0.5 sm:pr-1 truncate">
                      {formatCurrency(subtotal)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeRow(row.rowId)}
                      disabled={rows.length === 1}
                      className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              <Plus size={14} />
              Add medicine
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
            <span className="text-sm text-slate-500">Total Amount</span>
            <span className="text-base font-semibold text-slate-800">{formatCurrency(total)}</span>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
            >
              Add Prescription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
