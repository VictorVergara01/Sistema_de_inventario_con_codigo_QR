const { body, param, query } = require('express-validator');
const { Op } = require('sequelize');
const { InventoryMovement, Product, User, sequelize } = require('../models');
const { refreshStockAlertForProduct } = require('../services/stock-alert.service');

const movementValidators = [
  body('productId').isInt({ min: 1 }),
  body('type').isIn(['entry', 'exit', 'transfer', 'adjustment']),
  body('quantity').isInt({ min: 1 }),
  body('adjustmentSign').optional().isIn(['positive', 'negative']),
  body('reason').optional().isString(),
  body('fromLocationText').optional().isString(),
  body('toLocationText').optional().isString()
];

const productHistoryValidators = [param('id').isInt({ min: 1 })];

const listMovementsValidators = [
  query('productId').optional().isInt({ min: 1 }),
  query('type').optional().isIn(['entry', 'exit', 'transfer', 'adjustment']),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 200 })
];

const computeNewStock = ({ current, type, quantity, adjustmentSign }) => {
  if (type === 'entry') return current + quantity;
  if (type === 'exit') return current - quantity;
  if (type === 'transfer') return current;
  if (type === 'adjustment') {
    return adjustmentSign === 'negative' ? current - quantity : current + quantity;
  }
  return current;
};

const parsePeriod = (from, to) => {
  if (!from && !to) return null;
  const period = {};
  if (from) period[Op.gte] = new Date(from);
  if (to) period[Op.lte] = new Date(to);
  return period;
};

const normalizeText = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const createMovement = async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const productId = Number(req.body.productId);
    const type = req.body.type;
    const quantity = Number(req.body.quantity);
    const reason = normalizeText(req.body.reason);
    const fromLocationText = normalizeText(req.body.fromLocationText);
    const toLocationText = normalizeText(req.body.toLocationText);
    const adjustmentSign = req.body.adjustmentSign === 'negative' ? 'negative' : 'positive';

    if (type === 'adjustment' && !reason) {
      await tx.rollback();
      return res.status(400).json({ message: 'El ajuste manual requiere motivo' });
    }

    if (type === 'transfer') {
      if (!fromLocationText || !toLocationText) {
        await tx.rollback();
        return res.status(400).json({ message: 'El traslado requiere ubicación origen y destino' });
      }

      if (fromLocationText.toLowerCase() === toLocationText.toLowerCase()) {
        await tx.rollback();
        return res.status(400).json({ message: 'La ubicación origen y destino deben ser diferentes' });
      }
    }

    const product = await Product.findByPk(productId, { transaction: tx });
    if (!product || !product.active) {
      await tx.rollback();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const stockBefore = product.stockCurrent;
    const nextStock = computeNewStock({
      current: stockBefore,
      type,
      quantity,
      adjustmentSign
    });

    if (nextStock < 0) {
      await tx.rollback();
      return res.status(400).json({ message: 'Stock insuficiente para este movimiento' });
    }

    if (type === 'transfer' && toLocationText) {
      product.warehouseLocation = toLocationText;
    }
    product.stockCurrent = nextStock;
    await product.save({ transaction: tx });

    const movement = await InventoryMovement.create(
      {
        productId,
        userId: req.user.id,
        type,
        quantity,
        adjustmentSign: type === 'adjustment' ? adjustmentSign : null,
        reason,
        fromLocationText,
        toLocationText,
        stockBefore,
        stockAfter: nextStock
      },
      { transaction: tx }
    );

    await refreshStockAlertForProduct(product, tx);
    await tx.commit();

    const fullMovement = await InventoryMovement.findByPk(movement.id, {
      include: [
        { model: Product, attributes: ['id', 'name', 'sku', 'stockCurrent', 'stockMin', 'warehouseLocation'] },
        { model: User, attributes: ['id', 'name', 'email', 'role'] }
      ]
    });

    return res.status(201).json({
      message: 'Movimiento registrado correctamente',
      movement: fullMovement,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        stockCurrent: product.stockCurrent,
        stockMin: product.stockMin,
        warehouseLocation: product.warehouseLocation
      }
    });
  } catch (error) {
    await tx.rollback();
    return res.status(400).json({ message: 'No se pudo registrar el movimiento', detail: error.message });
  }
};

const listMovementsByProduct = async (req, res) => {
  const movements = await InventoryMovement.findAll({
    where: { productId: req.params.id },
    include: [
      { model: Product, attributes: ['id', 'name', 'sku', 'warehouseLocation'] },
      { model: User, attributes: ['id', 'name', 'email', 'role'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  return res.json(movements);
};

const listMovements = async (req, res) => {
  const where = {};

  if (req.query.productId) {
    where.productId = Number(req.query.productId);
  }

  if (req.query.type) {
    where.type = req.query.type;
  }

  const period = parsePeriod(req.query.from, req.query.to);
  if (period) {
    where.createdAt = period;
  }

  const limit = Number(req.query.limit || 50);
  const movements = await InventoryMovement.findAll({
    where,
    include: [
      { model: Product, attributes: ['id', 'name', 'sku', 'stockCurrent', 'stockMin', 'warehouseLocation'] },
      { model: User, attributes: ['id', 'name', 'email', 'role'] }
    ],
    order: [['createdAt', 'DESC']],
    limit
  });

  return res.json(movements);
};

module.exports = {
  movementValidators,
  productHistoryValidators,
  listMovementsValidators,
  createMovement,
  listMovementsByProduct,
  listMovements
};
