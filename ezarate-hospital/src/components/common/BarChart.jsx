// Plain CSS/HTML bar chart — no charting library dependency needed for
// something this simple, and it keeps this from adding a new package to
// the project just for two bar graphs.
export default function BarChart({ data, color = "#0f766e", height = 180, emptyLabel = "No data yet" }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const pct = Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0);
          return (
            <div key={i} className="flex-1 h-full flex flex-col items-center justify-end group relative">
              <span className="text-[10px] font-semibold text-slate-600 mb-1">
                {d.value > 0 ? d.value : ""}
              </span>
              <div
                className="w-full rounded-t-md transition-all"
                style={{ height: `${pct}%`, backgroundColor: color }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-slate-500 truncate" title={d.label}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
