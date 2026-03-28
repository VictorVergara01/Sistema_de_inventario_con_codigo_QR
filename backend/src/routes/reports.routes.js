const express = require('express');
const {
  periodValidators,
  inventoryCurrent,
  lowStock,
  movementsByPeriod,
  topMoved
} = require('../controllers/reports.controller');
const { validateRequest } = require('../middlewares/validation.middleware');
const { authRequired, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/inventory-current', authRequired, authorizeRoles('admin', 'auditor'), inventoryCurrent);
router.get('/low-stock', authRequired, authorizeRoles('admin', 'auditor'), lowStock);
router.get('/movements', authRequired, authorizeRoles('admin', 'auditor'), periodValidators, validateRequest, movementsByPeriod);
router.get('/top-moved', authRequired, authorizeRoles('admin', 'auditor'), periodValidators, validateRequest, topMoved);

module.exports = router;
