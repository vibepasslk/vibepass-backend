'use strict';

const { query } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { created } = require('../utils/respond');

const create = asyncHandler(async (req, res) => {
  const result = await query(
    `INSERT INTO support_tickets (user_id, email, subject, message)
     VALUES (:user_id, :email, :subject, :message)`,
    {
      user_id: req.user ? req.user.id : null,
      email: req.body.email || (req.user ? req.user.email : null),
      subject: req.body.subject,
      message: req.body.message
    }
  );
  created(res, { ticket_id: result.insertId }, 'Support request received');
});

module.exports = { create };
