const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 4000,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME || 'inventario_qr',
    user: process.env.DB_USER || 'inventario',
    password: process.env.DB_PASSWORD || 'inventario123'
  },
  jwtSecret: process.env.JWT_SECRET || 'super_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};
