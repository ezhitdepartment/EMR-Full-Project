import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

// Drop-in replacement for a native <select> when the option list can get
// long (barangays especially — some cities have 100+). Same controlled
// value/onChange(value) contract as a native select, so it swaps in
// cleanly wherever one was used.
export default function SearchableSelect({
  value,
  onChange,
  options,
  getValue = (o) => o.code,
  getLabel = (o) => o.name,
  placeholder = "Select",
  loadingLabel = "Loading…",
  loading = false,
  disabled = false,
  required = false,
  inputClass = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const selected = options.find((o) => getValue(o) === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => getLabel(o).toLowerCase().includes(q)) : options;

  function pick(optValue) {
    onChange(optValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${inputClass} flex items-center justify-between text-left disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`}
      >
        <span className={`truncate ${selected ? "" : "text-slate-400"}`}>
          {loading ? loadingLabel : selected ? getLabel(selected) : placeholder}
        </span>
        <ChevronDown size={14} className="text-slate-400 shrink-0 ml-2" />
      </button>

      {/* Zero-size but real input so native required-field validation still
          fires on submit, since a button element can't be `required`. */}
      {required && (
        <input
          tabIndex={-1}
          value={value || ""}
          required
          onChange={() => {}}
          className="absolute w-px h-px opacity-0 pointer-events-none"
        />
      )}

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-md border border-slate-200 pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">No matches</p>
            ) : (
              filtered.map((o) => {
                const v = getValue(o);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => pick(v)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 transition-colors ${
                      v === value ? "bg-teal-50 text-teal-700 font-medium" : "text-slate-700"
                    }`}
                  >
                    {getLabel(o)}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
