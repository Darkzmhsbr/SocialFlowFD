import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import Toast from '../components/Toast.jsx';
import { LoadingState, ErrorState } from '../components/states.jsx';
import { formatStorage } from '../components/StorageBar.jsx';
import * as storageApi from '../services/storageApi.js';
import '../styles/storage.css';

// Rodada 21: /admin/users — admin only (the API also checks).
// Platform storage rules + every user with usage and quota.

const DAY_OPTIONS = [3, 7, 10, 15, 30, 60];
const SWEEP_OPTIONS = [6, 12, 24, 48, 72];
const gbOf = (mb) => Math.round((mb / 1024) * 10) / 10;

export default function AdminUsers() {
  const [state, setState] = useState({ status: 'loading', users: [], error: null });
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const { users, settings: s } = await storageApi.listAdminUsers();
      setState({ status: 'success', users: users || [], error: null });
      setSettings((cur) => cur || { ...s, defaultQuotaGb: gbOf(s.defaultQuotaMb) });
    } catch (err) {
      setState({ status: 'error', users: [], error: err.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const users = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...state.users]
      .filter((u) => !q || `${u.email || ''} ${u.name || ''}`.toLowerCase().includes(q))
      .sort((a, b) => b.usedBytes - a.usedBytes);
  }, [state.users, query]);

  const totalUsed = state.users.reduce((s, u) => s + u.usedBytes, 0);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const gb = Number(String(settings.defaultQuotaGb).replace(',', '.'));
      const { settings: s } = await storageApi.savePlatformSettings({
        defaultQuotaMb: Number.isFinite(gb) && gb > 0 ? Math.round(gb * 1024) : null,
        defaultFreeStorageDays: settings.defaultFreeStorageDays || null,
        maxFreeStorageDays: settings.maxFreeStorageDays || null,
        orphanSweepHours: settings.orphanSweepHours,
        adminsUnlimited: settings.adminsUnlimited,
      });
      setSettings({ ...s, defaultQuotaGb: gbOf(s.defaultQuotaMb) });
      setToast({ tone: 'success', message: '✓ Regras da plataforma salvas.' });
      load();
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const onQuotaSaved = (user) => {
    setState((s) => ({ ...s, users: s.users.map((u) => (u.id === user.id ? user : u)) }));
    setToast({ tone: 'success', message: `✓ Cota de ${user.email} atualizada.` });
  };

  const setField = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Usuários</h1>
            <p className="sf-page-head__subtitle">Espaço usado por cada usuário, cotas e regras de armazenamento da plataforma.</p>
          </div>
        </div>

        {state.status === 'loading' && <LoadingState message="Carregando usuários..." />}
        {state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}

        {state.status === 'success' && settings && (
          <>
            <section className="sf-storage-card sf-admin-rules">
              <h2>Regras da plataforma</h2>
              <div className="sf-admin-rules__grid">
                <label>
                  <span>Cota padrão por usuário (GB)</span>
                  <input
                    className="sf-input"
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={settings.defaultQuotaGb}
                    onChange={(e) => setField('defaultQuotaGb', e.target.value)}
                  />
                </label>
                <label>
                  <span>Limpeza automática padrão</span>
                  <select
                    className="sf-select"
                    value={settings.defaultFreeStorageDays || ''}
                    onChange={(e) => setField('defaultFreeStorageDays', e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Desligada</option>
                    {DAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        Publicados há mais de {d} dias
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Limpeza obrigatória (máximo)</span>
                  <select
                    className="sf-select"
                    value={settings.maxFreeStorageDays || ''}
                    onChange={(e) => setField('maxFreeStorageDays', e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Não obrigatória</option>
                    {DAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        No máximo {d} dias
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Apagar envios sem uso após</span>
                  <select
                    className="sf-select"
                    value={settings.orphanSweepHours}
                    onChange={(e) => setField('orphanSweepHours', Number(e.target.value))}
                  >
                    {SWEEP_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h} horas
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="sf-admin-rules__check">
                <input
                  type="checkbox"
                  checked={Boolean(settings.adminsUnlimited)}
                  onChange={(e) => setField('adminsUnlimited', e.target.checked)}
                />
                Administradores sem limite de espaço
              </label>
              <p className="sf-field-hint">
                Padrão: vale para quem nunca mexeu nas regras da Limpeza. Obrigatória: ninguém pode desligar nem passar do
                máximo. A cota padrão vale para quem não tem cota própria.
              </p>
              <button type="button" className="sf-button sf-button--primary" onClick={saveSettings} disabled={savingSettings}>
                {savingSettings ? 'Salvando...' : 'Salvar regras'}
              </button>
            </section>

            <section className="sf-storage-card">
              <div className="sf-admin-users__head">
                <h2>
                  {state.users.length} usuário(s) · {formatStorage(totalUsed)} no total
                </h2>
                <input
                  className="sf-input"
                  type="search"
                  placeholder="Buscar por e-mail ou nome"
                  aria-label="Buscar usuário"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="sf-admin-users__wrap">
                <table className="sf-admin-users">
                  <thead>
                    <tr>
                      <th scope="col">Usuário</th>
                      <th scope="col">Perfis</th>
                      <th scope="col">Arquivos</th>
                      <th scope="col">Uso</th>
                      <th scope="col">Cota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <UserRow key={u.id} user={u} defaultMb={settings.defaultQuotaMb} onSaved={onQuotaSaved} onError={(m) => setToast({ tone: 'error', message: m })} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function modeOf(user) {
  if (user.storageQuotaMb === -1) return 'unlimited';
  if (user.storageQuotaMb === null || user.storageQuotaMb === undefined) return 'default';
  return 'custom';
}

function UserRow({ user, defaultMb, onSaved, onError }) {
  const [mode, setMode] = useState(modeOf(user));
  const [gb, setGb] = useState(user.storageQuotaMb > 0 ? gbOf(user.storageQuotaMb) : gbOf(defaultMb));
  const [saving, setSaving] = useState(false);
  const pct = user.percent;
  const changed =
    mode !== modeOf(user) || (mode === 'custom' && Math.round(Number(String(gb).replace(',', '.')) * 1024) !== user.storageQuotaMb);

  const save = async () => {
    let quotaMb = null;
    if (mode === 'unlimited') quotaMb = -1;
    if (mode === 'custom') {
      const n = Number(String(gb).replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0) return onError('Informe a cota em GB (ex.: 10).');
      quotaMb = Math.round(n * 1024);
    }
    setSaving(true);
    try {
      const { user: updated } = await storageApi.setUserQuota(user.id, quotaMb);
      onSaved(updated);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <tr>
      <td>
        <span className="sf-admin-users__email">{user.email || '—'}</span>
        {user.isAdmin && <span className="sf-admin-badge">admin</span>}
        {user.name && <span className="sf-field-hint sf-admin-users__name">{user.name}</span>}
      </td>
      <td>{user.accounts}</td>
      <td>{user.files}</td>
      <td className="sf-admin-users__usage">
        <span>
          {formatStorage(user.usedBytes)}
          {user.quotaBytes ? ` de ${formatStorage(user.quotaBytes)}` : ' · sem limite'}
        </span>
        {pct !== null && pct !== undefined && (
          <span className={`sf-admin-meter${pct >= 100 ? ' is-full' : pct >= 90 ? ' is-high' : ''}`} aria-label={`${pct}% usado`}>
            <span style={{ width: `${Math.min(100, pct)}%` }} />
          </span>
        )}
      </td>
      <td className="sf-admin-users__quota">
        <select className="sf-select" value={mode} onChange={(e) => setMode(e.target.value)} aria-label={`Cota de ${user.email}`}>
          <option value="default">Padrão ({gbOf(defaultMb).toLocaleString('pt-BR')} GB)</option>
          <option value="custom">Personalizada</option>
          <option value="unlimited">Ilimitada</option>
        </select>
        {mode === 'custom' && (
          <input
            className="sf-input sf-admin-users__gb"
            type="number"
            min="0.1"
            step="0.5"
            value={gb}
            onChange={(e) => setGb(e.target.value)}
            aria-label="Cota em GB"
          />
        )}
        <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={save} disabled={saving || !changed}>
          {saving ? '...' : 'Salvar'}
        </button>
      </td>
    </tr>
  );
}