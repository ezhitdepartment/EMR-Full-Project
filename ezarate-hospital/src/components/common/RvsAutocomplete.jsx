import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { RVS_CODES } from "../../data/rvsCodes";

const MAX_RESULTS = 30;

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip accents, e.g. "é" -> "e"
}

function highlight(text, tokens) {
  if (tokens.length === 0) return text;
  const pattern = tokens
    .filter((t) => t.length > 1)
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  if (!pattern) return text;
  const re = new RegExp(`(${pattern})`, "ig");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) && i % 2 === 1 ? (
      <mark key={i} className="bg-amber-200 text-inherit rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// Scores one catalog entry against the query — every token has to match
// something (code, description, or section/category) or the entry is
// rejected outright, same "AND across tokens" approach as the ICD-10
// picker, so "incision abscess" only turns up entries mentioning both
// words.
function scoreEntry(entry, rawQuery, tokens) {
  const name = normalize(entry.name);
  const code = normalize(entry.code);
  const category = normalize(entry.category || "");

  if (code === rawQuery) return 1000;
  if (code.startsWith(rawQuery)) return 900;
  if (name === rawQuery) return 850;

  let score = 0;
  for (const token of tokens) {
    let tokenScore = 0;
    if (code.includes(token)) tokenScore = Math.max(tokenScore, 60);
    if (name.includes(token)) tokenScore = Math.max(tokenScore, 40);
    if (category.includes(token)) tokenScore = Math.max(tokenScore, 15);
    if (tokenScore === 0) return null;
    score += tokenScore;
  }

  if (name.startsWith(rawQuery)) score += 80;
  else if (name.includes(rawQuery)) score += 30;

  score -= Math.min(name.length, 60) * 0.1;
  return score;
}

// RVS (Relative Value Scale) procedure code picker for the ED Management
// section — search-and-select, exactly like the ICD-10 diagnosis picker
// (Icd10Autocomplete) elsewhere on this form. Each click calls onSelect(entry)
// once and clears the search box (the dropdown stays open so several codes
// can be picked back-to-back) — it's deliberately not the thing that holds
// the RVS Code / Notes values itself. ConsultationForm.jsx's
// addSurgicalProcedureRvsCode stacks every pick onto the RVS Code field
// (comma-separated) and the Notes field (one sentence per code, each
// ending in its own period), and both of those plain fields are left fully
// editable afterward (so a doctor can adjust the wording, reorder/trim
// entries, or just type a code/note by hand for a procedure that isn't on
// this list yet).
//
// Backed by the full PhilHealth "List of Procedure Case Rates" schedule
// (src/data/rvsCodes.js). Search matches on code, description, or
// section/category, tokenized so word order doesn't matter, ranked by
// relevance rather than array order — an exact code hit always beats a
// loose text match.
export default function RvsAutocomplete({ onSelect, placeholder = "Search an RVS code or procedure…" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const tokens = useMemo(() => normalize(query.trim()).split(/\s+/).filter(Boolean), [query]);

  const matches = useMemo(() => {
    const rawQuery = normalize(query.trim());
    if (!rawQuery) return RVS_CODES.slice(0, MAX_RESULTS);

    const scored = [];
    for (const entry of RVS_CODES) {
      const score = scoreEntry(entry, rawQuery, tokens);
      if (score !== null) scored.push({ entry, score });
    }

    scored.sort((a, b) => b.score - a.score || a.entry.code.localeCompare(b.entry.code));
    return scored.slice(0, MAX_RESULTS).map((s) => s.entry);
  }, [query, tokens]);

  useEffect(() => {
    setActiveIndex(0);
  }, [matches]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[activeIndex];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function pick(entry) {
    onSelect(entry);
    setQuery("");
    // Deliberately left open — ED Management stacks multiple RVS codes
    // (see addSurgicalProcedureRvsCode in ConsultationForm.jsx), so a
    // doctor picking several in a row shouldn't have to reopen the list
    // after every single pick.
  }

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[activeIndex]) pick(matches[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
        />
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {matches.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-slate-400">
              {query.trim()
                ? "No matching RVS code found. Just type the code/procedure into the fields below instead."
                : "Start typing to search, or browse below."}
            </div>
          ) : (
            matches.map((entry, i) => (
              <button
                key={entry.code + entry.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(entry)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-start gap-2 text-left px-3 py-2 text-sm transition-colors ${
                  i === activeIndex ? "bg-teal-50" : "hover:bg-teal-50"
                }`}
              >
                <span className="shrink-0 mt-0.5 font-mono text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5">
                  {highlight(entry.code, tokens)}
                </span>
                <span className="min-w-0">
                  <span className="block text-slate-700">{highlight(entry.name, tokens)}</span>
                  {entry.category && (
                    <span className="block text-[11px] text-slate-400">{entry.category}</span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
