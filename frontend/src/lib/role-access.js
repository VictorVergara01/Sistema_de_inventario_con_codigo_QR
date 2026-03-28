export const ROLE_LABELS = {
  admin: 'Administrador',
  bodeguero: 'Bodeguero',
  auditor: 'Auditor'
};

export const DEMO_ACCOUNTS = [
  {
    role: 'admin',
    email: 'admin@inventario.local',
    password: 'Admin123!',
    note: 'Control total del sistema'
  },
  {
    role: 'bodeguero',
    email: 'bodega@inventario.local',
    password: 'Bodega123!',
    note: 'Registra movimientos y escanea QR'
  },
  {
    role: 'auditor',
    email: 'auditor@inventario.local',
    password: 'Auditor123!',
    note: 'Vista de reportes y lectura'
  }
];

export const getLandingPath = (role) => {
  if (role === 'bodeguero') return '/movements';
  if (role === 'auditor') return '/reports';
  return '/';
};

export const getRolePermissions = (role) => {
  if (role === 'admin') {
    return ['CRUD productos', 'Movimientos', 'Reportes', 'Alertas', 'Scanner'];
  }

  if (role === 'bodeguero') {
    return ['Movimientos', 'Scanner', 'Consulta de productos'];
  }

  return ['Solo lectura de productos', 'Reportes', 'Alertas'];
};
