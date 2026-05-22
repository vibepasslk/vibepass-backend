'use strict';

const express = require('express');
const ticketController = require('../controllers/ticketController');
const { requireAuth, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/orders/:orderId/download', requireAuth, ticketController.downloadTickets);
router.post('/validate-qr', requireAuth, authorizeRoles('super_admin', 'organizer', 'staff'), ticketController.validateTicketQr);

module.exports = router;
