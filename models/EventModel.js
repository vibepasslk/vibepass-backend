'use strict';

const { query } = require('../config/database');

async function create(data) {
  const result = await query(
    `INSERT INTO events
      (organizer_id, slug, title, description, category, venue, map_location, start_date, end_date,
       seating_enabled, visibility, rules, event_terms, status, cover_image, platform_terms_accepted)
     VALUES
      (:organizer_id, :slug, :title, :description, :category, :venue, :map_location, :start_date, :end_date,
       :seating_enabled, :visibility, :rules, :event_terms, :status, :cover_image, :platform_terms_accepted)
     RETURNING id`,
    {
      organizer_id: data.organizer_id,
      slug: data.slug,
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      venue: data.venue || null,
      map_location: data.map_location || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      seating_enabled: Boolean(data.seating_enabled),
      visibility: data.visibility || 'public',
      rules: data.rules || null,
      event_terms: data.event_terms || null,
      status: data.status || 'draft',
      cover_image: data.cover_image || null,
      platform_terms_accepted: Boolean(data.platform_terms_accepted)
    }
  );
  return findById(result.insertId);
}

async function findById(id) {
  const rows = await query(
    `SELECT e.*, u.name AS organizer_name, op.organization_name
     FROM events e
     JOIN users u ON u.id = e.organizer_id
     LEFT JOIN organizer_profiles op ON op.user_id = e.organizer_id
     WHERE e.id = :id AND e.deleted_at IS NULL
     LIMIT 1`,
    { id }
  );
  return rows[0] || null;
}

async function findBySlug(slug) {
  const rows = await query(
    `SELECT e.*, u.name AS organizer_name, op.organization_name
     FROM events e
     JOIN users u ON u.id = e.organizer_id
     LEFT JOIN organizer_profiles op ON op.user_id = e.organizer_id
     WHERE e.slug = :slug AND e.deleted_at IS NULL
     LIMIT 1`,
    { slug }
  );
  return rows[0] || null;
}

async function listPublished({ category, q, limit, offset }) {
  const filters = ["e.status = 'published'", "e.visibility = 'public'", 'e.deleted_at IS NULL'];
  const params = { limit, offset };

  if (category) {
    filters.push('e.category = :category');
    params.category = category;
  }
  if (q) {
    filters.push('(e.title ILIKE :q OR e.venue ILIKE :q OR e.description ILIKE :q)');
    params.q = `%${q}%`;
  }

  return query(
    `SELECT e.id, e.slug, e.title, e.description, e.category, e.venue, e.start_date, e.cover_image,
            u.name AS organizer_name,
            MIN(tt.price) AS min_price,
            SUM(tt.quantity_total - tt.quantity_sold) AS available_tickets
     FROM events e
     JOIN users u ON u.id = e.organizer_id
     LEFT JOIN ticket_types tt ON tt.event_id = e.id
     WHERE ${filters.join(' AND ')}
     GROUP BY e.id, u.name
     ORDER BY e.start_date ASC
     LIMIT :limit OFFSET :offset`,
    params
  );
}

async function listForOrganizer(organizerId) {
  return query(
    `SELECT e.*,
            COALESCE(SUM(tt.quantity_sold), 0) AS tickets_sold,
            COALESCE(SUM(tt.quantity_sold * tt.price), 0) AS gross_sales
     FROM events e
     LEFT JOIN ticket_types tt ON tt.event_id = e.id
     WHERE e.organizer_id = :organizerId AND e.deleted_at IS NULL
     GROUP BY e.id
     ORDER BY e.created_at DESC`,
    { organizerId }
  );
}

async function listForAdmin({ status, limit, offset }) {
  const params = { limit, offset };
  const filters = ['e.deleted_at IS NULL'];
  if (status) {
    filters.push('e.status = :status');
    params.status = status;
  }

  return query(
    `SELECT e.*, u.name AS organizer_name, u.email AS organizer_email
     FROM events e
     JOIN users u ON u.id = e.organizer_id
     WHERE ${filters.join(' AND ')}
     ORDER BY e.created_at DESC
     LIMIT :limit OFFSET :offset`,
    params
  );
}

async function update(id, data) {
  await query(
    `UPDATE events
     SET title = COALESCE(:title, title),
         description = COALESCE(:description, description),
         category = COALESCE(:category, category),
         venue = COALESCE(:venue, venue),
         map_location = COALESCE(:map_location, map_location),
         start_date = COALESCE(:start_date, start_date),
         end_date = COALESCE(:end_date, end_date),
         seating_enabled = COALESCE(:seating_enabled, seating_enabled),
         visibility = COALESCE(:visibility, visibility),
         rules = COALESCE(:rules, rules),
         event_terms = COALESCE(:event_terms, event_terms),
         cover_image = COALESCE(:cover_image, cover_image)
     WHERE id = :id`,
    {
      id,
      title: data.title || null,
      description: data.description || null,
      category: data.category || null,
      venue: data.venue || null,
      map_location: data.map_location || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      seating_enabled: typeof data.seating_enabled === 'boolean' ? data.seating_enabled : null,
      visibility: data.visibility || null,
      rules: data.rules || null,
      event_terms: data.event_terms || null,
      cover_image: data.cover_image || null
    }
  );
  return findById(id);
}

async function setStatus(id, status, reviewNotes = null) {
  const publishedAt = status === 'published' ? 'CURRENT_TIMESTAMP' : 'published_at';
  await query(
    `UPDATE events
     SET status = :status,
         review_notes = :reviewNotes,
         published_at = ${publishedAt}
     WHERE id = :id`,
    { id, status, reviewNotes }
  );
  return findById(id);
}

async function softDelete(id) {
  await query('UPDATE events SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id', { id });
}

module.exports = {
  create,
  findById,
  findBySlug,
  listPublished,
  listForOrganizer,
  listForAdmin,
  update,
  setStatus,
  softDelete
};
