import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/auth.css';

// If a protected page bounced the user here (Phase 3.3 will do that), the
// intended destination lives in location.state.from. Otherwise land on the
// dashboard after login.
function useRedirectTarget() {
  const location = useLocation();
  return location.state?.from?.pathname || '/dashboard';
}

export default function Login() {
  const navigate = useNavigate();
  const redirectTo = useRedirectTarget();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Preencha email e senha.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Não foi possível entrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sf-page">
      <Header />

      <main className="sf-main sf-auth">
        <div className="sf-auth__card">
          <h1 className="sf-auth__title">Entrar</h1>
          <p className="sf-auth__subtitle">Acesse sua conta do SocialFlow.</p>

          <form className="sf-auth__form" onSubmit={handleSubmit} noValidate>
            <div className="sf-auth__field">
              <label htmlFor="login-email" className="sf-field-label">
                Email
              </label>
              <input
                id="login-email"
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
              <label htmlFor="login-password" className="sf-field-label">
                Senha
              </label>
              <input
                id="login-password"
                type="password"
                className="sf-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={submitting}
                required
              />
            </div>

            {error && <p className="sf-auth__error">{error}</p>}

            <button
              type="submit"
              className="sf-button sf-button--primary sf-auth__submit"
              disabled={submitting}
            >
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="sf-auth__footer">
            Não tem conta? <Link to="/register">Criar conta</Link>
          </p>
        </div>
      </main>
    </div>
  );
}