import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Toast from '../components/Toast.jsx';
import Icon from '../components/Icon.jsx';
import FolderMembersModal from '../components/FolderMembersModal.jsx';
import { LoadingState, ErrorState } from '../components/states.jsx';
import { useInstagramAccounts } from '../hooks/useInstagramAccounts.js';
import { useAccountFolders } from '../hooks/useAccountFolders.js';
import * as foldersService from '../services/accountFoldersService.js';
import '../styles/accounts.css';
import '../styles/batch.css';
import '../styles/accountFolders.css';

// Rodada 8: /account-folders — group profiles ("Memes", "Contas novas").
// A profile can be in several folders. Folders are used to select profiles
// in one click in "Novo post → Vários perfis" and to filter Agendamentos.
const MAX_AVATARS = 8;

export default function AccountFolders() {
  const { status: accStatus, accounts, error: accError, reload: reloadAccounts } = useInstagramAccounts();
  const { status, folders, error, reload } = useAccountFolders();
  const [modal, setModal] = useState(null); // { mode, folder }
  const [toast, setToast] = useState(null);

  const byId = new Map(accounts.map((a) => [a.id, a]));

  const handleSave = async ({ name, accountIds }) => {
    if (modal.mode === 'create') {
      await foldersService.createAccountFolder(name, accountIds);
      setToast({ tone: 'success', message: `✓ Pasta "${name}" criada com ${accountIds.length} perfil(is).` });
    } else {
      await foldersService.setAccountFolderMembers(modal.folder.id, accountIds);
      setToast({ tone: 'success', message: '✓ Perfis da pasta atualizados.' });
    }
    setModal(null);
    reload();
  };

  const handleRename = async (folder) => {
    const name = window.prompt('Novo nome da pasta:', folder.name);
    if (!name || name === folder.name) return;
    try {
      await foldersService.renameAccountFolder(folder.id, name);
      setToast({ tone: 'success', message: '✓ Pasta renomeada.' });
      reload();
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  const handleDelete = async (folder) => {
    if (!window.confirm(`Excluir a pasta "${folder.name}"? Os perfis continuam conectados — só o agrupamento é desfeito.`)) return;
    try {
      await foldersService.deleteAccountFolder(folder.id);
      setToast({ tone: 'success', message: '✓ Pasta excluída.' });
      reload();
    } catch (err) {
      setToast({ tone: 'error', message: err.message });
    }
  };

  const loading = status === 'loading' || accStatus === 'loading';

  return (
    <div className="sf-page">
      <Header />
      <main className="sf-main">
        <div className="sf-page-head">
          <div>
            <h1 className="sf-page-head__title">Pastas de perfis</h1>
            <p className="sf-page-head__subtitle">
              Agrupe perfis para selecioná-los de uma vez no Novo post e filtrar os Agendamentos.
            </p>
          </div>
          <div className="sf-page-head__actions">
            <button
              type="button"
              className="sf-button sf-button--primary"
              onClick={() => setModal({ mode: 'create', folder: null })}
              disabled={accStatus !== 'success'}
            >
              <Icon name="folder" size={18} /> Nova pasta
            </button>
          </div>
        </div>

        {loading && <LoadingState message="Carregando pastas..." />}
        {!loading && accStatus === 'error' && <ErrorState message={accError} onRetry={reloadAccounts} />}
        {!loading && status === 'error' && <ErrorState message={error} onRetry={reload} />}

        {!loading && status === 'success' && folders.length === 0 && (
          <div className="sf-sched-empty">
            <Icon name="folder" size={36} />
            <p className="sf-sched-empty__title">Nenhuma pasta ainda.</p>
            <p className="sf-field-hint">Ex.: crie “Memes” e marque só os perfis de memes.</p>
            <button
              type="button"
              className="sf-button sf-button--primary"
              onClick={() => setModal({ mode: 'create', folder: null })}
              disabled={accStatus !== 'success'}
            >
              Criar primeira pasta
            </button>
          </div>
        )}

        {!loading && status === 'success' && folders.length > 0 && (
          <div className="sf-folder-grid">
            {folders.map((folder) => {
              const members = folder.accountIds.map((id) => byId.get(id)).filter(Boolean);
              const problems = members.filter((a) => a.status !== 'ACTIVE').length;
              return (
                <article key={folder.id} className="sf-folder-card">
                  <div className="sf-folder-card__head">
                    <span className="sf-folder-card__icon">
                      <Icon name="folder" size={22} />
                    </span>
                    <div className="sf-folder-card__title">
                      <h2>{folder.name}</h2>
                      <p>
                        {members.length} perfil{members.length === 1 ? '' : 's'}
                        {problems > 0 && <span className="sf-folder-card__warn"> · {problems} com problema</span>}
                      </p>
                    </div>
                  </div>

                  <div className="sf-folder-card__avatars">
                    {members.slice(0, MAX_AVATARS).map((a) => (
                      <span key={a.id} className="sf-folder-card__avatar" title={`@${a.username}`}>
                        {a.profilePictureUrl ? <img src={a.profilePictureUrl} alt="" /> : (a.username || '?').charAt(0).toUpperCase()}
                      </span>
                    ))}
                    {members.length > MAX_AVATARS && <span className="sf-folder-card__more">+{members.length - MAX_AVATARS}</span>}
                    {members.length === 0 && <span className="sf-field-hint">Nenhum perfil nesta pasta.</span>}
                  </div>

                  <div className="sf-folder-card__actions">
                    <button
                      type="button"
                      className="sf-button sf-button--primary sf-button--small"
                      onClick={() => setModal({ mode: 'edit', folder })}
                    >
                      Editar perfis
                    </button>
                    <Link className="sf-button sf-button--secondary sf-button--small" to={`/posts?folder=${folder.id}`}>
                      Ver agendamentos
                    </Link>
                    <button type="button" className="sf-button sf-button--secondary sf-button--small" onClick={() => handleRename(folder)}>
                      Renomear
                    </button>
                    <button type="button" className="sf-button sf-button--danger sf-button--small" onClick={() => handleDelete(folder)}>
                      Excluir
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {modal && (
        <FolderMembersModal
          mode={modal.mode}
          folder={modal.folder}
          accounts={accounts}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}