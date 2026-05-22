'use strict';

const { query } = require('../config/database');
const OrderModel = require('../models/OrderModel');
const EventModel = require('../models/EventModel');
const InvitationModel = require('../models/InvitationModel');
const NotificationModel = require('../models/NotificationModel');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');

const admin = asyncHandler(async (_req, res) => {
  const [revenue] = await query(
    `SELECT COALESCE(SUM(total), 0) AS gross_revenue,
            COALESCE(SUM(platform_fee), 0) AS platform_commission,
            COUNT(*) AS total_orders
     FROM orders
     WHERE payment_status = 'paid'`
  );
  const [tickets] = await query('SELECT COALESCE(COUNT(*), 0) AS total_tickets FROM qr_tickets');
  const [events] = await query(
    `SELECT
       SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS active_events,
       SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) AS pending_reviews
     FROM events
     WHERE deleted_at IS NULL`
  );
  const [withdrawals] = await query(
    `SELECT SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_withdrawals
     FROM withdrawals`
  );
  const [users] = await query('SELECT COUNT(*) AS total_users FROM users WHERE deleted_at IS NULL');
  const [invitations] = await query('SELECT COUNT(*) AS total_invitations FROM invitations');

  ok(res, {
    widgets: {
      ...revenue,
      ...tickets,
      ...events,
      ...withdrawals,
      ...users,
      ...invitations
    }
  });
});

const organizer = asyncHandler(async (req, res) => {
  const [stats] = await query(
    `SELECT COALESCE(SUM(o.total), 0) AS gross_revenue,
            COALESCE(SUM(o.organizer_amount), 0) AS withdrawal_balance,
            COUNT(DISTINCT e.id) AS total_events,
            COUNT(qt.id) AS total_tickets
     FROM events e
     LEFT JOIN orders o ON o.event_id = e.id AND o.payment_status = 'paid'
     LEFT JOIN qr_tickets qt ON qt.event_id = e.id
     WHERE e.organizer_id = :organizerId AND e.deleted_at IS NULL`,
    { organizerId: req.user.id }
  );
  const events = await EventModel.listForOrganizer(req.user.id);
  const orders = await OrderModel.listForOrganizer(req.user.id);
  ok(res, { stats, events, orders });
});

const customer = asyncHandler(async (req, res) => {
  const orders = await OrderModel.listForUser(req.user.id);
  const invitations = await InvitationModel.listForUser(req.user.id);
  const notifications = await NotificationModel.listForUser(req.user.id);
  ok(res, { orders, invitations, notifications });
});

module.exports = {
  admin,
  organizer,
  customer
};
