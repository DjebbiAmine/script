# Synergy Call Center

Intranet for call-center agents and admins: donation call scripts, objection handling and agent notes.

## Storage

**PostgreSQL** is the only database. There is no fallback: the server refuses to start when `DATABASE_URL` (or `SQL_HOST`/`SQL_DB_NAME`) is missing or the database is unreachable, and API requests fail with an error while it is down. The server creates the tables on startup and seeds an empty database with the built-in default scripts. The admin "Synchronisation & Diagnostic" tab shows the connection status.

## Run locally

**Prerequisites:** Node.js 20+ and a PostgreSQL server.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run the app: `npm run dev`

For production, run `npm run build`, then `NODE_ENV=production npm start`.

Quick PostgreSQL for development:

```sh
docker run -d --name synergy-pg -e POSTGRES_USER=synergy -e POSTGRES_PASSWORD=change-me -e POSTGRES_DB=synergy -p 5432:5432 postgres:16
```
