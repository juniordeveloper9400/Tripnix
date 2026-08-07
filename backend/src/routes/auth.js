import { Router } from "express";
import {
  dbRef,
  databaseConfigured,
  authConfigured,
  configReport,
  describeDatabaseError,
  snapshotToArray,
  safeKey,
  verifyPassword,
  createAuthUser,
  deleteAuthUser,
  loginEmailFor
} from "../lib/firebase.js";

const router = Router();

const COLLECTION = "agencies";

const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || "superadmin";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "";

function agencies() {
  return dbRef(COLLECTION);
}

/// Agency accounts exist only in Firebase, so every route here depends on it.
///
/// This used to fall back to an in-memory store, which meant a deployment
/// missing its credentials would invent an account for any username and
/// password and answer 200 — a broken deploy was indistinguishable from a
/// working one, and the sign-in was wide open to anyone. Refusing loudly is the
/// only answer that cannot be mistaken for success.
function firebaseUnavailable(res) {
  if (databaseConfigured && authConfigured) return false;
  const cfg = configReport();
  res.status(503).json({
    error:
      "Accounts are unavailable: this server has no Firebase configuration. " +
      `Missing ${cfg.missing.join(", ")}. See /api/auth/health for details.`
  });
  return true;
}

function docIdFor(username) {
  return safeKey(username);
}

/// Single place that turns a thrown error into a response, so an infrastructure
/// problem reaches the user as an instruction rather than a gRPC status code.
function sendError(res, err, context) {
  if (err?.status) {
    return res.status(err.status).json({ error: err.message });
  }

  const described = describeDatabaseError(err);
  if (described) {
    console.error(`${context}:`, described.message);
    return res.status(described.status).json({ error: described.message });
  }

  console.error(`${context}:`, err);
  return res.status(500).json({ error: err?.message || `${context} failed` });
}

function publicProfileData(data) {
  return {
    id: data.username,
    username: data.username,
    operatorName: data.operatorName,
    ownerName: data.ownerName || "",
    phone: data.phone || "",
    email: data.email || "",
    role: data.role,
    registeredAt: data.registeredAt || null
  };
}

/// Accepts a Realtime Database snapshot or a plain record.
function publicProfile(snapshot) {
  const a = typeof snapshot?.val === "function" ? snapshot.val() : snapshot;
  return publicProfileData(a);
}

async function createAgency({
  username,
  password,
  operatorName,
  ownerName,
  phone,
  email,
  role
}) {
  const id = docIdFor(username);
  const operatorLower = String(operatorName).trim().toLowerCase();

  const existing = await agencies().child(id).get();
  if (existing.exists()) {
    const err = new Error("That username is already taken");
    err.status = 409;
    throw err;
  }

  // Needs ".indexOn": "operatorNameLower" on /agencies in the database rules,
  // otherwise the server sorts the whole node in memory on every signup.
  const nameTaken = await agencies()
    .orderByChild("operatorNameLower")
    .equalTo(operatorLower)
    .limitToFirst(1)
    .get();
  if (nameTaken.exists()) {
    const err = new Error("That travel agency is already registered");
    err.status = 409;
    throw err;
  }

  let uid;
  try {
    uid = await createAuthUser({
      username: id,
      password,
      displayName: operatorName
    });
  } catch (e) {
    if (e?.code === "auth/email-already-exists") {
      const err = new Error("That username is already taken");
      err.status = 409;
      throw err;
    }
    if (e?.code === "auth/invalid-password") {
      const err = new Error("Password must be at least 6 characters");
      err.status = 400;
      throw err;
    }
    throw e;
  }

  const record = {
    uid,
    username: id,
    loginEmail: loginEmailFor(id),
    operatorName: String(operatorName).trim(),
    operatorNameLower: operatorLower,
    ownerName: (ownerName || "").trim(),
    phone: (phone || "").trim(),
    email: (email || "").trim(),
    role: role || "admin",
    registeredAt: new Date().toISOString()
  };

  try {
    await agencies().child(id).set(record);
  } catch (e) {
    await deleteAuthUser(uid);
    throw e;
  }

  // A new agency starts with no membership on purpose. Granting one here is
  // what made the platform fee unenforceable: signing up was enough to be
  // treated as a paying agency, so nobody ever had to pay it.
  return record;
}

let seedChecked = false;
async function ensureSuperAdmin() {
  if (seedChecked || !databaseConfigured || !SUPER_ADMIN_PASSWORD) return;
  seedChecked = true;
  try {
    const id = docIdFor(SUPER_ADMIN_USERNAME);
    const doc = await agencies().child(id).get();
    if (doc.exists()) return;
    await createAgency({
      username: id,
      password: SUPER_ADMIN_PASSWORD,
      operatorName: "Developer / Super Admin",
      role: "superadmin"
    });
    console.log(`Seeded Super Admin account "${id}".`);
  } catch (err) {
    console.error("Could not seed Super Admin:", err.message);
  }
}

// POST /api/auth/login - one username + password
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  if (firebaseUnavailable(res)) return;

  const id = docIdFor(username);

  try {
    await ensureSuperAdmin();

    const credentials = await verifyPassword(username, password);
    if (!credentials) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const doc = await agencies().child(id).get();
    if (!doc.exists()) {
      return res.status(404).json({ error: "No agency profile for this login" });
    }

    return res.json(publicProfile(doc));
  } catch (err) {
    return sendError(res, err, "Login failed");
  }
});

// GET /api/auth/health - what is actually wired up, for diagnosing sign-in.
// Credentials being present is not the same as the database being reachable,
// so this actually touches the database rather than only reading the config.
router.get("/health", async (req, res) => {
  const report = configReport();

  let databaseReachable = false;
  let databaseError = null;

  if (report.databaseConfigured) {
    try {
      await agencies().limitToFirst(1).get();
      databaseReachable = true;
    } catch (err) {
      databaseError = describeDatabaseError(err)?.message || err.message;
    }
  }

  const ok = report.databaseConfigured && report.authConfigured && databaseReachable;

  res.status(ok ? 200 : 503).json({
    ...report,
    databaseReachable,
    databaseError,
    mode: report.databaseConfigured ? "firebase" : "unconfigured",
    accountsPersisted: ok,
    registrationWorks: ok,
    signInWorks: ok
  });
});

// POST /api/auth/register - self-serve agency signup
router.post("/register", async (req, res) => {
  const { operatorName, ownerName, phone, email, username, password } = req.body;

  if (!operatorName || !username || !password) {
    return res
      .status(400)
      .json({ error: "Travel agency name, username and password are required" });
  }

  if (firebaseUnavailable(res)) return;

  try {
    await ensureSuperAdmin();
    const record = await createAgency({
      username,
      password,
      operatorName,
      ownerName,
      phone,
      email,
      role: "admin"
    });

    res.status(201).json({
      id: record.username,
      username: record.username,
      operatorName: record.operatorName,
      phone: record.phone,
      role: record.role,
      persisted: true,
      nextStep:
        "Use this same username and password to sign in to the admin portal."
    });
  } catch (err) {
    sendError(res, err, "Registration failed");
  }
});

// GET /api/auth/agency-contact
router.get("/agency-contact", async (req, res) => {
  const { operatorName } = req.query;
  if (!operatorName) {
    return res.status(400).json({ error: "operatorName query param is required" });
  }

  if (firebaseUnavailable(res)) return;

  const targetLower = String(operatorName).trim().toLowerCase();

  try {
    const snap = await agencies()
      .orderByChild("operatorNameLower")
      .equalTo(targetLower)
      .limitToFirst(1)
      .get();

    if (!snap.exists()) return res.status(404).json({ error: "Agency not found" });

    const a = snapshotToArray(snap)[0];
    return res.json({
      operatorName: a.operatorName,
      ownerName: a.ownerName || "",
      phone: a.phone || "",
      email: a.email || ""
    });
  } catch (err) {
    return sendError(res, err, "Contact lookup failed");
  }
});

// GET /api/auth/admins
router.get("/admins", async (req, res) => {
  if (firebaseUnavailable(res)) return;

  try {
    const snap = await agencies().get();
    const rows = snapshotToArray(snap)
      .map(publicProfileData)
      .sort((a, b) => String(a.registeredAt).localeCompare(String(b.registeredAt)));
    return res.json(rows);
  } catch (err) {
    return sendError(res, err, "Admin list failed");
  }
});

// POST /api/auth/admins
router.post("/admins", async (req, res) => {
  const { username, password, operatorName, ownerName, phone, email } = req.body;

  if (!username || !password || !operatorName) {
    return res
      .status(400)
      .json({ error: "Username, password, and operatorName are required" });
  }

  if (firebaseUnavailable(res)) return;

  try {
    const record = await createAgency({
      username,
      password,
      operatorName,
      ownerName,
      phone,
      email,
      role: "admin"
    });
    res.status(201).json({
      id: record.username,
      username: record.username,
      operatorName: record.operatorName,
      phone: record.phone,
      role: record.role
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    sendError(res, err, "Create admin failed");
  }
});

// DELETE /api/auth/admins/:id
router.delete("/admins/:id", async (req, res) => {
  if (firebaseUnavailable(res)) return;

  const id = docIdFor(req.params.id);

  try {
    const doc = await agencies().child(id).get();
    if (!doc.exists()) return res.status(404).json({ error: "Admin not found" });

    const data = doc.val();
    if (data.role === "superadmin") {
      return res.status(403).json({ error: "Cannot delete Super Admin account" });
    }

    await deleteAuthUser(data.uid);
    await agencies().child(id).remove();
    return res.status(204).end();
  } catch (err) {
    return sendError(res, err, "Delete admin failed");
  }
});

/// Used by other routes that need to confirm an agency exists.
export async function findAgencyByOperatorName(operatorName) {
  if (!databaseConfigured) return null;

  const targetLower = String(operatorName).trim().toLowerCase();
  const snap = await agencies()
    .orderByChild("operatorNameLower")
    .equalTo(targetLower)
    .limitToFirst(1)
    .get();
  return snap.exists() ? snapshotToArray(snap)[0] : null;
}

export default router;
