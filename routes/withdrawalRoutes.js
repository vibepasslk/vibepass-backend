'use strict';

const express = require('express');
const withdrawalController = require('../controllers/withdrawalController');
const { requireAuth, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', requireAuth, authorizeRoles('organizer', 'super_admin'), withdrawalController.requestWithdrawal);
router.get('/mine', requireAuth, authorizeRoles('organizer', 'super_admin'), withdrawalController.mine);
router.get('/admin', requireAuth, authorizeRoles('super_admin'), withdrawalController.adminList);
router.patch('/admin/:id', requireAuth, authorizeRoles('super_admin'), upload.single('transfer_receipt'), withdrawalController.adminReview);

router.get('/bank-accounts', requireAuth, authorizeRoles('organizer', 'super_admin'), withdrawalController.bankAccounts);
router.post('/bank-accounts', requireAuth, authorizeRoles('organizer', 'super_admin'), withdrawalController.saveBankAccount);

module.exports = router;
