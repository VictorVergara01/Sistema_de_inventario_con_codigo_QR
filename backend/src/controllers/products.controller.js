const { body, query, param } = require('express-validator');
const { Op, literal } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { Product, Category, Supplier, Location, sequelize } = require('../models');
const { refreshStockAlertForProduct } = require('../services/stock-alert.service');

const includeRelations = [
  { model: Category, attributes: ['id', 'name'] },
  { model: Supplier, attributes: ['id', 'name'] },
  { model: Location, attributes: ['id', 'code', 'name'] }
];

const productValidators = [
  body('name').isString().isLength({ min: 2 }),
  body('sku').isString().isLength({ min: 2 }),
  body('categoryId').isInt({ min: 1 }),
  body('supplierId').isInt({ min: 1 }),
  body('locationId').isInt({ min: 1 }),
  body('costPrice').isFloat({ min: 0 }),
  body('salePrice').isFloat({ min: 0 }),
  body('stockCurrent').isInt({ min: 0 }),
  body('stockMin').isInt({ min: 0 }),
  body('warehouseLocation').optional().isString(),
  body('active').optional().isBoolean()
];

const listValidators = [
  query('search').optional().isString(),
  query('categoryId').optional().isInt({ min: 1 }),
  query('belowMinimum').optional().isBoolean()
];

const getByIdValidators = [param('id').isInt({ min: 1 })];

const findByQrValidators = [query('value').isString().isLength({ min: 3 })];

const getQrPayload = (sku) => `INV:${sku}:${uuidv4()}`;

const mapProductError = (error, action) => {
  if (error.name === 'SequelizeUniqueConstraintError') {
    const duplicateField = error.errors?.[0]?.path;

    if (duplicateField === 'sku') {
      return {
        status: 409,
        body: { message: 'El SKU ya existe. Usa un SKU diferente para el producto.' }
      };
    }

    if (duplicateField === 'qrCodeValue' || duplicateField === 'qr_code_value') {
      return {
        status: 409,
        body: { message: 'No se pudo generar un QR único. Intenta guardar nuevamente.' }
      };
    }

    return {
      status: 409,
      body: { message: 'Ya existe un producto con datos únicos duplicados.' }
    };
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return {
      status: 400,
      body: { message: 'Categoría, proveedor o ubicación inválidos para este producto.' }
    };
  }

  if (error.name === 'SequelizeValidationError') {
    return {
      status: 400,
      body: {
        message:
          error.errors?.map((item) => item.message).join(' | ') ||
          `No se pudo ${action} el producto por una validación.`
      }
    };
  }

  return {
    status: 400,
    body: {
      message: `No se pudo ${action} el producto`,
      detail: error.message
    }
  };
};

const listProducts = async (req, res) => {
  const { search, categoryId, belowMinimum } = req.query;
  const where = { active: true };

  if (search) {
    where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { sku: { [Op.like]: `%${search}%` } }];
  }

  if (categoryId) {
    where.categoryId = Number(categoryId);
  }

  if (String(belowMinimum) === 'true') {
    where.stockCurrent = { [Op.lte]: literal('stock_min') };
  }

  const products = await Product.findAll({
    where,
    include: includeRelations,
    order: [['createdAt', 'DESC']]
  });

  return res.json(products);
};

const getProductById = async (req, res) => {
  const product = await Product.findByPk(req.params.id, { include: includeRelations });
  if (!product || !product.active) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  return res.json(product);
};

const createProduct = async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const normalizedSku = String(req.body.sku || '').trim().toUpperCase();
    const payload = {
      ...req.body,
      sku: normalizedSku,
      qrCodeValue: getQrPayload(normalizedSku)
    };

    const product = await Product.create(payload, { transaction: tx });
    await refreshStockAlertForProduct(product, tx);

    await tx.commit();

    const fullProduct = await Product.findByPk(product.id, { include: includeRelations });
    return res.status(201).json(fullProduct);
  } catch (error) {
    await tx.rollback();
    const mapped = mapProductError(error, 'crear');
    return res.status(mapped.status).json(mapped.body);
  }
};

const updateProduct = async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, { transaction: tx });
    if (!product || !product.active) {
      await tx.rollback();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const payload = {
      ...req.body,
      sku: req.body.sku ? String(req.body.sku).trim().toUpperCase() : product.sku
    };

    await product.update(payload, { transaction: tx });
    await refreshStockAlertForProduct(product, tx);
    await tx.commit();

    const fullProduct = await Product.findByPk(product.id, { include: includeRelations });
    return res.json(fullProduct);
  } catch (error) {
    await tx.rollback();
    const mapped = mapProductError(error, 'actualizar');
    return res.status(mapped.status).json(mapped.body);
  }
};

const deleteProduct = async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product || !product.active) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  product.active = false;
  await product.save();
  return res.status(204).send();
};

const findByQrCode = async (req, res) => {
  const product = await Product.findOne({
    where: { qrCodeValue: req.query.value, active: true },
    include: includeRelations
  });

  if (!product) {
    return res.status(404).json({ message: 'No se encontró producto para el QR' });
  }

  return res.json(product);
};

module.exports = {
  productValidators,
  listValidators,
  getByIdValidators,
  findByQrValidators,
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  findByQrCode
};
