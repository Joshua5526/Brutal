# BRUTAL — functional auth setup

## Recommended deployment
Run the Node server in `backend/`. It now serves the frontend too, so the website and `/api` use the same origin.

1. Create/configure PostgreSQL database `brutal`.
2. Put your real PostgreSQL password and a long random `SESSION_SECRET` in `backend/.env`.
3. From `backend/`, run `npm install` and `npm start`.
4. Open the Node server URL in the browser. Do not open the HTML files directly from `file://`.

The server automatically creates the PostgreSQL session table.

## Important
If the frontend is deployed separately, set `FRONTEND_ORIGIN` on the backend and set `window.BRUTAL_API_URL` before `auth.js` loads. Same-origin deployment is simpler because authentication cookies do not need cross-site configuration.
