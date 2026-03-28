const app = require('./app');
const env = require('./config/env');
const { sequelize } = require('./models');

const start = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    app.listen(env.port, () => {
      console.log(`API corriendo en puerto ${env.port}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
};

start();
