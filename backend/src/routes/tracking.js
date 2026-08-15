import { Router } from "express";
import { allVehicles, refreshVehiclesFromDb } from "./vehicles.js";
import { dbRef, databaseConfigured, describeDatabaseError } from "../lib/firebase.js";
import { reverseGeocode, withinSamePlace, cachedPlaceName } from "../lib/geocode.js";

const router = Router();

/// A bus counts as reporting while its last fix is recent. Beyond this it is
/// shown as out of contact rather than parked wherever it last spoke, which is
/// the difference between "here" and "here two days ago".
const STALE_AFTER_MS = 15 * 60 * 1000;

// Last known position per vehicle, cached for this process. The database is
// the store — a serverless instance starts with none of these.
let locations = [];

function locationsRef(path) {
  return dbRef(path ? `locations/${path}` : "locations");
}

function normaliseFix(raw) {
  if (!raw || typeof raw !== "object") return null;
  const vehicleId = Number(raw.vehicleId);
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!Number.isFinite(vehicleId) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return {
    vehicleId,
    lat,
    lng,
    speedKph: Number(raw.speedKph ?? 0),
    heading: Number(raw.heading ?? 0),
    label: raw.label ?? "",
    // Worked out once when the fix was reported, so the portals never have to
    // geocode and never disagree about where a bus is.
    placeName: raw.placeName ?? "",
    reportedAt: raw.reportedAt ?? new Date(0).toISOString()
  };
}

export async function refreshLocationsFromDb() {
  if (!databaseConfigured) return locations;
  try {
    const snap = await locationsRef().get();
    locations = Object.values(snap.val() || {})
      .map(normaliseFix)
      .filter(Boolean);
  } catch (e) {
    console.error("Database get locations error:", e);
  }
  return locations;
}

/// Decorates a fix with how old it is, so a client never has to work out
/// staleness from a timestamp itself and disagree with the next client.
function withFreshness(fix) {
  const at = new Date(fix.reportedAt).getTime();
  const ageMs = Number.isFinite(at) ? Date.now() - at : Number.MAX_SAFE_INTEGER;
  // Fixes stored before naming existed have no name of their own. If that
  // square has since been looked up for any bus, they get it for free; a read
  // never waits on the geocoder to fill one in.
  const placeName = fix.placeName || cachedPlaceName(fix.lat, fix.lng);
  return {
    ...fix,
    placeName,
    // The one string a client should show for "where". The geocoded name wins
    // over the note the device sent, because a name is what the fleet view is
    // for; the note is a label the driver typed and may be anything.
    place: placeName || fix.label || "",
    ageMinutes: Math.max(0, Math.round(ageMs / 60000)),
    live: ageMs <= STALE_AFTER_MS
  };
}

// GET /api/tracking/config - what the portals need to draw a real map.
//
// A Google Maps browser key is public by design: it travels in the page and is
// protected by HTTP-referrer restrictions set in Google Cloud, not by secrecy.
// Serving it here keeps it out of the built bundles, so it can be rotated
// without rebuilding the portals.
router.get("/config", (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY || "";
  res.json({
    mapsApiKey: key,
    // The portals fall back to their own drawn map when this is false, so the
    // GPS view still works before a key is set up.
    mapsConfigured: Boolean(key),
    // How long a fix counts as live. A device sharing its position reads this
    // rather than hard-coding an interval, so changing the rule here changes
    // how often the apps report without shipping a new build.
    staleAfterMinutes: STALE_AFTER_MS / 60000,
    // Places are named server-side from every reported fix. Nominatim needs no
    // key, so this is true on a fresh install.
    placeNamesEnabled: true
  });
});

// POST /api/tracking/vehicles/:id - a tracker or driver app reports a position.
//
// Deliberately open to any device that knows the vehicle id, the same as the
// rest of this API: there is no device authentication yet. Before real vehicles
// depend on it, this endpoint needs a per-device key.
router.post("/vehicles/:id", async (req, res) => {
  const vehicleId = Number(req.params.id);
  const { lat, lng, speedKph, heading, label } = req.body;

  if (!Number.isFinite(vehicleId)) {
    return res.status(400).json({ error: "A numeric vehicle id is required" });
  }
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return res.status(400).json({ error: "lat and lng are required numbers" });
  }
  if (Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) {
    return res.status(400).json({ error: "lat must be within ±90 and lng within ±180" });
  }

  await refreshVehiclesFromDb();
  const vehicle = allVehicles().find((v) => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

  await refreshLocationsFromDb();
  const previous = locations.find((l) => l.vehicleId === vehicleId);

  const fix = {
    vehicleId,
    lat: Number(lat),
    lng: Number(lng),
    speedKph: Number(speedKph ?? 0),
    heading: Number(heading ?? 0),
    label: String(label || "").trim(),
    placeName: "",
    reportedAt: new Date().toISOString()
  };

  // Named here rather than in the portals: one lookup per position instead of
  // one per viewer per refresh, and every client then shows the same name.
  fix.placeName = await reverseGeocode(fix.lat, fix.lng);

  // A geocoder that is down or rate-limiting must not strip the name off a bus
  // that has not actually moved — it would show as nameless until it drove far
  // enough to land in a cached square.
  if (!fix.placeName && withinSamePlace(previous, fix)) {
    fix.placeName = previous.placeName || "";
  }

  locations = [...locations.filter((l) => l.vehicleId !== vehicleId), fix];

  if (databaseConfigured) {
    try {
      await locationsRef(String(vehicleId)).set(fix);
    } catch (e) {
      console.error("Database save location error:", e);
      const described = describeDatabaseError(e);
      return res.status(described?.status || 503).json({
        error: described?.message || `Could not record the position: ${e.message}`
      });
    }
  }

  res.status(201).json(withFreshness(fix));
});

// GET /api/tracking?operatorName=... - every bus in the fleet, with its last fix
router.get("/", async (req, res) => {
  const { operatorName } = req.query;
  if (!operatorName) {
    return res.status(400).json({ error: "operatorName query param is required" });
  }

  await refreshVehiclesFromDb();
  await refreshLocationsFromDb();

  const key = String(operatorName).trim().toLowerCase();
  const rows = allVehicles()
    .filter((v) => String(v.operatorName).trim().toLowerCase() === key)
    .map((vehicle) => {
      const fix = locations.find((l) => l.vehicleId === vehicle.id);
      return {
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.type,
        // Every bus appears, reporting or not — a fleet view that hid the
        // silent ones would hide exactly the ones worth chasing.
        location: fix ? withFreshness(fix) : null
      };
    })
    .sort((a, b) => {
      const rank = (r) => (r.location?.live ? 0 : r.location ? 1 : 2);
      return rank(a) - rank(b) || a.vehicleName.localeCompare(b.vehicleName);
    });

  res.json({
    operatorName,
    reporting: rows.filter((r) => r.location?.live).length,
    total: rows.length,
    staleAfterMinutes: STALE_AFTER_MS / 60000,
    vehicles: rows
  });
});

export default router;
