import { Router } from "express";
import { dbRef, databaseConfigured, describeDatabaseError, safeKey } from "../lib/firebase.js";
import { reverseGeocode, withinSamePlace, cachedPlaceName } from "../lib/geocode.js";

const router = Router();

/// Someone counts as reporting while their last fix is recent. Beyond this they
/// are shown as out of contact rather than parked wherever they last spoke,
/// which is the difference between "here" and "here two days ago".
const STALE_AFTER_MS = 15 * 60 * 1000;

// Last known position per person, cached for this process. The database is the
// store — a serverless instance starts with none of these.
let people = [];

function peopleRef(path) {
  return dbRef(path ? `people-locations/${path}` : "people-locations");
}

/// The identity a fix is filed under.
///
/// Carried on the fix itself rather than looked up from the accounts tree: this
/// route would otherwise need owner credentials to read the staff list, and a
/// map of who is sharing should not depend on who is asking.
function normaliseFix(raw) {
  if (!raw || typeof raw !== "object") return null;

  const username = String(raw.username || "").trim();
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!username || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    username,
    operatorName: String(raw.operatorName || "").trim(),
    // Falls back to the username so a row is never blank; an account created
    // before display names existed still reads as somebody.
    displayName: String(raw.displayName || "").trim() || username,
    role: String(raw.role || "").trim(),
    lat,
    lng,
    speedKph: Number(raw.speedKph ?? 0),
    heading: Number(raw.heading ?? 0),
    // Worked out once when the fix was reported, so the portals never have to
    // geocode and never disagree about where somebody is.
    placeName: raw.placeName ?? "",
    reportedAt: raw.reportedAt ?? new Date(0).toISOString()
  };
}

export async function refreshPeopleFromDb() {
  if (!databaseConfigured) return people;
  try {
    const snap = await peopleRef().get();
    people = Object.values(snap.val() || {})
      .map(normaliseFix)
      .filter(Boolean);
  } catch (e) {
    console.error("Database get people locations error:", e);
  }
  return people;
}

/// Decorates a fix with how old it is, so a client never has to work out
/// staleness from a timestamp itself and disagree with the next client.
function withFreshness(fix) {
  const at = new Date(fix.reportedAt).getTime();
  const ageMs = Number.isFinite(at) ? Date.now() - at : Number.MAX_SAFE_INTEGER;
  // Fixes stored before naming existed have no name of their own. If that
  // square has since been looked up for anyone, they get it for free; a read
  // never waits on the geocoder to fill one in.
  const placeName = fix.placeName || cachedPlaceName(fix.lat, fix.lng);
  return {
    lat: fix.lat,
    lng: fix.lng,
    speedKph: fix.speedKph,
    heading: fix.heading,
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

// POST /api/tracking/people/:username - a signed-in person reports where they are.
//
// Deliberately open to any device that knows the username, the same as the rest
// of this API: there is no device authentication yet. Before this carries real
// staff positions it needs a per-session token — anyone who knows a username can
// currently post a position as them.
router.post("/people/:username", async (req, res) => {
  const username = String(req.params.username || "").trim();
  const { lat, lng, speedKph, heading, operatorName, displayName, role } = req.body;

  if (!username) {
    return res.status(400).json({ error: "A username is required" });
  }
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return res.status(400).json({ error: "lat and lng are required numbers" });
  }
  if (Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) {
    return res.status(400).json({ error: "lat must be within ±90 and lng within ±180" });
  }
  if (!String(operatorName || "").trim()) {
    // Without this the fix belongs to no agency and no portal would ever show
    // it — better to refuse than to store something invisible.
    return res.status(400).json({ error: "operatorName is required" });
  }

  await refreshPeopleFromDb();
  const previous = people.find((p) => p.username === username);

  const fix = {
    username,
    operatorName: String(operatorName).trim(),
    displayName: String(displayName || "").trim() || username,
    role: String(role || "").trim(),
    lat: Number(lat),
    lng: Number(lng),
    speedKph: Number(speedKph ?? 0),
    heading: Number(heading ?? 0),
    placeName: "",
    reportedAt: new Date().toISOString()
  };

  // Named here rather than in the portals: one lookup per position instead of
  // one per viewer per refresh, and every client then shows the same name.
  fix.placeName = await reverseGeocode(fix.lat, fix.lng);

  // A geocoder that is down or rate-limiting must not strip the name off
  // somebody who has not actually moved — they would show as nameless until
  // they travelled far enough to land in a cached square.
  if (!fix.placeName && withinSamePlace(previous, fix)) {
    fix.placeName = previous.placeName || "";
  }

  people = [...people.filter((p) => p.username !== username), fix];

  if (databaseConfigured) {
    try {
      await peopleRef(safeKey(username)).set(fix);
    } catch (e) {
      console.error("Database save person location error:", e);
      const described = describeDatabaseError(e);
      return res.status(described?.status || 503).json({
        error: described?.message || `Could not record the position: ${e.message}`
      });
    }
  }

  res.status(201).json(withFreshness(fix));
});

// DELETE /api/tracking/people/:username - stop sharing, and leave no last position.
//
// Stopping has to remove the fix, not just let it go stale: a position that
// lingers for fifteen minutes after someone deliberately switched sharing off
// is the app disregarding the decision they just made.
router.delete("/people/:username", async (req, res) => {
  const username = String(req.params.username || "").trim();
  if (!username) return res.status(400).json({ error: "A username is required" });

  people = people.filter((p) => p.username !== username);

  if (databaseConfigured) {
    try {
      await peopleRef(safeKey(username)).remove();
    } catch (e) {
      console.error("Database delete person location error:", e);
      const described = describeDatabaseError(e);
      return res.status(described?.status || 503).json({
        error: described?.message || `Could not stop sharing: ${e.message}`
      });
    }
  }

  res.status(204).end();
});

// GET /api/tracking?operatorName=... - everyone in the agency who is sharing.
//
// Only people who have reported appear. Unlike a fleet of buses there is no
// fixed roster to show as silent: somebody who has never turned sharing on has
// not withheld a position, they have simply made a choice, and listing them as
// "not reporting" would frame it as a fault.
router.get("/", async (req, res) => {
  const { operatorName } = req.query;
  if (!operatorName) {
    return res.status(400).json({ error: "operatorName query param is required" });
  }

  await refreshPeopleFromDb();

  const key = String(operatorName).trim().toLowerCase();
  const rows = people
    .filter((p) => String(p.operatorName).trim().toLowerCase() === key)
    .map((person) => ({
      id: person.username,
      name: person.displayName,
      subtitle: person.role,
      location: withFreshness(person)
    }))
    .sort((a, b) => {
      const rank = (r) => (r.location?.live ? 0 : 1);
      return rank(a) - rank(b) || String(a.name).localeCompare(String(b.name));
    });

  res.json({
    operatorName,
    reporting: rows.filter((r) => r.location?.live).length,
    total: rows.length,
    staleAfterMinutes: STALE_AFTER_MS / 60000,
    people: rows
  });
});

export default router;
