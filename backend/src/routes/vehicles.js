import { Router } from "express";

const router = Router();

// Initial in-memory fleet of buses and cars with availableDates (YYYY-MM-DD)
let vehicles = [
  {
    id: 1,
    name: "Volvo B11R Multi-Axle",
    type: "Bus",
    operatorName: "KPN Travels",
    pricePerDay: 75.0,
    capacity: 36,
    availableDates: ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-25", "2026-07-28"],
    features: ["AC", "WiFi", "Sleeper Berths", "USB Charger", "Individual Lights", "GPS Tracking"],
    imageUrls: [
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=600"
    ],
    videoUrls: [
      "https://assets.mixkit.co/videos/preview/mixkit-traffic-in-a-highway-of-a-modern-city-43063-large.mp4"
    ],
    description: "Experience premium long-distance travel in the Volvo B11R Multi-Axle. Featuring luxury semi-sleeper seats, individual USB ports, air conditioning, and top-tier safety features.",
    rating: 4.8,
    reviewsCount: 124
  },
  {
    id: 2,
    name: "Scania Touring HD",
    type: "Bus",
    operatorName: "SRS Travels",
    pricePerDay: 85.0,
    capacity: 45,
    availableDates: ["2026-07-20", "2026-07-23", "2026-07-24", "2026-07-25", "2026-07-29"],
    features: ["AC", "WiFi", "Reclining Seats", "Audio System", "Restroom", "Refreshments"],
    imageUrls: [
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600"
    ],
    videoUrls: [
      "https://assets.mixkit.co/videos/preview/mixkit-road-trip-on-a-sunny-day-32833-large.mp4"
    ],
    description: "The Scania Touring HD sets new standards in coach travel. Outfitted with plush reclining seats, onboard chemical restroom, cooling box, and climate control.",
    rating: 4.9,
    reviewsCount: 98
  },
  {
    id: 3,
    name: "Tesla Model Y Performance",
    type: "Car",
    operatorName: "Zabnix Rentals",
    pricePerDay: 130.0,
    capacity: 5,
    availableDates: ["2026-07-21", "2026-07-22", "2026-07-24", "2026-07-26", "2026-07-30"],
    features: ["AC", "Autopilot", "Panoramic Glass Roof", "Premium Sound", "Heated Seats", "Wireless Charging"],
    imageUrls: [
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&q=80&w=600"
    ],
    videoUrls: [
      "https://assets.mixkit.co/videos/preview/mixkit-car-driving-on-a-wet-highway-41603-large.mp4"
    ],
    description: "The Tesla Model Y Performance offers sports car acceleration and unmatched electric efficiency.",
    rating: 4.7,
    reviewsCount: 56
  },
  {
    id: 4,
    name: "Toyota Land Cruiser Prado",
    type: "Car",
    operatorName: "Explorer Travels",
    pricePerDay: 110.0,
    capacity: 7,
    availableDates: ["2026-07-20", "2026-07-22", "2026-07-25", "2026-07-27"],
    features: ["AC", "4WD", "Sunroof", "Spacious Boot", "Leather Seats", "Cruise Control"],
    imageUrls: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600"
    ],
    videoUrls: [
      "https://assets.mixkit.co/videos/preview/mixkit-road-trip-on-a-sunny-day-32833-large.mp4"
    ],
    description: "Conquer any terrain with the Toyota Land Cruiser Prado. A luxury 4WD SUV designed to provide maximum comfort.",
    rating: 4.6,
    reviewsCount: 42
  }
];

let nextId = 5;

// GET /api/vehicles (supports ?date=YYYY-MM-DD & ?operatorName=...)
router.get("/", (req, res) => {
  const { date, operatorName } = req.query;
  let result = vehicles;

  if (operatorName) {
    result = result.filter(
      (v) => v.operatorName.toLowerCase() === operatorName.toLowerCase()
    );
  }

  if (date) {
    const formattedDate = date.trim();
    result = result.filter(
      (v) => Array.isArray(v.availableDates) && v.availableDates.includes(formattedDate)
    );
  }

  res.json(result);
});

// GET /api/vehicles/:id
router.get("/:id", (req, res) => {
  const vehicle = vehicles.find((v) => v.id === Number(req.params.id));
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  res.json(vehicle);
});

// POST /api/vehicles
router.post("/", (req, res) => {
  const { name, type, operatorName, pricePerDay, capacity, availableDates, features, imageUrls, videoUrls, description } = req.body;
  if (!name || !type || !capacity) {
    return res.status(400).json({ error: "name, type, and capacity are required" });
  }

  const parsedAvailableDates = Array.isArray(availableDates)
    ? availableDates.map((d) => String(d).trim()).filter(Boolean)
    : [];

  const newVehicle = {
    id: nextId++,
    name,
    type,
    operatorName: operatorName || "My Travels",
    pricePerDay: Number(pricePerDay || 0),
    capacity: Number(capacity),
    availableDates: parsedAvailableDates,
    features: Array.isArray(features) ? features : [],
    imageUrls: Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : ["https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600"],
    videoUrls: Array.isArray(videoUrls) && videoUrls.length > 0 ? videoUrls : ["https://assets.mixkit.co/videos/preview/mixkit-traffic-in-a-highway-of-a-modern-city-43063-large.mp4"],
    description: description || "No description provided.",
    rating: 5.0,
    reviewsCount: 0
  };

  vehicles.push(newVehicle);
  res.status(201).json(newVehicle);
});

// PUT /api/vehicles/:id
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = vehicles.findIndex((v) => v.id === id);
  if (index === -1) return res.status(404).json({ error: "Vehicle not found" });

  const { name, type, operatorName, pricePerDay, capacity, availableDates, features, imageUrls, videoUrls, description } = req.body;

  const parsedAvailableDates = Array.isArray(availableDates)
    ? availableDates.map((d) => String(d).trim()).filter(Boolean)
    : vehicles[index].availableDates;

  vehicles[index] = {
    ...vehicles[index],
    name: name || vehicles[index].name,
    type: type || vehicles[index].type,
    operatorName: operatorName || vehicles[index].operatorName,
    pricePerDay: pricePerDay !== undefined ? Number(pricePerDay) : vehicles[index].pricePerDay,
    capacity: capacity !== undefined ? Number(capacity) : vehicles[index].capacity,
    availableDates: parsedAvailableDates,
    features: Array.isArray(features) ? features : vehicles[index].features,
    imageUrls: Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : vehicles[index].imageUrls,
    videoUrls: Array.isArray(videoUrls) && videoUrls.length > 0 ? videoUrls : vehicles[index].videoUrls,
    description: description || vehicles[index].description
  };

  res.json(vehicles[index]);
});

// DELETE /api/vehicles/:id
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const exists = vehicles.some((v) => v.id === id);
  if (!exists) return res.status(404).json({ error: "Vehicle not found" });
  vehicles = vehicles.filter((v) => v.id !== id);
  res.status(204).end();
});

export default router;
