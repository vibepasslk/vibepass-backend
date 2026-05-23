'use strict';

require('dotenv').config();

const bcrypt = require('bcrypt');
const { query, pool } = require('../config/database');

async function main() {
  const name = process.env.SUPER_ADMIN_NAME;
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!name || !email || !password || password === 'change-this-password') {
    throw new Error('Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD in .env before seeding.');
  }

  const existing = await query('SELECT id FROM users WHERE email = :email LIMIT 1', { email });
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing[0]) {
    await query(
      `UPDATE users
       SET name = :name,
           password_hash = :passwordHash,
           role = 'super_admin',
           status = 'active',
           verified = TRUE
       WHERE id = :id`,
      { id: existing[0].id, name, passwordHash }
    );
    console.log(`Updated super admin: ${email}`);
  } else {
    await query(
      `INSERT INTO users (name, email, password_hash, role, status, verified)
       VALUES (:name, :email, :passwordHash, 'super_admin', 'active', TRUE)`,
      { name, email, passwordHash }
    );
    console.log(`Created super admin: ${email}`);
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
