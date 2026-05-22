'use strict';

const TicketModel = require('../models/TicketModel');
const EventModel = require('../models/EventModel');
const OrderModel = require('../models/OrderModel');
const { validateQr } = require('../services/qrService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');

const createTicketType = asyncHandler(async (req, res) => {
  const event = await EventModel.findById(req.params.eventId);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.organizer_id !== req.user.id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'You can only manage tickets for your own events');
  }

  const ticket = await TicketModel.create({
    event_id: event.id,
    category: req.body.category,
    price: req.body.price,
    early_bird_price: req.body.early_bird_price,
    early_bird_until: req.body.early_bird_until,
    quantity_total: req.body.quantity_total,
    seats_per_ticket: req.body.seats_per_ticket,
    ticket_image: req.file ? `/uploads/${req.file.filename}` : req.body.ticket_image,
    qr_mode: req.body.qr_mode
  });

  created(res, { ticket }, 'Ticket category created');
});

const listForEvent = asyncHandler(async (req, res) => {
  ok(res, { tickets: await TicketModel.findByEvent(req.params.eventId) });
});

const validateTicketQr = asyncHandler(async (req, res) => {
  const result = await validateQr(req.body.qr_code, req.user.id);
  ok(res, result, result.approved ? 'Access approved' : 'Access denied');
});

const downloadTickets = asyncHandler(async (req, res) => {
  const tickets = await OrderModel.getTicketsForOrder(req.params.orderId, req.user.role === 'super_admin' ? null : req.user.id);
  ok(res, { tickets }, 'Tickets ready');
});

module.exports = {
  createTicketType,
  listForEvent,
  validateTicketQr,
  downloadTickets
};
