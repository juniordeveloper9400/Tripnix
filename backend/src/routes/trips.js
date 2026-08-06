import { Router } from "express";
import { findVehicle } from "./vehicles.js";
import { isVehiclePubliclyListed } from "./subscriptions.js";

const router = Router();

// Trips posted by agencies against one of their buses. These are what the
// traveller app shows in the stories bar at the top of the showcase.
let trips = [];
let nextId = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

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
    // "Status based on the bus" — whether the vehicle is still subscribed and
    // therefore visible to travellers.
    busListed: vehicle ? isVehiclePubliclyListed(vehicle) : false,
    vehicleName: vehicle?.name ?? trip.vehicleName,
    vehicleNumber: vehicle?.vehicleNumber ?? trip.vehicleNumber,
    vehicleType: vehicle?.type ?? trip.vehicleType,
    seats: vehicle?.capacity ?? null
  };
}

// GET /api/trips (?operatorName=... & ?listed=true)
router.get("/", (req, res) => {
  const { operatorName, listed } = req.query;
  let result = trips.map(decorate);

  if (operatorName) {
    result = result.filter(
      (t) => t.operatorName.toLowerCase() === String(operatorName).toLowerCase()
    );
  }

  // The traveller app asks for listed=true: only trips whose bus is live, and
  // never trips that have already finished.
  if (listed === "true") {
    result = result.filter((t) => t.busListed && t.status !== "Completed");
  }

  // Soonest departure first.
  result.sort((a, b) =>
    String(a.departureDate).localeCompare(String(b.departureDate))
  );
  res.json(result);
});

// GET /api/trips/:id
router.get("/:id", (req, res) => {
  const trip = trips.find((t) => t.id === Number(req.params.id));
  if (!trip) return res.status(404).json({ error: "Trip not found" });
  res.json(decorate(trip));
});

// POST /api/trips - an agency posts a trip against one of its buses
router.post("/", (req, res) => {
  const { operatorName, vehicleId, place, departureDate, arrivalDate, imageUrl, note } =
    req.body;

  if (!operatorName || !vehicleId || !place || !departureDate || !arrivalDate) {
    return res.status(400).json({
      error:
        "operatorName, vehicleId, place, departureDate and arrivalDate are required"
    });
  }

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

  const trip = {
    id: nextId++,
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
  res.status(201).json(decorate(trip));
});

// DELETE /api/trips/:id
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const exists = trips.some((t) => t.id === id);
  if (!exists) return res.status(404).json({ error: "Trip not found" });
  trips = trips.filter((t) => t.id !== id);
  res.status(204).end();
});

/// Drops a vehicle's trips when the vehicle itself is deleted.
export function removeTripsForVehicle(vehicleId) {
  trips = trips.filter((t) => t.vehicleId !== Number(vehicleId));
}

export default router;
