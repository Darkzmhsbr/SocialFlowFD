import { useEffect, useState } from 'react';
import * as performanceApi from '../services/performanceApi.js';
import '../styles/performance.css';

// Rodada 18: best times to publish (Brasília time).
//   <BestTimesHeatmap data={bestTimes} />  - weekday x 3h grid (Desempenho page)
//   <BestTimesHint ... />                  - one line under "Agendamento" in
//                                            Novo post / lote
// Each cell = how the posts published there did vs their own profile's
// average. Cells with too few posts stay grey: no pattern yet.

function pct(ratio) {
  const v = Math.round((ratio - 1) * 100);
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`;
}

// Diverging scale around 1.0x: above -> blue, below -> orange, same -> grey.
function cellStyle(ratio) {
  if (ratio == null) return undefined;
  const strength = Math.min(1, Math.abs(Math.log2(ratio)) / 1.2); // 2.3x or 0.43x = full
  const pctMix = Math.round(12 + strength * 63);
  const color = ratio >= 1 ? 'var(--sf-perf-up)' : 'var(--sf-perf-down)';
  return { background: `color-mix(in srgb, ${color} ${pctMix}%, var(--sf-surface-raised))` };
}

export function BestTimesHeatmap({ data }) {
  const [hover, setHover] = useState(null);
  if (!data) return null;
  const blocks = data.blocks.length;
  const cell = (w, b) => data.cells[w * blocks + b];
  const hc = hover ? cell(hover.w, hover.b) : null;

  return (
    <div className="sf-best">
      <p className="sf-best__summary">{data.summary}</p>
      <div className="sf-best__scroll">
        <table className="sf-best__grid" aria-label="Resultado médio por dia e horário (Brasília)">
          <thead>
            <tr>
              <th scope="col" aria-label="Dia" />
              {data.blocks.map((b) => (
                <th key={b} scope="col">
                  {b}
                </th>
              ))}
              <th scope="col">Dia</th>
            </tr>
          </thead>
          <tbody>
            {data.weekdays.map((wd, w) => (
              <tr key={wd}>
                <th scope="row">{wd}</th>
                {data.blocks.map((label, b) => {
                  const c = cell(w, b);
                  const title =
                    c.avgRatio != null
                      ? `${wd} ${label}: ${pct(c.avgRatio)} vs média (${c.n} posts)`
                      : `${wd} ${label}: ${c.n} post(s), precisa de ${data.minSample}`;
                  return (
                    <td
                      key={label}
                      className={`sf-best__cell${c.avgRatio == null ? ' is-empty' : ''}`}
                      style={cellStyle(c.avgRatio)}
                      title={title}
                      aria-label={title}
                      onMouseEnter={() => setHover({ w, b })}
                      onMouseLeave={() => setHover(null)}
                    >
                      {c.avgRatio != null ? pct(c.avgRatio) : c.n > 0 ? c.n : ''}
                    </td>
                  );
                })}
                <td className="sf-best__total">{data.rows[w].avgRatio != null ? pct(data.rows[w].avgRatio) : '—'}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Faixa</th>
              {data.cols.map((c) => (
                <td key={c.block} className="sf-best__total">
                  {c.avgRatio != null ? pct(c.avgRatio) : '—'}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="sf-best__foot">
        <span className="sf-best__legend">
          <i className="sf-best__swatch sf-best__swatch--down" /> abaixo da média
          <i className="sf-best__swatch sf-best__swatch--mid" /> na média
          <i className="sf-best__swatch sf-best__swatch--up" /> acima da média
          <i className="sf-best__swatch sf-best__swatch--empty" /> poucos posts (número = quantos)
        </span>
        <span className="sf-field-hint">
          {hc
            ? hc.avgRatio != null
              ? `${data.weekdays[hover.w]} ${data.blocks[hover.b]}: ${pct(hc.avgRatio)} vs a média, em ${hc.n} posts.`
              : `${data.weekdays[hover.w]} ${data.blocks[hover.b]}: ${hc.n} post(s). Precisa de ${data.minSample} para mostrar.`
            : `Horário de Brasília · ${data.totalPosts} post(s) com resultado · mostra o que aconteceu, não é garantia.`}
        </span>
      </div>
    </div>
  );
}

/**
 * Hint for the composers. scope 'account' + id (single) or 'accounts' + ids (batch).
 * Renders nothing until there's a clear pattern.
 */
export function BestTimesHint({ accountId = null, accountIds = null }) {
  const [text, setText] = useState(null);
  const key = accountId || (accountIds || []).slice().sort().join(',');

  useEffect(() => {
    if (!key) {
      setText(null);
      return undefined;
    }
    let alive = true;
    const t = setTimeout(() => {
      const filters = accountId ? { scope: 'account', id: accountId } : { scope: 'accounts', ids: accountIds };
      performanceApi
        .getBestTimes(filters)
        .then(({ bestTimes }) => {
          if (!alive) return;
          setText(bestTimes?.best?.length ? bestTimes.best.map((b) => `${b.label} (${pct(b.avgRatio)})`).join(' · ') : null);
        })
        .catch(() => alive && setText(null));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!text) return null;
  return (
    <p className="sf-best-hint">
      💡 <strong>Melhores horários {accountId ? 'deste perfil' : 'destes perfis'}:</strong> {text}
    </p>
  );
}