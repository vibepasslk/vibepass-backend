'use strict';

const NotificationModel = require('../models/NotificationModel');

async function notify(userId, title, body, metadata = {}) {
  if (!userId) return null;
  return NotificationModel.create({
    user_id: userId,
    channel: 'in_app',
    title,
    body,
    metadata
  });
}

async function notifyMany(userIds, title, body, metadata = {}) {
  return Promise.all(userIds.map((id) => notify(id, title, body, metadata)));
}

module.exports = {
  notify,
  notifyMany
};
