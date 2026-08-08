import { useState } from "react";
import { X } from "lucide-react";
import logoImg from "../../assets/logo.jpg";

// One row per numbered line on the paper form (1–9 under Take Home Medications).
const MED_ROWS = 9;

// Left-hand and right-hand columns of the paper form's "Ancillaries Done"
// checklist — 7 + 7, in the same order the printed form lists them.
export const ANCILLARY_ITEMS = [
  { key: "cbc", label: "CBC w/ PC" },
  { key: "na", label: "Na+" },
  { key: "k", label: "K+" },
  { key: "cl", label: "Cl-" },
  { key: "ua", label: "UA" },
  { key: "fa", label: "FA" },
  { key: "ecg12L", label: "12-L ECG" },
  { key: "hgt", label: "HGT" },
  { key: "hba1c", label: "HbA1c" },
  { key: "crea", label: "Crea" },
  { key: "sgot", label: "SGOT" },
  { key: "sgpt", label: "SGPT" },
  { key: "bun", label: "BUN" },
  { key: "bua", label: "BUA" },
];
const ANCILLARY_COL_1 = ANCILLARY_ITEMS.slice(0, 7);
const ANCILLARY_COL_2 = ANCILLARY_ITEMS.slice(7);

// Maps each ancillary checkbox to the exact lab_test_catalog.test_name it
// corresponds to, so a Consultation's ordered diagnostics (Diagnostics /
// Tests Ordered — see utils/labOrders.js's DIAGNOSTIC_GROUPS) can
// auto-check the matching box here. Kept separate from ANCILLARY_ITEMS
// since the box label ("Na+") and the catalog's full test name ("Sodium
// Na+") aren't always identical strings. There's no "12-L ECG" entry in
// lab_test_catalog today, so ecg12L is left out — nothing to auto-match
// it against yet, it stays a manual checkbox.
export const ANCILLARY_TEST_NAMES = {
  cbc: "CBC w/ PC",
  na: "Sodium Na+",
  k: "Potassium K+",
  cl: "Chloride Cl-",
  ua: "Urinalysis",
  fa: "Fecalysis",
  hgt: "Hgt",
  hba1c: "HbA1c",
  crea: "Creatinine",
  sgot: "SGOT",
  sgpt: "SGPT",
  bun: "BUN",
  bua: "BUA",
};

function emptyMedRows() {
  return Array.from({ length: MED_ROWS }, () => ({ medicine: "", dosage: "", time: "" }));
}

export const emptyDischargeForm = {
  hospitalNo: "",
  patientName: "",
  address: "",
  age: "",
  sex: "",
  dob: "",
  dateTimeAttended: "",
  nurseOnDuty: "",
  chiefComplaints: "",
  ancillaries: ANCILLARY_ITEMS.reduce((acc, item) => ({ ...acc, [item.key]: false }), {}),
  xray: false,
  xrayNote: "",
  others: false,
  othersNote: "",
  finalDiagnosis: "",
  treatmentGiven: "",
  dateTimeDischarge: "",
  conditionUponDischarge: "",
  disposition: "",
  medications: emptyMedRows(),
  followUpExamination: "",
  erPhysician: "",
  physicianDate: "",
};

// ---------------------------------------------------------------------------
// Paper-form styling — plain black-on-white, underline-style blanks and
// ruled boxes instead of the app's usual rounded/shadowed card look, so
// this reads as a faithful on-screen replica of the printed Emergency
// Room Discharge Instruction Form rather than a generic web form.
// ---------------------------------------------------------------------------
const lineInputClass =
  "flex-1 min-w-0 border-0 border-b border-slate-900 bg-transparent px-1 py-0.5 text-[13px] text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-teal-50/40";
const ruledTextareaStyle = {
  backgroundImage: "repeating-linear-gradient(#fff 0 27px, #94a3b8 27px 28px)",
  lineHeight: "28px",
  backgroundAttachment: "local",
};

function Line({ label, children, labelWidth = "auto", full }) {
  return (
    <div className={`flex items-end gap-2 ${full ? "col-span-full" : ""}`}>
      <span
        className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-900 pb-0.5"
        style={{ width: labelWidth }}
      >
        {label}:
      </span>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[11px] font-bold uppercase tracking-wide text-slate-900 mb-1.5">{children}:</p>;
}

export default function ErDischargeForm({ initialValues, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    ...emptyDischargeForm,
    physicianDate: new Date().toISOString().slice(0, 10),
    ...(initialValues || {}),
    ancillaries: {
      ...emptyDischargeForm.ancillaries,
      ...((initialValues && initialValues.ancillaries) || {}),
    },
    medications:
      initialValues && Array.isArray(initialValues.medications) && initialValues.medications.length
        ? initialValues.medications
        : emptyMedRows(),
  }));

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function toggleAncillary(key) {
    setForm((f) => ({ ...f, ancillaries: { ...f.ancillaries, [key]: !f.ancillaries[key] } }));
  }
  function setMedRow(index, field, value) {
    setForm((f) => {
      const medications = [...f.medications];
      medications[index] = { ...medications[index], [field]: value };
      return { ...f, medications };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave?.(form);
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        {/* App chrome — not part of the printed form, just the modal's own
            close bar, kept visually separate (teal) from the plain
            black-on-white paper replica below it. */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-teal-700 text-white sticky top-0 z-10">
          <p className="text-xs font-medium text-teal-100">Emergency Room Discharge Instruction Form</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center gap-1.5 rounded border border-white/30 px-3 py-1 text-xs font-medium hover:bg-white/10 transition-colors"
          >
            <X size={14} />
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="text-slate-900">
          {/* ============================ THE PAPER ============================ */}
          <div className="px-8 sm:px-12 py-8 font-serif">
            {/* Letterhead */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-5">
              <div className="flex items-center gap-3">
                <img
                  src={logoImg}
                  alt="E. Zarate General Hospital seal"
                  className="w-14 h-14 rounded-full object-cover shrink-0 border border-slate-300"
                />
                <div>
                  <h1 className="text-xl font-bold tracking-wide">E. ZARATE HOSPITAL</h1>
                  <p className="text-[10px] text-slate-700 leading-snug">
                    16 J. Aguilar Avenue, Talon II, Las Piñas City, Metro Manila, Philippines
                  </p>
                  <p className="text-[10px] text-slate-700 leading-snug">
                    Tel Nos: (02) 871-1990 / (02) 8028-5503 / (02) 878-6905
                  </p>
                  <p className="text-[10px] text-slate-700 leading-snug">Email: ezaratehospital@yahoo.com</p>
                </div>
              </div>
              <div className="text-right shrink-0 pl-4">
                <Line label="Hospital No." labelWidth="72px">
                  <input
                    value={form.hospitalNo}
                    onChange={(e) => set("hospitalNo", e.target.value)}
                    className={`${lineInputClass} w-28 text-right`}
                  />
                </Line>
              </div>
            </div>

            <h2 className="text-center text-sm font-bold uppercase tracking-widest mb-6">
              Emergency Room Discharge Instruction Form
            </h2>

            {/* Patient info */}
            <div className="space-y-2.5 mb-5">
              <div className="grid grid-cols-3 gap-x-4">
                <Line label="Patient's Name" labelWidth="100px" full>
                  <input
                    value={form.patientName}
                    onChange={(e) => set("patientName", e.target.value)}
                    className={lineInputClass}
                  />
                </Line>
              </div>
              <div className="grid grid-cols-2 gap-x-6">
                <Line label="Age" labelWidth="40px">
                  <input value={form.age} onChange={(e) => set("age", e.target.value)} className={`${lineInputClass} w-14`} />
                </Line>
                <Line label="Sex" labelWidth="40px">
                  <select value={form.sex} onChange={(e) => set("sex", e.target.value)} className={lineInputClass}>
                    <option value="">—</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </Line>
              </div>
              <div className="grid grid-cols-2 gap-x-6">
                <Line label="Address" labelWidth="100px">
                  <input
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    className={lineInputClass}
                  />
                </Line>
                <Line label="D.O.B." labelWidth="60px">
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => set("dob", e.target.value)}
                    className={lineInputClass}
                  />
                </Line>
              </div>
              <div className="grid grid-cols-2 gap-x-6">
                <Line label="Date/Time Attended" labelWidth="140px">
                  <input
                    value={form.dateTimeAttended}
                    onChange={(e) => set("dateTimeAttended", e.target.value)}
                    placeholder="e.g. 07/03/2026 3:45 PM"
                    className={lineInputClass}
                  />
                </Line>
                <Line label="Nurse on Duty" labelWidth="100px">
                  <input
                    value={form.nurseOnDuty}
                    onChange={(e) => set("nurseOnDuty", e.target.value)}
                    className={lineInputClass}
                  />
                </Line>
              </div>
              <Line label="Chief Complaint/s" labelWidth="120px">
                <input
                  value={form.chiefComplaints}
                  onChange={(e) => set("chiefComplaints", e.target.value)}
                  className={lineInputClass}
                />
              </Line>
            </div>

            {/* Ancillaries done */}
            <div className="mb-5 pt-2 border-t border-slate-300">
              <SectionLabel>Ancillaries Done</SectionLabel>
              <div className="grid grid-cols-2 gap-x-10 gap-y-1 mb-2">
                <div className="space-y-1">
                  {ANCILLARY_COL_1.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-[13px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.ancillaries[item.key]}
                        onChange={() => toggleAncillary(item.key)}
                        className="w-3.5 h-3.5 rounded-none border-2 border-slate-900 text-slate-900 focus:ring-0 focus:ring-offset-0"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
                <div className="space-y-1">
                  {ANCILLARY_COL_2.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-[13px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.ancillaries[item.key]}
                        onChange={() => toggleAncillary(item.key)}
                        className="w-3.5 h-3.5 rounded-none border-2 border-slate-900 text-slate-900 focus:ring-0 focus:ring-offset-0"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.xray}
                    onChange={() => set("xray", !form.xray)}
                    className="w-3.5 h-3.5 shrink-0 rounded-none border-2 border-slate-900 text-slate-900 focus:ring-0 focus:ring-offset-0"
                  />
                  <Line label="Xray" labelWidth="42px">
                    <input
                      value={form.xrayNote}
                      onChange={(e) => set("xrayNote", e.target.value)}
                      className={lineInputClass}
                    />
                  </Line>
                </label>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.others}
                    onChange={() => set("others", !form.others)}
                    className="w-3.5 h-3.5 shrink-0 rounded-none border-2 border-slate-900 text-slate-900 focus:ring-0 focus:ring-offset-0"
                  />
                  <Line label="Others" labelWidth="52px">
                    <input
                      value={form.othersNote}
                      onChange={(e) => set("othersNote", e.target.value)}
                      className={lineInputClass}
                    />
                  </Line>
                </label>
              </div>
            </div>

            {/* Final diagnosis / Treatment given */}
            <div className="grid md:grid-cols-2 gap-6 mb-5 pt-2 border-t border-slate-300">
              <div>
                <SectionLabel>Final Diagnosis</SectionLabel>
                <textarea
                  rows={6}
                  value={form.finalDiagnosis}
                  onChange={(e) => set("finalDiagnosis", e.target.value)}
                  style={ruledTextareaStyle}
                  className="w-full resize-none border-0 bg-transparent text-[13px] text-slate-900 px-0.5 focus:outline-none"
                />
              </div>
              <div>
                <SectionLabel>Treatment / Medication Given</SectionLabel>
                <textarea
                  rows={6}
                  value={form.treatmentGiven}
                  onChange={(e) => set("treatmentGiven", e.target.value)}
                  style={ruledTextareaStyle}
                  className="w-full resize-none border-0 bg-transparent text-[13px] text-slate-900 px-0.5 focus:outline-none"
                />
              </div>
            </div>

            {/* Discharge details */}
            <div className="grid sm:grid-cols-3 gap-x-6 gap-y-2.5 mb-5 pt-2 border-t border-slate-300">
              <Line label="Date/Time of Discharge" labelWidth="150px" full>
                <input
                  value={form.dateTimeDischarge}
                  onChange={(e) => set("dateTimeDischarge", e.target.value)}
                  placeholder="e.g. 07/03/2026 5:30 PM"
                  className={lineInputClass}
                />
              </Line>
              <Line label="Condition Upon Discharge" labelWidth="170px" full>
                <input
                  value={form.conditionUponDischarge}
                  onChange={(e) => set("conditionUponDischarge", e.target.value)}
                  className={lineInputClass}
                />
              </Line>
              <Line label="Disposition" labelWidth="90px" full>
                <input
                  value={form.disposition}
                  onChange={(e) => set("disposition", e.target.value)}
                  className={lineInputClass}
                />
              </Line>
            </div>

            {/* Take home medications */}
            <div className="mb-5 pt-2 border-t border-slate-300">
              <SectionLabel>Take Home Medications</SectionLabel>
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr>
                    <th className="w-6 border border-slate-900 py-1 text-[10px] font-bold uppercase">#</th>
                    <th className="border border-slate-900 py-1 text-[10px] font-bold uppercase">Medicine</th>
                    <th className="border border-slate-900 py-1 text-[10px] font-bold uppercase w-32">Dosage</th>
                    <th className="border border-slate-900 py-1 text-[10px] font-bold uppercase w-28">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {form.medications.map((row, i) => (
                    <tr key={i}>
                      <td className="border border-slate-900 text-center text-slate-500">{i + 1}</td>
                      <td className="border border-slate-900 p-0">
                        <input
                          value={row.medicine}
                          onChange={(e) => setMedRow(i, "medicine", e.target.value)}
                          className="w-full border-0 bg-transparent px-2 py-1 text-[13px] focus:outline-none focus:bg-teal-50/40"
                        />
                      </td>
                      <td className="border border-slate-900 p-0">
                        <input
                          value={row.dosage}
                          onChange={(e) => setMedRow(i, "dosage", e.target.value)}
                          className="w-full border-0 bg-transparent px-2 py-1 text-[13px] focus:outline-none focus:bg-teal-50/40"
                        />
                      </td>
                      <td className="border border-slate-900 p-0">
                        <input
                          value={row.time}
                          onChange={(e) => setMedRow(i, "time", e.target.value)}
                          className="w-full border-0 bg-transparent px-2 py-1 text-[13px] focus:outline-none focus:bg-teal-50/40"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Follow-up + Physician */}
            <div className="pt-2 border-t border-slate-300 space-y-4">
              <Line label="Follow-up Examination" labelWidth="150px" full>
                <input
                  value={form.followUpExamination}
                  onChange={(e) => set("followUpExamination", e.target.value)}
                  className={lineInputClass}
                />
              </Line>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 pt-6">
                <Line label="E.R. Physician on Duty" labelWidth="150px">
                  <input
                    value={form.erPhysician}
                    onChange={(e) => set("erPhysician", e.target.value)}
                    className={lineInputClass}
                  />
                </Line>
                <Line label="Date" labelWidth="50px">
                  <input
                    type="date"
                    value={form.physicianDate}
                    onChange={(e) => set("physicianDate", e.target.value)}
                    className={lineInputClass}
                  />
                </Line>
              </div>
            </div>
          </div>
          {/* ========================== END OF THE PAPER ========================== */}

          {/* Save / Cancel — app chrome, not part of the printed form */}
          <div className="flex gap-4 justify-end px-8 sm:px-12 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
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