import { Router } from "express";
import {
  dbRef,
  databaseConfigured,
  configReport,
  describeDatabaseError,
  snapshotToArray,
  safeKey,
  verifyPassword,
  createAuthUser,
  deleteAuthUser,
  loginEmailFor
} from "../lib/firebase.js";
import { autoActivateAgency } from "./subscriptions.js";

const router = Router();

const COLLECTION = "agencies";

const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || "superadmin";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "";

// In-memory store when Firebase is not configured locally
const memoryAgencies = new Map();

function agencies() {
  return databaseConfigured ? dbRef(COLLECTION) : null;
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

  if (databaseConfigured) {
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

    autoActivateAgency(record.operatorName);
    return record;
  } else {
    // In-memory fallback mode
    if (memoryAgencies.has(id)) {
      const err = new Error("That username is already taken");
      err.status = 409;
      throw err;
    }

    for (const [, agency] of memoryAgencies.entries()) {
      if (agency.operatorNameLower === operatorLower) {
        const err = new Error("That travel agency is already registered");
        err.status = 409;
        throw err;
      }
    }

    const record = {
      uid: `mem-${id}`,
      username: id,
      password,
      loginEmail: loginEmailFor(id),
      operatorName: String(operatorName).trim(),
      operatorNameLower: operatorLower,
      ownerName: (ownerName || "").trim(),
      phone: (phone || "").trim(),
      email: (email || "").trim(),
      role: role || "admin",
      registeredAt: new Date().toISOString()
    };

    memoryAgencies.set(id, record);
    autoActivateAgency(record.operatorName);
    return record;
  }
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

  const id = docIdFor(username);

  // The database holds the agency profiles, so whenever it is configured it is the
  // only source of truth — never quietly fall back to the memory store, or a
  // half-configured deployment would accept logins the real database rejects.
  if (databaseConfigured) {
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

      autoActivateAgency(doc.val().operatorName);
      return res.json(publicProfile(doc));
    } catch (err) {
      return sendError(res, err, "Login failed");
    }
  }

  // Fallback mode: accounts live in this process only. Registering somewhere
  // else (an earlier run, or another serverless instance) means there is
  // nothing here to sign in to, and inventing an account on the fly would hide
  // the fact that Firebase was never wired up.
  const agency = memoryAgencies.get(id);
  if (!agency || agency.password !== password) {
    return res.status(401).json({
      error:
        "Invalid username or password. The backend is running without Firebase credentials, so accounts are not saved — set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in backend/.env and register again."
    });
  }

  autoActivateAgency(agency.operatorName);
  return res.json(publicProfileData(agency));
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
    mode: report.databaseConfigured ? "firebase" : "in-memory-fallback",
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
      // Without Firebase the account only exists in this process, so say so
      // rather than promising a sign-in that will fail later.
      persisted: databaseConfigured,
      nextStep: databaseConfigured
        ? "Use this same username and password to sign in to the admin portal."
        : "WARNING: the backend has no Firebase credentials, so this account was NOT saved and will disappear when the server restarts."
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

  const targetLower = String(operatorName).trim().toLowerCase();

  if (databaseConfigured) {
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
  }

  for (const agency of memoryAgencies.values()) {
    if (agency.operatorNameLower === targetLower) {
      return res.json({
        operatorName: agency.operatorName,
        ownerName: agency.ownerName || "",
        phone: agency.phone || "",
        email: agency.email || ""
      });
    }
  }

  return res.json({
    operatorName: String(operatorName).trim(),
    ownerName: "",
    phone: "",
    email: ""
  });
});

// GET /api/auth/admins
router.get("/admins", async (req, res) => {
  if (databaseConfigured) {
    try {
      const snap = await agencies().get();
      const rows = snapshotToArray(snap)
        .map(publicProfileData)
        .sort((a, b) => String(a.registeredAt).localeCompare(String(b.registeredAt)));
      return res.json(rows);
    } catch (err) {
      return sendError(res, err, "Admin list failed");
    }
  }

  const rows = Array.from(memoryAgencies.values())
    .map(publicProfileData)
    .sort((a, b) => String(a.registeredAt).localeCompare(String(b.registeredAt)));
  res.json(rows);
});

// POST /api/auth/admins
router.post("/admins", async (req, res) => {
  const { username, password, operatorName, ownerName, phone, email } = req.body;

  if (!username || !password || !operatorName) {
    return res
      .status(400)
      .json({ error: "Username, password, and operatorName are required" });
  }

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
  const id = docIdFor(req.params.id);

  if (databaseConfigured) {
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
  }

  const data = memoryAgencies.get(id);
  if (!data) return res.status(404).json({ error: "Admin not found" });
  if (data.role === "superadmin") {
    return res.status(403).json({ error: "Cannot delete Super Admin account" });
  }

  memoryAgencies.delete(id);
  res.status(204).end();
});

/// Used by other routes that need to confirm an agency exists.
export async function findAgencyByOperatorName(operatorName) {
  const targetLower = String(operatorName).trim().toLowerCase();
  if (databaseConfigured) {
    const snap = await agencies()
      .orderByChild("operatorNameLower")
      .equalTo(targetLower)
      .limitToFirst(1)
      .get();
    return snap.exists() ? snapshotToArray(snap)[0] : null;
  }

  for (const agency of memoryAgencies.values()) {
    if (agency.operatorNameLower === targetLower) {
      return agency;
    }
  }
  return null;
}

export default router;
