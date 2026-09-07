# Narok Car Hire — MVP

A car hire marketplace: renters browse and book vehicles, owners list their
own vehicles, and renters can pay a deposit directly through M-Pesa.

- `backend/` — Express API. Storage automatically switches between a local
  JSON-file store (zero setup) and Postgres, based on whether `DATABASE_URL`
  is set.
- `frontend/` — React (Vite) app, wired to the backend's real API.

## Run it locally (JSON storage, no database needed)

Open two terminals.

**Terminal 1 — backend**
```
cd backend
npm install
npm start
```
Runs on http://localhost:4000. Vehicle and booking data live in
`backend/data/*.json`.

**Terminal 2 — frontend**
```
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173 and talks to the backend automatically.

## Switching to a real database (Postgres)

The JSON files are fine for testing, but aren't safe once more than one
person can write to them at once. To switch to Postgres:

1. Get a Postgres database. Easiest options with free tiers: [Neon](https://neon.tech),
   [Supabase](https://supabase.com), or [Railway](https://railway.app). Each
   gives you a connection string like
   `postgresql://user:password@host:5432/dbname`.
2. Load the schema (creates the tables and seeds the 8 starter vehicles):
   ```
   cd backend
   psql "YOUR_CONNECTION_STRING" -f data-access/schema.sql
   ```
3. Copy `backend/.env.example` to `backend/.env` and set:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```
4. Restart the backend (`npm start`). The startup log will print
   `Data store: Postgres (DATABASE_URL is set)` to confirm the switch.

Nothing else changes — the API endpoints and the frontend work exactly the
same either way. This was tested end-to-end against a real Postgres database
before being handed to you.

## Connecting M-Pesa (Daraja STK Push)

This lets a renter pay a deposit directly from the app — Safaricom sends a
payment prompt to their phone.

1. **Get sandbox credentials.** Create an account at
   [developer.safaricom.co.ke](https://developer.safaricom.co.ke), create a
   new sandbox app, and note your **Consumer Key** and **Consumer Secret**.
   The shared sandbox shortcode is `174379` — the matching **Passkey** is on
   your app's dashboard.
2. **Expose a public callback URL.** Safaricom needs to reach your server
   over the internet to tell you whether a payment succeeded — it cannot
   call `localhost`. While developing, use [ngrok](https://ngrok.com):
   ```
   ngrok http 4000
   ```
   This gives you a URL like `https://abcd1234.ngrok-free.app`. Your
   callback URL is that plus `/api/mpesa/callback`.
3. **Fill in `backend/.env`** (copy from `.env.example` if you haven't):
   ```
   MPESA_ENV=sandbox
   MPESA_CONSUMER_KEY=your_key
   MPESA_CONSUMER_SECRET=your_secret
   MPESA_SHORTCODE=174379
   MPESA_PASSKEY=your_passkey
   MPESA_CALLBACK_URL=https://abcd1234.ngrok-free.app/api/mpesa/callback
   ```
4. **Restart the backend.** On the booking confirmation screen in the app,
   enter a real Safaricom number you own under "Pay deposit with M-Pesa" —
   in sandbox mode you'll actually receive the STK prompt on your phone.
5. **Go live later:** once Safaricom approves your production app, set
   `MPESA_ENV=production`, use your real (not sandbox) shortcode and
   passkey, and point `MPESA_CALLBACK_URL` at your real deployed domain
   (must be HTTPS).

The STK Push and callback logic is in `backend/mpesa.js` and the two routes
in `backend/server.js` (`/api/mpesa/pay` and `/api/mpesa/callback`). A
booking's `status` field moves from `requested` → `payment_pending` →
`paid` (or `payment_failed`) as this happens.

## API endpoints (backend)

- `GET  /api/vehicles` — list vehicles, optional `?type=` filter
- `POST /api/vehicles` — owner lists a new vehicle
- `GET  /api/bookings` — list all booking requests
- `POST /api/bookings` — renter requests a booking
- `POST /api/mpesa/pay` — trigger an STK Push deposit for a booking
- `POST /api/mpesa/callback` — Safaricom posts the payment result here

## Next steps toward production

1. Add basic vehicle vetting fields (driver's license, insurance) to the listing form.
2. Deploy backend to Railway/Render and frontend to Vercel/Netlify — then point `MPESA_CALLBACK_URL` and the frontend's `VITE_API_BASE` at the real deployed URLs.
3. Add simple auth so owners can see and manage only their own listings and bookings.
4. Add an STK Push status-query fallback (`/mpesa/stkpushquery/v1/query`) for cases where Safaricom's callback never arrives.
