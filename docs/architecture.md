# Database

The API uses PostgreSQL through the `pg` Node.js driver. Connection settings are
loaded from `server/.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and
`DB_NAME`). The schema is defined in `database/schema.sql` and is applied
idempotently when the API starts. Create the configured database before
starting the API.

`server/src/config/db.js` retains the existing service-level query result shape
while using PostgreSQL connections and positional parameters internally.

## Render deployment

The root `render.yaml` declares a Render Blueprint that builds the React client
and serves it from the API service on the same origin (`/`, with API routes
under `/api`). Configure the Neon `DATABASE_URL` as a secret on the Render
service; the Blueprint generates a JWT secret. The service root must be the
repository root so the client build and database migration can access their
files. Local deployments can continue to use the individual `DB_*` variables
in `server/.env`.