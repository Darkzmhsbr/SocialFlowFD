// Single KPI tile used in the dashboard grid. Kept intentionally plain -
// no icons library, no motion, just typography and color accents so the
// grid feels calm at 4 tiles side-by-side.
//
// `tone` maps to the accent color of the value; defaults to neutral so
// nothing screams unless the metric earns it.
export default function KpiCard({ label, value, hint, tone = 'neutral' }) {
  return (
    <div className={`sf-kpi sf-kpi--${tone}`}>
      <p className="sf-kpi__label">{label}</p>
      <p className="sf-kpi__value">{value}</p>
      {hint && <p className="sf-kpi__hint">{hint}</p>}
    </div>
  );
}