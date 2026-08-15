import { Router } from "express";
import { allVehicles, refreshVehiclesFromDb } from "./vehicles.js";
import { dbRef, databaseConfigured, describeDatabaseError } from "../lib/firebase.js";
import { reverseGeocode, withinSamePlace, cachedPlaceName } from "../lib/geocode.js";

const router = Router();

/// A bus counts as reporting while its last fix is recent. Beyond this it is
/// shown as out of contact rather than parked wherever it last spoke, which is
/// the difference between "here" and "here two days ago".
const STALE_AFTER_MS = 15 * 60 * 1000;

// Last known position per vehicle, cached for this process. The database is the
// store — a serverless instance starts with none of these.
let locations = [];

function locationsRef(path) {
  return dbRef(path ? `locations/${path}` : "locations");
}

/// A position, filed against the bus it came from.
///
/// The driver travels on the fix as well as the bus. The map is about buses —
/// that is what an office dispatches — but "who is on it" is the next question
/// anyone asks about a moving bus, and it costs nothing to carry the answer.
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
    // Who is sharing from this bus. Blank on fixes stored before drivers were
    // recorded, which read as an unattributed position rather than a wrong one.
    driverUsername: String(raw.driverUsername || "").trim(),
    driverName: String(raw.driverName || "").trim(),
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
    lat: fix.lat,
    lng: fix.lng,
    speedKph: fix.speedKph,
    heading: fix.heading,
    driverUsername: fix.driverUsername,
    driverName: fix.driverName,
    placeName,
    // The one string a client should show for "where".
    place: placeName || "",
    reportedAt: fix.reportedAt,
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
    // location view still works before a key is set up.
    mapsConfigured: Boolean(key),
    // How long a fix counts as live. A device sharing its position reads this
    // rather than hard-coding an interval, so changing the rule here changes
    // how often the apps report without shipping a new build.
    staleAfterMinutes: STALE_AFTER_MS / 60000,
    // Places are named server-side from every reported fix. Nominatim needs no
    // key, so this is true on a fresh install.
    placeNamesEnabled: true,
    // False means positions are only held in this process's memory. On one
    // long-running server that is merely lossy across restarts; on serverless
    // hosting it is fatal and silent — the instance that stores a position is
    // rarely the one asked for it, so every portal shows an empty map while
    // every report returns 201. Surfaced here so that failure can be seen
    // rather than guessed at.
    positionsPersisted: databaseConfigured
  });
});

// POST /api/tracking/vehicles/:id - a driver's phone reports where its bus is.
//
// Deliberately open to any device that knows the vehicle id, the same as the
// rest of this API: there is no device authentication yet. Before real vehicles
// depend on it, this endpoint needs a per-device key — anyone who knows a
// vehicle id can currently place that bus anywhere.
router.post("/vehicles/:id", async (req, res) => {
  const vehicleId = Number(req.params.id);
  const { lat, lng, speedKph, heading, driverUsername, driverName } = req.body;

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
    driverUsername: String(driverUsername || "").trim(),
    driverName: String(driverName || "").trim(),
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

// DELETE /api/tracking/vehicles/:id - the driver stops sharing.
//
// Removing the fix rather than letting it go stale: a bus that stays on the map
// for another fifteen minutes after its driver deliberately switched sharing
// off is the app disregarding the decision they just made.
router.delete("/vehicles/:id", async (req, res) => {
  const vehicleId = Number(req.params.id);
  if (!Number.isFinite(vehicleId)) {
    return res.status(400).json({ error: "A numeric vehicle id is required" });
  }

  locations = locations.filter((l) => l.vehicleId !== vehicleId);

  if (databaseConfigured) {
    try {
      await locationsRef(String(vehicleId)).remove();
    } catch (e) {
      console.error("Database delete location error:", e);
      const described = describeDatabaseError(e);
      return res.status(described?.status || 503).json({
        error: described?.message || `Could not stop sharing: ${e.message}`
      });
    }
  }

  res.status(204).end();
});

// GET /api/tracking?operatorName=... - every bus in the fleet, with its last fix.
//
// Every bus appears, reporting or not. An agency with three buses should see
// three rows: hiding the silent ones would hide exactly the ones worth chasing,
// and an office counting its fleet on this screen needs the count to be right.
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
        // The generic shape the shared map draws from: the bus is the subject,
        // and its number is what identifies it on a marker.
        id: vehicle.id,
        name: vehicle.name,
        subtitle: vehicle.vehicleNumber || "",
        vehicleType: vehicle.type,
        location: fix ? withFreshness(fix) : null
      };
    })
    .sort((a, b) => {
      const rank = (r) => (r.location?.live ? 0 : r.location ? 1 : 2);
      return rank(a) - rank(b) || String(a.name).localeCompare(String(b.name));
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
