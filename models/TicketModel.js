'use strict';

const { query } = require('../config/database');

async function create(data) {
  const result = await query(
    `INSERT INTO ticket_types
      (event_id, category, price, early_bird_price, early_bird_until, quantity_total,
       seats_per_ticket, ticket_image, qr_mode)
     VALUES
      (:event_id, :category, :price, :early_bird_price, :early_bird_until, :quantity_total,
       :seats_per_ticket, :ticket_image, :qr_mode)`,
    {
      event_id: data.event_id,
      category: data.category,
      price: data.price,
      early_bird_price: data.early_bird_price || null,
      early_bird_until: data.early_bird_until || null,
      quantity_total: data.quantity_total,
      seats_per_ticket: data.seats_per_ticket || 1,
      ticket_image: data.ticket_image || null,
      qr_mode: data.qr_mode || 'qr'
    }
  );
  return findById(result.insertId);
}

async function createMany(eventId, tickets = []) {
  const created = [];
  for (const ticket of tickets) {
    created.push(await create({ ...ticket, event_id: eventId }));
  }
  return created;
}

async function findById(id) {
  const rows = await query('SELECT * FROM ticket_types WHERE id = :id LIMIT 1', { id });
  return rows[0] || null;
}

async function findByEvent(eventId) {
  return query(
    `SELECT *,
            (quantity_total - quantity_sold) AS quantity_available
     FROM ticket_types
     WHERE event_id = :eventId
     ORDER BY price ASC`,
    { eventId }
  );
}

async function reserve(ticketTypeId, quantity, connection) {
  const executor = connection || { execute: query };
  const sql =
    `UPDATE ticket_types
     SET quantity_sold = quantity_sold + :quantity
     WHERE id = :ticketTypeId AND quantity_sold + :quantity <= quantity_total`;

  if (connection) {
    const [result] = await connection.execute(sql, { ticketTypeId, quantity });
    return result.affectedRows === 1;
  }

  const result = await query(sql, { ticketTypeId, quantity });
  return result.affectedRows === 1;
}

module.exports = {
  create,
  createMany,
  findById,
  findByEvent,
  reserve
};
