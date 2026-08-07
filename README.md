# Tripnix

A trip-planning app with a **Flutter frontend** and a **Node.js/Express backend**.

```
Tripnix/
├── frontend/   # Flutter app (Android, iOS, Web)
└── backend/    # Node.js + Express REST API
```

## Getting started

### 1. Backend (start this first)

```bash
cd backend
npm install
npm start        # or: npm run dev  (auto-restarts on file changes)
```

The API runs at `http://localhost:3000`.

| Method | Endpoint          | Description        |
|--------|-------------------|--------------------|
| GET    | `/`               | Health check       |
| GET    | `/api/trips`      | List all trips     |
| GET    | `/api/trips/:id`  | Get one trip       |
| POST   | `/api/trips`      | Create a trip      |
| DELETE | `/api/trips/:id`  | Delete a trip      |

> Data is stored in memory for now — swap `backend/src/routes/trips.js` for a real database when ready.

### 2. Frontend

```bash
cd frontend
flutter pub get
flutter run              # pick a device, or:
flutter run -d chrome    # run in the browser
```

The app resolves the backend automatically (see `frontend/lib/config/app_config.dart`):

- **Deployed web build** → the origin it is served from, so `/api` is same-origin
- **`flutter run -d chrome`** → `http://localhost:3000`
- **Anything else** → `http://localhost:3000`

An Android emulator reaches the host machine as `10.0.2.2`, and a phone on the
same Wi-Fi needs the machine's LAN address, so those builds have to name the
backend explicitly:

```bash
flutter run --dart-define=API_ORIGIN=http://10.0.2.2:3000
flutter build web --dart-define=API_ORIGIN=https://api.example.com
```

### 3. Admin Portal (Travels Owner Web Portal)

```bash
cd admin
npm install
npm run dev
```

The Admin Portal runs at `http://localhost:3005`.


## Configuration

`backend/.env` holds the Firebase and Cloudflare R2 credentials — copy
`backend/.env.example` and fill it in. It is loaded from `backend/.env`
regardless of the directory the server is started from.

`GET /api/auth/health` reports exactly what is wired up. Until it answers
`"mode": "firebase"` the API runs on an **in-memory store**: accounts are not
saved and sign-in does not check passwords against the real database.

```bash
curl http://localhost:3000/api/auth/health
```

## Deploying to Vercel

`vercel.json` builds the Flutter app, the admin portal and the shared images
into `dist/`, and deploys `api/index.js` — the whole Express app — as a single
serverless function behind `/api/*`.

`backend/.env` and `backend/serviceAccountKey.json` are deliberately not
committed, so the same values have to be set as **Environment Variables** in the
Vercel project (Settings → Environment Variables), for Production *and*
Preview:

| Variable | Where it comes from |
|----------|---------------------|
| `FIREBASE_PROJECT_ID` | Firebase → Project settings → General |
| `FIREBASE_WEB_API_KEY` | Firebase → Project settings → General → Web API Key |
| `FIREBASE_DATABASE_URL` | Firebase → Build → Realtime Database (exact instance URL, including region) |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from the service account JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` from the same JSON — keep the surrounding quotes and the literal `\n` escapes |
| `R2_*` | Only needed for image and video uploads |

Redeploy after changing them: environment variables are baked in at deploy time.

To check a deployment, open `https://<your-site>/api/auth/health`. Any failure
inside the function now comes back as JSON rather than an HTML error page; set
`DEBUG_API_ERRORS=1` in the Vercel environment to include the stack trace while
diagnosing one.

## Project layout

**Frontend** (`frontend/lib/`)
- `main.dart` — app entry point & theme
- `models/trip.dart` — Trip data model
- `services/api_service.dart` — HTTP client for the backend
- `screens/trips_screen.dart` — trip list + add/delete UI

**Backend** (`backend/src/`)
- `index.js` — Express server setup
- `routes/trips.js` — trip endpoints
