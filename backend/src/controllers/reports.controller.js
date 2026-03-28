const { query } = require('express-validator');
const { Op, fn, col, literal } = require('sequelize');
const { Product, InventoryMovement, User } = require('../models');
const { buildWorkbook, sendWorkbook } = require('../services/excel.service');

const periodValidators = [query('from').optional().isISO8601(), query('to').optional().isISO8601()];

const parsePeriod = (from, to) => {
  if (!from && !to) return null;
  const period = {};
  if (from) period[Op.gte] = new Date(from);
  if (to) period[Op.lte] = new Date(to);
  return period;
};

const inventoryCurrent = async (req, res) => {
  const products = await Product.findAll({
    where: { active: true },
    order: [['name', 'ASC']]
  });

  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stockCurrent: p.stockCurrent,
    stockMin: p.stockMin,
    costPrice: Number(p.costPrice),
    salePrice: Number(p.salePrice),
    totalCostValue: Number(p.costPrice) * p.stockCurrent,
    totalSaleValue: Number(p.salePrice) * p.stockCurrent
  }));

  const totals = rows.reduce(
    (acc, row) => {
      acc.totalCostValue += row.totalCostValue;
      acc.totalSaleValue += row.totalSaleValue;
      return acc;
    },
    { totalCostValue: 0, totalSaleValue: 0 }
  );

  if (req.query.format === 'excel') {
    const workbook = await buildWorkbook({
      sheetName: 'Inventario',
      columns: [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Producto', key: 'name', width: 30 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Stock Actual', key: 'stockCurrent', width: 15 },
        { header: 'Stock Min', key: 'stockMin', width: 12 },
        { header: 'Costo', key: 'costPrice', width: 14 },
        { header: 'Venta', key: 'salePrice', width: 14 },
        { header: 'Valor Costo', key: 'totalCostValue', width: 16 },
        { header: 'Valor Venta', key: 'totalSaleValue', width: 16 }
      ],
      rows
    });
    return sendWorkbook(res, workbook, 'reporte_inventario_actual.xlsx');
  }

  return res.json({ rows, totals });
};

const lowStock = async (req, res) => {
  const rows = await Product.findAll({
    where: {
      active: true,
      stockCurrent: { [Op.lte]: literal('stock_min') }
    },
    order: [['stockCurrent', 'ASC']]
  });

  if (req.query.format === 'excel') {
    const workbook = await buildWorkbook({
      sheetName: 'Bajo Minimo',
      columns: [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Producto', key: 'name', width: 30 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Stock Actual', key: 'stockCurrent', width: 15 },
        { header: 'Stock Min', key: 'stockMin', width: 12 }
      ],
      rows: rows.map((p) => p.toJSON())
    });
    return sendWorkbook(res, workbook, 'reporte_stock_bajo_minimo.xlsx');
  }

  return res.json(rows);
};

const movementsByPeriod = async (req, res) => {
  const period = parsePeriod(req.query.from, req.query.to);
  const where = {};
  if (period) where.createdAt = period;

  const rows = await InventoryMovement.findAll({
    where,
    include: [
      { model: Product, attributes: ['id', 'name', 'sku'] },
      { model: User, attributes: ['id', 'name', 'role'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  if (req.query.format === 'excel') {
    const workbook = await buildWorkbook({
      sheetName: 'Movimientos',
      columns: [
        { header: 'Fecha', key: 'createdAt', width: 20 },
        { header: 'Tipo', key: 'type', width: 14 },
        { header: 'Cantidad', key: 'quantity', width: 12 },
        { header: 'Producto', key: 'productName', width: 30 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Usuario', key: 'userName', width: 24 },
        { header: 'Rol', key: 'userRole', width: 14 },
        { header: 'Motivo', key: 'reason', width: 30 }
      ],
      rows: rows.map((m) => ({
        createdAt: m.createdAt,
        type: m.type,
        quantity: m.quantity,
        productName: m.Product?.name,
        sku: m.Product?.sku,
        userName: m.User?.name,
        userRole: m.User?.role,
        reason: m.reason
      }))
    });
    return sendWorkbook(res, workbook, 'reporte_movimientos_periodo.xlsx');
  }

  return res.json(rows);
};

const topMoved = async (req, res) => {
  try {
    const period = parsePeriod(req.query.from, req.query.to);
    const where = {};
    if (period) where.createdAt = period;

    const limit = Number(req.query.limit || 10);
    const rows = await InventoryMovement.findAll({
      where,
      attributes: [
        'productId',
        [fn('SUM', fn('ABS', col('InventoryMovement.quantity'))), 'movedQty'],
        [fn('COUNT', col('InventoryMovement.id')), 'movementsCount']
      ],
      include: [{ model: Product, attributes: ['id', 'name', 'sku'] }],
      group: ['productId', 'Product.id'],
      order: [[literal('movedQty'), 'DESC']],
      subQuery: false,
      limit
    });

    const normalized = rows.map((row) => ({
      productId: row.productId,
      productName: row.Product?.name,
      sku: row.Product?.sku,
      movedQty: Number(row.get('movedQty')),
      movementsCount: Number(row.get('movementsCount'))
    }));

    if (req.query.format === 'excel') {
      const workbook = await buildWorkbook({
        sheetName: 'Top Movidos',
        columns: [
          { header: 'Product ID', key: 'productId', width: 12 },
          { header: 'Producto', key: 'productName', width: 30 },
          { header: 'SKU', key: 'sku', width: 20 },
          { header: 'Cantidad Movida', key: 'movedQty', width: 20 },
          { header: 'N Movimientos', key: 'movementsCount', width: 16 }
        ],
        rows: normalized
      });
      return sendWorkbook(res, workbook, 'reporte_top_productos_movidos.xlsx');
    }

    return res.json(normalized);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo generar el reporte top movidos', detail: error.message });
  }
};

module.exports = {
  periodValidators,
  inventoryCurrent,
  lowStock,
  movementsByPeriod,
  topMoved
};
