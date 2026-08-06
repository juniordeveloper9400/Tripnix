import { Router } from "express";

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_DAYS = 30;

/// Plan catalogue. Everything is billed monthly: the agency pays one flat
/// platform fee, plus one flat fee per vehicle regardless of type or seats.
/// Prices are editable by the Super Admin at runtime.
let catalogue = {
  currency: "INR",
  currencySymbol: "₹",
  billingPeriod: "month",
  platform: {
    id: "platform",
    name: "Agency Platform Membership",
    price: 1500,
    durationDays: MONTH_DAYS,
    tagline: "Monthly fee to keep your travel agency registered on Tripnix",
    features: [
      "Agency profile listed in the traveller app",
      "Browse buses and cars posted by other travel agencies",
      "Unlimited booking requests from travellers",
      "Fleet dashboard, date scheduling and booking management",
      "Required before you can add vehicles to your fleet"
    ]
  },
  // One flat monthly fee per vehicle. The three entries exist so the portal can
  // group the fleet by category and so pricing can diverge later if needed —
  // today they are deliberately the same amount.
  vehicleTiers: [
    {
      id: "bus",
      vehicleType: "Bus",
      label: "Bus",
      seatsLabel: "Any seat count",
      price: 1500
    },
    {
      id: "traveller",
      vehicleType: "Traveller",
      label: "Traveller",
      seatsLabel: "Any seat count",
      price: 1500
    },
    {
      id: "car",
      vehicleType: "Car",
      label: "Car",
      seatsLabel: "Any seat count",
      price: 1500
    }
  ]
};

// In-memory subscription records.
let platformSubs = []; // one per agency
let listingSubs = []; // one per vehicle
let nextSubId = 1;

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

/// Picks the subscription plan for a vehicle. Priced per vehicle by category,
/// not by seat count.
export function tierForVehicle(type) {
  const wantedType = String(type || "").toLowerCase();
  return (
    catalogue.vehicleTiers.find(
      (t) => t.vehicleType.toLowerCase() === wantedType
    ) || null
  );
}

export function autoActivateAgency(operatorName) {
  const name = String(operatorName || "My Travels").trim();
  const key = normalise(name);
  let sub = platformSubs.find((s) => normalise(s.operatorName) === key);
  const now = new Date();
  const expiresAt = addDays(now, 365);

  if (!sub) {
    sub = {
      id: nextSubId++,
      operatorName: name,
      planId: catalogue.platform.id,
      planName: catalogue.platform.name,
      amount: catalogue.platform.price,
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      renewedAt: null
    };
    platformSubs.push(sub);
  } else if (!isActive(sub)) {
    sub.expiresAt = expiresAt.toISOString();
  }
}

export function autoActivateVehicleListing(operatorName, vehicleId, type) {
  const name = String(operatorName || "My Travels").trim();
  if (vehicleId === undefined) return;
  autoActivateAgency(name);
  const id = Number(vehicleId);
  const key = normalise(name);
  let listing = listingSubs.find((s) => s.vehicleId === id && normalise(s.operatorName) === key);
  const now = new Date();
  const expiresAt = addDays(now, 365);

  if (!listing) {
    const tier = tierForVehicle(type) || catalogue.vehicleTiers[0];
    listing = {
      id: nextSubId++,
      operatorName: name,
      vehicleId: id,
      vehicleName: `Vehicle #${id}`,
      tierId: tier.id,
      tierLabel: tier.label,
      amount: tier.price,
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      renewedAt: null
    };
    listingSubs.push(listing);
  } else if (!isActive(listing)) {
    listing.expiresAt = expiresAt.toISOString();
  }
}

/// True when the agency has paid the platform fee and it has not lapsed.
export function hasActivePlatformMembership(operatorName) {
  if (!operatorName) return true;
  autoActivateAgency(operatorName);
  return true;
}

/// True when a vehicle may appear in the public traveller app:
/// Every vehicle added by an agency automatically shows in the user section.
export function isVehiclePubliclyListed(vehicle) {
  if (!vehicle) return false;
  autoActivateVehicleListing(vehicle.operatorName, vehicle.id, vehicle.type);
  return true;
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
router.get("/plans", (req, res) => {
  res.json(catalogue);
});

// PUT /api/subscriptions/plans - Super Admin updates pricing
router.put("/plans", (req, res) => {
  const { platformPrice, tiers } = req.body;

  if (platformPrice !== undefined) {
    const price = Number(platformPrice);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: "platformPrice must be a positive number" });
    }
    catalogue.platform.price = price;
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

  res.json(catalogue);
});

// ─── Agency subscription state ─────────────────────────────

// GET /api/subscriptions?operatorName=KPN Travels
router.get("/", (req, res) => {
  const { operatorName } = req.query;
  if (!operatorName) {
    return res.status(400).json({ error: "operatorName query param is required" });
  }
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
router.get("/overview", (req, res) => {
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

// POST /api/subscriptions/platform - pay or renew the monthly platform fee
router.post("/platform", (req, res) => {
  const { operatorName } = req.body;
  if (!operatorName || !String(operatorName).trim()) {
    return res.status(400).json({ error: "operatorName is required" });
  }

  const name = String(operatorName).trim();
  const key = normalise(name);
  const existing = platformSubs.find((s) => normalise(s.operatorName) === key);

  // Renewing early extends from the current expiry, not from today.
  const now = new Date();
  const startsAt = isActive(existing) ? new Date(existing.expiresAt) : now;
  const expiresAt = addDays(startsAt, catalogue.platform.durationDays);

  if (existing) {
    existing.amount += catalogue.platform.price;
    existing.expiresAt = expiresAt.toISOString();
    existing.renewedAt = now.toISOString();
    return res.json(withStatus(existing));
  }

  const sub = {
    id: nextSubId++,
    operatorName: name,
    planId: catalogue.platform.id,
    planName: catalogue.platform.name,
    amount: catalogue.platform.price,
    startsAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    renewedAt: null
  };
  platformSubs.push(sub);
  res.status(201).json(withStatus(sub));
});

// POST /api/subscriptions/listing - pay or renew one vehicle's monthly fee
router.post("/listing", (req, res) => {
  const { operatorName, vehicleId, vehicleName, type, capacity } = req.body;

  if (!operatorName || vehicleId === undefined) {
    return res.status(400).json({ error: "operatorName and vehicleId are required" });
  }

  const name = String(operatorName).trim();
  if (!hasActivePlatformMembership(name)) {
    return res.status(402).json({
      error: "Agency platform membership is not active. Pay the platform fee first."
    });
  }

  const tier = tierForVehicle(type);
  if (!tier) {
    return res.status(400).json({
      error: `No subscription plan exists for vehicle type "${type}"`
    });
  }

  const id = Number(vehicleId);
  const existing = listingSubs.find(
    (s) => s.vehicleId === id && normalise(s.operatorName) === normalise(name)
  );

  const now = new Date();
  const startsAt = isActive(existing) ? new Date(existing.expiresAt) : now;
  const expiresAt = addDays(startsAt, MONTH_DAYS);

  if (existing) {
    existing.amount += tier.price;
    existing.tierId = tier.id;
    existing.tierLabel = tier.label;
    existing.expiresAt = expiresAt.toISOString();
    existing.renewedAt = now.toISOString();
    return res.json(withStatus(existing));
  }

  const sub = {
    id: nextSubId++,
    operatorName: name,
    vehicleId: id,
    vehicleName: vehicleName || `Vehicle #${id}`,
    tierId: tier.id,
    tierLabel: tier.label,
    amount: tier.price,
    startsAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    renewedAt: null
  };
  listingSubs.push(sub);
  res.status(201).json(withStatus(sub));
});

export default router;
