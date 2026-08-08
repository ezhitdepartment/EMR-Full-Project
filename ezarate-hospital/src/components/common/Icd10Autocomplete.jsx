import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { ICD10_CODES } from "../../data/icd10Codes";

const MAX_RESULTS = 30;

// Common clinical shorthand hospital staff actually type, mapped to the
// real words those diagnoses are written with in the ICD-10 name column.
// A query token that matches a key on the left also searches for every
// word on the right, so typing "UTI" still finds "Urinary tract infection".
const ABBREVIATIONS = {
  uti: ["urinary", "tract", "infection"],
  urti: ["upper", "respiratory", "tract", "infection"],
  lrti: ["lower", "respiratory", "tract", "infection"],
  cap: ["community", "acquired", "pneumonia"],
  copd: ["chronic", "obstructive", "pulmonary"],
  htn: ["hypertensive", "hypertension"],
  dm: ["diabetes", "mellitus"],
  t2dm: ["diabetes", "mellitus"],
  tb: ["tuberculosis"],
  ptb: ["pulmonary", "tuberculosis"],
  cva: ["cerebrovascular"],
  mi: ["myocardial", "infarction"],
  chf: ["heart", "failure"],
  age: ["gastroenteritis"],
  dhf: ["dengue", "hemorrhagic"],
  gerd: ["gastro", "esophageal", "reflux"],
  pud: ["peptic", "ulcer"],
  ckd: ["chronic", "kidney"],
  aki: ["acute", "kidney"],
  uri: ["upper", "respiratory"],
  lbm: ["diarrhea"],
  afib: ["atrial", "fibrillation"],
};

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip accents, e.g. "é" -> "e"
}

function expandToken(token) {
  return ABBREVIATIONS[token] ? [token, ...ABBREVIATIONS[token]] : [token];
}

// Medical terms routinely differ only by suffix — "tuberculous" vs.
// "tuberculosis", "diabetic" vs. "diabetes" — which a strict word-equals
// or startsWith check treats as unrelated. Comparing a shared root prefix
// (once both words are long enough that a short prefix wouldn't be a
// false positive) catches these without a full stemming library.
function sharesStem(word, candidate) {
  const minLen = 5;
  if (word.length < minLen || candidate.length < minLen) return false;
  const cut = Math.min(word.length, candidate.length, 7);
  return word.slice(0, cut) === candidate.slice(0, cut);
}

// Scores one catalog entry against the user's query tokens. Returns null
// if the entry doesn't genuinely match (every token has to hit something),
// otherwise a number — higher is a better match. This replaces the old
// "does the whole query appear as one substring" check, which missed
// anything typed out of order or split across two ICD-10 name fragments.
function scoreEntry(entry, rawQuery, tokens) {
  const name = normalize(entry.name);
  const code = normalize(entry.code);

  if (code === rawQuery) return 1000;
  if (code.startsWith(rawQuery)) return 900;
  if (name === rawQuery) return 850;

  let score = 0;
  const nameWords = name.split(/[^a-z0-9]+/).filter(Boolean);

  for (const token of tokens) {
    const candidates = expandToken(token);
    let tokenScore = 0;

    for (const candidate of candidates) {
      if (code.includes(candidate)) tokenScore = Math.max(tokenScore, 60);
      if (nameWords.some((w) => w === candidate)) tokenScore = Math.max(tokenScore, 55);
      else if (nameWords.some((w) => w.startsWith(candidate))) tokenScore = Math.max(tokenScore, 40);
      else if (name.includes(candidate)) tokenScore = Math.max(tokenScore, 20);
      else if (candidate.length >= 5 && nameWords.some((w) => sharesStem(w, candidate)))
        tokenScore = Math.max(tokenScore, 15);
    }

    if (tokenScore === 0) return null; // this token matched nothing at all — reject
    score += tokenScore;
  }

  if (name.startsWith(rawQuery)) score += 80;
  else if (name.includes(rawQuery)) score += 30;

  // Slight boost for shorter names so a concise, exact-sounding diagnosis
  // outranks a longer one that merely also contains all the same tokens.
  score -= Math.min(name.length, 60) * 0.15;

  return score;
}

function highlight(text, tokens) {
  if (tokens.length === 0) return text;
  const pattern = tokens
    .flatMap((t) => expandToken(t))
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

// ICD-10 diagnosis picker — click to browse common diagnoses, type to
// filter by code or name, select one or more. Selected codes show as
// removable chips. Backed by a curated subset of the Philippine DOH
// ICD-10 Modifications Handbook (src/data/icd10Codes.js) — the practical
// "common diagnoses" table, not the full WHO code set.
//
// Search matches on code OR name, tokenized so word order doesn't matter
// ("chest pain" and "pain chest" both match), tolerant of common clinical
// shorthand (UTI, TB, HTN, DM, COPD, ...), and ranked by relevance rather
// than array order — an exact code hit always beats a loose text match.
export default function Icd10Autocomplete({ value = [], onChange, placeholder = "Search a diagnosis or ICD-10 code…" }) {
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

  const selectedCodes = useMemo(() => new Set(value.map((v) => v.code)), [value]);

  const tokens = useMemo(
    () => normalize(query.trim()).split(/\s+/).filter(Boolean),
    [query]
  );

  const matches = useMemo(() => {
    const rawQuery = normalize(query.trim());
    if (!rawQuery) {
      return ICD10_CODES.filter((r) => !selectedCodes.has(r.code)).slice(0, MAX_RESULTS);
    }

    const scored = [];
    for (const entry of ICD10_CODES) {
      if (selectedCodes.has(entry.code)) continue;
      const score = scoreEntry(entry, rawQuery, tokens);
      if (score !== null) scored.push({ entry, score });
    }

    scored.sort((a, b) => b.score - a.score || a.entry.code.localeCompare(b.entry.code));
    return scored.slice(0, MAX_RESULTS).map((s) => s.entry);
  }, [query, tokens, selectedCodes]);

  useEffect(() => {
    setActiveIndex(0);
  }, [matches]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[activeIndex];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function addCode(entry) {
    onChange([...value, entry]);
    setQuery("");
  }

  function removeCode(code) {
    onChange(value.filter((v) => v.code !== code));
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
      if (matches[activeIndex]) addCode(matches[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((v) => (
            <span
              key={v.code}
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium pl-2.5 pr-1.5 py-1"
            >
              <span className="font-bold">{v.code}</span>
              <span className="text-teal-700">{v.name}</span>
              <button
                type="button"
                onClick={() => removeCode(v.code)}
                className="text-teal-400 hover:text-red-600 shrink-0"
                aria-label={`Remove ${v.code}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

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
                ? "No matching diagnosis found. Try a different word, or search by ICD-10 code."
                : "Start typing to search, or browse below."}
            </div>
          ) : (
            matches.map((entry, i) => (
              <button
                key={entry.code + entry.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addCode(entry)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-2 text-left px-3 py-2 text-sm transition-colors ${
                  i === activeIndex ? "bg-teal-50" : "hover:bg-teal-50"
                }`}
              >
                <span className="shrink-0 font-mono text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5">
                  {highlight(entry.code, tokens)}
                </span>
                <span className="text-slate-700 truncate">{highlight(entry.name, tokens)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}