// Rodada 19B: read/write spreadsheets in the browser (CSV + XLSX).
// XLSX uses SheetJS, loaded only when needed (keeps the app bundle small).

const HEADER_ALIASES = {
  profile: ['perfil', 'profile', 'conta', 'usuario', 'username', '@'],
  files: ['arquivo', 'arquivos', 'midia', 'midias', 'file', 'files', 'video', 'imagem'],
  caption: ['legenda', 'caption', 'texto'],
  date: ['data', 'date', 'dia'],
  time: ['hora', 'horario', 'time'],
  type: ['tipo', 'type', 'formato'],
  cover: ['capa', 'cover', 'thumbnail'],
};
const REQUIRED = { profile: 'perfil', files: 'arquivo' };
export const MAX_ROWS = 500;

function plain(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/** Minimal CSV parser: quotes, "" escapes, line breaks inside quotes, ; or , separator. */
export function parseCsv(text) {
  const clean = String(text).replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

async function loadXlsx() {
  return import('xlsx');
}

/** File -> array of arrays (first sheet). Numbers (Excel dates/times) stay numbers. */
export async function readSheet(file) {
  const name = String(file.name || '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsv(await file.text());
  if (!/\.(xlsx|xls|ods)$/.test(name)) throw new Error('Use um arquivo .xlsx ou .csv.');
  const XLSX = await loadXlsx();
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
}

/**
 * Array of arrays -> rows for the API ({ line, profile, files, caption, date, time, type, cover }).
 * Throws when a required column is missing or the sheet is too big.
 */
export function toImportRows(table) {
  const headerIndex = table.findIndex((r) => r.some((c) => String(c).trim() !== ''));
  if (headerIndex < 0) throw new Error('A planilha está vazia.');
  const header = table[headerIndex].map(plain);
  const col = {};
  Object.entries(HEADER_ALIASES).forEach(([key, aliases]) => {
    const i = header.findIndex((h) => aliases.includes(h.replace(/\s*\(.*\)$/, '')));
    if (i >= 0) col[key] = i;
  });
  const missing = Object.entries(REQUIRED).filter(([key]) => col[key] === undefined);
  if (missing.length) {
    throw new Error(`Coluna ${missing.map(([, label]) => `"${label}"`).join(' e ')} não encontrada na primeira linha.`);
  }
  const rows = [];
  for (let i = headerIndex + 1; i < table.length; i += 1) {
    const r = table[i];
    if (!r || r.every((c) => String(c ?? '').trim() === '')) continue;
    const get = (key) => (col[key] === undefined ? '' : r[col[key]] ?? '');
    rows.push({
      line: i + 1,
      profile: String(get('profile')).trim(),
      files: String(get('files')).trim(),
      caption: String(get('caption')),
      date: typeof get('date') === 'number' ? String(get('date')) : String(get('date')).trim(),
      time: typeof get('time') === 'number' ? String(get('time')) : String(get('time')).trim(),
      type: String(get('type')).trim(),
      cover: String(get('cover')).trim(),
    });
  }
  if (rows.length === 0) throw new Error('Nenhuma linha preenchida abaixo do cabeçalho.');
  if (rows.length > MAX_ROWS) throw new Error(`A planilha tem ${rows.length} linhas. O máximo por importação é ${MAX_ROWS}.`);
  return rows;
}

/** Splits rows so each request stays well under the server's 100 KB body limit. */
export function chunkRows(rows, maxBytes = 60000) {
  const chunks = [];
  let current = [];
  let size = 0;
  for (const row of rows) {
    const s = JSON.stringify(row).length + 1;
    if (current.length && size + s > maxBytes) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(row);
    size += s;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(rows, filename) {
  const text = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  download(new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' }), filename);
}

/** sheets: [{ name, rows: [[...]], widths?: [n] }] */
export async function downloadXlsx(sheets, filename) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    if (s.widths) ws['!cols'] = s.widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

export const TEMPLATE_HEADER = ['perfil', 'arquivo', 'legenda', 'data', 'hora', 'tipo', 'capa'];

export function templateExamples() {
  const d = new Date(Date.now() + 2 * 86400000);
  const br = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  return [
    ['@meuperfil', 'video01.mp4', '{Kkkk|Rindo muito} marca aquele amigo 😂 #memes', br, '19:30', 'reels', ''],
    ['@meuperfil', 'foto1.jpg | foto2.jpg | foto3.jpg', 'Arrasta pro lado ➡️', br, '12:00', 'carrossel', ''],
    ['@outroperfil', 'video02.mp4', 'Legenda do post', br, '21:00', '', 'capa02.jpg'],
  ];
}

export const TEMPLATE_HELP = [
  ['Coluna', 'Obrigatória?', 'Como preencher'],
  ['perfil', 'sim', '@ do perfil conectado no SocialFlow (com ou sem @).'],
  ['arquivo', 'sim', 'Nome do arquivo na Biblioteca, igual aparece lá (ex.: video01.mp4). Vários separados por | viram carrossel.'],
  ['legenda', 'não', 'Texto do post. {opção1|opção2} sorteia uma variação.'],
  ['data', 'não*', 'dd/mm/aaaa. Data e hora vazias = rascunho.'],
  ['hora', 'não*', 'HH:MM, horário de Brasília (ex.: 19:30).'],
  ['tipo', 'não', 'reels, foto, video, carrossel ou story. Vazio: vídeo = Reels, imagem = foto, vários = carrossel.'],
  ['capa', 'não', 'Nome de uma imagem da Biblioteca para capa de Reels ou vídeo.'],
  ['', '', ''],
  ['Dica', '', 'Baixe a "Lista de arquivos da Biblioteca" na página de importação para copiar os nomes exatos.'],
];