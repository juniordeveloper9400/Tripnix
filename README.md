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

The app calls the backend automatically:
- **Web / desktop** → `http://localhost:3000`
- **Android emulator** → `http://10.0.2.2:3000`

(See `frontend/lib/services/api_service.dart`.)

### 3. Admin Portal (Travels Owner Web Portal)

```bash
cd admin
npm install
npm run dev
```

The Admin Portal runs at `http://localhost:3005`.


## Project layout

**Frontend** (`frontend/lib/`)
- `main.dart` — app entry point & theme
- `models/trip.dart` — Trip data model
- `services/api_service.dart` — HTTP client for the backend
- `screens/trips_screen.dart` — trip list + add/delete UI

**Backend** (`backend/src/`)
- `index.js` — Express server setup
- `routes/trips.js` — trip endpoints
