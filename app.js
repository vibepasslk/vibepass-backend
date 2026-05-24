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

function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  if (env.frontendUrls.includes('*') || env.frontendUrls.includes(origin)) {
    return callback(null, true);
  }
  const error = new Error(`CORS blocked for origin: ${origin}`);
  error.statusCode = 403;
  return callback(error);
}

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false
  }));

  app.use(cors({
    origin: corsOrigin,
    credentials: true
  }));

  app.use(rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  if (env.nodeEnv !== 'test') {
    app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);
  app.use('/api', routes);

  if (env.frontendPath) {
    const frontendPath = path.resolve(__dirname, env.frontendPath);
    app.use(express.static(frontendPath));
    app.get('/', (_req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
