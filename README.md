# Synergy Call Center

Intranet for call-center agents and admins: donation call scripts, objection handling and agent notes.

## Storage

The server reads and writes data in this order:

1. **PostgreSQL** is the primary database. The server creates the tables on startup. If the database is empty, the server seeds it from `db.json` (or from the built-in defaults).
2. **Cloud Firestore** takes over automatically when PostgreSQL is unreachable. It needs a Firebase service account key.
3. **`db.json`** is a local copy of every write. The server uses it when neither database is reachable.

A backend that fails is skipped for 30 s, then retried. The admin "Synchronisation & Diagnostic" tab shows which backend is active.

## Run locally

**Prerequisites:** Node.js 20+ and a PostgreSQL server.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL` (plus the Firebase variables if you want the fallback).
3. Run the app: `npm run dev`

For production, run `npm run build`, then `NODE_ENV=production npm start`.

Quick PostgreSQL for development:

```sh
docker run -d --name synergy-pg -e POSTGRES_USER=synergy -e POSTGRES_PASSWORD=change-me -e POSTGRES_DB=synergy -p 5432:5432 postgres:16
```
