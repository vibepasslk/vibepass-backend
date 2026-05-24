'use strict';

const { query } = require('../config/database');

const VALID_ROLES = ['super_admin', 'organizer', 'customer', 'staff'];

function validateRole(role) {
  const nextRole = role || 'customer';
  if (!VALID_ROLES.includes(nextRole)) {
    throw new Error(`Invalid user role: ${nextRole}`);
  }
  return nextRole;
}

async function create(data) {
  const role = validateRole(data.role);
  const result = await query(
    `INSERT INTO users
      (name, email, password_hash, phone, role, status, verified)
     VALUES
      (:name, :email, :password_hash, :phone, :role, :status, :verified)
     RETURNING id`,
    {
      name: data.name,
      email: data.email,
      password_hash: data.password_hash,
      phone: data.phone || null,
      role,
      status: data.status || 'active',
      verified: Boolean(data.verified)
    }
  );
  return findById(result.insertId);
}

async function findByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE email = :email LIMIT 1', { email });
  return rows[0] || null;
}

async function findById(id) {
  const rows = await query('SELECT * FROM users WHERE id = :id LIMIT 1', { id });
  return rows[0] || null;
}

async function list({ role, status, limit, offset }) {
  const filters = ['deleted_at IS NULL'];
  const params = { limit, offset };

  if (role) {
    filters.push('role = :role');
    params.role = role;
  }
  if (status) {
    filters.push('status = :status');
    params.status = status;
  }

  return query(
    `SELECT id, name, email, phone, role, status, verified, created_at, last_login_at
     FROM users
     WHERE ${filters.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT :limit OFFSET :offset`,
    params
  );
}

async function touchLastLogin(id) {
  await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id', { id });
}

async function updateProfile(id, data) {
  await query(
    `UPDATE users
     SET name = COALESCE(:name, name),
         phone = COALESCE(:phone, phone),
         avatar_url = COALESCE(:avatar_url, avatar_url)
     WHERE id = :id`,
    {
      id,
      name: data.name || null,
      phone: data.phone || null,
      avatar_url: data.avatar_url || null
    }
  );
  return findById(id);
}

async function updatePassword(id, passwordHash) {
  await query('UPDATE users SET password_hash = :passwordHash WHERE id = :id', { id, passwordHash });
}

async function setStatus(id, status) {
  await query('UPDATE users SET status = :status WHERE id = :id', { id, status });
  return findById(id);
}

async function countByRole() {
  return query('SELECT role, COUNT(*) AS total FROM users WHERE deleted_at IS NULL GROUP BY role');
}

module.exports = {
  create,
  VALID_ROLES,
  validateRole,
  findByEmail,
  findById,
  list,
  touchLastLogin,
  updateProfile,
  updatePassword,
  setStatus,
  countByRole
};
