'use strict';

const { query } = require('../config/database');

async function createProfile(data) {
  const result = await query(
    `INSERT INTO organizer_profiles
      (user_id, organizer_type, organization_name, status, plan_id, commission_rate)
     VALUES
      (:user_id, :organizer_type, :organization_name, :status, :plan_id, :commission_rate)
     RETURNING id`,
    {
      user_id: data.user_id,
      organizer_type: data.organizer_type || 'Event organizer',
      organization_name: data.organization_name || null,
      status: data.status || 'pending',
      plan_id: data.plan_id || null,
      commission_rate: data.commission_rate || null
    }
  );
  return findByUserId(data.user_id) || result.insertId;
}

async function findByUserId(userId) {
  const rows = await query(
    `SELECT op.*, u.name, u.email, u.phone
     FROM organizer_profiles op
     JOIN users u ON u.id = op.user_id
     WHERE op.user_id = :userId
     LIMIT 1`,
    { userId }
  );
  return rows[0] || null;
}

async function updateProfile(userId, data) {
  await query(
    `UPDATE organizer_profiles
     SET organizer_type = COALESCE(:organizer_type, organizer_type),
         organization_name = COALESCE(:organization_name, organization_name),
         nic_document_path = COALESCE(:nic_document_path, nic_document_path),
         bank_verified = COALESCE(:bank_verified, bank_verified)
     WHERE user_id = :userId`,
    {
      userId,
      organizer_type: data.organizer_type || null,
      organization_name: data.organization_name || null,
      nic_document_path: data.nic_document_path || null,
      bank_verified: typeof data.bank_verified === 'boolean' ? data.bank_verified : null
    }
  );
  return findByUserId(userId);
}

async function list({ status, limit, offset }) {
  const params = { limit, offset };
  const filters = [];
  if (status) {
    filters.push('op.status = :status');
    params.status = status;
  }

  return query(
    `SELECT op.*, u.name, u.email, u.phone, p.name AS plan_name
     FROM organizer_profiles op
     JOIN users u ON u.id = op.user_id
     LEFT JOIN plans p ON p.id = op.plan_id
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY op.created_at DESC
     LIMIT :limit OFFSET :offset`,
    params
  );
}

async function review(userId, data) {
  await query(
    `UPDATE organizer_profiles
     SET status = :status,
         admin_notes = :admin_notes,
         reviewed_by = :reviewed_by,
         reviewed_at = CURRENT_TIMESTAMP
     WHERE user_id = :userId`,
    {
      userId,
      status: data.status,
      admin_notes: data.admin_notes || null,
      reviewed_by: data.reviewed_by || null
    }
  );
  return findByUserId(userId);
}

async function upsertBankAccount(userId, data) {
  const existing = await query(
    'SELECT id FROM organizer_bank_accounts WHERE user_id = :userId AND is_primary = TRUE LIMIT 1',
    { userId }
  );

  if (existing[0]) {
    await query(
      `UPDATE organizer_bank_accounts
       SET bank_name = :bank_name,
           branch_name = :branch_name,
           account_name = :account_name,
           account_number = :account_number
       WHERE id = :id`,
      {
        id: existing[0].id,
        bank_name: data.bank_name,
        branch_name: data.branch_name || null,
        account_name: data.account_name,
        account_number: data.account_number
      }
    );
  } else {
    await query(
      `INSERT INTO organizer_bank_accounts
        (user_id, bank_name, branch_name, account_name, account_number, is_primary)
       VALUES
        (:userId, :bank_name, :branch_name, :account_name, :account_number, TRUE)`,
      {
        userId,
        bank_name: data.bank_name,
        branch_name: data.branch_name || null,
        account_name: data.account_name,
        account_number: data.account_number
      }
    );
  }

  return listBankAccounts(userId);
}

async function listBankAccounts(userId) {
  return query(
    `SELECT id, bank_name, branch_name, account_name, account_number, is_primary, verified, created_at
     FROM organizer_bank_accounts
     WHERE user_id = :userId
     ORDER BY is_primary DESC, created_at DESC`,
    { userId }
  );
}

module.exports = {
  createProfile,
  findByUserId,
  updateProfile,
  list,
  review,
  upsertBankAccount,
  listBankAccounts
};
