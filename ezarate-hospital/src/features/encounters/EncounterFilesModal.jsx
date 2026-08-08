import { X, Folder } from "lucide-react";

// Placeholder, same "ready for later" pattern used for other not-yet-built
// sections in this app — wire this up to real file storage (Supabase
// Storage) once that's in place.
export default function EncounterFilesModal({ encounter, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Folder size={18} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-slate-800">Registration Files — {encounter.id}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-10 flex flex-col items-center justify-center text-center gap-2">
          <Folder size={28} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">This section isn't set up yet</p>
          <p className="text-xs text-slate-400 max-w-xs">
            Files attached to this encounter will show up here once file storage is wired up.
          </p>
        </div>
      </div>
    </div>
  );
}