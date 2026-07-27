import { Router } from "express";

const router = Router();

// In-memory list of admins (Super Admin + Pre-created Travel Owner accounts)
let admins = [
  {
    id: 1,
    username: "superadmin",
    password: "superadmin123",
    operatorName: "Developer / Super Admin",
    role: "superadmin"
  },
  {
    id: 2,
    username: "kpnadmin",
    password: "pass123",
    operatorName: "KPN Travels",
    role: "admin"
  },
  {
    id: 3,
    username: "srsadmin",
    password: "pass123",
    operatorName: "SRS Travels",
    role: "admin"
  }
];

let nextAdminId = 4;

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const user = admins.find(
    (a) => a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  res.json({
    id: user.id,
    username: user.username,
    operatorName: user.operatorName,
    role: user.role
  });
});

// GET /api/auth/admins - List all admins (for Super Admin)
router.get("/admins", (req, res) => {
  const safeAdmins = admins.map(({ id, username, password, operatorName, role }) => ({
    id,
    username,
    password, // Included so Super Admin can view created passwords
    operatorName,
    role
  }));
  res.json(safeAdmins);
});

// POST /api/auth/admins - Create new Admin (Super Admin action)
router.post("/admins", (req, res) => {
  const { username, password, operatorName } = req.body;

  if (!username || !password || !operatorName) {
    return res.status(400).json({ error: "Username, password, and operatorName are required" });
  }

  const exists = admins.some(
    (a) => a.username.toLowerCase() === username.trim().toLowerCase()
  );

  if (exists) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const newAdmin = {
    id: nextAdminId++,
    username: username.trim(),
    password: password.trim(),
    operatorName: operatorName.trim(),
    role: "admin"
  };

  admins.push(newAdmin);

  res.status(201).json({
    id: newAdmin.id,
    username: newAdmin.username,
    password: newAdmin.password,
    operatorName: newAdmin.operatorName,
    role: newAdmin.role
  });
});

// DELETE /api/auth/admins/:id
router.delete("/admins/:id", (req, res) => {
  const id = Number(req.params.id);
  const admin = admins.find((a) => a.id === id);

  if (!admin) {
    return res.status(404).json({ error: "Admin not found" });
  }

  if (admin.role === "superadmin") {
    return res.status(403).json({ error: "Cannot delete Super Admin account" });
  }

  admins = admins.filter((a) => a.id !== id);
  res.status(204).end();
});

export default router;
