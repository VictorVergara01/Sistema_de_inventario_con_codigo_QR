const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/products.routes');
const movementRoutes = require('./routes/movements.routes');
const reportRoutes = require('./routes/reports.routes');
const alertRoutes = require('./routes/alerts.routes');
const catalogRoutes = require('./routes/catalog.routes');

const app = express();

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: false
  })
);
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/catalog', catalogRoutes);

app.use((err, _req, res, _next) => {
  return res.status(500).json({ message: 'Error interno', detail: err.message });
});

module.exports = app;
