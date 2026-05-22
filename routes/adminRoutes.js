'use strict';

const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAuth, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, authorizeRoles('super_admin'));

router.get('/users', adminController.users);
router.patch('/users/:userId/status', adminController.setUserStatus);
router.get('/organizers', adminController.organizers);
router.patch('/organizers/:userId/review', adminController.reviewOrganizer);
router.get('/settings', adminController.settings);
router.post('/settings', adminController.saveSetting);

module.exports = router;
