'use strict';

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');
const UserModel = require('../models/UserModel');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next(new ApiError(401, 'Authentication required'));

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    const user = await UserModel.findById(payload.sub);
    if (!user || user.deleted_at) throw new ApiError(401, 'Invalid session');
    if (['suspended', 'banned'].includes(user.status)) {
      throw new ApiError(403, 'Account access is restricted');
    }
    req.user = user;
    next();
  } catch (error) {
    next(error.statusCode ? error : new ApiError(401, 'Invalid or expired session'));
  }
}

function authorizeRoles(...roles) {
  return function roleGuard(req, _res, next) {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to access this resource'));
    }
    next();
  };
}

module.exports = {
  signAccessToken,
  requireAuth,
  authorizeRoles
};
