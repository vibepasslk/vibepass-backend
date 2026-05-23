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

function listEnv(name, fallback) {
  const value = process.env[name] || fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const appUrl = process.env.APP_URL || (isProduction ? 'https://api.vibepass.lk' : 'http://localhost:5000');
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/vibepass';
const frontendUrls = listEnv(
  'FRONTEND_URL',
  isProduction
    ? 'https://vibepass.lk,https://www.vibepass.lk'
    : 'http://localhost:3000,http://localhost:5000,http://127.0.0.1:3000,http://127.0.0.1:5000'
);

const env = {
  nodeEnv,
  port: numberEnv('PORT', 5000),
  appUrl,
  frontendUrl: frontendUrls.join(','),
  frontendUrls,
  primaryFrontendUrl: frontendUrls[0],
  frontendPath: process.env.FRONTEND_PATH ?? (isProduction ? '' : '..'),
  rateLimit: {
    windowMs: numberEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    max: numberEnv('RATE_LIMIT_MAX', isProduction ? 200 : 300)
  },
  db: {
    databaseUrl,
    connectionLimit: numberEnv('DB_CONNECTION_LIMIT', 10),
    ssl: booleanEnv(
      'DB_SSL',
      isProduction || databaseUrl.includes('supabase.co') || databaseUrl.includes('railway.app')
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
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || `${appUrl}/api/auth/google/callback`
  }
};

function validateProductionEnv(config) {
  if (config.nodeEnv !== 'production') return;

  const required = [
    ['DATABASE_URL', process.env.DATABASE_URL],
    ['JWT_SECRET', process.env.JWT_SECRET],
    ['FRONTEND_URL', process.env.FRONTEND_URL]
  ];

  const missing = required
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  if (config.jwt.secret === 'development-only-change-me' || config.jwt.secret.length < 32) {
    throw new Error('JWT_SECRET must be a long random value in production.');
  }
}

validateProductionEnv(env);

module.exports = { env };
