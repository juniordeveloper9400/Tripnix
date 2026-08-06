import { Router } from "express";
import { findVehicle, refreshVehiclesFromDb } from "./vehicles.js";
import { addTripFromBooking, removeTripForBooking } from "./trips.js";
import { dbRef, databaseConfigured, snapshotToArray } from "../lib/firebase.js";

const router = Router();

// In-memory bookings store. Starts empty — bookings arrive from the app.
let bookings = [];

let nextId = 1;

function bookingsRef() {
  return databaseConfigured ? dbRef("bookings") : null;
}

// GET /api/bookings
router.get("/", async (req, res) => {
  if (databaseConfigured) {
    try {
      const snap = await bookingsRef().get();
      return res.json(snapshotToArray(snap));
    } catch (e) {
      console.error("Database get bookings error:", e);
    }
  }
  res.json(bookings);
});

// POST /api/bookings
router.post("/", async (req, res) => {
  const { vehicleId, vehicleName, userName, userPhone, startDate, endDate } = req.body;

  // Deliberately no cost: agencies don't set a rate, and the old check rejected
  // every booking because `!totalCost` is true for a price of zero.
  if (!vehicleId || !vehicleName || !userName || !userPhone || !startDate || !endDate) {
    return res.status(400).json({
      error:
        "All booking details (vehicleId, vehicleName, userName, userPhone, startDate, endDate) are required"
    });
  }

  const numericVehicleId = Number(vehicleId);
  // Without this a freshly started process has an empty fleet, so the booking
  // would not find its vehicle and no status entry would be created.
  await refreshVehiclesFromDb();
  const vehicle = findVehicle(numericVehicleId);

  const newBooking = {
    id: nextId++,
    vehicleId: numericVehicleId,
    vehicleName,
    userName,
    userPhone,
    startDate,
    endDate,
    status: "Pending", // Initial booking status
    createdAt: new Date().toISOString()
  };

  bookings.push(newBooking);

  // If vehicle is found, automatically post this booking to fleet status as a trip
  if (vehicle) {
    try {
      addTripFromBooking(newBooking, vehicle);
    } catch (e) {
      console.error("Error adding trip from booking:", e);
    }
  }

  if (databaseConfigured) {
    try {
      await bookingsRef().child(String(newBooking.id)).set(newBooking);
    } catch (e) {
      console.error("Database save booking error:", e);
    }
  }

  res.status(201).json(newBooking);
});

// PATCH /api/bookings/:id - update booking status (Confirm / Cancel)
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const { status } = req.body;
  if (!status || !["Pending", "Confirmed", "Cancelled"].includes(status)) {
    return res
      .status(400)
      .json({ error: "Invalid or missing status (must be Pending, Confirmed, or Cancelled)" });
  }

  booking.status = status;

  if (status === "Cancelled") {
    removeTripForBooking(id);
  }

  if (databaseConfigured) {
    try {
      await bookingsRef().child(String(id)).update({ status });
    } catch (e) {
      console.error("Database update booking status error:", e);
    }
  }

  res.json(booking);
});

// DELETE /api/bookings/:id - user cancellation/deletion
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const exists = bookings.some((b) => b.id === id);
  if (!exists) return res.status(404).json({ error: "Booking not found" });

  bookings = bookings.filter((b) => b.id !== id);
  removeTripForBooking(id);

  if (databaseConfigured) {
    try {
      await bookingsRef().child(String(id)).remove();
    } catch (e) {
      console.error("Database delete booking error:", e);
    }
  }

  res.status(204).end();
});

export default router;
