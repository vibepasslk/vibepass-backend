'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { env } = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function healthHandler(_req, res) {
  res.json({ ok: true, service: 'vibepass-api' });
}

function createApp() {
  const app = express();

  // Important for Render / proxies
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false
  }));

  // =========================
  // CORS FIX (IMPORTANT)
  // =========================
  const allowedOrigins = (env.frontendUrls || []).map(o => o.trim());

  app.use(cors({
    origin: function (origin, callback) {
      // allow Postman / mobile apps
      if (!origin) return callback(null, true);

      // allow all (dev mode)
      if (allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // allow listed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // ❌ DO NOT throw error (prevents CORS crash)
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // IMPORTANT: handle preflight requests
  app.options('*', cors());

  // =========================
  // Rate Limiting
  // =========================
  app.use(rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false
  }));

  // =========================
  // Body Parsers
  // =========================
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Logging
  if (env.nodeEnv !== 'test') {
    app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  // Static files
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Health checks
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // API routes
  app.use('/api', routes);

  // Frontend static (optional)
  if (env.frontendPath) {
    const frontendPath = path.resolve(__dirname, env.frontendPath);
    app.use(express.static(frontendPath));
    app.get('/', (_req, res) =>
      res.sendFile(path.join(frontendPath, 'index.html'))
    );
  }

  // Error handlers
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
