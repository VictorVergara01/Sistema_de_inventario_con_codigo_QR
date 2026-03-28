const express = require('express');
const { loginValidators, login, me } = require('../controllers/auth.controller');
const { validateRequest } = require('../middlewares/validation.middleware');
const { authRequired } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', loginValidators, validateRequest, login);
router.get('/me', authRequired, me);

module.exports = router;
