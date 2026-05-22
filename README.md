# VibePass.lk Backend

Node.js, Express, MySQL, and JWT REST API for VibePass.lk.

## Local Setup

```bash
npm install
cp .env.example .env
npm run seed:admin
npm start
```

The API listens on `PORT` and exposes routes under `/api`.

## Render

Use the included `render.yaml`, or configure manually:

```text
Build command: npm install
Start command: npm start
Health check path: /health
```

Add the environment variables from `.env.example` in Render before deploying.
