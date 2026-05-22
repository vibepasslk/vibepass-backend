'use strict';

const express = require('express');
const eventController = require('../controllers/eventController');
const ticketController = require('../controllers/ticketController');
const { requireAuth, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', eventController.listPublic);
router.get('/mine', requireAuth, eventController.organizerEvents);
router.get('/admin/review-queue', requireAuth, authorizeRoles('super_admin'), eventController.adminEvents);
router.get('/:id', eventController.detail);

router.post('/', requireAuth, upload.single('cover_image'), eventController.create);
router.put('/:id', requireAuth, upload.single('cover_image'), eventController.update);
router.delete('/:id', requireAuth, eventController.remove);
router.post('/:id/submit-review', requireAuth, eventController.submitForReview);
router.patch('/:id/review', requireAuth, authorizeRoles('super_admin'), eventController.adminReview);

router.get('/:eventId/tickets', ticketController.listForEvent);
router.post('/:eventId/tickets', requireAuth, upload.single('ticket_image'), ticketController.createTicketType);

module.exports = router;
