import { useEffect, useRef, useState } from 'react';
import * as telegramApi from '../services/telegramApi.js';

// Rodada 17: "Alertas no Telegram" card (Monitoramento page).
// One official bot for the platform; each user links their own destination:
//   Canal/grupo pelo ID : type the id or @ -> the bot posts a 6-digit code
//                         in that chat -> type the code here (proves it's yours)
//   Chat privado        : open the bot with the link -> "Iniciar"
//   Código no canal     : publish "SF-XXXXXX" in the channel/group
const METHODS = [
  { key: 'id', label: 'Canal/grupo (ID)' },
  { key: 'private', label: 'Privado' },
  { key: 'code', label: 'Código' },
];

function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expirado';
  const m = Math.ceil(ms / 60000);
  return `vale por ${m} min`;
}

export default function TelegramAlertsCard({ initial = null, onChanged }) {
  const [tg, setTg] = useState(initial);
  const [method, setMethod] = useState('id');
  const [changing, setChanging] = useState(false);
  const [chatRef, setChatRef] = useState('');
  const [verify, setVerify] = useState('');
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null); // { tone, text }
  const pollRef = useRef(null);

  const apply = (next) => {
    setTg(next);
    onChanged?.(next);
  };

  useEffect(() => {
    if (initial) return;
    telegramApi
      .getTelegramStatus()
      .then(({ telegram }) => setTg(telegram))
      .catch((err) => setMsg({ tone: 'error', text: err.message }));
  }, [initial]);

  const link = tg?.link || null;
  const active = link?.status === 'ACTIVE';
  const showConnect = !active || changing;
  const waitingCode = Boolean(link?.code);

  // While a SF- code is on screen, watch for the bot to link it.
  useEffect(() => {
    if (!waitingCode) return undefined;
    const startedChat = link?.title;
    pollRef.current = setInterval(async () => {
      try {
        const { telegram } = await telegramApi.getTelegramStatus();
        if (!telegram.link?.code) {
          apply(telegram);
          setChanging(false);
          if (telegram.link?.status === 'ACTIVE' && telegram.link.title !== startedChat) {
            setMsg({ tone: 'success', text: `✓ Conectado: ${telegram.link.title}` });
          }
        }
      } catch {
        // keep polling
      }
    }, 4000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingCode]);

  const run = async (key, fn, okText) => {
    setBusy(key);
    setMsg(null);
    try {
      const { telegram } = await fn();
      apply(telegram);
      if (okText) setMsg({ tone: 'success', text: okText(telegram) });
      return telegram;
    } catch (err) {
      setMsg({ tone: 'error', text: err.message });
      return null;
    } finally {
      setBusy(null);
    }
  };

  if (!tg) {
    return (
      <section className="sf-card sf-tg">
        <h2 className="sf-tg__title">Alertas no Telegram</h2>
        <p className="sf-field-hint">{msg?.text || 'Carregando...'}</p>
      </section>
    );
  }

  if (!tg.configured) {
    return (
      <section className="sf-card sf-tg">
        <h2 className="sf-tg__title">Alertas no Telegram</h2>
        <p className="sf-field-hint">O bot oficial de alertas ainda não foi configurado pelo administrador da plataforma.</p>
      </section>
    );
  }

  const botName = tg.bot?.username ? `@${tg.bot.username}` : 'o bot oficial';
  const enabled = tg.alertTypes.filter((a) => a.enabled).map((a) => a.key);

  const toggleAlert = (key) => {
    const next = enabled.includes(key) ? enabled.filter((k) => k !== key) : [...enabled, key];
    run('alerts', () => telegramApi.saveTelegramAlerts(next));
  };

  return (
    <section className="sf-card sf-tg">
      <div className="sf-tg__head">
        <h2 className="sf-tg__title">Alertas no Telegram</h2>
        <span className={`sf-tg__status sf-tg__status--${active ? 'on' : link?.status === 'BROKEN' ? 'broken' : 'off'}`}>
          {active ? 'Conectado' : link?.status === 'BROKEN' ? 'Desconectado' : 'Não conectado'}
        </span>
      </div>

      {link?.title && (link.status === 'ACTIVE' || link.status === 'BROKEN') && (
        <div className="sf-tg__dest">
          <div>
            <strong>{link.title}</strong>
            <span>
              {link.chatTypeLabel}
              {link.chatUsername ? ` · @${link.chatUsername}` : ''}
            </span>
          </div>
          {link.status === 'BROKEN' && (
            <p className="sf-field-hint sf-field-hint--error">
              {link.lastError || 'O bot foi removido ou perdeu a permissão.'} Adicione o bot de novo como administrador ou conecte outro destino.
            </p>
          )}
          <div className="sf-tg__dest-actions">
            {active && (
              <button
                type="button"
                className="sf-button sf-button--secondary sf-button--small"
                onClick={() => run('test', telegramApi.sendTelegramTest, () => '✓ Mensagem de teste enviada.')}
                disabled={busy !== null}
              >
                {busy === 'test' ? 'Enviando...' : 'Enviar teste'}
              </button>
            )}
            {active && !changing && (
              <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={() => setChanging(true)}>
                Trocar destino
              </button>
            )}
            <button
              type="button"
              className="sf-button sf-button--danger sf-button--small"
              disabled={busy !== null}
              onClick={async () => {
                if (!window.confirm('Desconectar os alertas do Telegram?')) return;
                setBusy('disconnect');
                try {
                  await telegramApi.disconnectTelegram();
                  const { telegram } = await telegramApi.getTelegramStatus();
                  apply(telegram);
                  setChanging(false);
                  setMsg({ tone: 'success', text: 'Alertas desconectados.' });
                } catch (err) {
                  setMsg({ tone: 'error', text: err.message });
                } finally {
                  setBusy(null);
                }
              }}
            >
              Desconectar
            </button>
          </div>
        </div>
      )}

      {showConnect && (
        <div className="sf-tg__connect">
          <div className="sf-tg__tabs" role="tablist" aria-label="Como conectar">
            {METHODS.map((m) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={method === m.key}
                className={method === m.key ? 'is-active' : ''}
                onClick={() => setMethod(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {method === 'id' && (
            <div className="sf-tg__panel">
              <ol className="sf-tg__steps">
                <li>
                  Crie um canal (ou grupo) e adicione <strong>{botName}</strong> como <strong>administrador</strong> só com a
                  permissão <strong>"Publicar mensagens"</strong>. Não precisa dar as outras.
                </li>
                <li>Informe o ID do canal (ou o @, se for público) e clique em Conectar.</li>
                <li>O bot publica um código de 6 dígitos no canal. Digite o código aqui.</li>
              </ol>
              <div className="sf-tg__row">
                <input
                  className="sf-tg__input"
                  placeholder="-1001234567890 ou @meucanal"
                  value={chatRef}
                  onChange={(e) => setChatRef(e.target.value)}
                  aria-label="ID do canal ou grupo"
                />
                <button
                  type="button"
                  className="sf-button sf-button--primary"
                  disabled={!chatRef.trim() || busy !== null}
                  onClick={() =>
                    run('connect', () => telegramApi.connectTelegramChat(chatRef.trim()), (t) =>
                      `O bot publicou um código em "${t.link?.pending?.title}". Digite-o abaixo.`
                    )
                  }
                >
                  {busy === 'connect' ? 'Verificando...' : 'Conectar'}
                </button>
              </div>
              <p className="sf-field-hint">
                Onde achar o ID: abra o canal no <strong>Telegram Web</strong>; o número que aparece no endereço (começa com
                -100) é o ID. Canal público: pode usar o @.
              </p>
              {link?.pending && (
                <div className="sf-tg__verify">
                  <span>
                    Código publicado em <strong>{link.pending.title}</strong> ({link.pending.chatTypeLabel}) ·{' '}
                    {timeLeft(link.pending.expiresAt)}
                  </span>
                  <div className="sf-tg__row">
                    <input
                      className="sf-tg__input sf-tg__input--code"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={verify}
                      onChange={(e) => setVerify(e.target.value.replace(/\D/g, ''))}
                      aria-label="Código de 6 dígitos"
                    />
                    <button
                      type="button"
                      className="sf-button sf-button--primary"
                      disabled={verify.length !== 6 || busy !== null}
                      onClick={async () => {
                        const t = await run('confirm', () => telegramApi.confirmTelegramChat(verify), (x) => `✓ Conectado: ${x.link?.title}`);
                        if (t) {
                          setVerify('');
                          setChatRef('');
                          setChanging(false);
                        }
                      }}
                    >
                      {busy === 'confirm' ? 'Confirmando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {method === 'private' && (
            <div className="sf-tg__panel">
              <p>Receba os alertas numa conversa direta com {botName}.</p>
              {link?.code?.privateLink ? (
                <>
                  <a className="sf-button sf-button--primary" href={link.code.privateLink} target="_blank" rel="noreferrer">
                    Abrir {botName} no Telegram
                  </a>
                  <p className="sf-field-hint">
                    Toque em <strong>Iniciar</strong> no Telegram. Esta tela atualiza sozinha · {timeLeft(link.code.expiresAt)}.
                  </p>
                </>
              ) : (
                <button type="button" className="sf-button sf-button--primary" onClick={() => run('code', telegramApi.createTelegramLinkCode)} disabled={busy !== null}>
                  {busy === 'code' ? 'Gerando...' : 'Gerar link'}
                </button>
              )}
            </div>
          )}

          {method === 'code' && (
            <div className="sf-tg__panel">
              <ol className="sf-tg__steps">
                <li>
                  Adicione <strong>{botName}</strong> como administrador do canal (permissão "Publicar mensagens"), ou como membro
                  do grupo.
                </li>
                <li>Publique o código abaixo no canal/grupo. O bot conecta e apaga o post sozinho.</li>
              </ol>
              {link?.code ? (
                <>
                  <div className="sf-tg__code">
                    <code>{link.code.code}</code>
                    <button
                      type="button"
                      className="sf-button sf-button--secondary sf-button--small"
                      onClick={() => {
                        navigator.clipboard?.writeText(link.code.code).catch(() => {});
                        setMsg({ tone: 'success', text: 'Código copiado.' });
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="sf-field-hint">
                    Uso único · {timeLeft(link.code.expiresAt)}. Esta tela atualiza sozinha.
                    {link.code.groupLink && (
                      <>
                        {' '}
                        Grupo?{' '}
                        <a href={link.code.groupLink} target="_blank" rel="noreferrer">
                          Adicionar o bot ao grupo
                        </a>{' '}
                        já com o código.
                      </>
                    )}
                  </p>
                </>
              ) : (
                <button type="button" className="sf-button sf-button--primary" onClick={() => run('code', telegramApi.createTelegramLinkCode)} disabled={busy !== null}>
                  {busy === 'code' ? 'Gerando...' : 'Gerar código'}
                </button>
              )}
            </div>
          )}

          {changing && (
            <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={() => setChanging(false)}>
              Cancelar troca
            </button>
          )}
        </div>
      )}

      {msg && <p className={`sf-tg__msg sf-tg__msg--${msg.tone}`}>{msg.text}</p>}

      {link && (link.status === 'ACTIVE' || link.status === 'BROKEN') && (
        <div className="sf-tg__alerts">
          <span className="sf-field-label">Quais alertas receber</span>
          {tg.alertTypes.map((a) => (
            <label key={a.key} className="sf-tg__check">
              <input type="checkbox" checked={a.enabled} onChange={() => toggleAlert(a.key)} disabled={busy === 'alerts'} />
              {a.label}
            </label>
          ))}
          <p className="sf-field-hint">Alertas que chegam juntos viram uma mensagem só. Tudo continua aparecendo também no sininho.</p>
        </div>
      )}
    </section>
  );
}