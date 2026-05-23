'use strict';

const { query } = require('../config/database');

async function create(data) {
  const result = await query(
    `INSERT INTO invitations
      (creator_id, event_id, template_id, title, guest_name, event_date, venue, message,
       share_link, rsvp_enabled, status)
     VALUES
      (:creator_id, :event_id, :template_id, :title, :guest_name, :event_date, :venue, :message,
       :share_link, :rsvp_enabled, :status)
     RETURNING id`,
    {
      creator_id: data.creator_id,
      event_id: data.event_id || null,
      template_id: data.template_id || null,
      title: data.title,
      guest_name: data.guest_name || null,
      event_date: data.event_date || null,
      venue: data.venue || null,
      message: data.message || null,
      share_link: data.share_link,
      rsvp_enabled: data.rsvp_enabled !== false,
      status: data.status || 'published'
    }
  );
  return findById(result.insertId);
}

async function findById(id) {
  const rows = await query('SELECT * FROM invitations WHERE id = :id LIMIT 1', { id });
  return rows[0] || null;
}

async function findByShareLink(shareLink) {
  const rows = await query(
    `SELECT i.*, u.name AS creator_name
     FROM invitations i
     JOIN users u ON u.id = i.creator_id
     WHERE i.share_link = :shareLink
     LIMIT 1`,
    { shareLink }
  );
  return rows[0] || null;
}

async function listForUser(userId) {
  return query(
    `SELECT i.*,
            SUM(CASE WHEN r.status = 'attending' THEN 1 ELSE 0 END) AS attending_count,
            COUNT(r.id) AS rsvp_count
     FROM invitations i
     LEFT JOIN invitation_rsvps r ON r.invitation_id = i.id
     WHERE i.creator_id = :userId
     GROUP BY i.id
     ORDER BY i.created_at DESC`,
    { userId }
  );
}

async function createRsvp(data) {
  const result = await query(
    `INSERT INTO invitation_rsvps
      (invitation_id, guest_name, guest_email, guest_phone, status, note)
     VALUES
      (:invitation_id, :guest_name, :guest_email, :guest_phone, :status, :note)
     RETURNING id`,
    {
      invitation_id: data.invitation_id,
      guest_name: data.guest_name,
      guest_email: data.guest_email || null,
      guest_phone: data.guest_phone || null,
      status: data.status || 'attending',
      note: data.note || null
    }
  );
  return result.insertId;
}

async function listRsvps(invitationId) {
  return query(
    `SELECT *
     FROM invitation_rsvps
     WHERE invitation_id = :invitationId
     ORDER BY created_at DESC`,
    { invitationId }
  );
}

module.exports = {
  create,
  findById,
  findByShareLink,
  listForUser,
  createRsvp,
  listRsvps
};
