import { useCallback, useEffect, useState } from 'react';
import Header from '../components/Header.jsx';
import Toast from '../components/Toast.jsx';
import ConnectInstagramButton from '../components/ConnectInstagramButton.jsx';
import { LoadingState, ErrorState } from '../components/states.jsx';
import * as metaAppService from '../services/metaAppService.js';
import { formatDateTime } from '../utils/formatDate.js';
import '../styles/accounts.css';
import '../styles/metaApp.css';

// Rodada 10: /meta-app — optional own Instagram app per user. Without it,
// connections use the SocialFlow default app (as always).
const STATUS_INFO = {
  PENDING: { label: 'Aguardando primeira conexão', tone: 'warning' },
  VERIFIED: { label: 'Funcionando', tone: 'success' },
  ERROR: { label: 'Falhou na última conexão', tone: 'error' },
};

export default function MetaApp() {
  const [state, setState] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await metaAppService.getMetaApp();
      setData(res);
      setAppId(res.credential?.appId || '');
      setAppSecret('');
      setState('success');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(data.redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast({ tone: 'error', message: 'Não foi possível copiar. Selecione o texto e copie manualmente.' });
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { appId: appId.trim() };
      if (appSecret.trim()) body.appSecret = appSecret.trim();
      await metaAppService.saveMetaApp(body);
      setToast({
        tone: 'success',
        message: '✓ App salvo. Agora conecte um perfil (testador do seu app) para confirmar que está funcionando.',
      });
      await load();
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (
      !window.confirm(
        'Remover seu app próprio?\n\nOs perfis já conectados continuam publicando normalmente. As próximas conexões passam a usar o app padrão do SocialFlow.'
      )
    )
      return;
    try {
      await metaAppService.removeMetaApp();
      setToast({ tone: 'success', message: '✓ App removido. Novas conexões usam o app padrão.' });
      await load();
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  const cred = data?.credential;
  const info = cred ? STATUS_INFO[cred.status] || STATUS_INFO.PENDING : null;

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">App Meta</h1>
            <p className="sf-page-head__subtitle">Use o seu próprio app do Instagram para conectar os seus perfis.</p>
          </div>
        </div>

        {state === 'loading' && <LoadingState message="Carregando..." />}
        {state === 'error' && <ErrorState message={error} onRetry={load} />}

        {state === 'success' && data && (
          <>
            <div className="sf-meta-grid">
              <section className="sf-meta-card">
                <h2 className="sf-meta-card__title">App em uso</h2>
                {cred ? (
                  <>
                    <p className="sf-meta-card__big">Seu app próprio</p>
                    <p className="sf-meta-card__line">
                      ID do app: <code>{cred.appId}</code> · chave ••••{cred.secretLast4 || '????'}
                    </p>
                    <span className={`sf-pill sf-pill--${info.tone}`}>{info.label}</span>
                    {cred.status === 'VERIFIED' && cred.verifiedAt && (
                      <p className="sf-field-hint">Confirmado em {formatDateTime(cred.verifiedAt)}</p>
                    )}
                    {cred.status === 'ERROR' && cred.lastErrorMessage && (
                      <p className="sf-meta-card__error">{cred.lastErrorMessage}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="sf-meta-card__big">App padrão do SocialFlow</p>
                    <p className="sf-field-hint">
                      Nenhum app próprio configurado. Suas conexões usam o app padrão da plataforma.
                    </p>
                  </>
                )}
              </section>

              <section className="sf-meta-card">
                <h2 className="sf-meta-card__title">Perfis conectados</h2>
                <p className="sf-meta-card__big">{data.accounts.total}</p>
                <p className="sf-field-hint">
                  {data.accounts.viaOwnApp} pelo seu app · {data.accounts.viaDefaultApp} pelo app padrão
                </p>
                <ConnectInstagramButton />
              </section>
            </div>

            <section className="sf-meta-card sf-meta-card--dashed">
              <h2 className="sf-meta-card__title">URL de retorno (redirect)</h2>
              <p className="sf-field-hint">
                Cole este endereço no seu app, em “URIs de redirecionamento OAuth válidos”. Tem que ser exatamente
                igual, sem espaço nem barra no final.
              </p>
              <div className="sf-meta-copy">
                <code className="sf-meta-copy__value">{data.redirectUri || 'META_REDIRECT_URI não configurada no servidor'}</code>
                <button type="button" className="sf-button sf-button--secondary" onClick={copyRedirect} disabled={!data.redirectUri}>
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </section>

            <form className="sf-meta-card" onSubmit={save}>
              <h2 className="sf-meta-card__title">{cred ? 'Alterar credenciais' : 'Cadastrar meu app'}</h2>
              <div className="sf-meta-form">
                <label className="sf-meta-form__field">
                  <span className="sf-field-label">ID do app do Instagram</span>
                  <input
                    className="sf-meta-input"
                    inputMode="numeric"
                    autoComplete="off"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="Ex.: 1234567890123456"
                    required
                  />
                </label>
                <label className="sf-meta-form__field">
                  <span className="sf-field-label">Chave secreta do app do Instagram</span>
                  <input
                    className="sf-meta-input"
                    type="password"
                    autoComplete="new-password"
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder={cred ? `Salva (••••${cred.secretLast4 || ''}). Deixe em branco para manter.` : '32 caracteres'}
                    required={!cred}
                  />
                </label>
              </div>
              <p className="sf-meta-warning">
                ⚠ Use o ID e a chave do <strong>app do Instagram</strong> (Casos de uso › API do Instagram › Configuração da
                API com login do Instagram) — <strong>não</strong> os do app principal da Meta, que aparecem em
                Configurações do app › Básico. São pares diferentes e o login falha com o par errado.
              </p>
              <div className="sf-meta-form__actions">
                <button type="submit" className="sf-button sf-button--primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar app'}
                </button>
                {cred && (
                  <button type="button" className="sf-button sf-button--danger" onClick={remove} disabled={saving}>
                    Voltar para o app padrão
                  </button>
                )}
              </div>
            </form>

            <section className="sf-meta-card">
              <h2 className="sf-meta-card__title">Como criar o seu app (passo a passo)</h2>
              <ol className="sf-meta-steps">
                <li>
                  Entre em <strong>developers.facebook.com</strong> › <strong>Meus apps</strong> ›{' '}
                  <strong>Criar app</strong>. Escolha o caso de uso de gerenciar mensagens e conteúdo no Instagram (tipo
                  Empresa).
                </li>
                <li>
                  Abra <strong>Casos de uso › API do Instagram › Configuração da API com login do Instagram</strong>.
                </li>
                <li>
                  Em <strong>Configurar login empresarial do Instagram</strong>, cole a <strong>URL de retorno</strong>{' '}
                  acima no campo de URIs de redirecionamento e salve.
                </li>
                <li>
                  Na mesma tela, copie o <strong>ID do app do Instagram</strong> e a{' '}
                  <strong>chave secreta do app do Instagram</strong> e cole no formulário acima.
                </li>
                <li>
                  Em <strong>Funções do app › Funções</strong>, adicione cada perfil como <strong>Testador do
                  Instagram</strong>. Em cada perfil: Instagram › Configurações › Apps e sites › Convites de testador ›{' '}
                  <strong>Aceitar</strong>.
                </li>
                <li>
                  Volte aqui, clique em <strong>+ Conectar Instagram</strong> logado no perfil (no mesmo navegador). Se
                  der certo, o status acima muda para <strong>Funcionando</strong>.
                </li>
              </ol>
              <p className="sf-field-hint">
                Enquanto o app não passa pela análise da Meta, só perfis testadores conseguem conectar. Perfis com
                restrição de mensagens podem não conectar (limitação da própria Meta).
              </p>
            </section>
          </>
        )}
      </main>
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}