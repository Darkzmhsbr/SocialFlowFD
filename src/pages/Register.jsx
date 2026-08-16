import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/auth.css';

// Register uses invite-only signup during the beta. Sharing a signup link
// like /register?code=XYZ prefills the code so the invitee doesn't need
// to type it manually.
export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Prefill invite code from ?code=XYZ once on mount.
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) setInviteCode(codeFromUrl.trim().toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password || !inviteCode.trim()) {
      setError('Preencha email, senha e código de convite.');
      return;
    }
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        name: name.trim() || null,
        inviteCode: inviteCode.trim(),
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sf-page">
      <Header />

      <main className="sf-main sf-auth">
        <div className="sf-auth__card">
          <h1 className="sf-auth__title">Criar conta</h1>
          <p className="sf-auth__subtitle">
            SocialFlow está em beta fechado. Você precisa de um código de convite.
          </p>

          <form className="sf-auth__form" onSubmit={handleSubmit} noValidate>
            <div className="sf-auth__field">
              <label htmlFor="reg-name" className="sf-field-label">
                Nome
              </label>
              <input
                id="reg-name"
                type="text"
                className="sf-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                disabled={submitting}
                placeholder="Como você quer ser chamado"
              />
            </div>

            <div className="sf-auth__field">
              <label htmlFor="reg-email" className="sf-field-label">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                className="sf-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={submitting}
                required
              />
            </div>

            <div className="sf-auth__field">
              <label htmlFor="reg-password" className="sf-field-label">
                Senha
              </label>
              <input
                id="reg-password"
                type="password"
                className="sf-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                disabled={submitting}
                required
              />
              <p className="sf-field-hint">Mínimo 8 caracteres.</p>
            </div>

            <div className="sf-auth__field">
              <label htmlFor="reg-invite" className="sf-field-label">
                Código de convite
              </label>
              <input
                id="reg-invite"
                type="text"
                className="sf-input"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                disabled={submitting}
                required
                autoCapitalize="characters"
                placeholder="Ex: ABC12XYZ98"
              />
            </div>

            {error && <p className="sf-auth__error">{error}</p>}

            <button
              type="submit"
              className="sf-button sf-button--primary sf-auth__submit"
              disabled={submitting}
            >
              {submitting ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="sf-auth__footer">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </main>
    </div>
  );
}