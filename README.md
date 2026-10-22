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

The root [`render.yaml`](./render.yaml) Blueprint defines the API, PostgreSQL
database, and static client. In Render, create a new Blueprint from this
repository and review the services before applying it. The Blueprint generates
a JWT secret and uses Render's internal PostgreSQL connection. The initial
configuration uses Render's free plans to avoid unexpected charges; those
plans have sleep, storage, and expiration limits and are intended for testing,
not production. Select appropriate paid plans before deploying production
workloads.

The API service runs from the repository root so its startup migration can read
`database/schema.sql`; the client remains rooted in `client/`.

The API applies `database/schema.sql` during startup. Existing MySQL/XAMPP data
is not imported automatically; migrate and verify any production data before
switching users to the deployed application.
