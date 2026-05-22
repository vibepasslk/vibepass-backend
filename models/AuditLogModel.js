'use strict';

const { query } = require('../config/database');

async function record(data) {
  await query(
    `INSERT INTO audit_logs
      (actor_id, action, entity_type, entity_id, metadata, ip_address)
     VALUES
      (:actor_id, :action, :entity_type, :entity_id, :metadata, :ip_address)`,
    {
      actor_id: data.actor_id || null,
      action: data.action,
      entity_type: data.entity_type || null,
      entity_id: data.entity_id || null,
      metadata: JSON.stringify(data.metadata || {}),
      ip_address: data.ip_address || null
    }
  );
}

module.exports = { record };
