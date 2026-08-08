// Generic year + month (+ optional day) filter — narrows a list down to
// records whose date falls in a given year/month/day. Originally built as
// "DateOfBirthFilter" for the Patients page; generalized so every list
// page in the dashboard (Encounters, Lab Orders, Medicine Prescriptions,
// Audit Logs, ...) can filter its own date field the same way, with the
// same look and feel. Pass showDay to also get a Day dropdown (e.g. Audit
// Logs, where you might want to narrow to one exact date, not just a
// month).
export default function YearMonthFilter({
  label,
  year,
  month,
  day,
  years,
  onYearChange,
  onMonthChange,
  onDayChange,
  showDay = false,
}) {
  const daysInMonth = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;

  return (
    <div className="flex flex-col gap-1 min-w-60">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex gap-2">
        <select
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          title={`Year — ${label}`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          title={`Month — ${label}`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
        >
          <option value="">All Months</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={String(m)}>
              {new Date(0, m - 1).toLocaleString(undefined, { month: "long" })}
            </option>
          ))}
        </select>

        {showDay && (
          <select
            value={day}
            onChange={(e) => onDayChange(e.target.value)}
            disabled={!month}
            title={month ? `Day — ${label}` : "Pick a month first"}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Days</option>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <option key={d} value={String(d)}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}