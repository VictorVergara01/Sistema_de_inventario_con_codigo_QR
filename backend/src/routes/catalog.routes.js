const express = require('express');
const {
  categoryValidators,
  supplierValidators,
  locationValidators,
  listCategories,
  createCategory,
  listSuppliers,
  createSupplier,
  listLocations,
  createLocation
} = require('../controllers/catalog.controller');
const { authRequired, authorizeRoles } = require('../middlewares/auth.middleware');
const { validateRequest } = require('../middlewares/validation.middleware');

const router = express.Router();

router.get('/categories', authRequired, listCategories);
router.post('/categories', authRequired, authorizeRoles('admin'), categoryValidators, validateRequest, createCategory);

router.get('/suppliers', authRequired, listSuppliers);
router.post('/suppliers', authRequired, authorizeRoles('admin'), supplierValidators, validateRequest, createSupplier);

router.get('/locations', authRequired, listLocations);
router.post('/locations', authRequired, authorizeRoles('admin'), locationValidators, validateRequest, createLocation);

module.exports = router;
