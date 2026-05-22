'use strict';

const EventModel = require('../models/EventModel');
const TicketModel = require('../models/TicketModel');
const AuditLogModel = require('../models/AuditLogModel');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const { getPagination } = require('../utils/pagination');
const slugify = require('../utils/slugify');

const listPublic = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const events = await EventModel.listPublished({
    category: req.query.category,
    q: req.query.q,
    ...pagination
  });
  ok(res, { events, pagination });
});

const detail = asyncHandler(async (req, res) => {
  const event = Number(req.params.id)
    ? await EventModel.findById(req.params.id)
    : await EventModel.findBySlug(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  const tickets = await TicketModel.findByEvent(event.id);
  ok(res, { event, tickets });
});

const create = asyncHandler(async (req, res) => {
  const slug = `${slugify(req.body.title)}-${Date.now().toString(36)}`;
  const event = await EventModel.create({
    organizer_id: req.user.id,
    slug,
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    venue: req.body.venue,
    map_location: req.body.map_location,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
    seating_enabled: req.body.seating_enabled,
    visibility: req.body.visibility,
    rules: req.body.rules,
    event_terms: req.body.event_terms,
    platform_terms_accepted: req.body.platform_terms_accepted,
    cover_image: req.file ? `/uploads/${req.file.filename}` : req.body.cover_image
  });

  if (Array.isArray(req.body.tickets)) {
    await TicketModel.createMany(event.id, req.body.tickets);
  }

  await AuditLogModel.record({
    actor_id: req.user.id,
    action: 'event.create',
    entity_type: 'event',
    entity_id: event.id,
    ip_address: req.ip
  });

  created(res, { event }, 'Event created');
});

const update = asyncHandler(async (req, res) => {
  const event = await EventModel.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.organizer_id !== req.user.id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'You can only edit your own events');
  }

  const updated = await EventModel.update(event.id, {
    ...req.body,
    cover_image: req.file ? `/uploads/${req.file.filename}` : req.body.cover_image
  });

  ok(res, { event: updated }, 'Event updated');
});

const submitForReview = asyncHandler(async (req, res) => {
  const event = await EventModel.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.organizer_id !== req.user.id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'You can only submit your own events');
  }
  const updated = await EventModel.setStatus(event.id, 'under_review');
  ok(res, { event: updated }, 'Event submitted for review');
});

const organizerEvents = asyncHandler(async (req, res) => {
  ok(res, { events: await EventModel.listForOrganizer(req.user.id) });
});

const adminEvents = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const events = await EventModel.listForAdmin({ status: req.query.status, ...pagination });
  ok(res, { events, pagination });
});

const adminReview = asyncHandler(async (req, res) => {
  const allowed = ['corrections_required', 'approved', 'published', 'rejected', 'cancelled', 'completed'];
  if (!allowed.includes(req.body.status)) throw new ApiError(400, 'Invalid event status');
  const event = await EventModel.setStatus(req.params.id, req.body.status, req.body.review_notes);
  await AuditLogModel.record({
    actor_id: req.user.id,
    action: 'event.review',
    entity_type: 'event',
    entity_id: event.id,
    metadata: { status: req.body.status },
    ip_address: req.ip
  });
  ok(res, { event }, 'Event review saved');
});

const remove = asyncHandler(async (req, res) => {
  const event = await EventModel.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.organizer_id !== req.user.id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'You can only delete your own events');
  }
  await EventModel.softDelete(event.id);
  ok(res, null, 'Event deleted');
});

module.exports = {
  listPublic,
  detail,
  create,
  update,
  submitForReview,
  organizerEvents,
  adminEvents,
  adminReview,
  remove
};
