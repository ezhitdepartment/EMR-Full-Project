import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Loader2, Globe } from "lucide-react";

// Medicine picker: click to browse the full local formulary, or type to
// filter it instantly — no network round-trip for the primary flow.
//
// There is no free, public, CORS-enabled API for the Philippine FDA drug
// registry (the FDA Verification Portal is a server-rendered page with an
// Excel export button, not a JSON API — see the note in
// utils/medicinePrescriptions.js). As a secondary, clearly-separated
// source, this also queries the NLM Clinical Table Search Service
// (RxTerms API) — a free, no-key public API — for broader international
// drug-name coverage when the local formulary doesn't have a match.
// Docs: https://clinicaltables.nlm.nih.gov/apidoc/rxterms/v3/doc.html
const RXTERMS_SEARCH_URL = "https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search";
const DEBOUNCE_MS = 300;
const MIN_CHARS_FOR_API = 3;
const MAX_LOCAL_RESULTS = 8;
const MAX_API_RESULTS = 8;

async function searchRxTerms(query, signal) {
  const url = new URL(RXTERMS_SEARCH_URL);
  url.searchParams.set("terms", query);
  url.searchParams.set("maxList", String(MAX_API_RESULTS));

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`RxTerms search failed (${res.status})`);
  const data = await res.json();
  // Shape: [totalCount, [displayNames], {extraFields}, [[displayStrings]]]
  return Array.isArray(data?.[1]) ? data[1] : [];
}

export default function MedicineAutocomplete({
  value,
  onChange,
  catalog = [],
  placeholder = "Select or search a medicine…",
  className = "",
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiResults, setApiResults] = useState([]);
  const [apiError, setApiError] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  // Keep the visible text in sync if the row's value changes from outside
  // (e.g. cleared, or pre-filled).
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? catalog.filter((name) => name.toLowerCase().includes(q)) : catalog;
    return pool.slice(0, MAX_LOCAL_RESULTS);
  }, [catalog, query]);

  function handleInput(e) {
    const next = e.target.value;
    setQuery(next);
    onChange(next); // keep the row's medicineName live as free text while typing
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (next.trim().length < MIN_CHARS_FOR_API) {
      setApiResults([]);
      setLoading(false);
      setApiError(false);
      return;
    }

    setLoading(true);
    setApiError(false);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const names = await searchRxTerms(next.trim(), controller.signal);
        setApiResults(names);
      } catch (err) {
        if (err.name !== "AbortError") setApiError(true);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }

  function handleSelect(name) {
    setQuery(name);
    onChange(name);
    setOpen(false);
  }

  // Don't repeat a name in "More results" if it's already shown locally.
  const apiOnlyResults = useMemo(() => {
    const localLower = new Set(localMatches.map((n) => n.toLowerCase()));
    return apiResults.filter((n) => !localLower.has(n.toLowerCase()));
  }, [apiResults, localMatches]);

  const showApiSection = query.trim().length >= MIN_CHARS_FOR_API;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-slate-300 pl-7 pr-7 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 ${className}`}
        />
        <ChevronDown
          size={13}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Local formulary — the primary, always-available list */}
          {localMatches.length === 0 && !showApiSection ? (
            <div className="px-3 py-2.5 text-xs text-slate-400">No matches in the formulary.</div>
          ) : (
            localMatches.map((name) => (
              <button
                key={name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(name)}
                className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-teal-50 transition-colors"
              >
                {name}
              </button>
            ))
          )}

          {/* Secondary — free international drug database, clearly separated */}
          {showApiSection && (
            <div className="border-t border-slate-100">
              <p className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <Globe size={11} />
                More results (international database)
                {loading && <Loader2 size={11} className="animate-spin text-slate-400" />}
              </p>
              {apiError ? (
                <div className="px-3 pb-2.5 text-xs text-slate-400">Couldn't reach the database — try again.</div>
              ) : !loading && apiOnlyResults.length === 0 ? (
                <div className="px-3 pb-2.5 text-xs text-slate-400">No additional matches found.</div>
              ) : (
                apiOnlyResults.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(name)}
                    className="block w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
