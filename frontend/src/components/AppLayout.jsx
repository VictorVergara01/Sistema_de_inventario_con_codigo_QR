import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { ROLE_LABELS, getRolePermissions } from '../lib/role-access';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const permissions = getRolePermissions(user?.role);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-icon">W</span>
          <div>
            <h2>Warehouse Pulse</h2>
            <small>Control inteligente por QR</small>
          </div>
        </div>

        <nav className="main-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Productos
          </NavLink>
          <NavLink to="/scanner" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Escanear QR
          </NavLink>
          {(user?.role === 'admin' || user?.role === 'bodeguero') && (
            <NavLink to="/movements" className={({ isActive }) => (isActive ? 'is-active' : '')}>
              Movimientos
            </NavLink>
          )}
          {(user?.role === 'admin' || user?.role === 'auditor') && (
            <NavLink to="/reports" className={({ isActive }) => (isActive ? 'is-active' : '')}>
              Reportes
            </NavLink>
          )}
        </nav>

        <div className="permissions-box">
          <small>Permisos activos</small>
          <div className="pill-row">
            {permissions.map((item) => (
              <span key={item} className="pill">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <small>{user?.name}</small>
          <small>Rol: {ROLE_LABELS[user?.role] || user?.role}</small>
          <button onClick={logout} type="button">
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
