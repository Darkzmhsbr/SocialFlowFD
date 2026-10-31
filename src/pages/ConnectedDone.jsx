import { useSearchParams } from 'react-router-dom';
import '../styles/connect.css';

// Rodada 20: public page /connected — end of the "Copiar link (multilogin)"
// flow. It opens in the profile's browser (Dolphin etc.), which is NOT
// logged in the panel, so it needs no login and shows no menu.

const MESSAGES = {
  connected: {
    icon: '✓',
    title: 'Perfil conectado!',
    text: 'Pode fechar esta aba. No painel, clique em "Já autorizei — atualizar" para ver o perfil na lista.',
  },
  denied: {
    icon: '!',
    title: 'Autorização cancelada',
    text: 'Nenhum perfil foi conectado. Para tentar de novo, gere um novo link no painel.',
  },
  expired: {
    icon: '!',
    title: 'Link expirado ou já usado',
    text: 'Cada link vale por 5 minutos e funciona uma vez só. Gere um novo link no painel e cole aqui de novo.',
  },
  error: {
    icon: '✕',
    title: 'Não foi possível conectar',
    text: 'O Instagram não concluiu a conexão. Gere um novo link no painel e tente de novo. Se continuar, confira se o perfil é profissional (comercial ou criador).',
  },
};

export default function ConnectedDone() {
  const [params] = useSearchParams();
  const status = MESSAGES[params.get('status')] ? params.get('status') : 'error';
  const msg = MESSAGES[status];
  const username = params.get('username');

  return (
    <main className="sf-connected">
      <div className={`sf-connected__card is-${status}`}>
        <span className="sf-connected__icon" aria-hidden="true">
          {msg.icon}
        </span>
        <h1 className="sf-connected__title">{msg.title}</h1>
        {status === 'connected' && username && <p className="sf-connected__user">@{username}</p>}
        <p className="sf-connected__text">{msg.text}</p>
      </div>
    </main>
  );
}