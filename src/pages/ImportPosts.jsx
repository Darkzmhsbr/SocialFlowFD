import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import * as importApi from '../services/importApi.js';
import {
  readSheet,
  toImportRows,
  chunkRows,
  downloadCsv,
  downloadXlsx,
  TEMPLATE_HEADER,
  TEMPLATE_HELP,
  templateExamples,
} from '../utils/spreadsheet.js';
import '../styles/import.css';

// Rodada 19B: /import — "Importar planilha".
// 1) download the template  2) choose the file  3) preview row by row
// 4) import the valid rows (one batch, manageable in Agendamentos).

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'error', label: 'Com erro' },
  { key: 'warning', label: 'Avisos' },
  { key: 'ok', label: 'OK' },
];
const STATUS = {
  ok: { icon: '✓', label: 'OK' },
  warning: { icon: '!', label: 'Aviso' },
  error: { icon: '✕', label: 'Erro' },
};

function whenText(iso) {
  if (!iso) return 'Rascunho';
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ImportPosts() {
  const [fileName, setFileName] = useState(null);
  const [rows, setRows] = useState(null);
  const [preview, setPreview] = useState(null);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(null); // 'read' | 'preview' | 'commit' | 'template' | 'media'
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const reset = () => {
    setFileName(null);
    setRows(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setFilter('all');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (file) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    setBusy('read');
    try {
      const parsed = toImportRows(await readSheet(file));
      setRows(parsed);
      setBusy('preview');
      const chunks = chunkRows(parsed);
      const all = [];
      for (let i = 0; i < chunks.length; i += 1) {
        setProgress(chunks.length > 1 ? `Verificando parte ${i + 1} de ${chunks.length}...` : null);
        const { preview: p } = await importApi.previewImport(chunks[i]);
        all.push(...p.rows);
      }
      setPreview(all);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const summary = useMemo(() => {
    if (!preview) return null;
    const count = (s) => preview.filter((r) => r.status === s).length;
    return {
      total: preview.length,
      ok: count('ok'),
      warning: count('warning'),
      error: count('error'),
      drafts: preview.filter((r) => r.status !== 'error' && !r.resolved.scheduledFor).length,
    };
  }, [preview]);

  const importable = summary ? summary.ok + summary.warning : 0;
  const visible = (preview || []).filter((r) => filter === 'all' || r.status === filter);

  const doImport = async () => {
    const validLines = new Set(preview.filter((r) => r.status !== 'error').map((r) => r.line));
    const toSend = rows.filter((r) => validLines.has(r.line));
    const msg =
      `Criar ${importable} post(s)?` +
      (summary.error ? `\n\n${summary.error} linha(s) com erro serão ignoradas.` : '') +
      (summary.drafts ? `\n${summary.drafts} sem data viram rascunho.` : '');
    if (!window.confirm(msg)) return;
    setBusy('commit');
    setError(null);
    try {
      let batchId = null;
      const total = { created: 0, skipped: summary.error, failed: [] };
      const chunks = chunkRows(toSend);
      for (let i = 0; i < chunks.length; i += 1) {
        setProgress(chunks.length > 1 ? `Importando parte ${i + 1} de ${chunks.length}...` : null);
        const { import: r } = await importApi.commitImport(chunks[i], batchId);
        batchId = r.batchId || batchId;
        total.created += r.created;
        total.skipped += r.skipped;
        total.failed.push(...r.failed);
      }
      setResult({ ...total, batchId });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const templateXlsx = async () => {
    setBusy('template');
    try {
      await downloadXlsx(
        [
          { name: 'Posts', rows: [TEMPLATE_HEADER, ...templateExamples()], widths: [16, 34, 46, 12, 8, 11, 14] },
          { name: 'Instruções', rows: TEMPLATE_HELP, widths: [12, 13, 100] },
        ],
        'modelo-importacao-socialflow.xlsx'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const mediaList = async () => {
    setBusy('media');
    try {
      const { media } = await importApi.listImportMedia();
      await downloadXlsx(
        [
          {
            name: 'Biblioteca',
            rows: [
              ['arquivo (copie para a planilha)', 'tipo', 'pasta', 'na Biblioteca', 'enviado em'],
              ...media.map((m) => [
                m.name,
                m.type === 'VIDEO' ? 'vídeo' : 'imagem',
                m.folder || '',
                m.inLibrary ? 'sim' : 'não',
                new Date(m.createdAt).toLocaleDateString('pt-BR'),
              ]),
            ],
            widths: [40, 8, 20, 12, 12],
          },
        ],
        'arquivos-biblioteca-socialflow.xlsx'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Importar planilha</h1>
            <p className="sf-page-head__subtitle">
              Agende muitos posts de uma vez a partir de um arquivo .xlsx ou .csv. Os arquivos precisam estar na Biblioteca.
            </p>
          </div>
        </div>

        <div className="sf-imp-steps">
          <section className="sf-imp-step">
            <span className="sf-imp-step__n">1</span>
            <div>
              <h2>Baixe o modelo</h2>
              <p className="sf-field-hint">
                Colunas: <strong>perfil</strong>, <strong>arquivo</strong>, legenda, data, hora, tipo, capa. A aba "Instruções"
                explica cada uma.
              </p>
              <div className="sf-imp-actions">
                <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={templateXlsx} disabled={busy !== null}>
                  {busy === 'template' ? 'Gerando...' : 'Modelo .xlsx'}
                </button>
                <button
                  type="button"
                  className="sf-button sf-button--secondary sf-button--small"
                  onClick={() => downloadCsv([TEMPLATE_HEADER, ...templateExamples()], 'modelo-importacao-socialflow.csv')}
                >
                  Modelo .csv
                </button>
                <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={mediaList} disabled={busy !== null}>
                  {busy === 'media' ? 'Gerando...' : 'Lista de arquivos da Biblioteca'}
                </button>
              </div>
            </div>
          </section>

          <section className="sf-imp-step">
            <span className="sf-imp-step__n">2</span>
            <div>
              <h2>Escolha a planilha</h2>
              <label
                className={`sf-imp-drop${busy === 'read' || busy === 'preview' ? ' is-busy' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFile(e.dataTransfer.files?.[0]);
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.ods"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  aria-label="Planilha"
                />
                <strong>{fileName || 'Clique ou arraste o arquivo aqui'}</strong>
                <span className="sf-field-hint">
                  {busy === 'read' ? 'Lendo...' : busy === 'preview' ? progress || 'Verificando cada linha...' : '.xlsx ou .csv · até 500 linhas'}
                </span>
              </label>
            </div>
          </section>
        </div>

        {error && <p className="sf-imp-error">{error}</p>}

        {result && (
          <section className="sf-imp-result">
            <h2>✓ {result.created} post(s) criado(s)</h2>
            <p className="sf-field-hint">
              {result.skipped > 0 && `${result.skipped} linha(s) com erro foram ignoradas. `}
              Todos ficaram no mesmo lote: em Agendamentos dá para arquivar, excluir ou publicar o lote inteiro.
            </p>
            {result.failed.length > 0 && (
              <ul className="sf-imp-msgs">
                {result.failed.map((f) => (
                  <li key={f.line} className="is-error">
                    Linha {f.line}: {f.error}
                  </li>
                ))}
              </ul>
            )}
            <div className="sf-imp-actions">
              <Link className="sf-button sf-button--primary sf-button--small" to="/calendar">
                Ver no Calendário
              </Link>
              <Link className="sf-button sf-button--secondary sf-button--small" to="/posts">
                Ver em Agendamentos
              </Link>
              <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={reset}>
                Importar outra planilha
              </button>
            </div>
          </section>
        )}

        {preview && !result && (
          <section className="sf-imp-preview">
            <div className="sf-imp-preview__head">
              <h2>3. Confira antes de importar</h2>
              <div className="sf-imp-counts">
                <span className="sf-imp-count sf-imp-count--ok">{summary.ok} OK</span>
                <span className="sf-imp-count sf-imp-count--warning">{summary.warning} com aviso</span>
                <span className="sf-imp-count sf-imp-count--error">{summary.error} com erro</span>
                {summary.drafts > 0 && <span className="sf-imp-count">{summary.drafts} rascunho(s)</span>}
              </div>
            </div>

            <div className="sf-imp-filter" role="group" aria-label="Filtro">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filter === f.key}
                  className={filter === f.key ? 'is-active' : ''}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="sf-imp-table-wrap">
              <table className="sf-imp-table">
                <thead>
                  <tr>
                    <th scope="col">Linha</th>
                    <th scope="col">Status</th>
                    <th scope="col">Perfil</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Arquivo(s)</th>
                    <th scope="col">Quando (Brasília)</th>
                    <th scope="col">Legenda</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.line} className={`is-${r.status}`}>
                      <td>{r.line}</td>
                      <td>
                        <span className={`sf-imp-status sf-imp-status--${r.status}`} title={STATUS[r.status].label}>
                          {STATUS[r.status].icon} {STATUS[r.status].label}
                        </span>
                      </td>
                      <td>{r.resolved.username ? `@${r.resolved.username}` : '—'}</td>
                      <td>{r.resolved.typeLabel || '—'}</td>
                      <td className="sf-imp-files">
                        {r.resolved.files.map((f) => f.name).join(' | ') || '—'}
                        {r.resolved.cover && <span> · capa: {r.resolved.cover.name}</span>}
                      </td>
                      <td>{r.status === 'error' && !r.resolved.scheduledFor ? '—' : whenText(r.resolved.scheduledFor)}</td>
                      <td className="sf-imp-caption">
                        {r.resolved.captionPreview || <span className="sf-field-hint">sem legenda</span>}
                        {(r.errors.length > 0 || r.warnings.length > 0) && (
                          <ul className="sf-imp-msgs">
                            {r.errors.map((m) => (
                              <li key={m} className="is-error">
                                {m}
                              </li>
                            ))}
                            {r.warnings.map((m) => (
                              <li key={m} className="is-warning">
                                {m}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sf-imp-commit">
              <span className="sf-field-hint">
                {summary.error > 0
                  ? `As ${summary.error} linha(s) com erro serão ignoradas. Corrija a planilha e envie de novo para incluí-las.`
                  : 'Tudo certo para importar.'}
              </span>
              <div className="sf-imp-actions">
                <button type="button" className="sf-button sf-button--secondary" onClick={reset} disabled={busy !== null}>
                  Cancelar
                </button>
                <button type="button" className="sf-button sf-button--primary" onClick={doImport} disabled={busy !== null || importable === 0}>
                  {busy === 'commit' ? progress || 'Importando...' : `Importar ${importable} post(s)`}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}