import { useState } from "react";
import { X } from "lucide-react";

// Mirrors the printed "MEDICAL CERTIFICATE" pad — one field per line on the form.
export const emptyMedicalCertificateForm = {
  patientName: "",
  age: "",
  date: "",
  occupation: "",
  classification: "",
  address: "",
  inclusiveDatesOfTreatment: "",
  subjectiveComplaints: "",
  pertinentPhysicalExaminationFindings: "",
  ancillaryExaminationDone: "",
  clinicalDiagnosis: "",
  medicinePrescription: "",
  disposition: "",
  attendingPhysician: "",
  licNo: "",
  ptrNo: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600";
const textareaClass = `${inputClass} resize-none`;

function Field({ label, children, full }) {
  return (
    <label className={`block ${full ? "col-span-full" : ""}`}>
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

export default function MedicalCertificateForm({ initialValues, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    ...emptyMedicalCertificateForm,
    ...(initialValues || {}),
  }));

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave?.(form);
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-teal-700 text-white sticky top-0 rounded-t-2xl z-10">
          <div>
            <h1 className="text-base font-semibold">E. ZARATE HOSPITAL</h1>
            <p className="text-teal-200 text-xs">Medical Certificate</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition-colors"
          >
            <X size={14} />
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {/* Patient info */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Patient Information</p>
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="Patient's Name" full>
                <input
                  value={form.patientName}
                  onChange={(e) => set("patientName", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Age">
                <input value={form.age} onChange={(e) => set("age", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Occupation">
                <input
                  value={form.occupation}
                  onChange={(e) => set("occupation", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Classification">
                <input
                  value={form.classification}
                  onChange={(e) => set("classification", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Address" full>
                <input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Inclusive Dates of Treatment" full>
                <input
                  value={form.inclusiveDatesOfTreatment}
                  onChange={(e) => set("inclusiveDatesOfTreatment", e.target.value)}
                  placeholder="e.g. 07/01/2026 – 07/03/2026"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          {/* Clinical details */}
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Subjective Complaints" full>
              <textarea
                rows={2}
                value={form.subjectiveComplaints}
                onChange={(e) => set("subjectiveComplaints", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <Field label="Pertinent Physical Examination Findings" full>
              <textarea
                rows={3}
                value={form.pertinentPhysicalExaminationFindings}
                onChange={(e) => set("pertinentPhysicalExaminationFindings", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <Field label="Ancillary Examination Done" full>
              <textarea
                rows={2}
                value={form.ancillaryExaminationDone}
                onChange={(e) => set("ancillaryExaminationDone", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <Field label="Clinical Diagnosis" full>
              <textarea
                rows={2}
                value={form.clinicalDiagnosis}
                onChange={(e) => set("clinicalDiagnosis", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <Field label="Medicine Prescription" full>
              <textarea
                rows={3}
                value={form.medicinePrescription}
                onChange={(e) => set("medicinePrescription", e.target.value)}
                className={textareaClass}
              />
            </Field>
            <Field label="Disposition/Recommendations" full>
              <input
                value={form.disposition}
                onChange={(e) => set("disposition", e.target.value)}
                placeholder="e.g. Discharged - Rest with medication x 4 days"
                className={inputClass}
              />
            </Field>
          </div>

          {/* Attending physician */}
          <div className="grid md:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
            <p className="col-span-full text-sm font-semibold text-slate-700 pt-3">Attending Physician</p>
            <Field label="Name and Signature of Attending Physician, M.D." full>
              <input
                value={form.attendingPhysician}
                onChange={(e) => set("attendingPhysician", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Lic. No.">
              <input value={form.licNo} onChange={(e) => set("licNo", e.target.value)} className={inputClass} />
            </Field>
            <Field label="PTR No.">
              <input value={form.ptrNo} onChange={(e) => set("ptrNo", e.target.value)} className={inputClass} />
            </Field>
          </div>

          {/* Submit */}
          <div className="flex gap-4 justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}