'use strict';

const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validateBody, authSchemas } = require('../middleware/validate');

const router = express.Router();

router.post('/register', validateBody(authSchemas.register), authController.register);
router.post('/login', validateBody(authSchemas.login), authController.login);
router.get('/me', requireAuth, authController.me);
router.post('/forgot-password', validateBody(authSchemas.forgotPassword), authController.forgotPassword);
router.post('/2fa/verify', validateBody(authSchemas.verify2fa), authController.verify2fa);
router.get('/google', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);

module.exports = router;
