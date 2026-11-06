# TeamFlow

## Local setup

1. Install PostgreSQL and create the application database:

   ```sql
   CREATE DATABASE teamflow_db;
   ```

2. Copy `server/.env.example` to `server/.env` and set the PostgreSQL
   connection details and a private `ADMIN_INVITE_CODE`. Keep this code
   server-side and share it only with people requesting administrator access.
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

Team members can register and sign in immediately. Public administrator
registration requires `ADMIN_INVITE_CODE` and creates a pending account;
an existing administrator must approve it from the admin user list before it
can sign in. Manager accounts are assigned by an administrator.

Administrators create and maintain team-member developer profiles from the
admin user forms. The profile stores contact and employment details, salary,
currency, and hire date, and is linked to the member's login account. These
fields are not collected during public self-registration and are available
only through administrator-protected APIs.

## Deploying to Vercel and Render

For a separate Vercel frontend and Render API, configure the Vercel project's
`VITE_API_URL` environment variable as
`https://team-workflow-platform-2ef1.onrender.com/api` for each environment
you deploy, then redeploy the frontend. The client also appends `/api` if the
variable is set to only the Render service origin.

On Render, set `CLIENT_URL` to
`https://team-workflow-platform-sslh.vercel.app` so the API allows browser
requests from the deployed frontend. The Blueprint below sets this origin.
If you use an existing Render service that is not managed by the Blueprint,
add `CLIENT_URL` manually in its Environment settings.

## Deploying the combined app to Render

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
then starts the API. The API serves the client whenever
`client/dist/index.html` exists; this does not depend on `NODE_ENV`.

For an existing Render service, update **Settings → Build & Deploy**:

- Clear **Root Directory** (leave it blank so it uses the repository root).
- Set **Build Command** to
  `npm --prefix client ci && VITE_API_URL=/api npm --prefix client run build && npm --prefix server ci`.
- Set **Start Command** to `npm --prefix server start`.
- In **Environment**, set `DATABASE_URL` to the Neon connection string and
  `NODE_ENV` to `production`. Set `CLIENT_URL` to the deployed frontend's
  origin (for example, `https://team-workflow-platform-sslh.vercel.app`).
  Keep the Neon URL on the server service only.
- Save and deploy the latest commit.

The API applies `database/schema.sql` during startup. Existing MySQL/XAMPP data
is not imported automatically; migrate and verify any production data before
switching users to the deployed application.
