import { Router } from "express";
import { refreshVehiclesFromDb } from "./vehicles.js";
import {
  dbRef,
  databaseConfigured,
  safeKey,
  allocateId,
  describeDatabaseError
} from "../lib/firebase.js";

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_DAYS = 30;

const YEAR_DAYS = 365;

/// Plan catalogue. An agency pays a platform fee — monthly or yearly — plus one
/// flat fee per vehicle, the same amount whatever the vehicle is.
/// Prices are editable by the Super Admin at runtime.
///
/// This is the default only. Whatever the Super Admin has saved is loaded over
/// the top of it, because a catalogue that lived in memory reset to these
/// prices every time a serverless instance was recycled.
let catalogue = {
  currency: "INR",
  currencySymbol: "₹",
  billingPeriod: "month",
  platform: {
    id: "platform",
    name: "Agency Platform Membership",
    // Mirrors the monthly plan so older clients reading a single figure still
    // show the right price. `plans` below is the real catalogue.
    price: 1500,
    durationDays: MONTH_DAYS,
    tagline: "Keeps your travel agency registered and visible on Tripnix",
    plans: [
      {
        id: "monthly",
        label: "1 Month",
        period: "month",
        price: 1500,
        durationDays: MONTH_DAYS
      },
      {
        id: "yearly",
        label: "1 Year",
        period: "year",
        price: 15000,
        durationDays: YEAR_DAYS,
        // 12 months at the monthly rate would be 18,000.
        note: "Best value — two months free"
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
  // One flat fee for every vehicle — bus, traveller or car alike. Kept as a
  // single-entry list so the shape stays stable for existing clients.
  vehicleTiers: [
    {
      id: "vehicle",
      vehicleType: "All",
      label: "All Vehicles",
      seatsLabel: "Bus, Traveller or Car — any seat count",
      price: 999
    }
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
let listingSubs = []; // one per vehicle

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
    renewedAt: raw.renewedAt ?? null
  };
}

/// Merges a stored catalogue over the built-in defaults, so a price the Super
/// Admin never touched keeps its default rather than becoming undefined.
function mergeCatalogue(stored) {
  if (!stored || typeof stored !== "object") return;

  if (stored.platform) {
    catalogue.platform.price = Number(stored.platform.price ?? catalogue.platform.price);
    const storedPlans = Array.isArray(stored.platform.plans) ? stored.platform.plans : [];
    for (const plan of catalogue.platform.plans) {
      const match = storedPlans.find((p) => p && p.id === plan.id);
      if (match && Number.isFinite(Number(match.price))) plan.price = Number(match.price);
    }
  }

  const storedTiers = Array.isArray(stored.vehicleTiers) ? stored.vehicleTiers : [];
  for (const tier of catalogue.vehicleTiers) {
    const match = storedTiers.find((t) => t && t.id === tier.id);
    if (match && Number.isFinite(Number(match.price))) tier.price = Number(match.price);
  }
}

/// Pulls every stored subscription and the saved prices into this process.
///
/// Must be awaited by anything that reads membership or listing state, because
/// a freshly started instance knows nothing until it has run.
export async function refreshSubscriptionsFromDb() {
  if (!databaseConfigured) return;

  try {
    const snap = await subscriptionsRef().get();
    const value = snap.val() || {};

    platformSubs = Object.values(value.platform || {})
      .map(normaliseSub)
      .filter(Boolean);
    listingSubs = Object.values(value.listings || {})
      .map(normaliseSub)
      .filter((s) => s && Number.isFinite(Number(s.vehicleId)))
      .map((s) => ({ ...s, vehicleId: Number(s.vehicleId) }));

    mergeCatalogue(value.catalogue);
  } catch (e) {
    console.error("Database get subscriptions error:", e);
  }
}

async function savePlatformSub(sub) {
  if (!databaseConfigured) return;
  await subscriptionsRef(`platform/${safeKey(sub.operatorName)}`).set(sub);
}

async function saveListingSub(sub) {
  if (!databaseConfigured) return;
  await subscriptionsRef(`listings/${Number(sub.vehicleId)}`).set(sub);
}

async function saveCatalogue() {
  if (!databaseConfigured) return;
  await subscriptionsRef("catalogue").set({
    platform: {
      price: catalogue.platform.price,
      plans: catalogue.platform.plans.map((p) => ({ id: p.id, price: p.price }))
    },
    vehicleTiers: catalogue.vehicleTiers.map((t) => ({ id: t.id, price: t.price }))
  });
}

/// Drops a vehicle's listing when the vehicle itself is deleted, so the agency
/// is not still shown as paying for a bus that no longer exists.
export async function removeListingForVehicle(vehicleId) {
  const id = Number(vehicleId);
  listingSubs = listingSubs.filter((s) => Number(s.vehicleId) !== id);
  if (!databaseConfigured) return;
  try {
    await subscriptionsRef(`listings/${id}`).remove();
  } catch (e) {
    console.error(`Database delete listing ${id} error:`, e);
  }
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

/// The listing plan for a vehicle. One flat fee covers every vehicle, so the
/// type no longer selects between tiers — it is accepted only so callers can
/// keep passing it.
export function tierForVehicle() {
  return catalogue.vehicleTiers[0] || null;
}

/// Looks up a platform plan (monthly / yearly), falling back to the first one.
export function platformPlan(planId) {
  const plans = catalogue.platform.plans;
  const wanted = String(planId || "").toLowerCase();
  return plans.find((p) => p.id.toLowerCase() === wanted) || plans[0];
}

/// The agency's platform membership record, paid or lapsed, or undefined.
function platformSubFor(operatorName) {
  const key = normalise(operatorName);
  return platformSubs.find((s) => normalise(s.operatorName) === key);
}

/// The listing record for one vehicle, paid or lapsed, or undefined.
function listingSubFor(vehicleId) {
  const id = Number(vehicleId);
  return listingSubs.find((s) => Number(s.vehicleId) === id);
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
  const expiresAt = addDays(startsAt, plan.durationDays);

  const sub = {
    id: existing?.id || (await nextSubscriptionId()),
    operatorName: name,
    planId: plan.id,
    planName: `${catalogue.platform.name} (${plan.label})`,
    amount: (existing?.amount || 0) + plan.price,
    startsAt: (existing?.startsAt && new Date(existing.startsAt)) || now,
    expiresAt: expiresAt.toISOString(),
    renewedAt: existing ? now.toISOString() : null
  };
  sub.startsAt = new Date(sub.startsAt).toISOString();

  platformSubs = [...platformSubs.filter((s) => s !== existing), sub];
  await savePlatformSub(sub);
  return sub;
}

/// Records one vehicle's listing fee as paid for a month, and stores it.
export async function activateVehicleListing(operatorName, vehicle) {
  const name = String(operatorName || "").trim();
  const tier = tierForVehicle();
  if (!tier) throw new Error("No vehicle listing plan is configured");

  const existing = listingSubFor(vehicle.id);
  const now = new Date();
  const startsAt = isActive(existing) ? new Date(existing.expiresAt) : now;

  const sub = {
    id: existing?.id || (await nextSubscriptionId()),
    operatorName: name,
    vehicleId: Number(vehicle.id),
    vehicleName: vehicle.name || `Vehicle #${vehicle.id}`,
    tierId: tier.id,
    tierLabel: tier.label,
    amount: (existing?.amount || 0) + tier.price,
    startsAt: new Date(existing?.startsAt || now).toISOString(),
    expiresAt: addDays(startsAt, MONTH_DAYS).toISOString(),
    renewedAt: existing ? now.toISOString() : null
  };

  listingSubs = [...listingSubs.filter((s) => s !== existing), sub];
  await saveListingSub(sub);
  return sub;
}

/// Subscription ids come from the same collision-proof allocator as vehicles
/// and trips, so two instances issuing receipts at once cannot reuse one.
async function nextSubscriptionId() {
  if (!databaseConfigured) {
    return Math.max(0, ...platformSubs.map((s) => s.id), ...listingSubs.map((s) => s.id)) + 1;
  }
  const known = Math.max(
    0,
    ...platformSubs.map((s) => Number(s.id) || 0),
    ...listingSubs.map((s) => Number(s.id) || 0)
  );
  return allocateId("subscriptions", known);
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

/// True when a vehicle may appear in the public traveller app.
///
/// Both fees have to be current: the agency's platform membership keeps the
/// agency itself on the platform, and the per-vehicle listing fee keeps that
/// particular bus visible. Either lapsing hides the bus.
export function isVehiclePubliclyListed(vehicle) {
  if (!vehicle) return false;
  if (!hasActivePlatformMembership(vehicle.operatorName)) return false;
  return isActive(listingSubFor(vehicle.id));
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
  const { platformPrice, platformPlans, tiers } = req.body;

  if (platformPrice !== undefined) {
    const price = Number(platformPrice);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: "platformPrice must be a positive number" });
    }
    catalogue.platform.price = price;
    // Keep the monthly plan and the legacy single figure in step.
    const monthly = catalogue.platform.plans.find((p) => p.id === "monthly");
    if (monthly) monthly.price = price;
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
      if (plan.id === "monthly") catalogue.platform.price = price;
    }
  }

  if (tiers !== undefined) {
    if (!Array.isArray(tiers)) {
      return res.status(400).json({ error: "tiers must be an array" });
    }
    for (const incoming of tiers) {
      const tier = catalogue.vehicleTiers.find((t) => t.id === incoming.id);
      if (!tier) {
        return res.status(404).json({ error: `Unknown tier: ${incoming.id}` });
      }
      const price = Number(incoming.price);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ error: `Invalid price for tier ${incoming.id}` });
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

  const key = normalise(operatorName);

  const platform = platformSubs.find((s) => normalise(s.operatorName) === key);
  const listings = listingSubs.filter((s) => normalise(s.operatorName) === key);

  res.json({
    operatorName,
    platform: withStatus(platform),
    listings: listings.map(withStatus)
  });
});

// GET /api/subscriptions/overview - Super Admin: every agency at a glance
router.get("/overview", async (req, res) => {
  // Same reason as GET / above: without the stored records this instance knows
  // about no agencies at all and the Super Admin sees an empty table.
  await refreshSubscriptionsFromDb();

  const names = new Set([
    ...platformSubs.map((s) => s.operatorName),
    ...listingSubs.map((s) => s.operatorName)
  ]);

  const rows = [...names].map((operatorName) => {
    const key = normalise(operatorName);
    const platform = withStatus(platformSubs.find((s) => normalise(s.operatorName) === key));
    const listings = listingSubs
      .filter((s) => normalise(s.operatorName) === key)
      .map(withStatus);

    return {
      operatorName,
      platform,
      listingCount: listings.length,
      activeListings: listings.filter((l) => l.status === "active").length,
      totalPaid:
        (platform ? platform.amount : 0) + listings.reduce((sum, l) => sum + l.amount, 0)
    };
  });

  res.json(rows);
});

// POST /api/subscriptions/platform - pay or renew the platform fee.
// Body: { operatorName, planId?: "monthly" | "yearly" }
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
  const existing = platformSubFor(name);
  const renewal = Boolean(existing);

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

// POST /api/subscriptions/listing - pay or renew one vehicle's monthly fee
router.post("/listing", async (req, res) => {
  const { operatorName, vehicleId, vehicleName } = req.body;

  if (!operatorName || vehicleId === undefined) {
    return res.status(400).json({ error: "operatorName and vehicleId are required" });
  }

  await refreshSubscriptionsFromDb();

  const name = String(operatorName).trim();
  if (!hasActivePlatformMembership(name)) {
    return res.status(402).json({
      error: "Agency platform membership is not active. Pay the platform fee first."
    });
  }

  if (!tierForVehicle()) {
    return res.status(400).json({ error: "No vehicle listing plan is configured" });
  }

  try {
    const existing = listingSubFor(vehicleId);
    const sub = await activateVehicleListing(name, {
      id: vehicleId,
      name: vehicleName || existing?.vehicleName
    });
    return res.status(existing ? 200 : 201).json(withStatus(sub));
  } catch (e) {
    console.error("Database save listing subscription error:", e);
    const described = describeDatabaseError(e);
    return res.status(described?.status || 503).json({
      error: described?.message || `Could not record the payment: ${e.message}`
    });
  }
});

export default router;
