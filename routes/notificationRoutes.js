'use strict';

const express = require('express');
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/mine', requireAuth, notificationController.mine);
router.patch('/:id/read', requireAuth, notificationController.markRead);

module.exports = router;
