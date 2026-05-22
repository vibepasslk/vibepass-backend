'use strict';

const { transaction } = require('../config/database');
const EventModel = require('../models/EventModel');
const TicketModel = require('../models/TicketModel');
const OrderModel = require('../models/OrderModel');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const paymentService = require('../services/paymentService');

const createOrder = asyncHandler(async (req, res) => {
  const event = await EventModel.findById(req.body.event_id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.status !== 'published') {
    throw new ApiError(400, 'This event is not open for ticket purchases');
  }

  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) throw new ApiError(400, 'At least one ticket item is required');

  let total = 0;
  const itemDetails = [];
  for (const item of items) {
    const ticket = await TicketModel.findById(item.ticket_type_id);
    if (!ticket || ticket.event_id !== event.id) throw new ApiError(400, 'Invalid ticket category');
    const quantity = Math.max(parseInt(item.quantity || '1', 10), 1);
    const earlyBirdActive = ticket.early_bird_price && ticket.early_bird_until && new Date(ticket.early_bird_until) > new Date();
    const unitPrice = Number(earlyBirdActive ? ticket.early_bird_price : ticket.price);
    total += unitPrice * quantity;
    itemDetails.push({ ...item, quantity, unit_price: unitPrice, subtotal: unitPrice * quantity });
  }

  const feeConfig = await paymentService.getFeeConfig();
  const split = paymentService.calculateTicketSplit(total, feeConfig);

  const orderId = await transaction(async (connection) => {
    for (const item of itemDetails) {
      const [reserveResult] = await connection.execute(
        `UPDATE ticket_types
         SET quantity_sold = quantity_sold + :quantity
         WHERE id = :ticketTypeId AND quantity_sold + :quantity <= quantity_total`,
        { ticketTypeId: item.ticket_type_id, quantity: item.quantity }
      );
      if (reserveResult.affectedRows !== 1) throw new ApiError(409, 'Requested ticket quantity is not available');
    }

    const id = await OrderModel.createOrder(connection, {
      user_id: req.user.id,
      event_id: event.id,
      total,
      platform_fee: split.platformFee,
      gateway_fee: split.gatewayFee,
      organizer_amount: split.organizerAmount,
      buyer_details: req.body.buyer_details
    });

    for (const item of itemDetails) {
      await OrderModel.createOrderItem(connection, {
        order_id: id,
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        form_answers: item.form_answers,
        seats: item.seats
      });
    }

    return id;
  });

  const order = await OrderModel.findById(orderId);
  const payment = await paymentService.initializePayment(order);
  created(res, { order, payment }, 'Order created');
});

const myOrders = asyncHandler(async (req, res) => {
  ok(res, { orders: await OrderModel.listForUser(req.user.id) });
});

const orderDetail = asyncHandler(async (req, res) => {
  const order = await OrderModel.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.user_id !== req.user.id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'You can only view your own orders');
  }
  const tickets = await OrderModel.getTicketsForOrder(order.id, order.user_id);
  ok(res, { order, tickets });
});

module.exports = {
  createOrder,
  myOrders,
  orderDetail
};
