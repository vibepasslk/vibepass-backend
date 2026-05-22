'use strict';

const InvitationModel = require('../models/InvitationModel');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const slugify = require('../utils/slugify');

const create = asyncHandler(async (req, res) => {
  const shareLink = `${slugify(req.body.title || 'invite')}-${Date.now().toString(36)}`;
  const invitation = await InvitationModel.create({
    creator_id: req.user.id,
    event_id: req.body.event_id,
    template_id: req.body.template_id,
    title: req.body.title,
    guest_name: req.body.guest_name,
    event_date: req.body.event_date,
    venue: req.body.venue,
    message: req.body.message,
    share_link: shareLink,
    rsvp_enabled: req.body.rsvp_enabled
  });
  created(res, { invitation }, 'Invitation created');
});

const mine = asyncHandler(async (req, res) => {
  ok(res, { invitations: await InvitationModel.listForUser(req.user.id) });
});

const publicDetail = asyncHandler(async (req, res) => {
  const invitation = await InvitationModel.findByShareLink(req.params.shareLink);
  if (!invitation) throw new ApiError(404, 'Invitation not found');
  ok(res, { invitation });
});

const rsvp = asyncHandler(async (req, res) => {
  const invitation = await InvitationModel.findByShareLink(req.params.shareLink);
  if (!invitation) throw new ApiError(404, 'Invitation not found');
  if (!invitation.rsvp_enabled) throw new ApiError(400, 'RSVP is not enabled for this invitation');
  const rsvpId = await InvitationModel.createRsvp({
    invitation_id: invitation.id,
    guest_name: req.body.guest_name,
    guest_email: req.body.guest_email,
    guest_phone: req.body.guest_phone,
    status: req.body.status,
    note: req.body.note
  });
  created(res, { rsvp_id: rsvpId }, 'RSVP saved');
});

const rsvps = asyncHandler(async (req, res) => {
  const invitation = await InvitationModel.findById(req.params.id);
  if (!invitation) throw new ApiError(404, 'Invitation not found');
  if (invitation.creator_id !== req.user.id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'You can only view RSVPs for your own invitations');
  }
  ok(res, { rsvps: await InvitationModel.listRsvps(invitation.id) });
});

module.exports = {
  create,
  mine,
  publicDetail,
  rsvp,
  rsvps
};
