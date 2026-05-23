'use strict';

const { Pool, types } = require('pg');
const { env } = require('./env');

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

function sslConfig() {
  if (!env.db.ssl) return false;
  return { rejectUnauthorized: env.db.sslRejectUnauthorized };
}

const pool = new Pool({
  connectionString: env.db.databaseUrl,
  max: env.db.connectionLimit,
  ssl: sslConfig()
});

function bindNamedParams(sql, params = {}) {
  if (Array.isArray(params)) return { text: sql, values: params };

  const values = [];
  const positions = new Map();
  const text = sql.replace(/(^|[^:]):([A-Za-z_][A-Za-z0-9_]*)/g, (match, prefix, name) => {
    if (!Object.prototype.hasOwnProperty.call(params, name)) {
      throw new Error(`Missing SQL parameter: ${name}`);
    }

    if (!positions.has(name)) {
      values.push(params[name]);
      positions.set(name, values.length);
    }

    return `${prefix}$${positions.get(name)}`;
  });

  return { text, values };
}

function attachMysqlCompat(rows, result) {
  Object.defineProperties(rows, {
    affectedRows: { value: result.rowCount, enumerable: false },
    rowCount: { value: result.rowCount, enumerable: false },
    insertId: { value: rows[0]?.id || null, enumerable: false }
  });
  return rows;
}

async function run(client, sql, params = {}) {
  const statement = bindNamedParams(sql, params);
  const result = await client.query(statement.text, statement.values);
  return attachMysqlCompat(result.rows, result);
}

async function query(sql, params = {}) {
  return run(pool, sql, params);
}

async function transaction(callback) {
  const client = await pool.connect();
  const connection = {
    async execute(sql, params = {}) {
      const rows = await run(client, sql, params);
      return [rows];
    },
    async query(sql, params = {}) {
      return run(client, sql, params);
    }
  };

  try {
    await client.query('BEGIN');
    const result = await callback(connection);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
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
