'use strict';

const UserModel = require('../models/UserModel');
const OrganizerModel = require('../models/OrganizerModel');
const SettingsModel = require('../models/SettingsModel');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { getPagination } = require('../utils/pagination');

const users = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  if (req.query.role && !UserModel.VALID_ROLES.includes(req.query.role)) {
    throw new ApiError(400, 'Invalid user role filter');
  }
  const rows = await UserModel.list({ role: req.query.role, status: req.query.status, ...pagination });
  ok(res, { users: rows, pagination });
});

const organizers = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const rows = await OrganizerModel.list({ status: req.query.status, ...pagination });
  ok(res, { organizers: rows, pagination });
});

const reviewOrganizer = asyncHandler(async (req, res) => {
  const allowed = ['approved', 'rejected', 'suspended', 'corrections_required', 'pending'];
  if (!allowed.includes(req.body.status)) throw new ApiError(400, 'Invalid organizer status');
  const organizer = await OrganizerModel.review(req.params.userId, {
    status: req.body.status,
    admin_notes: req.body.admin_notes,
    reviewed_by: req.user.id
  });
  ok(res, { organizer }, 'Organizer review saved');
});

const setUserStatus = asyncHandler(async (req, res) => {
  const allowed = ['active', 'pending', 'suspended', 'banned'];
  if (!allowed.includes(req.body.status)) throw new ApiError(400, 'Invalid user status');
  ok(res, { user: await UserModel.setStatus(req.params.userId, req.body.status) }, 'User status updated');
});

const settings = asyncHandler(async (_req, res) => {
  ok(res, { settings: await SettingsModel.all() });
});

const saveSetting = asyncHandler(async (req, res) => {
  const setting = await SettingsModel.set(req.body.key, req.body.value, req.body.type);
  ok(res, { setting }, 'Setting saved');
});

module.exports = {
  users,
  organizers,
  reviewOrganizer,
  setUserStatus,
  settings,
  saveSetting
};
