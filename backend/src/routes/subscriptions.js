import { Router } from "express";
import {
  dbRef,
  databaseConfigured,
  safeKey,
  allocateId,
  describeDatabaseError
} from "../lib/firebase.js";

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const HALF_YEAR_DAYS = 180;

/// Plan catalogue. An agency pays a platform fee to be on Tripnix at all, plus
/// one fleet fee that covers every vehicle it runs — priced by how many that
/// is, not per vehicle.
///
/// This is the default only. Whatever the Super Admin has saved is loaded over
/// the top of it, because a catalogue that lived in memory reset to these
/// prices every time a serverless instance was recycled.
let catalogue = {
  currency: "INR",
  currencySymbol: "₹",
  billingPeriod: "6 months",
  platform: {
    id: "platform",
    name: "Agency Platform Membership",
    // Mirrors the single plan so any client reading one figure shows the right
    // price. `plans` below is the real catalogue.
    price: 500,
    durationDays: HALF_YEAR_DAYS,
    tagline: "Keeps your travel agency registered and visible on Tripnix",
    plans: [
      {
        id: "halfyearly",
        label: "6 Months",
        period: "6 months",
        price: 500,
        durationDays: HALF_YEAR_DAYS
      }
    ],
    features: [
      "Agency profile listed in the traveller app",
      "Browse buses and cars posted by other travel agencies",
      "Unlimited booking requests from travellers",
      "Fleet dashboard, date scheduling and booking management",
      "Required before you can add vehicles to your fleet"
    ]
  },
  // One fee covering the whole fleet, chosen by how many vehicles the agency
  // runs. Adding a vehicle inside the current band costs nothing extra; adding
  // one that crosses into the next band moves the agency up to it.
  //
  // `maxVehicles: null` marks the open-ended top band, so a growing agency is
  // never blocked from adding another vehicle.
  fleetTiers: [
    { id: "fleet-1-3", label: "1–3 vehicles", minVehicles: 1, maxVehicles: 3, price: 500 },
    { id: "fleet-4-6", label: "4–6 vehicles", minVehicles: 4, maxVehicles: 6, price: 900 },
    { id: "fleet-7-10", label: "7–10 vehicles", minVehicles: 7, maxVehicles: 10, price: 1300 },
    { id: "fleet-11-plus", label: "11+ vehicles", minVehicles: 11, maxVehicles: null, price: 1700 }
  ]
};

// Subscription records for this process. The database is the real store —
// these are a cache of it, refilled by refreshSubscriptionsFromDb().
//
// They used to live *only* here, which is why paying changed nothing on the
// deployed site: the instance that took the payment kept the record, every
// other instance saw an unpaid agency, and a recycled instance lost it for
// good. Nothing may rely on these arrays without loading them first.
let platformSubs = []; // one per agency
let fleetSubs = []; // one per agency, covering that agency's whole fleet

// ─── Persistence ───────────────────────────────────────────

function subscriptionsRef(path) {
  return dbRef(path ? `subscriptions/${path}` : "subscriptions");
}

/// Realtime Database drops empty arrays and objects entirely, so a stored
/// record comes back missing whichever fields were empty. Filling them in on
/// the way out keeps every consumer working with the same shape.
function normaliseSub(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    id: Number(raw.id) || 0,
    operatorName: raw.operatorName ?? "",
    amount: Number(raw.amount ?? 0),
    startsAt: raw.startsAt ?? new Date(0).toISOString(),
    expiresAt: raw.expiresAt ?? new Date(0).toISOString(),
    renewedAt: raw.renewedAt ?? null,
    // Days already given back for buses on hold. Realtime Database drops an
    // empty array entirely, so it has to be restored here or a first hold would
    // credit against undefined.
    creditedHoldDates: Array.isArray(raw.creditedHoldDates) ? raw.creditedHoldDates : []
  };
}

/// Merges stored prices over the built-in defaults, so a price the Super Admin
/// never touched keeps its default rather than becoming undefined.
///
/// Only prices are stored. The bands themselves — their ids, labels and vehicle
/// ranges — stay in code, so a stored catalogue can never leave the product
/// with a gap or an overlap in its pricing ladder.
function mergeCatalogue(stored) {
  if (!stored || typeof stored !== "object") return;

  if (stored.platform) {
    const storedPlans = Array.isArray(stored.platform.plans) ? stored.platform.plans : [];
    for (const plan of catalogue.platform.plans) {
      const match = storedPlans.find((p) => p && p.id === plan.id);
      if (match && Number.isFinite(Number(match.price))) plan.price = Number(match.price);
    }
    catalogue.platform.price = catalogue.platform.plans[0]?.price ?? catalogue.platform.price;
  }

  const storedTiers = Array.isArray(stored.fleetTiers) ? stored.fleetTiers : [];
  for (const tier of catalogue.fleetTiers) {
    const match = storedTiers.find((t) => t && t.id === tier.id);
    if (match && Number.isFinite(Number(match.price))) tier.price = Number(match.price);
  }
}

/// Pulls every stored subscription and the saved prices into this process.
///
/// Must be awaited by anything that reads membership or fleet state, because a
/// freshly started instance knows nothing until it has run.
export async function refreshSubscriptionsFromDb() {
  if (!databaseConfigured) return;

  try {
    const snap = await subscriptionsRef().get();
    const value = snap.val() || {};

    platformSubs = Object.values(value.platform || {})
      .map(normaliseSub)
      .filter(Boolean);
    fleetSubs = Object.values(value.fleet || {})
      .map(normaliseSub)
      .filter(Boolean);

    mergeCatalogue(value.catalogue);
  } catch (e) {
    console.error("Database get subscriptions error:", e);
  }
}

async function savePlatformSub(sub) {
  if (!databaseConfigured) return;
  await subscriptionsRef(`platform/${safeKey(sub.operatorName)}`).set(sub);
}

async function saveFleetSub(sub) {
  if (!databaseConfigured) return;
  await subscriptionsRef(`fleet/${safeKey(sub.operatorName)}`).set(sub);
}

async function saveCatalogue() {
  if (!databaseConfigured) return;
  await subscriptionsRef("catalogue").set({
    platform: {
      plans: catalogue.platform.plans.map((p) => ({ id: p.id, price: p.price }))
    },
    fleetTiers: catalogue.fleetTiers.map((t) => ({ id: t.id, price: t.price }))
  });
}

// ─── Helpers ───────────────────────────────────────────────

function normalise(name) {
  return String(name || "").trim().toLowerCase();
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

/// A record is active while its expiry is still in the future.
function isActive(sub) {
  return !!sub && new Date(sub.expiresAt).getTime() > Date.now();
}

function withStatus(sub) {
  if (!sub) return null;
  const expires = new Date(sub.expiresAt).getTime();
  const daysLeft = Math.ceil((expires - Date.now()) / DAY_MS);
  return {
    ...sub,
    status: expires > Date.now() ? "active" : "expired",
    daysLeft: Math.max(daysLeft, 0)
  };
}

/// The band a fleet of `count` vehicles falls into.
///
/// The top band is open-ended, so any number above its minimum lands there —
/// an agency is priced, never blocked, for growing past the last named band.
export function fleetTierFor(count) {
  const size = Math.max(1, Number(count) || 0);
  const tiers = catalogue.fleetTiers;
  return (
    tiers.find(
      (t) => size >= t.minVehicles && (t.maxVehicles === null || size <= t.maxVehicles)
    ) ||
    tiers[tiers.length - 1] ||
    null
  );
}

/// Looks up a platform plan, falling back to the first one.
///
/// The fallback matters for records written under an older catalogue: a
/// membership stored as "monthly" still renews, on today's plan.
export function platformPlan(planId) {
  const plans = catalogue.platform.plans;
  const wanted = String(planId || "").toLowerCase();
  return plans.find((p) => p.id.toLowerCase() === wanted) || plans[0];
}

/// The agency's platform membership record, paid or lapsed, or undefined.
export function platformSubFor(operatorName) {
  const key = normalise(operatorName);
  return platformSubs.find((s) => normalise(s.operatorName) === key);
}

/// The agency's fleet subscription, paid or lapsed, or undefined.
export function fleetSubFor(operatorName) {
  const key = normalise(operatorName);
  return fleetSubs.find((s) => normalise(s.operatorName) === key);
}

/// Subscription ids come from the same collision-proof allocator as vehicles
/// and trips, so two instances issuing receipts at once cannot reuse one.
async function nextSubscriptionId() {
  const known = Math.max(
    0,
    ...platformSubs.map((s) => Number(s.id) || 0),
    ...fleetSubs.map((s) => Number(s.id) || 0)
  );
  if (!databaseConfigured) return known + 1;
  return allocateId("subscriptions", known);
}

/// Records the platform fee as paid, for `plan`, and stores it.
///
/// Renewing early extends from the current expiry rather than from today, so
/// an agency is never charged for time it has already bought.
export async function activatePlatformMembership(operatorName, plan) {
  const name = String(operatorName || "").trim();
  const existing = platformSubFor(name);
  const now = new Date();
  const startsAt = isActive(existing) ? new Date(existing.expiresAt) : now;

  const sub = {
    id: existing?.id || (await nextSubscriptionId()),
    operatorName: name,
    planId: plan.id,
    planName: `${catalogue.platform.name} (${plan.label})`,
    amount: (existing?.amount || 0) + plan.price,
    startsAt: new Date(existing?.startsAt || now).toISOString(),
    expiresAt: addDays(startsAt, plan.durationDays).toISOString(),
    renewedAt: existing ? now.toISOString() : null
  };

  platformSubs = [...platformSubs.filter((s) => s !== existing), sub];
  await savePlatformSub(sub);
  return sub;
}

/// Puts the agency's fleet subscription on the band that covers `vehicleCount`,
/// and stores it.
///
/// One fee covers the whole fleet, so this is what a vehicle "costs": nothing
/// while the fleet stays inside its paid band, and the difference up to the
/// next band's price when it crosses one. `charge` on the returned record is
/// what was actually billed, so the caller can report it honestly.
export async function activateFleetSubscription(operatorName, vehicleCount) {
  const name = String(operatorName || "").trim();
  const tier = fleetTierFor(vehicleCount);
  if (!tier) throw new Error("No fleet plan is configured");

  const existing = fleetSubFor(name);
  const live = isActive(existing);
  const now = new Date();

  // Still inside the paid band and still in date: nothing to charge, and the
  // expiry must not move — an agency adding its second bus has not bought
  // another period. The recorded fleet size is still updated, or it would keep
  // reporting whatever it was when the band was last crossed and under-count
  // the fleet everywhere it is shown.
  if (live && existing.tierId === tier.id) {
    const size = Math.max(1, Number(vehicleCount) || 0);
    if (Number(existing.vehicleCount) === size) {
      return { ...existing, charge: 0, upgraded: false };
    }
    const sub = { ...existing, vehicleCount: size };
    fleetSubs = [...fleetSubs.filter((s) => s !== existing), sub];
    await saveFleetSub(sub);
    return { ...sub, charge: 0, upgraded: false };
  }

  // Moving up a band mid-period charges only the difference, and keeps the
  // expiry the agency already paid for. Charging the full price again would
  // bill them twice for the months they are still inside.
  const isUpgrade = live && tier.price > (existing.price || 0);
  const charge = isUpgrade ? Math.max(0, tier.price - (existing.price || 0)) : tier.price;
  const expiresAt = live
    ? new Date(existing.expiresAt)
    : addDays(now, catalogue.platform.plans[0]?.durationDays || HALF_YEAR_DAYS);

  const sub = {
    id: existing?.id || (await nextSubscriptionId()),
    operatorName: name,
    tierId: tier.id,
    tierLabel: tier.label,
    // The band's list price, so a later upgrade can work out the difference.
    price: tier.price,
    vehicleCount: Math.max(1, Number(vehicleCount) || 0),
    amount: (existing?.amount || 0) + charge,
    startsAt: new Date(existing?.startsAt || now).toISOString(),
    expiresAt: expiresAt.toISOString(),
    renewedAt: existing ? now.toISOString() : null
  };

  fleetSubs = [...fleetSubs.filter((s) => s !== existing), sub];
  await saveFleetSub(sub);
  return { ...sub, charge, upgraded: isUpgrade };
}

/// Renews the fleet subscription for another period at the band `vehicleCount`
/// falls into, extending from the current expiry.
export async function renewFleetSubscription(operatorName, vehicleCount) {
  const name = String(operatorName || "").trim();
  const tier = fleetTierFor(vehicleCount);
  if (!tier) throw new Error("No fleet plan is configured");

  const existing = fleetSubFor(name);
  const now = new Date();
  const startsAt = isActive(existing) ? new Date(existing.expiresAt) : now;
  const days = catalogue.platform.plans[0]?.durationDays || HALF_YEAR_DAYS;

  const sub = {
    id: existing?.id || (await nextSubscriptionId()),
    operatorName: name,
    tierId: tier.id,
    tierLabel: tier.label,
    price: tier.price,
    vehicleCount: Math.max(1, Number(vehicleCount) || 0),
    amount: (existing?.amount || 0) + tier.price,
    startsAt: new Date(existing?.startsAt || now).toISOString(),
    expiresAt: addDays(startsAt, days).toISOString(),
    renewedAt: existing ? now.toISOString() : null
  };

  fleetSubs = [...fleetSubs.filter((s) => s !== existing), sub];
  await saveFleetSub(sub);
  return { ...sub, charge: tier.price, upgraded: false };
}

/// True when the agency has paid the platform fee and it has not lapsed.
///
/// This used to activate the agency and return true unconditionally, which
/// made every gate in the product decorative — an agency could add vehicles
/// and go live in the app without ever paying.
export function hasActivePlatformMembership(operatorName) {
  if (!operatorName) return false;
  return isActive(platformSubFor(operatorName));
}

/// True when the agency's fleet fee is paid and current.
export function hasActiveFleetSubscription(operatorName) {
  if (!operatorName) return false;
  return isActive(fleetSubFor(operatorName));
}

/// True when a vehicle may appear in the public traveller app.
///
/// Both fees have to be current: the platform membership keeps the agency on
/// the platform, and the fleet fee keeps its vehicles visible. Either lapsing
/// hides the whole fleet.
export function isVehiclePubliclyListed(vehicle) {
  if (!vehicle) return false;
  // A bus in the workshop cannot take a traveller anywhere, so it comes off the
  // app until the agency puts it back. The days it sat out are credited to the
  // fleet plan on the way back, by creditHeldDays() below.
  if (vehicle.onHold) return false;
  if (!hasActivePlatformMembership(vehicle.operatorName)) return false;
  return hasActiveFleetSubscription(vehicle.operatorName);
}

/// Pushes the fleet plan's expiry out by the days a bus spent off the road.
///
/// `dates` are the individual days held, and only ones not already credited
/// count. That matters because the fee covers the whole fleet, not each bus:
/// holding three buses across the same fortnight is one fortnight of lost
/// visibility, not three. Summing per-bus days would let an agency hold its
/// fleet in rotation and extend the plan indefinitely.
export async function creditHeldDays(operatorName, dates) {
  const existing = fleetSubFor(operatorName);
  if (!existing) return { credited: 0, sub: null };

  const already = new Set(existing.creditedHoldDates || []);
  const fresh = [...new Set(dates)].filter((d) => !already.has(d));
  if (!fresh.length) return { credited: 0, sub: withStatus(existing) };

  const sub = {
    ...existing,
    creditedHoldDates: [...already, ...fresh].sort(),
    expiresAt: addDays(new Date(existing.expiresAt), fresh.length).toISOString()
  };

  fleetSubs = [...fleetSubs.filter((s) => s !== existing), sub];
  await saveFleetSub(sub);
  return { credited: fresh.length, sub: withStatus(sub) };
}

/// Agencies currently visible to travellers, with their fleet size.
export function listedAgencies(vehicles) {
  const names = new Map();
  for (const vehicle of vehicles) {
    if (!isVehiclePubliclyListed(vehicle)) continue;
    const current = names.get(vehicle.operatorName) || 0;
    names.set(vehicle.operatorName, current + 1);
  }
  return [...names].map(([operatorName, vehicleCount]) => ({ operatorName, vehicleCount }));
}

// ─── Plans ─────────────────────────────────────────────────

// GET /api/subscriptions/plans
router.get("/plans", async (req, res) => {
  // Prices the Super Admin edited are stored, so they have to be loaded before
  // the catalogue is quoted — otherwise a fresh instance quotes the defaults.
  await refreshSubscriptionsFromDb();
  res.json(catalogue);
});

// PUT /api/subscriptions/plans - Super Admin updates pricing
router.put("/plans", async (req, res) => {
  await refreshSubscriptionsFromDb();
  const { platformPrice, platformPlans, fleetTiers } = req.body;

  if (platformPrice !== undefined) {
    const price = Number(platformPrice);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: "platformPrice must be a positive number" });
    }
    catalogue.platform.price = price;
    if (catalogue.platform.plans[0]) catalogue.platform.plans[0].price = price;
  }

  if (platformPlans !== undefined) {
    if (!Array.isArray(platformPlans)) {
      return res.status(400).json({ error: "platformPlans must be an array" });
    }
    for (const incoming of platformPlans) {
      const plan = catalogue.platform.plans.find((p) => p.id === incoming.id);
      if (!plan) {
        return res.status(404).json({ error: `Unknown platform plan: ${incoming.id}` });
      }
      const price = Number(incoming.price);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ error: `Invalid price for plan ${incoming.id}` });
      }
      plan.price = price;
    }
    catalogue.platform.price = catalogue.platform.plans[0]?.price ?? catalogue.platform.price;
  }

  if (fleetTiers !== undefined) {
    if (!Array.isArray(fleetTiers)) {
      return res.status(400).json({ error: "fleetTiers must be an array" });
    }
    for (const incoming of fleetTiers) {
      const tier = catalogue.fleetTiers.find((t) => t.id === incoming.id);
      if (!tier) {
        return res.status(404).json({ error: `Unknown fleet band: ${incoming.id}` });
      }
      const price = Number(incoming.price);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ error: `Invalid price for band ${incoming.id}` });
      }
      tier.price = price;
    }
  }

  try {
    await saveCatalogue();
  } catch (e) {
    console.error("Database save catalogue error:", e);
    const described = describeDatabaseError(e);
    return res.status(described?.status || 503).json({
      error: described?.message || `Could not save the new prices: ${e.message}`
    });
  }

  res.json(catalogue);
});

// ─── Agency subscription state ─────────────────────────────

// GET /api/subscriptions?operatorName=KPN Travels
router.get("/", async (req, res) => {
  const { operatorName } = req.query;
  if (!operatorName) {
    return res.status(400).json({ error: "operatorName query param is required" });
  }

  // A serverless instance starts with no records at all, so what the agency
  // has actually paid for has to be loaded before it can be reported.
  await refreshSubscriptionsFromDb();

  const platform = platformSubFor(operatorName);
  const fleet = fleetSubFor(operatorName);

  res.json({
    operatorName,
    platform: withStatus(platform),
    fleet: withStatus(fleet),
    // The band the agency would be on at its current size, so the portal can
    // show what a renewal costs today.
    fleetTiers: catalogue.fleetTiers
  });
});

// GET /api/subscriptions/overview - Super Admin: every agency at a glance
router.get("/overview", async (req, res) => {
  // Same reason as GET / above: without the stored records this instance knows
  // about no agencies at all and the Super Admin sees an empty table.
  await refreshSubscriptionsFromDb();

  const names = new Set([
    ...platformSubs.map((s) => s.operatorName),
    ...fleetSubs.map((s) => s.operatorName)
  ]);

  const rows = [...names].map((operatorName) => {
    const platform = withStatus(platformSubFor(operatorName));
    const fleet = withStatus(fleetSubFor(operatorName));

    return {
      operatorName,
      platform,
      fleet,
      vehicleCount: fleet?.vehicleCount || 0,
      totalPaid: (platform ? platform.amount : 0) + (fleet ? fleet.amount : 0)
    };
  });

  res.json(rows);
});

// POST /api/subscriptions/platform - pay or renew the platform fee.
// Body: { operatorName, planId? }
router.post("/platform", async (req, res) => {
  const { operatorName, planId } = req.body;
  if (!operatorName || !String(operatorName).trim()) {
    return res.status(400).json({ error: "operatorName is required" });
  }

  await refreshSubscriptionsFromDb();

  if (planId && !catalogue.platform.plans.some((p) => p.id === planId)) {
    return res.status(400).json({
      error: `Unknown plan "${planId}". Choose one of: ${catalogue.platform.plans
        .map((p) => p.id)
        .join(", ")}.`
    });
  }

  const name = String(operatorName).trim();
  const renewal = Boolean(platformSubFor(name));

  // No payment gateway yet, so reaching this endpoint *is* the payment. The
  // record is written the same way it will be once a gateway confirms one, so
  // only the trigger changes later.
  try {
    const sub = await activatePlatformMembership(name, platformPlan(planId));
    return res.status(renewal ? 200 : 201).json(withStatus(sub));
  } catch (e) {
    console.error("Database save platform subscription error:", e);
    const described = describeDatabaseError(e);
    return res.status(described?.status || 503).json({
      error: described?.message || `Could not record the payment: ${e.message}`
    });
  }
});

// POST /api/subscriptions/fleet - pay or renew the whole-fleet fee.
// Body: { operatorName, vehicleCount? }
router.post("/fleet", async (req, res) => {
  const { operatorName, vehicleCount } = req.body;
  if (!operatorName || !String(operatorName).trim()) {
    return res.status(400).json({ error: "operatorName is required" });
  }

  await refreshSubscriptionsFromDb();

  const name = String(operatorName).trim();
  if (!hasActivePlatformMembership(name)) {
    return res.status(402).json({
      error: "Agency platform membership is not active. Pay the platform fee first.",
      reason: "platform-membership-required"
    });
  }

  // The caller may say how big the fleet is; otherwise the band already paid
  // for is kept. Counting vehicles here would import the fleet store and make
  // the two routes circular, so the caller passes it.
  const count = Number(vehicleCount) || fleetSubFor(name)?.vehicleCount || 1;
  const renewal = Boolean(fleetSubFor(name));

  try {
    const sub = await renewFleetSubscription(name, count);
    return res.status(renewal ? 200 : 201).json(withStatus(sub));
  } catch (e) {
    console.error("Database save fleet subscription error:", e);
    const described = describeDatabaseError(e);
    return res.status(described?.status || 503).json({
      error: described?.message || `Could not record the payment: ${e.message}`
    });
  }
});

export default router;
