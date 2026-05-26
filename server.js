'use strict';

const { createApp } = require('./app');
const { env } = require('./config/env');
const { testConnection } = require('./config/database');

async function start() {
  const app = createApp();

  // ---------------------------
  // SAFE ENV HANDLING
  // ---------------------------
  const PORT = env.port || process.env.PORT || 5000;

  const APP_URL = process.env.APP_URL || null;
  const API_URL = process.env.API_URL || null;

  if (!APP_URL && !API_URL) {
    console.warn('⚠️ Warning: APP_URL / API_URL not set. Using fallback mode.');
  }

  // ---------------------------
  // DATABASE CHECK (NON-BLOCKING)
  // ---------------------------
  try {
    await testConnection();
    console.log('✅ PostgreSQL connection ready');
  } catch (error) {
    console.warn('⚠️ PostgreSQL connection failed:', error.message);
    console.warn('Server will continue running without DB connection.');
  }

  // ---------------------------
  // START SERVER (NEVER CRASH)
  // ---------------------------
  app.listen(PORT, () => {
    console.log(`🚀 VibePass API running on port ${PORT}`);

    if (API_URL) {
      console.log(`🌐 API_URL: ${API_URL}`);
    }

    if (APP_URL) {
      console.log(`🌍 APP_URL: ${APP_URL}`);
    }
  });
}

// ---------------------------
// GLOBAL SAFETY NET
// ---------------------------
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

start();
