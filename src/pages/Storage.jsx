import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Toast from '../components/Toast.jsx';
import { LoadingState, ErrorState } from '../components/states.jsx';
import StorageBar, { STORAGE_GROUPS, formatStorage } from '../components/StorageBar.jsx';
import * as storageApi from '../services/storageApi.js';
import * as cleanupService from '../services/cleanupService.js';
import '../styles/storage.css';

// Rodada 21: /storage — "Armazenamento". How much space the user is using,
// split by group, with what can be done about each one.

const QUOTA_TEXT = {
  default: 'Cota padrão da plataforma.',
  custom: 'Cota definida pelo administrador para a sua conta.',
  unlimited: 'Sua conta não tem limite de espaço.',
  admin: 'Administrador: sem limite de espaço.',
};

export default function Storage() {
  const [state, setState] = useState({ status: 'loading', storage: null, error: null });
  const [cleanup, setCleanup] = useState(null);
  const [freeing, setFreeing] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: s.storage ? 'success' : 'loading', error: null }));
    try {
      const { storage } = await storageApi.getStorage();
      setState({ status: 'success', storage, error: null });
    } catch (err) {
      setState({ status: 'error', storage: null, error: err.message });
    }
    cleanupService
      .getCleanupSettings()
      .then(({ settings }) => setCleanup(settings))
      .catch(() => setCleanup(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const s = state.storage;
  const published = s?.breakdown?.published || { count: 0, bytes: 0 };

  const freeNow = async () => {
    if (
      !window.confirm(
        `Liberar ${formatStorage(published.bytes)} de posts já publicados?\n\nOs posts continuam no Instagram e no histórico, com as métricas. Só os arquivos são apagados do servidor (não dá para repostar esses arquivos depois). Mídias da Biblioteca não são tocadas.`
      )
    )
      return;
    setFreeing(true);
    try {
      await cleanupService.startCleanup({ action: 'FREE_STORAGE', filter: {} });
      setToast({ tone: 'success', message: '✓ Limpeza iniciada. Acompanhe em Limpeza › Em andamento.' });
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    } finally {
      setFreeing(false);
    }
  };

  const autoText = () => {
    if (!cleanup) return null;
    if (!cleanup.freeStorageAfterDays) return 'Limpeza automática desligada: os arquivos de posts publicados ficam guardados.';
    const origin = cleanup.maxFreeStorageDays
      ? ' (obrigatória nesta plataforma)'
      : cleanup.freeStorageIsDefault
      ? ' (padrão da plataforma)'
      : '';
    return `Limpeza automática ligada: arquivos de posts publicados há mais de ${cleanup.freeStorageAfterDays} dias são liberados todo dia${origin}.`;
  };

  const CARDS = {
    library: {
      text: 'Nunca são apagadas automaticamente. Remova o que você não vai reutilizar.',
      action: (
        <Link className="sf-button sf-button--secondary sf-button--small" to="/library">
          Abrir Biblioteca
        </Link>
      ),
    },
    published: {
      text: 'Arquivos de posts já publicados. Podem ser liberados: o post continua no Instagram e no histórico.',
      action: (
        <button
          type="button"
          className="sf-button sf-button--primary sf-button--small"
          onClick={freeNow}
          disabled={freeing || published.count === 0}
        >
          {freeing ? 'Iniciando...' : 'Liberar agora'}
        </button>
      ),
    },
    pending: {
      text: 'Usados por posts agendados, rascunhos ou falhas. Ficam guardados enquanto esses posts existirem.',
      action: (
        <Link className="sf-button sf-button--secondary sf-button--small" to="/posts">
          Ver agendamentos
        </Link>
      ),
    },
    orphan: {
      text: `Enviados mas não usados em nenhum post nem guardados na Biblioteca. São apagados sozinhos ${
        s?.orphanSweepHours ? `${s.orphanSweepHours}h` : ''
      } depois do envio.`,
      action: null,
    },
  };

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Armazenamento</h1>
            <p className="sf-page-head__subtitle">Quanto espaço suas mídias ocupam no servidor e como liberar.</p>
          </div>
          <div className="sf-page-head__actions">
            <button type="button" className="sf-button sf-button--secondary" onClick={load}>
              Atualizar
            </button>
          </div>
        </div>

        {state.status === 'loading' && <LoadingState message="Calculando o espaço..." />}
        {state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}

        {state.status === 'success' && s && (
          <>
            <section className="sf-storage-card">
              <StorageBar storage={s} />
              <p className="sf-field-hint">{QUOTA_TEXT[s.quotaSource] || ''}</p>
            </section>

            <div className="sf-storage-groups">
              {STORAGE_GROUPS.map((g) => (
                <section key={g.key} className="sf-storage-group">
                  <h2>
                    <span className="sf-storage-legend__dot" style={{ background: g.color }} aria-hidden="true" />
                    {g.label}
                  </h2>
                  <p className="sf-storage-group__value">
                    {formatStorage(s.breakdown[g.key].bytes)}
                    <span> · {s.breakdown[g.key].count} arquivo(s)</span>
                  </p>
                  <p className="sf-field-hint">{CARDS[g.key].text}</p>
                  {CARDS[g.key].action && <div className="sf-storage-group__action">{CARDS[g.key].action}</div>}
                </section>
              ))}
            </div>

            {cleanup && (
              <section className="sf-storage-card sf-storage-auto">
                <p>{autoText()}</p>
                <Link to="/cleanup">Alterar em Limpeza</Link>
              </section>
            )}
          </>
        )}
      </main>
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}