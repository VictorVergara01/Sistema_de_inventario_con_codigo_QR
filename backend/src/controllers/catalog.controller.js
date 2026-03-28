const { body } = require('express-validator');
const { Category, Supplier, Location } = require('../models');

const categoryValidators = [body('name').isString().isLength({ min: 2 })];
const supplierValidators = [body('name').isString().isLength({ min: 2 })];
const locationValidators = [body('code').isString().isLength({ min: 1 }), body('name').isString()];

const listCatalog = async (Model, res) => {
  const rows = await Model.findAll({ order: [['name', 'ASC']] });
  return res.json(rows);
};

const createCatalog = async (Model, payload, res) => {
  const row = await Model.create(payload);
  return res.status(201).json(row);
};

const listCategories = async (_req, res) => listCatalog(Category, res);
const createCategory = async (req, res) => createCatalog(Category, req.body, res);

const listSuppliers = async (_req, res) => listCatalog(Supplier, res);
const createSupplier = async (req, res) => createCatalog(Supplier, req.body, res);

const listLocations = async (_req, res) => listCatalog(Location, res);
const createLocation = async (req, res) => createCatalog(Location, req.body, res);

module.exports = {
  categoryValidators,
  supplierValidators,
  locationValidators,
  listCategories,
  createCategory,
  listSuppliers,
  createSupplier,
  listLocations,
  createLocation
};
