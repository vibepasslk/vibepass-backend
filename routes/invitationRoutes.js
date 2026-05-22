'use strict';

const express = require('express');
const invitationController = require('../controllers/invitationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, invitationController.create);
router.get('/mine', requireAuth, invitationController.mine);
router.get('/:shareLink', invitationController.publicDetail);
router.post('/:shareLink/rsvp', invitationController.rsvp);
router.get('/:id/rsvps/list', requireAuth, invitationController.rsvps);

module.exports = router;
