const express = require('express');
const {
  movementValidators,
  productHistoryValidators,
  listMovementsValidators,
  createMovement,
  listMovementsByProduct,
  listMovements
} = require('../controllers/movements.controller');
const { validateRequest } = require('../middlewares/validation.middleware');
const { authRequired, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authRequired, listMovementsValidators, validateRequest, listMovements);
router.post('/', authRequired, authorizeRoles('admin', 'bodeguero'), movementValidators, validateRequest, createMovement);
router.get('/product/:id', authRequired, productHistoryValidators, validateRequest, listMovementsByProduct);

module.exports = router;
