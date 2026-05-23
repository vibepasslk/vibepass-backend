'use strict';

const { query } = require('../config/database');

async function create(data) {
  const result = await query(
    `INSERT INTO withdrawals
      (organizer_id, amount, status, bank_account_id, organizer_note)
     VALUES
      (:organizer_id, :amount, 'pending', :bank_account_id, :organizer_note)
     RETURNING id`,
    {
      organizer_id: data.organizer_id,
      amount: data.amount,
      bank_account_id: data.bank_account_id || null,
      organizer_note: data.organizer_note || null
    }
  );
  return findById(result.insertId);
}

async function findById(id) {
  const rows = await query(
    `SELECT w.*, u.name AS organizer_name, u.email AS organizer_email
     FROM withdrawals w
     JOIN users u ON u.id = w.organizer_id
     WHERE w.id = :id
     LIMIT 1`,
    { id }
  );
  return rows[0] || null;
}

async function listForOrganizer(organizerId) {
  return query(
    `SELECT *
     FROM withdrawals
     WHERE organizer_id = :organizerId
     ORDER BY created_at DESC`,
    { organizerId }
  );
}

async function listForAdmin({ status, limit, offset }) {
  const filters = [];
  const params = { limit, offset };
  if (status) {
    filters.push('w.status = :status');
    params.status = status;
  }

  return query(
    `SELECT w.*, u.name AS organizer_name, u.email AS organizer_email
     FROM withdrawals w
     JOIN users u ON u.id = w.organizer_id
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY w.created_at DESC
     LIMIT :limit OFFSET :offset`,
    params
  );
}

async function review(id, data) {
  await query(
    `UPDATE withdrawals
     SET status = :status,
         admin_note = :admin_note,
         transfer_receipt_path = COALESCE(:transfer_receipt_path, transfer_receipt_path),
         reviewed_by = :reviewed_by,
         reviewed_at = CURRENT_TIMESTAMP
     WHERE id = :id`,
    {
      id,
      status: data.status,
      admin_note: data.admin_note || null,
      transfer_receipt_path: data.transfer_receipt_path || null,
      reviewed_by: data.reviewed_by || null
    }
  );
  return findById(id);
}

module.exports = {
  create,
  findById,
  listForOrganizer,
  listForAdmin,
  review
};
