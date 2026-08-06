import { Router } from "express";
import {
  hasActivePlatformMembership,
  isVehiclePubliclyListed,
  listedAgencies,
  autoActivateVehicleListing
} from "./subscriptions.js";
import { removeTripsForVehicle } from "./trips.js";

const router = Router();

// Fleet list. Pre-seeded with active default vehicles so travellers always have vehicles to browse,
// and newly added vehicles are appended and listed immediately.
let vehicles = [
  {
    id: 1,
    name: "Volvo B11R Multi-Axle",
    type: "Bus",
    vehicleNumber: "TN 01 AB 1234",
    operatorName: "KPN Travels",
    pricePerDay: 15000,
    capacity: 42,
    availableDates: [],
    features: ["AC", "WiFi", "Sleeper Berths", "USB Charger", "Restroom"],
    imageUrls: ["https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600"],
    videoUrls: ["https://assets.mixkit.co/videos/preview/mixkit-traffic-in-a-highway-of-a-modern-city-43063-large.mp4"],
    description: "Premium ultra-luxury multi-axle sleeper bus with climate control.",
    instagramUrl: "https://instagram.com/kpntravels",
    rating: 4.9,
    reviewsCount: 128
  },
  {
    id: 2,
    name: "Force Traveller 3350 Luxury",
    type: "Traveller",
    vehicleNumber: "TN 37 CD 5678",
    operatorName: "Royal Travels",
    pricePerDay: 4500,
    capacity: 12,
    availableDates: [],
    features: ["AC", "WiFi", "Audio System", "USB Charger"],
    imageUrls: ["https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600"],
    videoUrls: ["https://assets.mixkit.co/videos/preview/mixkit-traffic-in-a-highway-of-a-modern-city-43063-large.mp4"],
    description: "Comfortable 12-seater mini coach ideal for hill tours and family trips.",
    instagramUrl: "https://instagram.com/royaltravels",
    rating: 4.8,
    reviewsCount: 94
  }
];

let nextId = 3;

// Pre-activate default seeded vehicles
vehicles.forEach((v) => autoActivateVehicleListing(v.operatorName, v.id, v.type));

/// Lookup helpers for other routes (trips) — avoids duplicating the store.
export function findVehicle(id) {
  return vehicles.find((v) => v.id === Number(id));
}

export function allVehicles() {
  return vehicles;
}

// GET /api/vehicles (supports ?date=YYYY-MM-DD, ?operatorName=... & ?listed=true)
router.get("/", (req, res) => {
  const { date, operatorName, listed } = req.query;
  let result = vehicles;

  // The traveller app passes listed=true so only listed vehicles are shown.
  if (listed === "true") {
    result = result.filter(isVehiclePubliclyListed);
  }

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

// GET /api/vehicles/agencies - registered agencies visible to travellers.
// Declared before /:id so "agencies" isn't parsed as an id.
router.get("/agencies", (req, res) => {
  res.json(listedAgencies(vehicles));
});

// GET /api/vehicles/:id
router.get("/:id", (req, res) => {
  const vehicle = vehicles.find((v) => v.id === Number(req.params.id));
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  res.json(vehicle);
});

// POST /api/vehicles
router.post("/", (req, res) => {
  const { name, type, vehicleNumber, operatorName, pricePerDay, capacity, availableDates, features, imageUrls, videoUrls, description, instagramUrl } = req.body;
  if (!name || !type || !capacity) {
    return res.status(400).json({ error: "name, type, and capacity are required" });
  }
  if (!vehicleNumber || !String(vehicleNumber).trim()) {
    return res.status(400).json({ error: "vehicleNumber is required" });
  }

  const owner = operatorName || "My Travels";
  hasActivePlatformMembership(owner);

  const parsedAvailableDates = Array.isArray(availableDates)
    ? availableDates.map((d) => String(d).trim()).filter(Boolean)
    : [];

  const newVehicle = {
    id: nextId++,
    name,
    type,
    vehicleNumber: String(vehicleNumber).trim().toUpperCase(),
    operatorName: owner,
    pricePerDay: Number(pricePerDay || 0),
    capacity: Number(capacity),
    availableDates: parsedAvailableDates,
    features: Array.isArray(features) ? features : [],
    imageUrls: Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : ["https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600"],
    videoUrls: Array.isArray(videoUrls) && videoUrls.length > 0 ? videoUrls : ["https://assets.mixkit.co/videos/preview/mixkit-traffic-in-a-highway-of-a-modern-city-43063-large.mp4"],
    description: description || "No description provided.",
    instagramUrl: instagramUrl ? String(instagramUrl).trim() : "",
    rating: 5.0,
    reviewsCount: 0
  };

  vehicles.push(newVehicle);
  autoActivateVehicleListing(owner, newVehicle.id, newVehicle.type);
  res.status(201).json(newVehicle);
});

// PUT /api/vehicles/:id
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = vehicles.findIndex((v) => v.id === id);
  if (index === -1) return res.status(404).json({ error: "Vehicle not found" });

  const { name, type, vehicleNumber, operatorName, pricePerDay, capacity, availableDates, features, imageUrls, videoUrls, description, instagramUrl } = req.body;

  const parsedAvailableDates = Array.isArray(availableDates)
    ? availableDates.map((d) => String(d).trim()).filter(Boolean)
    : vehicles[index].availableDates;

  vehicles[index] = {
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
    imageUrls: Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : vehicles[index].imageUrls,
    videoUrls: Array.isArray(videoUrls) && videoUrls.length > 0 ? videoUrls : vehicles[index].videoUrls,
    description: description || vehicles[index].description,
    instagramUrl: instagramUrl !== undefined ? String(instagramUrl).trim() : (vehicles[index].instagramUrl || "")
  };

  res.json(vehicles[index]);
});

// DELETE /api/vehicles/:id
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const exists = vehicles.some((v) => v.id === id);
  if (!exists) return res.status(404).json({ error: "Vehicle not found" });
  vehicles = vehicles.filter((v) => v.id !== id);
  removeTripsForVehicle(id);
  res.status(204).end();
});

export default router;
