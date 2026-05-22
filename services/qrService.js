'use strict';

const { query, transaction } = require('../config/database');
const OrderModel = require('../models/OrderModel');
const { createQrCode } = require('../utils/qr');
const ApiError = require('../utils/ApiError');

async function ensureTicketsForPaidOrder(orderId) {
  const existing = await query('SELECT COUNT(*) AS total FROM qr_tickets WHERE order_id = :orderId', { orderId });
  if (Number(existing[0].total) > 0) {
    return OrderModel.getTicketsForOrder(orderId);
  }

  const order = await OrderModel.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  const items = await OrderModel.listItems(orderId);

  await transaction(async (connection) => {
    for (const item of items) {
      for (let i = 0; i < Number(item.quantity); i += 1) {
        await OrderModel.createQrTicket(connection, {
          order_id: orderId,
          order_item_id: item.id,
          event_id: order.event_id,
          user_id: order.user_id,
          qr_code: createQrCode('VPT')
        });
      }
    }
  });

  return OrderModel.getTicketsForOrder(orderId);
}

async function validateQr(qrCode, scannerUserId) {
  const tickets = await query(
    `SELECT qt.*, e.title AS event_title, e.start_date, e.venue
     FROM qr_tickets qt
     JOIN events e ON e.id = qt.event_id
     WHERE qt.qr_code = :qrCode
     LIMIT 1`,
    { qrCode }
  );

  const ticket = tickets[0];
  if (!ticket) {
    await recordScan(null, scannerUserId, qrCode, 'denied', 'Ticket not found');
    return { approved: false, reason: 'Ticket not found' };
  }

  if (ticket.scan_status !== 'unscanned') {
    await recordScan(ticket.id, scannerUserId, qrCode, 'denied', 'Ticket already scanned or inactive');
    return { approved: false, reason: 'Ticket already scanned or inactive', ticket };
  }

  await query(
    `UPDATE qr_tickets
     SET scan_status = 'used',
         scanned_by = :scannerUserId,
         scanned_at = CURRENT_TIMESTAMP
     WHERE id = :id`,
    { id: ticket.id, scannerUserId }
  );
  await recordScan(ticket.id, scannerUserId, qrCode, 'approved', null);

  return { approved: true, ticket: { ...ticket, scan_status: 'used' } };
}

async function recordScan(qrTicketId, scannerUserId, qrCode, result, reason) {
  await query(
    `INSERT INTO qr_scan_logs
      (qr_ticket_id, scanner_user_id, qr_code, result, reason)
     VALUES
      (:qrTicketId, :scannerUserId, :qrCode, :result, :reason)`,
    { qrTicketId, scannerUserId, qrCode, result, reason }
  ).catch(() => null);
}

module.exports = {
  ensureTicketsForPaidOrder,
  validateQr
};
