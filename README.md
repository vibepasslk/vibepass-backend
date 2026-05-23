# VibePass.lk Backend

Node.js, Express, Supabase PostgreSQL, and JWT REST API for VibePass.lk.

## Local Setup

```bash
npm install
cp .env.example .env
npm run seed:admin
npm start
```

The API listens on `PORT` and exposes routes under `/api`.

## Database

Set `DATABASE_URL` to the Supabase PostgreSQL connection string. Apply:

```text
database/schema.sql
database/seed.sql
```

## Railway

Use the included `railway.toml`, or configure manually:

```text
Build command: npm install
Start command: npm start
Health check path: /health
```

Add the environment variables from `.env.example` in Railway before deploying.
