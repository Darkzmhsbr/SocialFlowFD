import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// 14-day activity bars. The parent (Dashboard) hands over the raw activity
// array from the backend. Colors are pulled from CSS variables via getComputedStyle
// so the chart stays visually consistent with the rest of the app.
export default function ActivityChart({ data }) {
  // Recharts wants a stable data shape. We map the ISO date string to a
  // short label (dd/MM) for the axis - full date lives in the tooltip.
  const formatted = (data || []).map((point) => ({
    ...point,
    label: formatShortDate(point.date),
  }));

  const total = formatted.reduce((sum, p) => sum + p.count, 0);

  if (total === 0) {
    return (
      <div className="sf-chart__empty">
        Nenhum post criado nos últimos 14 dias. Crie o primeiro na aba Posts.
      </div>
    );
  }

  return (
    <div className="sf-chart">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#262a35" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#676d7a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#676d7a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(124, 92, 255, 0.08)' }}
            contentStyle={{
              background: '#1a1d26',
              border: '1px solid #262a35',
              borderRadius: 8,
              fontSize: 12,
              color: '#f2f3f5',
            }}
            labelStyle={{ color: '#9aa0ac', marginBottom: 4 }}
            labelFormatter={(_, payload) => {
              const raw = payload?.[0]?.payload?.date;
              return raw ? formatFullDate(raw) : '';
            }}
            formatter={(value) => [`${value} post${value === 1 ? '' : 's'}`, 'Criados']}
          />
          <Bar dataKey="count" fill="#7c5cff" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatShortDate(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function formatFullDate(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}