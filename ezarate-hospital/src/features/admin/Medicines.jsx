import { useEffect, useMemo, useState } from "react";
import { Search, Plus, RefreshCw, Pill, FilterX, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import AddMedicineModal from "./AddMedicineModal";
import { loadMedicines, deleteMedicine } from "../../utils/medicines";
import { useAuth } from "../../context/AuthContext";

const PAGE_SIZE = 10;

export default function Medicines() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingName, setDeletingName] = useState(null);
  const [banner, setBanner] = useState(null); // { type: "success" | "error", message }

  // Only Admin/Pharmacist can add or remove — everyone else who somehow
  // lands here (they shouldn't, since AppRoutes already gates the route on
  // hasFeatureAccess(user?.role, "medicines")) sees a read-only list.
  const canManage = user?.role === "admin" || user?.role === "pharmacist";

  async function refresh() {
    setLoading(true);
    setMedicines(await loadMedicines());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // "focus" catches "came back to this tab" the same way the other
    // Supabase-backed list pages (e.g. MedicinePrescriptions.jsx) do.
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // Auto-dismiss the banner so it doesn't linger forever.
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = !q ? medicines : medicines.filter((name) => name.toLowerCase().includes(q));
    return [...result].sort((a, b) => a.localeCompare(b));
  }, [medicines, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  function handleAdded(name) {
    setShowAddModal(false);
    setBanner({ type: "success", message: `"${name}" was added to the formulary.` });
    refresh();
  }

  async function handleDelete(name) {
    if (!window.confirm(`Remove "${name}" from the formulary? This can't be undone.`)) return;
    setDeletingName(name);
    try {
      await deleteMedicine(name);
      setBanner({ type: "success", message: `"${name}" was removed from the formulary.` });
      refresh();
    } catch (err) {
      setBanner({ type: "error", message: err.message || "Couldn't remove that medicine." });
    } finally {
      setDeletingName(null);
    }
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Medicines</h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain the medicine formulary and inventory catalog.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            Add Medicine
          </button>
        )}
      </div>

      {/* Banner */}
      {banner && (
        <div
          className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${
            banner.type === "success"
              ? "border-teal-200 bg-teal-50 text-teal-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {banner.message}
        </div>
      )}

      {/* Search + toolbar */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicines"
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
          />
        </div>
        <button
          type="button"
          onClick={() => setSearch("")}
          disabled={!search}
          title="Clear search"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FilterX size={16} />
        </button>
        <button
          type="button"
          onClick={refresh}
          title="Refresh list"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {!loading && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <Pill size={28} />
            <p className="text-sm font-medium">No medicines found</p>
            <p className="text-xs text-slate-400">
              {medicines.length === 0
                ? canManage
                  ? 'Click "Add Medicine" to start building the formulary.'
                  : "The formulary hasn't been set up yet."
                : "Try a different search."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-900 text-left text-xs uppercase tracking-wide text-white">
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">#</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Medicine Name</th>
                    {canManage && (
                      <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((name, idx) => (
                    <tr
                      key={name}
                      className="border-b border-slate-100 hover:bg-teal-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {(safePage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{name}</td>
                      {canManage && (
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(name)}
                            disabled={deletingName === name}
                            title="Remove medicine"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-300 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500">
                Showing <span className="font-medium text-slate-700">{rangeStart}</span>–
                <span className="font-medium text-slate-700">{rangeEnd}</span> of{" "}
                <span className="font-medium text-slate-700">{filtered.length}</span> medicines
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>
                <span className="text-xs text-slate-500">
                  Page <span className="font-medium text-slate-700">{safePage}</span> of{" "}
                  <span className="font-medium text-slate-700">{pageCount}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={safePage >= pageCount}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showAddModal && (
        <AddMedicineModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} />
      )}
    </div>
  );
}