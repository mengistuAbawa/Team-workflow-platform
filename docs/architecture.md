# Database

The API uses PostgreSQL through the `pg` Node.js driver. Connection settings are
loaded from `server/.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and
`DB_NAME`). The schema is defined in `database/schema.sql` and is applied
idempotently when the API starts. Create the configured database before
starting the API.

`server/src/config/db.js` retains the existing service-level query result shape
while using PostgreSQL connections and positional parameters internally.

## Render deployment

The root `render.yaml` declares a Render Blueprint for the API, PostgreSQL
database, and static React client. Render injects the database connection URL
and generated JWT secret; the API enables TLS for its database connection and
allows requests from the deployed client host. Local deployments can continue
to use the individual `DB_*` variables in `server/.env`.