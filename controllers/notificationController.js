'use strict';

const NotificationModel = require('../models/NotificationModel');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');

const mine = asyncHandler(async (req, res) => {
  ok(res, { notifications: await NotificationModel.listForUser(req.user.id) });
});

const markRead = asyncHandler(async (req, res) => {
  await NotificationModel.markRead(req.user.id, req.params.id);
  ok(res, null, 'Notification marked as read');
});

module.exports = {
  mine,
  markRead
};
