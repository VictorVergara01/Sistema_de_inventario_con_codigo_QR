const bcrypt = require('bcryptjs');
const { sequelize, User, Category, Supplier, Location, Department, Employee, PayrollRun, PayrollEntry } = require('./models');

const run = async () => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  // ── Usuarios del sistema ──────────────────────────────────────────────────
  const users = [
    { name: 'Administrador', email: 'admin@inventario.local', role: 'admin', password: 'Admin123!' },
    { name: 'Bodeguero Principal', email: 'bodega@inventario.local', role: 'bodeguero', password: 'Bodega123!' },
    { name: 'Auditor', email: 'auditor@inventario.local', role: 'auditor', password: 'Auditor123!' },
    { name: 'Recursos Humanos', email: 'hr@inventario.local', role: 'hr_admin', password: 'Hr123!' }
  ];

  for (const user of users) {
    const existing = await User.findOne({ where: { email: user.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await User.create({ name: user.name, email: user.email, role: user.role, passwordHash, active: true });
    }
  }

  // ── Catálogo inventario ───────────────────────────────────────────────────
  const categories = ['Electrónica', 'Ferretería', 'Limpieza', 'Papelería'];
  for (const name of categories) {
    await Category.findOrCreate({ where: { name }, defaults: { name } });
  }

  await Supplier.findOrCreate({
    where: { name: 'Proveedor General S.A.' },
    defaults: {
      name: 'Proveedor General S.A.',
      contact: 'Juan Pérez',
      phone: '+57 3000000000',
      email: 'contacto@proveedor.local'
    }
  });

  await Location.findOrCreate({
    where: { code: 'A1' },
    defaults: { code: 'A1', name: 'Pasillo A - Estante 1', description: 'Ubicación principal de almacenamiento' }
  });

  // ── Departamentos HR ──────────────────────────────────────────────────────
  const [deptOps] = await Department.findOrCreate({
    where: { name: 'Operaciones' },
    defaults: { name: 'Operaciones', description: 'Personal de bodega, logística y operaciones diarias' }
  });

  const [deptAdmin] = await Department.findOrCreate({
    where: { name: 'Administración' },
    defaults: { name: 'Administración', description: 'Personal administrativo, contabilidad y RR.HH.' }
  });

  const [deptVentas] = await Department.findOrCreate({
    where: { name: 'Ventas' },
    defaults: { name: 'Ventas', description: 'Equipo comercial y atención al cliente' }
  });

  // ── Empleados de ejemplo ──────────────────────────────────────────────────
  const employeeSeed = [
    {
      firstName: 'Carlos',
      lastName: 'Ramírez',
      dni: '10001234',
      email: 'c.ramirez@empresa.local',
      phone: '+57 3100000001',
      position: 'Jefe de Bodega',
      departmentId: deptOps.id,
      salaryType: 'monthly',
      baseSalary: 3200000,
      hireDate: '2021-03-15',
      status: 'active'
    },
    {
      firstName: 'Laura',
      lastName: 'Gómez',
      dni: '10005678',
      email: 'l.gomez@empresa.local',
      phone: '+57 3100000002',
      position: 'Auxiliar de Bodega',
      departmentId: deptOps.id,
      salaryType: 'monthly',
      baseSalary: 1600000,
      hireDate: '2022-07-01',
      status: 'active'
    },
    {
      firstName: 'Miguel',
      lastName: 'Torres',
      dni: '10009999',
      email: 'm.torres@empresa.local',
      phone: '+57 3100000003',
      position: 'Contador',
      departmentId: deptAdmin.id,
      salaryType: 'monthly',
      baseSalary: 2800000,
      hireDate: '2020-01-10',
      status: 'active'
    },
    {
      firstName: 'Sofía',
      lastName: 'Herrera',
      dni: '10007777',
      email: 's.herrera@empresa.local',
      phone: '+57 3100000004',
      position: 'Ejecutiva de Ventas',
      departmentId: deptVentas.id,
      salaryType: 'monthly',
      baseSalary: 2200000,
      hireDate: '2023-02-20',
      status: 'active'
    },
    {
      firstName: 'Andrés',
      lastName: 'Vargas',
      dni: '10003333',
      email: 'a.vargas@empresa.local',
      phone: '+57 3100000005',
      position: 'Operario de Carga',
      departmentId: deptOps.id,
      salaryType: 'hourly',
      baseSalary: 15000,
      hireDate: '2023-09-01',
      status: 'on_leave'
    }
  ];

  for (const emp of employeeSeed) {
    await Employee.findOrCreate({ where: { dni: emp.dni }, defaults: emp });
  }

  // ── Nómina draft del mes actual ───────────────────────────────────────────
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const adminUser = await User.findOne({ where: { email: 'admin@inventario.local' } });

  const existingRun = await PayrollRun.findOne({ where: { period } });
  if (!existingRun && adminUser) {
    const activeEmployees = await Employee.findAll({ where: { active: true, status: 'active' } });
    const run = await PayrollRun.create({
      period,
      status: 'draft',
      notes: 'Nómina generada automáticamente por el seed',
      processedById: adminUser.id,
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0
    });

    let totalGross = 0;
    for (const emp of activeEmployees) {
      const gross = Number(emp.baseSalary);
      totalGross += gross;
      await PayrollEntry.create({
        payrollRunId: run.id,
        employeeId: emp.id,
        baseSalary: gross,
        bonuses: 0,
        deductions: 0,
        grossSalary: gross,
        netSalary: gross
      });
    }
    run.totalGross = totalGross;
    run.totalNet = totalGross;
    await run.save();
  }

  console.log('\nSeed completado.');
  console.log('\nUsuarios del sistema:');
  console.log('  admin@inventario.local   / Admin123!   [Administrador]');
  console.log('  bodega@inventario.local  / Bodega123!  [Bodeguero]');
  console.log('  auditor@inventario.local / Auditor123! [Auditor]');
  console.log('  hr@inventario.local      / Hr123!      [RR.HH.]');
  console.log('\nDatos HR creados: 3 departamentos, 5 empleados, 1 nómina draft.');

  await sequelize.close();
};

run().catch(async (error) => {
  console.error(error);
  await sequelize.close();
  process.exit(1);
});
