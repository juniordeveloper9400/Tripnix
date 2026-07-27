import { Router } from "express";

const router = Router();

// In-memory demo data. Replace with a real database later.
let trips = [
  { id: 1, title: "Weekend in Goa", destination: "Goa, India", days: 3 },
  { id: 2, title: "Himalayan Trek", destination: "Manali, India", days: 7 },
];
let nextId = 3;

// GET /api/trips
router.get("/", (req, res) => {
  res.json(trips);
});

// GET /api/trips/:id
router.get("/:id", (req, res) => {
  const trip = trips.find((t) => t.id === Number(req.params.id));
  if (!trip) return res.status(404).json({ error: "Trip not found" });
  res.json(trip);
});

// POST /api/trips
router.post("/", (req, res) => {
  const { title, destination, days } = req.body;
  if (!title || !destination) {
    return res.status(400).json({ error: "title and destination are required" });
  }
  const trip = { id: nextId++, title, destination, days: days ?? 1 };
  trips.push(trip);
  res.status(201).json(trip);
});

// DELETE /api/trips/:id
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const exists = trips.some((t) => t.id === id);
  if (!exists) return res.status(404).json({ error: "Trip not found" });
  trips = trips.filter((t) => t.id !== id);
  res.status(204).end();
});

export default router;
