const express = require('express');
const {
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
} = require('../controllers/products.controller');
const { validateRequest } = require('../middlewares/validation.middleware');
const { authRequired, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authRequired, listValidators, validateRequest, listProducts);
router.get('/by-qr', authRequired, findByQrValidators, validateRequest, findByQrCode);
router.get('/:id', authRequired, getByIdValidators, validateRequest, getProductById);
router.post('/', authRequired, authorizeRoles('admin'), productValidators, validateRequest, createProduct);
router.put('/:id', authRequired, authorizeRoles('admin'), [...getByIdValidators, ...productValidators], validateRequest, updateProduct);
router.delete('/:id', authRequired, authorizeRoles('admin'), getByIdValidators, validateRequest, deleteProduct);

module.exports = router;
