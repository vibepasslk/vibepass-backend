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
  res.json({
    ok: true,
    service: 'vibepass-api',
    time: new Date().toISOString()
  });
}

function createApp() {
  const app = express();

  // Trust Render / proxies
  app.set('trust proxy', 1);

  // =========================
  // SECURITY HEADERS
  // =========================
  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );

  // =========================
  // CORS CONFIG (FIXED)
  // =========================
  const allowedOrigins = [
    'https://vibepass.lk',
    'https://www.vibepass.lk'
  ];

  const corsOptions = {
    origin: function (origin, callback) {
      // Allow server-to-server or mobile apps
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      console.log('❌ CORS blocked origin:', origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  // IMPORTANT: apply BEFORE routes
  app.use(cors(corsOptions));

  // IMPORTANT: preflight must use SAME config
  app.options('*', cors(corsOptions));

  // =========================
  // RATE LIMITING
  // =========================
  app.use(
    rateLimit({
      windowMs: env.rateLimit.windowMs || 15 * 60 * 1000,
      max: env.rateLimit.max || 200,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  // =========================
  // BODY PARSERS
  // =========================
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // =========================
  // LOGGING
  // =========================
  if (env.nodeEnv !== 'test') {
    app.use(
      morgan(env.nodeEnv === 'production' ? 'combined' : 'dev')
    );
  }

  // =========================
  // STATIC FILES
  // =========================
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // =========================
  // HEALTH CHECKS
  // =========================
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // =========================
  // API ROUTES
  // =========================
  app.use('/api', routes);

  // =========================
  // FRONTEND STATIC (OPTIONAL)
  // =========================
  if (env.frontendPath) {
    const frontendPath = path.resolve(__dirname, env.frontendPath);

    app.use(express.static(frontendPath));

    app.get('/', (_req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }

  // =========================
  // ERROR HANDLING (MUST BE LAST)
  // =========================
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
