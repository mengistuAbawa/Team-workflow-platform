# TeamFlow

## Local setup

1. Install PostgreSQL and create the application database:

   ```sql
   CREATE DATABASE teamflow_db;
   ```

2. Copy `server/.env.example` to `server/.env` and set the PostgreSQL
   connection details. The local development password requested for this setup
   is `1234`.
3. Install and start the API:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

   On startup, the API applies the idempotent PostgreSQL schema in
   `database/schema.sql`.
4. Install and start the client in another terminal:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

The client uses `http://localhost:5000/api` by default. Keep `server/.env`
local; it is excluded from version control.

## Deploying to Render

The root [`render.yaml`](./render.yaml) Blueprint defines the API and static
client. In Render, create or sync the Blueprint, then set `DATABASE_URL` on the
API service to the Neon connection string from the Neon dashboard. This value
is a secret and is deliberately not stored in Git. The Blueprint generates a
JWT secret. Its initial service plan is free; free services have usage and
availability limits and are intended for testing, not production. Select an
appropriate paid plan before deploying production workloads.

The API service runs from the repository root so its startup migration can read
`database/schema.sql`; the client remains rooted in `client/`.

For an existing Render service, open **Environment** for `teamflow-api`, set
`DATABASE_URL` to the Neon connection string, and choose **Save, rebuild, and
deploy**. Keep the Neon URL in the API environment only, not in a client
variable.

The API applies `database/schema.sql` during startup. Existing MySQL/XAMPP data
is not imported automatically; migrate and verify any production data before
switching users to the deployed application.
