'use strict';

const { query } = require('../config/database');

async function findById(id) {
  const rows = await query(
    `SELECT o.*, e.title AS event_title, e.start_date, e.venue
     FROM orders o
     JOIN events e ON e.id = o.event_id
     WHERE o.id = :id
     LIMIT 1`,
    { id }
  );
  return rows[0] || null;
}

async function listForUser(userId) {
  return query(
    `SELECT o.*, e.title AS event_title, e.slug AS event_slug, e.start_date, e.venue
     FROM orders o
     JOIN events e ON e.id = o.event_id
     WHERE o.user_id = :userId
     ORDER BY o.created_at DESC`,
    { userId }
  );
}

async function listForOrganizer(organizerId) {
  return query(
    `SELECT o.*, e.title AS event_title, u.name AS buyer_name, u.email AS buyer_email
     FROM orders o
     JOIN events e ON e.id = o.event_id
     JOIN users u ON u.id = o.user_id
     WHERE e.organizer_id = :organizerId
     ORDER BY o.created_at DESC`,
    { organizerId }
  );
}

async function createOrder(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO orders
      (user_id, event_id, payment_status, total, platform_fee, gateway_fee, organizer_amount,
       payment_reference, buyer_details)
     VALUES
      (:user_id, :event_id, :payment_status, :total, :platform_fee, :gateway_fee, :organizer_amount,
       :payment_reference, :buyer_details)`,
    {
      user_id: data.user_id,
      event_id: data.event_id,
      payment_status: data.payment_status || 'pending',
      total: data.total,
      platform_fee: data.platform_fee,
      gateway_fee: data.gateway_fee,
      organizer_amount: data.organizer_amount,
      payment_reference: data.payment_reference || null,
      buyer_details: JSON.stringify(data.buyer_details || {})
    }
  );
  return result.insertId;
}

async function createOrderItem(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO order_items
      (order_id, ticket_type_id, quantity, unit_price, subtotal, form_answers, seats)
     VALUES
      (:order_id, :ticket_type_id, :quantity, :unit_price, :subtotal, :form_answers, :seats)`,
    {
      order_id: data.order_id,
      ticket_type_id: data.ticket_type_id,
      quantity: data.quantity,
      unit_price: data.unit_price,
      subtotal: data.subtotal,
      form_answers: JSON.stringify(data.form_answers || {}),
      seats: JSON.stringify(data.seats || [])
    }
  );
  return result.insertId;
}

async function createQrTicket(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO qr_tickets
      (order_id, order_item_id, event_id, user_id, qr_code, scan_status)
     VALUES
      (:order_id, :order_item_id, :event_id, :user_id, :qr_code, 'unscanned')`,
    data
  );
  return result.insertId;
}

async function listItems(orderId) {
  return query(
    `SELECT oi.*, tt.category, tt.event_id
     FROM order_items oi
     JOIN ticket_types tt ON tt.id = oi.ticket_type_id
     WHERE oi.order_id = :orderId
     ORDER BY oi.id ASC`,
    { orderId }
  );
}

async function updatePaymentStatus(id, paymentStatus, paymentReference = null) {
  await query(
    `UPDATE orders
     SET payment_status = :paymentStatus,
         payment_reference = COALESCE(:paymentReference, payment_reference),
         paid_at = CASE WHEN :paymentStatus = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END
     WHERE id = :id`,
    { id, paymentStatus, paymentReference }
  );
  return findById(id);
}

async function getTicketsForOrder(orderId, userId = null) {
  const params = { orderId };
  const filters = ['qt.order_id = :orderId'];
  if (userId) {
    filters.push('qt.user_id = :userId');
    params.userId = userId;
  }

  return query(
    `SELECT qt.*, e.title AS event_title, e.start_date, e.venue, tt.category AS ticket_category
     FROM qr_tickets qt
     JOIN events e ON e.id = qt.event_id
     LEFT JOIN order_items oi ON oi.id = qt.order_item_id
     LEFT JOIN ticket_types tt ON tt.id = oi.ticket_type_id
     WHERE ${filters.join(' AND ')}
     ORDER BY qt.created_at ASC`,
    params
  );
}

module.exports = {
  findById,
  listForUser,
  listForOrganizer,
  createOrder,
  createOrderItem,
  createQrTicket,
  listItems,
  updatePaymentStatus,
  getTicketsForOrder
};
