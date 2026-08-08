import { Router } from "express";
import { findVehicle, allVehicles, refreshVehiclesFromDb } from "./vehicles.js";
import { isVehiclePubliclyListed } from "./subscriptions.js";
import {
  dbRef,
  databaseConfigured,
  snapshotToArray,
  allocateId,
  describeDatabaseError
} from "../lib/firebase.js";

const router = Router();

// Trips posted by agencies against one of their buses. These are what the
// traveller app shows in the stories bar at the top of the showcase.
let trips = [];
let nextId = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

function tripsRef() {
  return databaseConfigured ? dbRef("trips") : null;
}

/// The highest trip id this process has seen.
function highestKnownId() {
  return trips.reduce((max, t) => Math.max(max, Number(t.id) || 0), nextId - 1);
}

/// Reserves an id for a new trip through the shared database counter, so two
/// serverless instances cannot hand out the same one and overwrite each
/// other's trips.
async function reserveTripId() {
  if (!databaseConfigured) return nextId++;
  const id = await allocateId("trips", highestKnownId());
  if (id >= nextId) nextId = id + 1;
  return id;
}

/// Midnight today, so a trip departing today counts as running.
function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDate(value) {
  const d = new Date(`${String(value).trim()}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/// Where the trip sits relative to today.
function tripStatus(trip) {
  const now = today().getTime();
  const departure = parseDate(trip.departureDate);
  const arrival = parseDate(trip.arrivalDate);
  if (!departure || !arrival) return "Scheduled";
  if (now < departure.getTime()) return "Upcoming";
  if (now > arrival.getTime()) return "Completed";
  return "On Trip";
}

/// Decorates a stored trip with its live status and the bus it runs on.
function decorate(trip) {
  const vehicle = findVehicle(trip.vehicleId);
  const departure = parseDate(trip.departureDate);
  const arrival = parseDate(trip.arrivalDate);
  const durationDays =
    departure && arrival
      ? Math.max(1, Math.round((arrival - departure) / DAY_MS) + 1)
      : 1;

  return {
    ...trip,
    durationDays,
    status: tripStatus(trip),
    busListed: vehicle ? isVehiclePubliclyListed(vehicle) : false,
    vehicleName: vehicle?.name ?? trip.vehicleName,
    vehicleNumber: vehicle?.vehicleNumber ?? trip.vehicleNumber,
    vehicleType: vehicle?.type ?? trip.vehicleType,
    seats: vehicle?.capacity ?? null
  };
}

/// Strips the traveller's contact details off a booking-derived trip.
///
/// Anyone can read the public feed and a vehicle's schedule, so those views
/// show only *that* the bus is taken — never who took it.
export function redactTrip(trip) {
  const { customerName, customerPhone, ...rest } = trip;
  if (trip.kind !== "booking") return rest;
  return {
    ...rest,
    place: "Booked",
    note: "",
    isBooked: true
  };
}

/// Loads stored trips into this process.
export async function refreshTripsFromDb() {
  if (!databaseConfigured) return trips;
  try {
    const snap = await tripsRef().get();
    const stored = snapshotToArray(snap);
    if (stored.length) {
      const map = new Map();
      trips.forEach((t) => map.set(t.id, t));
      stored.forEach((t) => map.set(t.id, t));
      trips = Array.from(map.values());
      trips.forEach((t) => {
        const value = Number(t.id);
        if (Number.isFinite(value) && value >= nextId) nextId = value + 1;
      });
    }
  } catch (e) {
    console.error("Database get trips error:", e);
  }
  return trips;
}

/// Every trip booked against one vehicle, newest departure first.
export function tripsForVehicle(vehicleId) {
  return trips
    .filter((t) => Number(t.vehicleId) === Number(vehicleId))
    .map(decorate)
    .sort((a, b) => String(a.departureDate).localeCompare(String(b.departureDate)));
}

// GET /api/trips (?operatorName=... & ?listed=true)
router.get("/", async (req, res) => {
  const { operatorName, listed } = req.query;

  // Each trip is decorated with the bus it runs on, so an unloaded fleet marks
  // every trip as belonging to an unlisted bus — which hides them from the
  // traveller feed and flags them "bus not subscribed" in the admin table.
  await refreshVehiclesFromDb();

  if (databaseConfigured) {
    try {
      const snap = await tripsRef().get();
      const stored = snapshotToArray(snap);
      if (stored.length) {
        const map = new Map();
        trips.forEach((t) => map.set(t.id, t));
        stored.forEach((t) => map.set(t.id, t));
        trips = Array.from(map.values());
      }
    } catch (e) {
      console.error("Database get trips error:", e);
    }
  }

  let result = trips.map(decorate);

  if (operatorName) {
    result = result.filter(
      (t) => t.operatorName.toLowerCase() === String(operatorName).toLowerCase()
    );
  }

  if (listed === "true") {
    result = result.filter((t) => t.busListed && t.status !== "Completed");
  }

  // Only an agency asking for its own trips sees traveller contact details;
  // the public feed never does.
  if (!operatorName) {
    result = result.map(redactTrip);
  }

  result.sort((a, b) =>
    String(a.departureDate).localeCompare(String(b.departureDate))
  );
  res.json(result);
});

// GET /api/trips/fleet-status
router.get("/fleet-status", async (req, res) => {
  // The status bar lists one row per listed vehicle, so the fleet has to be
  // loaded before the trips are matched against it.
  await refreshVehiclesFromDb();

  if (databaseConfigured) {
    try {
      const snap = await tripsRef().get();
      const stored = snapshotToArray(snap);
      if (stored.length) {
        const map = new Map();
        trips.forEach((t) => map.set(t.id, t));
        stored.forEach((t) => map.set(t.id, t));
        trips = Array.from(map.values());
      }
    } catch (e) {
      console.error("Database get trips for fleet status error:", e);
    }
  }

  /// One tile in the app's status bar. Built field by field rather than by
  /// spreading the trip, so a booking's customer name and phone can never leak
  /// into this public feed.
  const row = (vehicle, trip) => ({
    id: trip.id,
    tripId: trip.id,
    operatorName: vehicle.operatorName,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    vehicleNumber: vehicle.vehicleNumber,
    vehicleType: vehicle.type,
    seats: vehicle.capacity,
    place: trip.place,
    departureDate: trip.departureDate,
    arrivalDate: trip.arrivalDate,
    durationDays: trip.durationDays,
    imageUrl: trip.imageUrl || (vehicle.imageUrls && vehicle.imageUrls[0]) || "",
    note: trip.note,
    status: trip.status,
    // When the status was posted. The app plays statuses in the order they were
    // added, oldest first, so it needs this rather than the travel dates.
    createdAt: trip.createdAt || "",
    busListed: true
  });

  // Only trips an agency has actually posted become a status. A listed bus with
  // nothing scheduled used to emit an "Available" tile, which filled the bar
  // with every bus on the platform whether or not it had anything to say.
  //
  // An agency can run one bus on several trips, so each of those gets its own
  // tile.
  const rows = allVehicles()
    .filter(isVehiclePubliclyListed)
    .flatMap((vehicle) =>
      trips
        .filter((t) => Number(t.vehicleId) === Number(vehicle.id))
        .map(decorate)
        .filter((t) => t.status !== "Completed")
        // Customer bookings keep the bus busy but are not advertised: a tile
        // per booking would publish on which dates a stranger booked it.
        .filter((t) => t.kind !== "booking")
        .sort((a, b) => String(a.departureDate).localeCompare(String(b.departureDate)))
        .map((t) => row(vehicle, t))
    );

  const rank = { "On Trip": 0, Upcoming: 1 };
  rows.sort((a, b) => {
    const byStatus = (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
    if (byStatus !== 0) return byStatus;
    // Within a status the soonest departure leads, so the bar reads as a
    // timeline rather than in insertion order.
    return String(a.departureDate).localeCompare(String(b.departureDate));
  });

  res.json(rows);
});

// GET /api/trips/:id
router.get("/:id", async (req, res) => {
  await refreshVehiclesFromDb();
  await refreshTripsFromDb();
  const trip = trips.find((t) => t.id === Number(req.params.id));
  if (!trip) return res.status(404).json({ error: "Trip not found" });
  res.json(decorate(trip));
});

// POST /api/trips - an agency posts a trip against one of its buses
router.post("/", async (req, res) => {
  const { operatorName, vehicleId, place, departureDate, arrivalDate, imageUrl, note } =
    req.body;

  if (!operatorName || !vehicleId || !place || !departureDate || !arrivalDate) {
    return res.status(400).json({
      error:
        "operatorName, vehicleId, place, departureDate and arrivalDate are required"
    });
  }

  // A freshly started process holds an empty fleet and no trips, so without
  // these two the lookup below answered "Vehicle not found" for a bus the
  // agency could plainly see in the picker, and `nextId` restarted at 1 —
  // overwriting an already stored trip.
  await refreshVehiclesFromDb();
  await refreshTripsFromDb();

  const vehicle = findVehicle(Number(vehicleId));
  if (!vehicle) {
    return res.status(404).json({ error: "Vehicle not found" });
  }
  if (
    vehicle.operatorName.toLowerCase() !== String(operatorName).trim().toLowerCase()
  ) {
    return res.status(403).json({ error: "That vehicle belongs to another agency" });
  }
  if (!isVehiclePubliclyListed(vehicle)) {
    return res.status(402).json({
      error: `${vehicle.name} has no active subscription, so trips on it would not be visible. Subscribe the vehicle first.`
    });
  }

  const departure = parseDate(departureDate);
  const arrival = parseDate(arrivalDate);
  if (!departure || !arrival) {
    return res.status(400).json({ error: "Dates must be in YYYY-MM-DD format" });
  }
  if (arrival < departure) {
    return res
      .status(400)
      .json({ error: "Arrival date cannot be before the departure date" });
  }

  let id;
  try {
    id = await reserveTripId();
  } catch (e) {
    console.error("Trip id allocation error:", e);
    return res.status(503).json({
      error: "Could not reserve an id for this trip. Please try again."
    });
  }

  const trip = {
    id,
    operatorName: vehicle.operatorName,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    vehicleNumber: vehicle.vehicleNumber,
    vehicleType: vehicle.type,
    place: String(place).trim(),
    departureDate: String(departureDate).trim(),
    arrivalDate: String(arrivalDate).trim(),
    imageUrl:
      (imageUrl && String(imageUrl).trim()) ||
      (vehicle.imageUrls && vehicle.imageUrls[0]) ||
      "",
    note: (note || "").trim(),
    createdAt: new Date().toISOString()
  };

  trips.push(trip);

  if (databaseConfigured) {
    try {
      await tripsRef().child(String(trip.id)).set(trip);
    } catch (e) {
      // Same reason as the vehicle save: reporting "posted" for a trip that
      // only exists in this instance's memory is how a trip vanishes from the
      // traveller app an hour later.
      console.error("Database save trip error:", e);
      trips = trips.filter((t) => t.id !== trip.id);
      const described = describeDatabaseError(e);
      return res.status(described?.status || 503).json({
        error: described?.message || `Could not save the trip: ${e.message}`
      });
    }
  }

  res.status(201).json(decorate(trip));
});

// DELETE /api/trips/:id
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  // Without this a stored trip is invisible to a process that has not loaded
  // it yet, so Delete answered "Trip not found" and the row stayed put.
  await refreshTripsFromDb();
  const exists = trips.some((t) => t.id === id);
  if (!exists) return res.status(404).json({ error: "Trip not found" });

  trips = trips.filter((t) => t.id !== id);

  if (databaseConfigured) {
    try {
      await tripsRef().child(String(id)).remove();
    } catch (e) {
      console.error("Database delete trip error:", e);
    }
  }

  res.status(204).end();
});

/// Drops a vehicle's trips when the vehicle itself is deleted.
///
/// The stored copies have to go too: dropping them from memory alone left them
/// in the database, so the next process to load trips brought back a row for a
/// bus that no longer exists.
export async function removeTripsForVehicle(vehicleId) {
  await refreshTripsFromDb();

  const doomed = trips.filter((t) => Number(t.vehicleId) === Number(vehicleId));
  trips = trips.filter((t) => Number(t.vehicleId) !== Number(vehicleId));

  if (!databaseConfigured) return;
  for (const trip of doomed) {
    try {
      await tripsRef().child(String(trip.id)).remove();
    } catch (e) {
      console.error(`Database delete trip ${trip.id} for removed vehicle error:`, e);
    }
  }
}

/// Creates a trip entry when a customer booking is made so it displays on the status bar.
///
/// The traveller's name and phone are kept in dedicated fields rather than
/// baked into `place` / `note`, because those two are shown publicly — putting
/// them there published one customer's contact details to every other user.
export async function addTripFromBooking(booking, vehicle) {
  // Shares the same collision-proof counter as a posted trip — a booking that
  // reused an id would overwrite whatever trip already held it.
  await refreshTripsFromDb();
  const trip = {
    id: await reserveTripId(),
    bookingId: booking.id,
    kind: "booking",
    operatorName: vehicle.operatorName,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    vehicleNumber: vehicle.vehicleNumber,
    vehicleType: vehicle.type,
    place: "Booked",
    departureDate: String(booking.startDate).trim(),
    arrivalDate: String(booking.endDate).trim(),
    imageUrl: (vehicle.imageUrls && vehicle.imageUrls[0]) || "",
    note: "",
    customerName: booking.userName,
    customerPhone: booking.userPhone,
    createdAt: new Date().toISOString()
  };
  trips.push(trip);

  if (databaseConfigured) {
    try {
      tripsRef().child(String(trip.id)).set(trip).catch((e) => {
        console.error("Database save trip from booking error:", e);
      });
    } catch (_) {}
  }

  return decorate(trip);
}

/// Removes a trip associated with a cancelled/deleted booking.
export function removeTripForBooking(bookingId) {
  const found = trips.find((t) => t.bookingId === Number(bookingId));
  trips = trips.filter((t) => t.bookingId !== Number(bookingId));

  if (found && databaseConfigured) {
    try {
      tripsRef().child(String(found.id)).remove().catch((e) => {
        console.error("Database delete trip for booking error:", e);
      });
    } catch (_) {}
  }
}

export default router;
