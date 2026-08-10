import { Router } from "express";
import {
  hasActivePlatformMembership,
  isVehiclePubliclyListed,
  listedAgencies,
  activateFleetSubscription,
  refreshSubscriptionsFromDb,
  fleetTierFor,
  creditHeldDays
} from "./subscriptions.js";
import {
  removeTripsForVehicle,
  refreshTripsFromDb,
  tripsForVehicle,
  redactTrip
} from "./trips.js";
import {
  dbRef,
  databaseConfigured,
  snapshotToArray,
  allocateId,
  describeDatabaseError
} from "../lib/firebase.js";

const router = Router();

/// Fleet cache for this process. Deliberately empty: the traveller app shows
/// exactly the vehicles travel agencies have added, so demo buses can never be
/// mistaken for a real listing. Records are loaded from the database on read
/// and appended as agencies add them.
let vehicles = [];

/// Vehicle ids must not collide with rows already stored in the database, so
/// the counter is nudged past whatever has been loaded.
let nextId = 1;

function rememberId(id) {
  const value = Number(id);
  if (Number.isFinite(value) && value >= nextId) nextId = value + 1;
}

/// The highest vehicle id this process has seen, so the shared counter is never
/// asked for an id that is already taken.
function highestKnownId() {
  return vehicles.reduce((max, v) => Math.max(max, Number(v.id) || 0), nextId - 1);
}

/// Reserves an id for a new vehicle. Backed by a database transaction so two
/// serverless instances can never hand out the same one; falls back to the
/// local counter only when there is no database to coordinate through.
async function reserveVehicleId() {
  if (!databaseConfigured) return nextId++;
  const id = await allocateId("vehicles", highestKnownId());
  rememberId(id);
  return id;
}

/// Fills in every field a vehicle record is expected to have.
///
/// The Realtime Database does not store empty arrays or empty objects at all,
/// so a vehicle saved with no photos comes back with `imageUrls` missing
/// entirely. Writing that `undefined` straight back is rejected outright, which
/// silently broke editing — so records are normalised on the way in and out.
function normaliseVehicle(raw) {
  return {
    ...raw,
    id: Number(raw.id),
    name: raw.name ?? "",
    type: raw.type ?? "Bus",
    vehicleNumber: raw.vehicleNumber ?? "",
    operatorName: raw.operatorName ?? "",
    pricePerDay: Number(raw.pricePerDay ?? 0),
    capacity: Number(raw.capacity ?? 0),
    availableDates: Array.isArray(raw.availableDates) ? raw.availableDates : [],
    features: Array.isArray(raw.features) ? raw.features : [],
    imageUrls: Array.isArray(raw.imageUrls) ? raw.imageUrls : [],
    videoUrls: Array.isArray(raw.videoUrls) ? raw.videoUrls : [],
    description: raw.description ?? "",
    instagramUrl: raw.instagramUrl ?? "",
    rating: Number(raw.rating ?? 5),
    reviewsCount: Number(raw.reviewsCount ?? 0),
    createdAt: raw.createdAt ?? new Date().toISOString(),

    // A bus off the road — in the workshop, or otherwise unable to run. It stays
    // in the agency's fleet but drops out of the traveller app until it is
    // brought back, and the days it sat out are added to the fleet plan.
    onHold: Boolean(raw.onHold),
    heldSince: raw.heldSince ?? null,
    holdReason: raw.holdReason ?? "",
    // Every past hold, so an agency can see why a bus was off the road and for
    // how long, and so the credited days can be audited against the plan.
    holdHistory: Array.isArray(raw.holdHistory) ? raw.holdHistory : []
  };
}

/// Whole days a bus has been on hold, counting the day it went on hold.
///
/// Inclusive because a bus pulled off the road this morning is already not
/// earning today — charging the agency for today would be the thing the credit
/// exists to prevent.
export function heldDaysSince(heldSince, until = new Date()) {
  const from = new Date(heldSince);
  if (Number.isNaN(from.getTime())) return 0;
  const startDay = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const endDay = Date.UTC(until.getFullYear(), until.getMonth(), until.getDate());
  return Math.max(1, Math.round((endDay - startDay) / 86400000) + 1);
}

function vehiclesRef() {
  return databaseConfigured ? dbRef("vehicles") : null;
}

/// YYYY-MM-DD in local time.
///
/// toISOString() would convert to UTC first, which in any timezone ahead of it
/// (IST is +5:30) rolls every date back by one day — a bus booked the 8th to
/// the 10th would show as taken from the 7th.
function isoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/// Expands each schedule entry's departure→arrival window into the individual
/// dates it occupies, so a calendar can grey out everything already taken.
function bookedDatesFor(entries) {
  const dates = new Set();

  for (const entry of entries) {
    if (entry.status === "Completed") continue;

    const from = new Date(`${String(entry.departureDate).trim()}T00:00:00`);
    const to = new Date(`${String(entry.arrivalDate).trim()}T00:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) continue;

    // Step by whole days from the departure date rather than adding
    // milliseconds, so a DST shift can't skip or repeat a day.
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      dates.add(isoDate(d));
    }
  }

  return [...dates].sort();
}

/// Pulls the stored fleet into this process. Both the vehicle list and the
/// trips fleet-status view read the same in-memory array, so they must load
/// through here or the two disagree depending on which is called first.
export async function refreshVehiclesFromDb() {
  if (!databaseConfigured) return vehicles;

  // Whether a vehicle is publicly listed, and whether its agency may add one at
  // all, are decided by the stored subscriptions — so they load first, before
  // any early return. Loading a vehicle used to *grant* it a listing, which is
  // why every bus went live whether or not its fee had been paid.
  await refreshSubscriptionsFromDb();

  try {
    const snap = await vehiclesRef().get();
    const stored = snapshotToArray(snap);
    if (!stored.length) return vehicles;

    const map = new Map();
    vehicles.forEach((v) => map.set(v.id, v));
    stored.map(normaliseVehicle).forEach((v) => map.set(v.id, v));
    vehicles = Array.from(map.values());

    vehicles.forEach((v) => rememberId(v.id));
  } catch (e) {
    console.error("Database get vehicles error:", e);
  }

  return vehicles;
}

/// Lookup helpers for other routes (trips) — avoids duplicating the store.
export function findVehicle(id) {
  return vehicles.find((v) => v.id === Number(id));
}

export function allVehicles() {
  return vehicles;
}

// GET /api/vehicles (supports ?date=YYYY-MM-DD, ?operatorName=... & ?listed=true)
router.get("/", async (req, res) => {
  const { date, operatorName, listed } = req.query;
  let result = await refreshVehiclesFromDb();

  // The traveller app passes listed=true so only listed vehicles are shown.
  if (listed === "true") {
    result = result.filter(isVehiclePubliclyListed);
  }

  if (operatorName) {
    result = result.filter(
      (v) => v.operatorName.toLowerCase() === String(operatorName).toLowerCase()
    );
  }

  if (date) {
    const formattedDate = String(date).trim();
    result = result.filter(
      (v) => Array.isArray(v.availableDates) && v.availableDates.includes(formattedDate)
    );
  }

  res.json(result);
});

// GET /api/vehicles/agencies - registered agencies visible to travellers.
router.get("/agencies", async (req, res) => {
  res.json(listedAgencies(await refreshVehiclesFromDb()));
});

// GET /api/vehicles/:id/schedule - the diary for one vehicle.
//
// Public by default: travellers see which dates are taken but never who took
// them. Passing ?operatorName= that matches the owner returns the full detail
// the agency needs to run the bus.
router.get("/:id/schedule", async (req, res) => {
  const id = Number(req.params.id);
  const fleet = await refreshVehiclesFromDb();
  const vehicle = fleet.find((v) => v.id === id);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

  await refreshTripsFromDb();

  const asOwner =
    String(req.query.operatorName || "").trim().toLowerCase() ===
    String(vehicle.operatorName || "").trim().toLowerCase();
  const owned = Boolean(req.query.operatorName) && asOwner;

  const entries = tripsForVehicle(id).map((t) => (owned ? t : redactTrip(t)));

  res.json({
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    vehicleNumber: vehicle.vehicleNumber,
    vehicleType: vehicle.type,
    operatorName: vehicle.operatorName,
    seats: vehicle.capacity,
    // Dates the agency marked as available when adding the bus.
    availableDates: vehicle.availableDates,
    // Every date already taken, so a calendar can grey them out.
    bookedDates: bookedDatesFor(entries),
    detailVisible: owned,
    entries
  });
});

// GET /api/vehicles/:id
router.get("/:id", async (req, res) => {
  const fleet = await refreshVehiclesFromDb();
  const vehicle = fleet.find((v) => v.id === Number(req.params.id));
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  res.json(vehicle);
});

// POST /api/vehicles
router.post("/", async (req, res) => {
  const { name, type, vehicleNumber, operatorName, pricePerDay, capacity, availableDates, features, imageUrls, videoUrls, description, instagramUrl } = req.body;
  if (!name || !type || !capacity) {
    return res.status(400).json({ error: "name, type, and capacity are required" });
  }
  if (!vehicleNumber || !String(vehicleNumber).trim()) {
    return res.status(400).json({ error: "vehicleNumber is required" });
  }

  // The fleet has to be loaded before an id is reserved, or this process has
  // no idea which ids are already taken. Loading it also loads the stored
  // subscriptions, which the membership check below depends on.
  await refreshVehiclesFromDb();

  const owner = String(operatorName || "").trim();
  if (!owner) {
    return res.status(400).json({ error: "operatorName is required" });
  }

  // The platform fee comes first: an agency that has not paid it cannot put
  // vehicles on the platform at all.
  if (!hasActivePlatformMembership(owner)) {
    return res.status(402).json({
      error:
        `${owner} does not have an active platform membership. ` +
        "Pay the platform fee on the Tripnix site, then add your vehicles.",
      reason: "platform-membership-required"
    });
  }

  // The fleet fee is priced by how many vehicles the agency will have once
  // this one is added, so the band is worked out from the new size.
  const fleetSizeAfter =
    vehicles.filter((v) => v.operatorName.toLowerCase() === owner.toLowerCase()).length + 1;
  const tier = fleetTierFor(fleetSizeAfter);
  if (!tier) {
    return res.status(400).json({ error: "No fleet plan is configured" });
  }

  let id;
  try {
    id = await reserveVehicleId();
  } catch (e) {
    console.error("Vehicle id allocation error:", e);
    return res.status(503).json({
      error: "Could not reserve an id for this vehicle. Please try again."
    });
  }

  const parsedAvailableDates = Array.isArray(availableDates)
    ? availableDates.map((d) => String(d).trim()).filter(Boolean)
    : [];

  const newVehicle = normaliseVehicle({
    id,
    name,
    type,
    vehicleNumber: String(vehicleNumber).trim().toUpperCase(),
    operatorName: owner,
    pricePerDay: Number(pricePerDay || 0),
    capacity: Number(capacity),
    availableDates: parsedAvailableDates,
    features: Array.isArray(features) ? features : [],
    imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
    videoUrls: Array.isArray(videoUrls) ? videoUrls : [],
    description: description || "No description provided.",
    instagramUrl: instagramUrl ? String(instagramUrl).trim() : "",
    rating: 5.0,
    reviewsCount: 0,
    createdAt: new Date().toISOString()
  });

  vehicles.push(newVehicle);

  if (databaseConfigured) {
    try {
      await vehiclesRef().child(String(newVehicle.id)).set(newVehicle);
    } catch (e) {
      // A swallowed write is what makes a bus "disappear": the agency is told
      // the save worked, the record survives only in this instance's memory,
      // and it is gone the moment that instance is recycled. Report it.
      console.error("Database save vehicle error:", e);
      vehicles = vehicles.filter((v) => v.id !== newVehicle.id);
      const described = describeDatabaseError(e);
      return res.status(described?.status || 503).json({
        error: described?.message || `Could not save ${newVehicle.name}: ${e.message}`
      });
    }
  }

  // One fee covers the whole fleet, so adding a vehicle charges nothing while
  // the fleet stays inside its paid band, and only the difference up to the
  // next band's price when it crosses one. Until a payment gateway exists the
  // add itself stands in for the payment; when one arrives, only this call
  // moves behind its confirmation.
  let fleet = null;
  try {
    fleet = await activateFleetSubscription(owner, fleetSizeAfter);
  } catch (e) {
    // The bus is saved but the fleet is unlisted rather than lost. It stays
    // invisible to travellers until the fee is settled from the Subscription
    // page, which is recoverable — deleting the vehicle here would not be.
    console.error("Fleet subscription activation error:", e);
    return res.status(201).json({
      ...newVehicle,
      fleet: null,
      listingWarning:
        `${newVehicle.name} was saved, but the ${tier.label} fleet fee could not be ` +
        "recorded, so your vehicles are not visible to travellers yet. " +
        "Pay it from the Subscription page."
    });
  }

  res.status(201).json({ ...newVehicle, fleet });
});

// PUT /api/vehicles/:id
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  // Without this a freshly started process holds an empty fleet, so editing a
  // stored vehicle answered "Vehicle not found" and the Edit button did nothing.
  await refreshVehiclesFromDb();
  const index = vehicles.findIndex((v) => v.id === id);
  if (index === -1) return res.status(404).json({ error: "Vehicle not found" });

  const { name, type, vehicleNumber, operatorName, pricePerDay, capacity, availableDates, features, imageUrls, videoUrls, description, instagramUrl } = req.body;

  const parsedAvailableDates = Array.isArray(availableDates)
    ? availableDates.map((d) => String(d).trim()).filter(Boolean)
    : vehicles[index].availableDates;

  vehicles[index] = normaliseVehicle({
    ...vehicles[index],
    name: name || vehicles[index].name,
    type: type || vehicles[index].type,
    vehicleNumber: vehicleNumber
      ? String(vehicleNumber).trim().toUpperCase()
      : vehicles[index].vehicleNumber,
    operatorName: operatorName || vehicles[index].operatorName,
    pricePerDay: pricePerDay !== undefined ? Number(pricePerDay) : vehicles[index].pricePerDay,
    capacity: capacity !== undefined ? Number(capacity) : vehicles[index].capacity,
    availableDates: parsedAvailableDates,
    features: Array.isArray(features) ? features : vehicles[index].features,
    // An empty array is a deliberate "remove all media", so it must be honoured
    // rather than treated as "field omitted".
    imageUrls: Array.isArray(imageUrls) ? imageUrls : vehicles[index].imageUrls,
    videoUrls: Array.isArray(videoUrls) ? videoUrls : vehicles[index].videoUrls,
    description: description || vehicles[index].description,
    instagramUrl: instagramUrl !== undefined ? String(instagramUrl).trim() : (vehicles[index].instagramUrl || "")
  });

  if (databaseConfigured) {
    try {
      await vehiclesRef().child(String(id)).update(vehicles[index]);
    } catch (e) {
      console.error("Database update vehicle error:", e);
    }
  }

  res.json(vehicles[index]);
});

// ─── Holding a bus off the road ────────────────────────────

/// Every date from `from` up to and including `to`, as YYYY-MM-DD.
function datesBetween(from, to) {
  const dates = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    dates.push(isoDate(d));
  }
  return dates;
}

// POST /api/vehicles/:id/hold - take a bus off the app (workshop, repairs)
router.post("/:id/hold", async (req, res) => {
  const id = Number(req.params.id);
  const { operatorName, reason } = req.body;

  await refreshVehiclesFromDb();
  const index = vehicles.findIndex((v) => v.id === id);
  if (index === -1) return res.status(404).json({ error: "Vehicle not found" });

  const vehicle = vehicles[index];
  if (
    operatorName &&
    String(vehicle.operatorName).trim().toLowerCase() !==
      String(operatorName).trim().toLowerCase()
  ) {
    return res.status(403).json({ error: "That vehicle belongs to another agency" });
  }
  if (vehicle.onHold) {
    return res.status(409).json({ error: `${vehicle.name} is already on hold` });
  }

  const patch = {
    onHold: true,
    heldSince: isoDate(new Date()),
    holdReason: String(reason || "").trim()
  };
  vehicles[index] = { ...vehicle, ...patch };

  if (databaseConfigured) {
    try {
      await vehiclesRef().child(String(id)).update(patch);
    } catch (e) {
      console.error("Database hold vehicle error:", e);
      vehicles[index] = vehicle;
      const described = describeDatabaseError(e);
      return res.status(described?.status || 503).json({
        error: described?.message || `Could not hold ${vehicle.name}: ${e.message}`
      });
    }
  }

  res.json(vehicles[index]);
});

// POST /api/vehicles/:id/resume - put the bus back on the app
//
// The days it sat out are added to the agency's fleet plan, so a bus in the
// workshop does not burn the visibility the agency paid for.
router.post("/:id/resume", async (req, res) => {
  const id = Number(req.params.id);
  const { operatorName } = req.body;

  await refreshVehiclesFromDb();
  const index = vehicles.findIndex((v) => v.id === id);
  if (index === -1) return res.status(404).json({ error: "Vehicle not found" });

  const vehicle = vehicles[index];
  if (
    operatorName &&
    String(vehicle.operatorName).trim().toLowerCase() !==
      String(operatorName).trim().toLowerCase()
  ) {
    return res.status(403).json({ error: "That vehicle belongs to another agency" });
  }
  if (!vehicle.onHold) {
    return res.status(409).json({ error: `${vehicle.name} is not on hold` });
  }

  const from = new Date(`${vehicle.heldSince}T00:00:00`);
  const today = new Date();
  const held = Number.isNaN(from.getTime()) ? [] : datesBetween(from, today);
  const days = held.length;

  const entry = {
    from: vehicle.heldSince,
    to: isoDate(today),
    days,
    reason: vehicle.holdReason || ""
  };

  const patch = {
    onHold: false,
    heldSince: null,
    holdReason: "",
    holdHistory: [...(vehicle.holdHistory || []), entry]
  };
  vehicles[index] = { ...vehicle, ...patch };

  if (databaseConfigured) {
    try {
      await vehiclesRef().child(String(id)).update(patch);
    } catch (e) {
      console.error("Database resume vehicle error:", e);
      vehicles[index] = vehicle;
      const described = describeDatabaseError(e);
      return res.status(described?.status || 503).json({
        error: described?.message || `Could not bring ${vehicle.name} back: ${e.message}`
      });
    }
  }

  // Crediting is separate from the vehicle write on purpose: if it fails the
  // bus is still back on the app, which is the part the agency asked for.
  let credit = { credited: 0, sub: null };
  try {
    credit = await creditHeldDays(vehicle.operatorName, held);
  } catch (e) {
    console.error("Fleet plan credit error:", e);
  }

  res.json({
    ...vehicles[index],
    hold: {
      days,
      from: entry.from,
      to: entry.to,
      // Days actually added — fewer than `days` when another bus was already
      // on hold over the same dates and those days have been credited once.
      creditedDays: credit.credited,
      fleetExpiresAt: credit.sub?.expiresAt || null
    }
  });
});

// DELETE /api/vehicles/:id
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await refreshVehiclesFromDb();
  const exists = vehicles.some((v) => v.id === id);
  if (!exists) return res.status(404).json({ error: "Vehicle not found" });

  vehicles = vehicles.filter((v) => v.id !== id);
  await removeTripsForVehicle(id);
  // The fleet fee is not per vehicle, so removing one does not cancel anything.
  // The agency keeps the band it paid for until the subscription is renewed, at
  // which point it renews at whatever band its fleet size is by then.

  if (databaseConfigured) {
    try {
      await vehiclesRef().child(String(id)).remove();
    } catch (e) {
      console.error("Database delete vehicle error:", e);
    }
  }

  res.status(204).end();
});

export default router;
