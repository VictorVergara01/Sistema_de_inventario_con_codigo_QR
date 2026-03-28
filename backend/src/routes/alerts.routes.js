const express = require('express');
const { Op } = require('sequelize');
const { StockAlert, Product } = require('../models');
const { authRequired, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/low-stock', authRequired, authorizeRoles('admin', 'auditor'), async (_req, res) => {
  const rows = await StockAlert.findAll({
    where: { status: 'open' },
    include: [{ model: Product, where: { active: true }, attributes: ['id', 'name', 'sku'] }],
    order: [['createdAt', 'DESC']]
  });
  return res.json(rows);
});

router.get('/latest', authRequired, authorizeRoles('admin', 'auditor'), async (_req, res) => {
  const rows = await Product.findAll({
    where: {
      active: true,
      stockCurrent: { [Op.lte]: require('sequelize').literal('stock_min') }
    },
    order: [['stockCurrent', 'ASC']]
  });
  return res.json(rows);
});

module.exports = router;
