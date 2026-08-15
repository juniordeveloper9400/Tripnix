// Turns a GPS fix into the name of a place.
//
// A fleet view that says "10.52760, 76.21440" tells an operator nothing they
// can act on — they have to paste it into a map to find out it means Thrissur.
// Every position that reaches this API gets a name attached once, here, so the
// portals never have to show coordinates at all.
//
// OpenStreetMap's Nominatim is the default because it needs no credentials, so
// naming works on a fresh checkout with nothing configured. Google's Geocoding
// API is used instead when GOOGLE_GEOCODING_API_KEY is set — note that this is
// NOT the same key as GOOGLE_MAPS_API_KEY: that one is a browser key restricted
// by HTTP referrer, and Google rejects it from a server, which has no referrer.

/// Cache key precision. Three decimals is about 110 m — close enough that the
/// answer would not change, so a bus idling at a stand is named once rather
/// than on every fix it reports.
const GRID = 1e3;

/// Nominatim's usage policy allows one request a second. Requests are queued
/// behind this gap rather than fired in parallel, because being blocked for
/// abuse would take the names away from every agency at once.
const MIN_GAP_MS = 1100;

/// A name is never worth delaying a position report for. Past this the fix is
/// stored unnamed and the next one from the same area picks the name up.
const TIMEOUT_MS = 4000;

/// Bounded so a long-running instance cannot grow this without limit. Entries
/// are dropped oldest-first, which suits fleets that move along routes.
const MAX_ENTRIES = 1000;

const cache = new Map();

let queue = Promise.resolve();
let lastCallAt = 0;

function cacheKey(lat, lng) {
  return `${Math.round(lat * GRID)}:${Math.round(lng * GRID)}`;
}

function remember(key, name) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, name);
  if (cache.size > MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

/// Runs [task] no sooner than MIN_GAP_MS after the previous one, whoever asked.
/// Serverless instances handle few concurrent reports, but a fleet posting on
/// the same interval arrives in bursts, and a burst is exactly what the policy
/// is about.
function throttled(task) {
  const run = queue.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastCallAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
    return task();
  });
  // The queue must survive a failed task, or one network error would wedge
  // every later lookup behind a rejected promise.
  queue = run.catch(() => {});
  return run;
}

async function fetchJson(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/// Builds a name a person would actually use: the specific part, then the town
/// it is in. "Chalakudy, Thrissur" rather than either the full postal address
/// or the bare district.
function nameFromNominatim(payload) {
  const a = payload?.address;
  if (!a) return String(payload?.display_name || "").split(",").slice(0, 2).join(", ").trim();

  const specific =
    a.road ||
    a.neighbourhood ||
    a.suburb ||
    a.hamlet ||
    a.village ||
    a.town ||
    a.city_district ||
    a.city ||
    a.county;

  const area = a.town || a.city || a.municipality || a.county || a.state_district || a.state;

  const parts = [specific, area].filter(Boolean);
  // A road with no town is worse than nothing to an operator, so the state is
  // the last resort rather than an empty string.
  const unique = [...new Set(parts)];
  return unique.slice(0, 2).join(", ");
}

/// Google returns a ranked list; the locality-level result is the one a person
/// would name, and its formatted address already reads as "Town, District".
function nameFromGoogle(payload) {
  const results = payload?.results || [];
  if (!results.length) return "";

  const preferred =
    results.find((r) => r.types?.includes("locality")) ||
    results.find((r) => r.types?.includes("sublocality")) ||
    results.find((r) => r.types?.includes("route")) ||
    results[0];

  const components = preferred.address_components || [];
  const pick = (type) => components.find((c) => c.types?.includes(type))?.long_name;

  const specific =
    pick("neighborhood") || pick("sublocality") || pick("route") || pick("locality");
  const area =
    pick("locality") || pick("administrative_area_level_2") || pick("administrative_area_level_1");

  const unique = [...new Set([specific, area].filter(Boolean))];
  if (unique.length) return unique.slice(0, 2).join(", ");

  return String(preferred.formatted_address || "").split(",").slice(0, 2).join(", ").trim();
}

async function lookup(lat, lng) {
  const googleKey = process.env.GOOGLE_GEOCODING_API_KEY;

  if (googleKey) {
    const url =
      "https://maps.googleapis.com/maps/api/geocode/json" +
      `?latlng=${lat},${lng}&result_type=street_address|route|locality|sublocality` +
      `&key=${encodeURIComponent(googleKey)}`;
    const payload = await fetchJson(url);
    if (payload.status === "OK") return nameFromGoogle(payload);
    // ZERO_RESULTS over the sea is a real answer, not a fault; anything else is
    // worth seeing in the log because it usually means the key is wrong.
    if (payload.status !== "ZERO_RESULTS") {
      throw new Error(`Google geocoding: ${payload.status} ${payload.error_message || ""}`.trim());
    }
    return "";
  }

  const url =
    "https://nominatim.openstreetmap.org/reverse?format=jsonv2" +
    `&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
  // Nominatim rejects requests without a User-Agent that identifies the caller.
  const payload = await fetchJson(url, {
    "User-Agent": "Tripnix/1.0 (fleet tracking; https://tripnix.in)",
    "Accept-Language": "en"
  });
  return nameFromNominatim(payload);
}

/// The name of the place at [lat],[lng] — "" when it could not be worked out.
///
/// Never throws and never rejects: a position is worth recording whether or not
/// it can be named, so a geocoder that is down or rate-limiting must not fail
/// the report that triggered it.
export async function reverseGeocode(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";

  const key = cacheKey(lat, lng);
  if (cache.has(key)) return cache.get(key);

  try {
    const name = await throttled(() => lookup(lat, lng));
    const clean = String(name || "").trim();
    // A failed lookup is not cached, so the next fix from the same place gets
    // another go rather than being permanently nameless.
    if (clean) remember(key, clean);
    return clean;
  } catch (e) {
    console.warn("Reverse geocoding failed:", e.message);
    return "";
  }
}

/// The cached name for a point, without ever going to the network.
///
/// Lets a read path put a name on a fix that was stored before naming existed,
/// when another bus has already had that square looked up. A read must never
/// wait on a geocoder, so an unknown square simply stays unnamed here.
export function cachedPlaceName(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  return cache.get(cacheKey(lat, lng)) || "";
}

/// True when two fixes are close enough to share a place name, used to carry a
/// name forward when a lookup fails rather than showing a bus as unnamed after
/// it has been named for hours.
export function withinSamePlace(a, b, metres = 400) {
  if (!a || !b) return false;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) <= metres;
}
