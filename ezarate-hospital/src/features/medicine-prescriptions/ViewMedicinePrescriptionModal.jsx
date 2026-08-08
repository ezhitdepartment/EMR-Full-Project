import { useState } from "react";
import { X, Pill, Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { formatAge } from "../../utils/age";
import { formatDateCreated } from "../../utils/medicinePrescriptions";
import MedicinePrescriptionPDF from "./MedicinePrescriptionPDF";

export default function ViewMedicinePrescriptionModal({ record, onClose }) {
  const [downloading, setDownloading] = useState(false);

  if (!record) return null;
  const p = record.patient || {};
  const fullName = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(", ");

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await pdf(<MedicinePrescriptionPDF record={record} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fullName || "Patient"} Prescription ${record.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 text-teal-700">
              <Pill size={16} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-800">{record.id}</h2>
              <p className="text-xs text-slate-400">Prescription</p>
            </div>
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
          {/* Patient, like the header of the printed Rx pad */}
          <div>
            <p className="text-sm font-semibold text-slate-800">{fullName || "—"}</p>
            <p className="text-xs text-slate-500">
              {formatAge(p.dateOfBirth)} · {p.sex || "—"}
            </p>
            {p.address && <p className="text-xs text-slate-400 mt-0.5">{p.address}</p>}
          </div>

          {/* Rx — medicine, quantity, and instructions only, no price */}
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold text-teal-700 leading-none">℞</span>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Medicines ({record.items?.length || 0})
              </p>
            </div>
            <div className="flex flex-col divide-y divide-slate-100">
              {(record.items || []).map((item, idx) => (
                <div key={idx} className="py-2.5 pl-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-slate-400">{idx + 1}.</span>
                    <p className="font-semibold text-sm text-slate-800">
                      {item.medicineName}
                      {item.milligram ? ` (${item.milligram})` : ""}
                    </p>
                    <span className="text-xs text-slate-500">Qty: {item.quantity}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 pl-4">
                    {item.instructions?.trim() || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Prescribed By</span>
            <span className="font-medium text-slate-700">
              {record.prescribedBy ? `${record.prescribedBy}, M.D.` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 -mt-2">
            <span>Date Created</span>
            <span className="font-medium text-slate-700">
              {formatDateCreated(record.dateCreated)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
          >
            <Download size={14} />
            {downloading ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}