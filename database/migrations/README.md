# Database Migrations

This folder is the migration-ready path for production PostgreSQL database changes.

- `001_initial_schema.sql` mirrors the current Supabase PostgreSQL schema.
- Add future changes as sequential files, for example `002_add_google_profile_fields.sql`.
- Apply migrations to staging first, then production.
- Keep destructive changes reversible with a backup or rollback script.
