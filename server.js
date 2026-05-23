'use strict';

const { createApp } = require('./app');
const { env } = require('./config/env');
const { testConnection } = require('./config/database');

async function start() {
  const app = createApp();

  try {
    await testConnection();
    console.log('PostgreSQL connection ready');
  } catch (error) {
    console.warn('PostgreSQL connection failed:', error.message);
    console.warn('Server will still start so static pages and health checks can run.');
  }

  app.listen(env.port, () => {
    console.log(`VibePass API running on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start VibePass API:', error);
  process.exit(1);
});
