'use strict';

const OrderModel = require('../models/OrderModel');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const paymentService = require('../services/paymentService');
const { ensureTicketsForPaidOrder } = require('../services/qrService');
const { notify } = require('../services/notificationService');

const initialize = asyncHandler(async (req, res) => {
  const order = await OrderModel.findById(req.body.order_id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.user_id !== req.user.id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'You can only pay for your own orders');
  }
  const payment = await paymentService.initializePayment(order);
  ok(res, { order, payment }, 'Payment initialized');
});

const verify = asyncHandler(async (req, res) => {
  const order = await OrderModel.findById(req.body.order_id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.user_id !== req.user.id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'You can only verify your own payments');
  }

  const verification = await paymentService.verifyPayment(req.body);
  if (!verification.verified) throw new ApiError(400, 'Payment could not be verified');

  const paidOrder = await OrderModel.updatePaymentStatus(order.id, 'paid', verification.payment_reference);
  const tickets = await ensureTicketsForPaidOrder(order.id);
  await notify(order.user_id, 'Ticket purchase confirmed', `Your tickets for ${order.event_title} are ready.`, {
    order_id: order.id
  });

  ok(res, { order: paidOrder, tickets }, 'Payment verified and tickets generated');
});

const webhook = asyncHandler(async (_req, res) => {
  ok(res, { received: true }, 'Webhook received');
});

const refund = asyncHandler(async (req, res) => {
  const order = await OrderModel.updatePaymentStatus(req.body.order_id, 'refunded', req.body.payment_reference);
  ok(res, { order }, 'Refund recorded');
});

module.exports = {
  initialize,
  verify,
  webhook,
  refund
};
