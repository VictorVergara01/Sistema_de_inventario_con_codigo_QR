import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { DEMO_ACCOUNTS, ROLE_LABELS, getLandingPath } from '../lib/role-access';

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@inventario.local', password: 'Admin123!' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={getLandingPath(user?.role)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      navigate(getLandingPath(user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const applyDemoCredentials = (account) => {
    setForm({ email: account.email, password: account.password });
    setError('');
  };

  return (
    <div className="login-wrap">
      <div className="auth-grid">
        <form className="card login-card" onSubmit={handleSubmit}>
          <span className="kicker">Sistema de Inventario</span>
          <h1>Acceso por roles</h1>
          <p>Inicia sesión para gestionar inventario, escanear QR y consultar reportes.</p>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
          </label>

          {error && <div className="error">{error}</div>}

          <button disabled={loading} type="submit">
            {loading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>
        </form>

        <div className="card role-preview-card">
          <h3>Perfiles demo listos para probar</h3>
          <p>Selecciona uno para autocompletar credenciales y validar permisos.</p>

          <div className="role-list">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                type="button"
                key={account.role}
                className="role-item"
                onClick={() => applyDemoCredentials(account)}
              >
                <div>
                  <strong>{ROLE_LABELS[account.role]}</strong>
                  <small>{account.note}</small>
                </div>
                <small>{account.email}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
