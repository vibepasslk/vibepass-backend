'use strict';

const mysql = require('mysql2/promise');
const { env } = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  ssl: env.db.ssl ? { rejectUnauthorized: env.db.sslRejectUnauthorized } : undefined,
  namedPlaceholders: true,
  timezone: 'Z'
});

async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function testConnection() {
  await query('SELECT 1 AS ok');
}

module.exports = {
  pool,
  query,
  transaction,
  testConnection
};
