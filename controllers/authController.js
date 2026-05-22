'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');
const OrganizerModel = require('../models/OrganizerModel');
const AuditLogModel = require('../models/AuditLogModel');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const { signAccessToken } = require('../middleware/auth');
const { env } = require('../config/env');

const PUBLIC_ROLES = ['customer', 'organizer'];

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

const register = asyncHandler(async (req, res) => {
  const role = PUBLIC_ROLES.includes(req.body.role) ? req.body.role : 'customer';
  const existing = await UserModel.findByEmail(req.body.email);
  if (existing) throw new ApiError(409, 'An account already exists for this email');

  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await UserModel.create({
    name: req.body.name || `${req.body.first_name || ''} ${req.body.last_name || ''}`.trim(),
    email: req.body.email,
    password_hash: passwordHash,
    phone: req.body.phone,
    role,
    status: 'active',
    verified: false
  });

  let organizer = null;
  if (role === 'organizer') {
    organizer = await OrganizerModel.createProfile({
      user_id: user.id,
      organizer_type: req.body.organizer_type,
      organization_name: req.body.organization_name,
      status: 'pending'
    });
  }

  await AuditLogModel.record({
    actor_id: user.id,
    action: 'auth.register',
    entity_type: 'user',
    entity_id: user.id,
    ip_address: req.ip
  });

  created(res, {
    token: signAccessToken(user),
    user: sanitizeUser(user),
    organizer
  }, 'Account created');
});

const login = asyncHandler(async (req, res) => {
  const user = await UserModel.findByEmail(req.body.email);
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const matches = await bcrypt.compare(req.body.password, user.password_hash);
  if (!matches) throw new ApiError(401, 'Invalid email or password');
  if (['suspended', 'banned'].includes(user.status)) throw new ApiError(403, 'Account is restricted');

  await UserModel.touchLastLogin(user.id);
  await AuditLogModel.record({
    actor_id: user.id,
    action: 'auth.login',
    entity_type: 'user',
    entity_id: user.id,
    ip_address: req.ip
  });

  ok(res, {
    token: signAccessToken(user),
    user: sanitizeUser(user)
  }, 'Signed in');
});

const me = asyncHandler(async (req, res) => {
  let organizer = null;
  if (req.user.role === 'organizer') {
    organizer = await OrganizerModel.findByUserId(req.user.id);
  }
  ok(res, { user: sanitizeUser(req.user), organizer });
});

const forgotPassword = asyncHandler(async (_req, res) => {
  ok(res, null, 'If the email exists, password reset instructions will be sent.');
});

const verify2fa = asyncHandler(async (_req, res) => {
  ok(res, { verified: true }, '2FA verification endpoint ready');
});

function isGoogleConfigured() {
  return Boolean(env.google.clientId && env.google.clientSecret && env.google.callbackUrl);
}

function oauthFrontendRedirect(params) {
  const url = new URL('/pages/login.html', env.primaryFrontendUrl || 'http://localhost:5000');
  url.hash = new URLSearchParams(params).toString();
  return url.toString();
}

function oauthCookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000
  };
}

function oauthClearCookieOptions() {
  const { maxAge, ...options } = oauthCookieOptions();
  return options;
}

function readCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim().split('='))
    .find(([key]) => key === name)?.[1];
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, payload.error_description || payload.error || 'Google OAuth request failed');
  }
  return payload;
}

const googleLogin = asyncHandler(async (_req, res) => {
  if (!isGoogleConfigured()) {
    throw new ApiError(503, 'Google OAuth is not configured');
  }

  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: env.google.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state
  });

  res.cookie('vp_oauth_state', state, oauthCookieOptions());
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

const googleCallback = asyncHandler(async (req, res) => {
  if (req.query.error) {
    return res.redirect(oauthFrontendRedirect({ error: req.query.error }));
  }

  if (!req.query.code) {
    throw new ApiError(400, 'Google authorization code is required');
  }

  if (!req.query.state || readCookie(req, 'vp_oauth_state') !== req.query.state) {
    throw new ApiError(400, 'Invalid Google OAuth state');
  }
  res.clearCookie('vp_oauth_state', oauthClearCookieOptions());

  if (!isGoogleConfigured()) {
    throw new ApiError(503, 'Google OAuth is not configured');
  }

  const tokenPayload = await fetchJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: req.query.code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: env.google.callbackUrl,
      grant_type: 'authorization_code'
    })
  });

  const profile = await fetchJson('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
  });

  if (!profile.email || profile.email_verified === false) {
    throw new ApiError(401, 'Google account email must be verified');
  }

  const email = profile.email.toLowerCase();
  let user = await UserModel.findByEmail(email);
  let action = 'auth.google.login';

  if (!user) {
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 12);
    user = await UserModel.create({
      name: profile.name || email,
      email,
      password_hash: passwordHash,
      phone: null,
      role: 'customer',
      status: 'active',
      verified: true
    });
    action = 'auth.google.register';
  } else if (['suspended', 'banned'].includes(user.status)) {
    throw new ApiError(403, 'Account is restricted');
  }

  await UserModel.touchLastLogin(user.id);
  await AuditLogModel.record({
    actor_id: user.id,
    action,
    entity_type: 'user',
    entity_id: user.id,
    ip_address: req.ip
  });

  const safeUser = sanitizeUser(user);
  const encodedUser = Buffer.from(JSON.stringify(safeUser)).toString('base64url');

  res.redirect(oauthFrontendRedirect({
    token: signAccessToken(user),
    user: encodedUser
  }));
});

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  verify2fa,
  googleLogin,
  googleCallback
};
