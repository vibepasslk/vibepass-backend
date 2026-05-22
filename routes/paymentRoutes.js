'use strict';

const express = require('express');
const paymentController = require('../controllers/paymentController');
const { requireAuth, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.post('/initialize', requireAuth, paymentController.initialize);
router.post('/verify', requireAuth, paymentController.verify);
router.post('/webhooks/paypal', paymentController.webhook);
router.post('/refunds', requireAuth, authorizeRoles('super_admin'), paymentController.refund);

module.exports = router;
