'use strict';

const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { requireAuth, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/admin', requireAuth, authorizeRoles('super_admin'), dashboardController.admin);
router.get('/organizer', requireAuth, authorizeRoles('organizer', 'super_admin'), dashboardController.organizer);
router.get('/customer', requireAuth, dashboardController.customer);

module.exports = router;
