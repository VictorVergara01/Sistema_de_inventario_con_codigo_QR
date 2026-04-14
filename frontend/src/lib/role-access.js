export const ROLE_LABELS = {
  admin: 'Administrador',
  bodeguero: 'Bodeguero',
  auditor: 'Auditor',
  hr_admin: 'RR.HH.'
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
  },
  {
    role: 'hr_admin',
    email: 'hr@inventario.local',
    password: 'Hr123!',
    note: 'Gestión de empleados, nómina y asistencia'
  }
];

export const getLandingPath = (role) => {
  if (role === 'bodeguero') return '/movements';
  if (role === 'auditor') return '/reports';
  if (role === 'hr_admin') return '/employees';
  return '/';
};

export const getRolePermissions = (role) => {
  if (role === 'admin') {
    return ['CRUD productos', 'Movimientos', 'Reportes', 'Alertas', 'Scanner', 'RR.HH.'];
  }
  if (role === 'bodeguero') {
    return ['Movimientos', 'Scanner', 'Consulta de productos'];
  }
  if (role === 'hr_admin') {
    return ['Empleados', 'Nómina', 'Asistencia', 'Departamentos'];
  }
  return ['Solo lectura de productos', 'Reportes', 'Alertas'];
};

export const isHR = (role) => role === 'admin' || role === 'hr_admin';
