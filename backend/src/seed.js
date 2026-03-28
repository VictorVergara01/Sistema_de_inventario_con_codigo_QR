const bcrypt = require('bcryptjs');
const { sequelize, User, Category, Supplier, Location } = require('./models');

const run = async () => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  const users = [
    { name: 'Administrador', email: 'admin@inventario.local', role: 'admin', password: 'Admin123!' },
    {
      name: 'Bodeguero Principal',
      email: 'bodega@inventario.local',
      role: 'bodeguero',
      password: 'Bodega123!'
    },
    { name: 'Auditor', email: 'auditor@inventario.local', role: 'auditor', password: 'Auditor123!' }
  ];

  for (const user of users) {
    const existing = await User.findOne({ where: { email: user.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await User.create({
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
        active: true
      });
    }
  }

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
    defaults: {
      code: 'A1',
      name: 'Pasillo A - Estante 1',
      description: 'Ubicación principal de almacenamiento'
    }
  });

  console.log('Seed completado. Usuarios demo:');
  console.log('admin@inventario.local / Admin123!');
  console.log('bodega@inventario.local / Bodega123!');
  console.log('auditor@inventario.local / Auditor123!');

  await sequelize.close();
};

run().catch(async (error) => {
  console.error(error);
  await sequelize.close();
  process.exit(1);
});
