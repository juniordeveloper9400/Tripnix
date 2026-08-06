import { Router } from "express";

const router = Router();

// In-memory bookings store. Starts empty — bookings arrive from the app.
let bookings = [];

let nextId = 1;

// GET /api/bookings
router.get("/", (req, res) => {
  res.json(bookings);
});

// POST /api/bookings
router.post("/", (req, res) => {
  const { vehicleId, vehicleName, userName, userPhone, startDate, endDate, totalCost } = req.body;
  
  if (!vehicleId || !vehicleName || !userName || !userPhone || !startDate || !endDate || !totalCost) {
    return res.status(400).json({ error: "All booking details (vehicleId, vehicleName, userName, userPhone, startDate, endDate, totalCost) are required" });
  }

  const newBooking = {
    id: nextId++,
    vehicleId: Number(vehicleId),
    vehicleName,
    userName,
    userPhone,
    startDate,
    endDate,
    totalCost: Number(totalCost),
    status: "Pending" // Initial booking status
  };

  bookings.push(newBooking);
  res.status(201).json(newBooking);
});

// PATCH /api/bookings/:id - update booking status (Confirm / Cancel)
router.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const { status } = req.body;
  if (!status || !["Pending", "Confirmed", "Cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid or missing status (must be Pending, Confirmed, or Cancelled)" });
  }

  booking.status = status;
  res.json(booking);
});

// DELETE /api/bookings/:id - user cancellation/deletion
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const exists = bookings.some((b) => b.id === id);
  if (!exists) return res.status(404).json({ error: "Booking not found" });
  bookings = bookings.filter((b) => b.id !== id);
  res.status(204).end();
});

export default router;
