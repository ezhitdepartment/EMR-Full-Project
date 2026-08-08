// Plain SVG line/area chart — no charting library dependency, same
// rationale as BarChart.jsx: keeps the project from adding a package for
// something this simple.
export default function LineChart({
  data,
  color = "#0f766e",
  height = 160,
  area = false,
  emptyLabel = "No data yet",
}) {
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

  const points = data.map((d, i) => ({
    x: data.length === 1 ? 50 : (i / (data.length - 1)) * 100,
    y: 100 - (d.value / max) * 85, // 15% headroom at the top so peaks don't touch the edge
    ...d,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;

  return (
    <div className="w-full">
      <div style={{ height }} className="relative w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          {area && <path d={areaPath} fill={color} fillOpacity="0.12" stroke="none" />}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="1.8" fill={color} vectorEffect="non-scaling-stroke">
              <title>{`${p.label}: ${p.value}`}</title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="flex mt-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-slate-500 truncate" title={d.label}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
