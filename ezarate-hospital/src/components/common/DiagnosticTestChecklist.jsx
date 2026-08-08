import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DIAGNOSTIC_GROUPS, FORM_TYPE_BY_GROUP } from "../../utils/labOrders";

// Only the "Others (...)" catch-all tests get a free-text detail input —
// matches lab_order_tests.test_detail's comment in the SQL schema ("free-
// text detail for 'Others (...)' tests").
function needsDetail(name) {
  return name.startsWith("Others");
}

// Reconstructs the same "request slip -> category -> tests" grouping the
// paper forms use (Laboratory / X-Ray / Ultrasound & Imaging), from the
// flatter DIAGNOSTIC_GROUPS/FORM_TYPE_BY_GROUP maps that back the rest of
// Lab Orders post-Supabase-migration.
const CATALOG = Object.entries(DIAGNOSTIC_GROUPS).reduce((forms, [category, tests]) => {
  const formType = FORM_TYPE_BY_GROUP[category] || "Other";
  let form = forms.find((f) => f.formType === formType);
  if (!form) {
    form = { formType, categories: [] };
    forms.push(form);
  }
  form.categories.push({ category, tests });
  return forms;
}, []);

// Shared "select diagnostic tests" checklist — a search box plus tests
// grouped by request slip (Laboratory / X-Ray / Ultrasound & Imaging) and
// category within it, matching the hospital's actual paper request forms.
// Used by CreateLabOrderModal (placing a formal lab order) and the
// Consultation Form's Diagnostics section (the doctor selecting what to
// order for this visit) so both stay visually and behaviorally identical.
export default function DiagnosticTestChecklist({
  selected,
  onToggle,
  testDetails,
  onDetailChange,
  className = "",
}) {
  const [query, setQuery] = useState("");

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.map((form) => ({
      ...form,
      categories: form.categories
        .map((cat) => ({ ...cat, tests: cat.tests.filter((t) => t.toLowerCase().includes(q)) }))
        .filter((cat) => cat.tests.length > 0),
    })).filter((form) => form.categories.length > 0);
  }, [query]);

  return (
    <div className={className}>
      <div className="relative mb-2">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search diagnostic tests…"
          className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
        />
      </div>

      <div className="rounded-lg border border-slate-200 p-3 max-h-72 overflow-y-auto space-y-4">
        {filteredCatalog.length === 0 ? (
          <p className="py-2 text-center text-xs text-slate-400">
            No diagnostic tests match "{query}"
          </p>
        ) : (
          filteredCatalog.map((form) => (
            <div key={form.formType}>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700 mb-2">
                {form.formType}
              </p>
              <div className="space-y-3">
                {form.categories.map((cat) => (
                  <div key={cat.category}>
                    {form.categories.length > 1 && (
                      <p className="text-[11px] font-semibold text-slate-500 mb-1">{cat.category}</p>
                    )}
                    <div className="grid grid-cols-2 gap-1.5">
                      {cat.tests.map((name) => (
                        <div key={name} className={needsDetail(name) ? "col-span-2" : ""}>
                          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected.includes(name)}
                              onChange={() => onToggle(name)}
                              className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                            />
                            {name}
                          </label>
                          {needsDetail(name) && selected.includes(name) && (
                            <input
                              type="text"
                              value={testDetails[name] || ""}
                              onChange={(e) => onDetailChange(name, e.target.value)}
                              placeholder="Please specify…"
                              className="mt-1 ml-6 w-[calc(100%-1.5rem)] rounded-md border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}