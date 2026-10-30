import { useCallback, useEffect, useState } from 'react';
import Header from '../components/Header.jsx';
import { LoadingState, ErrorState } from '../components/states.jsx';
import * as importApi from '../services/importApi.js';
import { downloadXlsx, downloadCsv } from '../utils/spreadsheet.js';
import '../styles/import.css';

// Rodada 19B: /reports — "Relatórios".
// Weekly report (Monday to Sunday, Brasília). The last complete week is
// also sent every Monday morning to the bell and to Telegram.

const nf = new Intl.NumberFormat('pt-BR');
const nfc = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const num = (v) => (v == null ? '—' : Math.abs(v) >= 100000 ? nfc.format(v) : nf.format(v));
const ratioText = (v) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v);
const signed = (v) => (v ? `${v > 0 ? '+' : '−'}${num(Math.abs(v))}` : '0');
const TYPE = { REEL: 'Reels', FEED_IMAGE: 'Foto', FEED_VIDEO: 'Vídeo', FEED_CAROUSEL: 'Carrossel', STORY: 'Story' };

export default function Reports() {
  const [weeks, setWeeks] = useState([]);
  const [week, setWeek] = useState(null);
  const [state, setState] = useState({ status: 'loading', report: null, text: '', error: null });
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    importApi
      .listReportWeeks()
      .then(({ weeks: list }) => {
        setWeeks(list || []);
        setWeek(list?.[0]?.week || null);
      })
      .catch((err) => setState({ status: 'error', report: null, text: '', error: err.message }));
  }, []);

  const load = useCallback(async () => {
    if (!week) return;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const { report, text } = await importApi.getWeeklyReport(week);
      setState({ status: 'success', report, text, error: null });
    } catch (err) {
      setState({ status: 'error', report: null, text: '', error: err.message });
    }
  }, [week]);

  useEffect(() => {
    load();
  }, [load]);

  const r = state.report;

  const sheetRows = () => {
    const t = r.totals;
    return {
      resumo: [
        ['Relatório semanal SocialFlow', r.label],
        [],
        ['Publicados', t.published],
        ['Falhas', t.failed],
        ['Sucesso (%)', t.successRate ?? ''],
        ['Seguidores ganhos', t.followersDelta],
        ['Visualizações', t.views],
        ['Alcance', t.reach],
        ['Agendados para a semana seguinte', t.scheduledNextWeek],
        ['Perfis com problema', t.accountsDown],
      ],
      perfis: [
        ['perfil', 'publicados', 'falhas', 'seguidores (fim da semana)', 'seguidores ganhos', 'visualizações', 'alcance'],
        ...r.profiles.map((p) => [`@${p.account.username}`, p.published, p.failed, p.followers ?? '', p.followersDelta, p.views, p.reach]),
      ],
      posts: [
        ['perfil', 'tipo', 'publicado em', 'métrica', 'valor', 'vs média do perfil', 'link'],
        ...r.topPosts.map((p) => [
          `@${p.username}`,
          TYPE[p.type] || p.type,
          new Date(p.publishedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          p.metric === 'views' ? 'visualizações' : 'alcance',
          p.value,
          p.ratio != null ? Math.round(p.ratio * 100) / 100 : '',
          p.permalink || '',
        ]),
      ],
    };
  };

  const exportXlsx = async () => {
    setExporting(true);
    try {
      const s = sheetRows();
      await downloadXlsx(
        [
          { name: 'Resumo', rows: s.resumo, widths: [34, 18] },
          { name: 'Perfis', rows: s.perfis, widths: [22, 11, 8, 22, 17, 14, 12] },
          { name: 'Top posts', rows: s.posts, widths: [22, 10, 20, 14, 10, 17, 40] },
        ],
        `relatorio-semanal-${r.week}.xlsx`
      );
    } finally {
      setExporting(false);
    }
  };

  const exportCsv = () => {
    const s = sheetRows();
    downloadCsv([...s.resumo, [], ...s.perfis, [], ['Top posts'], ...s.posts], `relatorio-semanal-${r.week}.csv`);
  };

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Relatórios</h1>
            <p className="sf-page-head__subtitle">
              Resumo de cada semana (segunda a domingo). Toda segunda de manhã ele também chega no sininho e no Telegram.
            </p>
          </div>
          <div className="sf-page-head__actions">
            <select className="sf-select" aria-label="Semana" value={week || ''} onChange={(e) => setWeek(e.target.value)}>
              {weeks.map((w) => (
                <option key={w.week} value={w.week}>
                  Semana {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {state.status === 'loading' && <LoadingState message="Montando o relatório..." />}
        {state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}

        {state.status === 'success' && r && (
          <div className="sf-rep">
            <div className="sf-rep-tiles">
              <Tile value={num(r.totals.published)} label="Publicados" />
              <Tile value={num(r.totals.failed)} label="Falhas" tone={r.totals.failed ? 'warn' : ''} />
              <Tile value={r.totals.successRate == null ? '—' : `${String(r.totals.successRate).replace('.', ',')}%`} label="Sucesso" />
              <Tile value={signed(r.totals.followersDelta)} label="Seguidores" tone={r.totals.followersDelta > 0 ? 'up' : ''} />
              <Tile value={num(r.totals.views)} label="Visualizações" />
              <Tile value={num(r.totals.reach)} label="Alcance" />
              <Tile value={num(r.totals.scheduledNextWeek)} label="Agendados p/ semana seguinte" />
              <Tile value={num(r.totals.accountsDown)} label="Perfis com problema" tone={r.totals.accountsDown ? 'warn' : ''} />
            </div>

            <div className="sf-imp-actions">
              <button type="button" className="sf-button sf-button--primary sf-button--small" onClick={exportXlsx} disabled={exporting}>
                {exporting ? 'Gerando...' : 'Baixar planilha (.xlsx)'}
              </button>
              <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={exportCsv}>
                Baixar .csv
              </button>
              <button
                type="button"
                className="sf-button sf-button--secondary sf-button--small"
                onClick={() => {
                  navigator.clipboard?.writeText(`📊 Relatório semanal — ${r.label}\n${state.text}`).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? 'Copiado ✓' : 'Copiar resumo'}
              </button>
            </div>

            <section className="sf-rep-section">
              <h2>Top 5 posts</h2>
              {r.topPosts.length === 0 ? (
                <p className="sf-field-hint">Nenhum post com métricas nessa semana.</p>
              ) : (
                <ol className="sf-rep-top">
                  {r.topPosts.map((p) => (
                    <li key={p.id}>
                      <strong>@{p.username}</strong> · {TYPE[p.type] || p.type} ·{' '}
                      {num(p.value)} {p.metric === 'views' ? 'visualizações' : 'alcance'}
                      {p.ratio != null && ` · ${ratioText(p.ratio)}× a média`}
                      {p.permalink && (
                        <>
                          {' '}
                          ·{' '}
                          <a href={p.permalink} target="_blank" rel="noreferrer">
                            ver ↗
                          </a>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="sf-rep-section">
              <h2>Perfis</h2>
              <div className="sf-imp-table-wrap">
                <table className="sf-imp-table sf-rep-table">
                  <thead>
                    <tr>
                      <th scope="col">Perfil</th>
                      <th scope="col">Publicados</th>
                      <th scope="col">Falhas</th>
                      <th scope="col">Seguidores</th>
                      <th scope="col">Ganhos</th>
                      <th scope="col">Visualizações</th>
                      <th scope="col">Alcance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.profiles.map((p) => (
                      <tr key={p.account.id}>
                        <td>
                          @{p.account.username}
                          {p.account.status !== 'ACTIVE' && <span className="sf-rep-bad"> · com problema</span>}
                        </td>
                        <td>{num(p.published)}</td>
                        <td>{num(p.failed)}</td>
                        <td>{num(p.followers)}</td>
                        <td>{signed(p.followersDelta)}</td>
                        <td>{num(p.views)}</td>
                        <td>{num(p.reach)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="sf-field-hint">
                Seguidores, visualizações e alcance vêm da coleta diária do Dashboard (perfis sem permissão de métricas mostram 0).
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Tile({ value, label, tone = '' }) {
  return (
    <div className={`sf-rep-tile${tone ? ` is-${tone}` : ''}`}>
      <span className="sf-rep-tile__value">{value}</span>
      <span className="sf-rep-tile__label">{label}</span>
    </div>
  );
}