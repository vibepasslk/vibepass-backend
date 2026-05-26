'use strict';

require('dotenv').config();

function numberEnv(name, fallback) {
  const value = process.env[name];
  return value ? Number(value) : fallback;
}

function booleanEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function listEnv(name, fallback = '') {
  const value = process.env[name] || fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const appUrl =
  process.env.APP_URL ||
  process.env.API_URL ||
  (isProduction ? '' : 'http://localhost:5000');

const databaseUrl =
  process.env.DATABASE_URL || process.env.DB_URL || '';

/* =========================
   FRONTEND URLS (FIXED)
========================= */
const frontendUrls = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

/* =========================
   ENV CONFIG
========================= */
const env = {
  nodeEnv,

  port: numberEnv('PORT', 5000),

  appUrl,

  frontendUrls,

  frontendPath: process.env.FRONTEND_PATH ?? (isProduction ? '' : '../frontend'),

  rateLimit: {
    windowMs: numberEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    max: numberEnv('RATE_LIMIT_MAX', isProduction ? 200 : 300)
  },

  db: {
    databaseUrl,
    connectionLimit: numberEnv('DB_CONNECTION_LIMIT', 10),
    ssl: booleanEnv(
      'DB_SSL',
      isProduction ||
        databaseUrl.includes('supabase.co') ||
        databaseUrl.includes('railway.app')
    ),
    sslRejectUnauthorized: booleanEnv('DB_SSL_REJECT_UNAUTHORIZED', false)
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'development-only-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  uploads: {
    maxMb: numberEnv('UPLOAD_MAX_MB', 8)
  },

  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    env: process.env.PAYPAL_ENV || 'sandbox',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || ''
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      `${appUrl}/api/auth/google/callback`
  }
};

/* =========================
   VALIDATION (PRODUCTION)
========================= */
function validateProductionEnv(config) {
  if (config.nodeEnv !== 'production') return;

  const missing = [];

  if (!config.db.databaseUrl) missing.push('DATABASE_URL or DB_URL');
  if (!config.appUrl) missing.push('APP_URL or API_URL');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.FRONTEND_URL) missing.push('FRONTEND_URL');

  if (missing.length) {
    console.error('❌ Missing env vars:', missing);
    process.exit(1);
  }

  if (
    config.jwt.secret === 'development-only-change-me' ||
    config.jwt.secret.length < 32
  ) {
    throw new Error('JWT_SECRET must be a long secure value in production.');
  }
}

validateProductionEnv(env);

module.exports = { env };
