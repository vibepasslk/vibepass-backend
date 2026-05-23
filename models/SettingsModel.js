'use strict';

const { query } = require('../config/database');

async function all() {
  return query('SELECT setting_key, setting_value, value_type FROM settings ORDER BY setting_key ASC');
}

async function get(key) {
  const rows = await query('SELECT * FROM settings WHERE setting_key = :key LIMIT 1', { key });
  return rows[0] || null;
}

async function set(key, value, type = 'string') {
  await query(
    `INSERT INTO settings (setting_key, setting_value, value_type)
     VALUES (:key, :value, :type)
     ON CONFLICT (setting_key) DO UPDATE
     SET setting_value = EXCLUDED.setting_value,
         value_type = EXCLUDED.value_type`,
    { key, value: String(value), type }
  );
  return get(key);
}

async function asObject() {
  const rows = await all();
  return rows.reduce((settings, row) => {
    let value = row.setting_value;
    if (row.value_type === 'number') value = Number(value);
    if (row.value_type === 'boolean') value = value === 'true' || value === '1';
    settings[row.setting_key] = value;
    return settings;
  }, {});
}

module.exports = {
  all,
  get,
  set,
  asObject
};
