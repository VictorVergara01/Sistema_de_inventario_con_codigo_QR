const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');

const authRequired = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findByPk(payload.sub);

    if (!user || !user.active) {
      return res.status(401).json({ message: 'Usuario inválido' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'No autorizado para este recurso' });
  }

  next();
};

module.exports = {
  authRequired,
  authorizeRoles
};
