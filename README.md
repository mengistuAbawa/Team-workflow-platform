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

The root [`render.yaml`](./render.yaml) Blueprint deploys the React client and
API together on one Render web service. The app is available at `/` and its API
at `/api`. Set `DATABASE_URL` on the Render service to the Neon connection
string from the Neon dashboard; this secret is deliberately not stored in Git.
The Blueprint generates a JWT secret. Its initial service plan is free; free
services have usage and availability limits and are intended for testing, not
production. Select an appropriate paid plan before deploying production
workloads.

The service must use the repository root as its root directory so the build
can include the client and the API startup migration can read
`database/schema.sql`. The Blueprint builds the client into `client/dist` and
then starts the API.

For an existing Render service, update **Settings → Build & Deploy**:

- Clear **Root Directory** (leave it blank so it uses the repository root).
- Set **Build Command** to
  `npm --prefix client ci && VITE_API_URL=/api npm --prefix client run build && npm --prefix server ci`.
- Set **Start Command** to `npm --prefix server start`.
- In **Environment**, set `DATABASE_URL` to the Neon connection string and
  `NODE_ENV` to `production`. Keep the Neon URL on the server service only.
- Save and deploy the latest commit.

The API applies `database/schema.sql` during startup. Existing MySQL/XAMPP data
is not imported automatically; migrate and verify any production data before
switching users to the deployed application.
