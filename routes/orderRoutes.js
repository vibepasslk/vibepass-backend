'use strict';

const express = require('express');
const orderController = require('../controllers/orderController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, orderController.createOrder);
router.get('/mine', requireAuth, orderController.myOrders);
router.get('/:id', requireAuth, orderController.orderDetail);

module.exports = router;
