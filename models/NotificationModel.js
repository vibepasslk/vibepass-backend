'use strict';

const { query } = require('../config/database');

async function create(data) {
  const result = await query(
    `INSERT INTO notifications
      (user_id, channel, title, body, status, metadata)
     VALUES
      (:user_id, :channel, :title, :body, :status, :metadata)
     RETURNING id`,
    {
      user_id: data.user_id,
      channel: data.channel || 'in_app',
      title: data.title,
      body: data.body || null,
      status: data.status || 'queued',
      metadata: JSON.stringify(data.metadata || {})
    }
  );
  return result.insertId;
}

async function listForUser(userId) {
  return query(
    `SELECT *
     FROM notifications
     WHERE user_id = :userId
     ORDER BY created_at DESC
     LIMIT 50`,
    { userId }
  );
}

async function markRead(userId, id) {
  await query(
    `UPDATE notifications
     SET read_at = CURRENT_TIMESTAMP
     WHERE id = :id AND user_id = :userId`,
    { userId, id }
  );
}

module.exports = {
  create,
  listForUser,
  markRead
};
