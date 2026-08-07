// firebase-admin v14 exposes only the modular API to ESM consumers: the legacy
// namespaced accessors (admin.apps, admin.app(), admin.database(), …) are all
// undefined here, so everything goes through the subpath entry points.
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getServiceAccount() {
  const possiblePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(__dirname, "../../../serviceAccountKey.json"),
    path.join(__dirname, "../../serviceAccountKey.json"),
    path.join(process.cwd(), "serviceAccountKey.json"),
    path.join(process.cwd(), "backend/serviceAccountKey.json")
  ]
    .filter(Boolean)
    .map((p) => path.resolve(p));

  for (const p of new Set(possiblePaths)) {
    if (!fs.existsSync(p)) continue;

    // A key file that is present but unusable is almost always a half-finished
    // setup, so it gets reported rather than skipped — silently treating it as
    // "no credentials" is what makes this so hard to diagnose.
    let parsed;
    try {
      const content = fs.readFileSync(p, "utf8").trim();
      if (!content) {
        console.error(`[Firebase] ${p} is empty. Paste the full service account JSON into it.`);
        continue;
      }
      parsed = JSON.parse(content);
    } catch (err) {
      console.error(`[Firebase] ${p} is not valid JSON (${err.message}).`);
      continue;
    }

    if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
      console.error(
        `[Firebase] ${p} is missing project_id / client_email / private_key. Use the file from Project settings -> Service accounts -> Generate new private key.`
      );
      continue;
    }
    return parsed;
  }
  return null;
}

const serviceAccount = getServiceAccount();

const PROJECT_ID = serviceAccount?.project_id || process.env.FIREBASE_PROJECT_ID || "";
const CLIENT_EMAIL = serviceAccount?.client_email || process.env.FIREBASE_CLIENT_EMAIL || "";
const WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || "";
const PRIVATE_KEY = (serviceAccount?.private_key || process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

/// Realtime Database instances outside us-central1 do NOT live at the
/// <project>.firebaseio.com address the Admin SDK assumes, so the URL has to be
/// given explicitly or every read silently targets a database that isn't there.
export const DATABASE_URL = process.env.FIREBASE_DATABASE_URL || "";

/// Data access + user management need a service account.
export const databaseConfigured = Boolean(
  (serviceAccount || (PROJECT_ID && CLIENT_EMAIL && PRIVATE_KEY)) && DATABASE_URL
);

/// Checking a password is only possible through the Identity Toolkit REST
/// endpoint, which needs the public web API key. The Admin SDK deliberately
/// offers no way to verify one, so a service account alone is NOT enough.
export const authConfigured = Boolean(PROJECT_ID && WEB_API_KEY);

/// Turns a raw database failure into something a human can act on, instead of
/// letting a driver-level string reach the signup form verbatim.
/// Returns null for errors that aren't recognised, so callers can fall through
/// to their own handling.
export function describeDatabaseError(err) {
  const raw = String(err?.message || "");

  if (/Can't determine Firebase Database URL|databaseURL/i.test(raw)) {
    return {
      status: 503,
      message:
        "FIREBASE_DATABASE_URL is not set in backend/.env. Copy the database URL from the " +
        "Firebase console -> Build -> Realtime Database (it looks like " +
        "https://<project>-default-rtdb.<region>.firebasedatabase.app)."
    };
  }

  // The Admin SDK bypasses security rules, so this is an IAM problem rather
  // than a rules problem.
  if (/permission_denied|PERMISSION_DENIED/i.test(raw)) {
    return {
      status: 503,
      message:
        `The service account ${CLIENT_EMAIL || "(from serviceAccountKey.json)"} is not allowed to access the ` +
        `Realtime Database in project "${PROJECT_ID}". Grant it the "Firebase Realtime Database Admin" role in Google Cloud IAM.`
    };
  }

  if (/ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|network error/i.test(raw)) {
    return {
      status: 503,
      message:
        `Could not reach the Realtime Database at ${DATABASE_URL || "(no URL configured)"}. ` +
        "Check the server's network connection and that the URL is correct."
    };
  }

  if (/404|not found/i.test(raw) && DATABASE_URL) {
    return {
      status: 503,
      message:
        `No Realtime Database responded at ${DATABASE_URL}. Confirm the instance exists and that ` +
        "FIREBASE_DATABASE_URL matches it exactly, including the region."
    };
  }

  return null;
}

/// Everything the API needs in order to run against real Firebase, so callers
/// can report precisely what is missing instead of silently degrading.
export function configReport() {
  const hasCredentials = Boolean(
    serviceAccount || (PROJECT_ID && CLIENT_EMAIL && PRIVATE_KEY)
  );
  return {
    databaseConfigured,
    authConfigured,
    projectId: PROJECT_ID || null,
    databaseUrl: DATABASE_URL || null,
    usingServiceAccountFile: Boolean(serviceAccount),
    missing: [
      PROJECT_ID ? null : "FIREBASE_PROJECT_ID",
      WEB_API_KEY ? null : "FIREBASE_WEB_API_KEY",
      DATABASE_URL ? null : "FIREBASE_DATABASE_URL",
      hasCredentials
        ? null
        : "serviceAccountKey.json (or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)"
    ].filter(Boolean)
  };
}

function ensureApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  if (!databaseConfigured) {
    throw new Error(
      "Firebase is not configured. Provide serviceAccountKey.json (or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) and set FIREBASE_DATABASE_URL."
    );
  }
  return initializeApp({
    credential: cert(
      serviceAccount || {
        projectId: PROJECT_ID,
        clientEmail: CLIENT_EMAIL,
        privateKey: PRIVATE_KEY
      }
    ),
    projectId: PROJECT_ID,
    databaseURL: DATABASE_URL
  });
}

/// A Realtime Database reference for one of the app's top-level nodes.
export function dbRef(path) {
  return getDatabase(ensureApp()).ref(path);
}

/// Hands out the next id for a collection, atomically.
///
/// Record ids used to come from a per-process counter that started at 1.
/// Deployed, every serverless instance keeps its own copy, so an instance that
/// had not loaded the existing records handed out an id already in use and the
/// new record *overwrote* the old one at that key — an agency's bus or trip
/// simply vanished. A database transaction is the only counter all instances
/// agree on.
///
/// `minimum` is the highest id the caller already knows about, so an existing
/// collection is never handed an id that is already taken.
export async function allocateId(node, minimum = 0) {
  const floor = Number.isFinite(minimum) ? Math.max(0, minimum) : 0;

  const result = await dbRef(`counters/${node}`).transaction((current) => {
    const seen = Number.isFinite(current) ? current : 0;
    return Math.max(seen, floor) + 1;
  });

  const allocated = Number(result.snapshot.val());
  if (!Number.isFinite(allocated) || allocated <= 0) {
    throw new Error(`Could not allocate an id for "${node}"`);
  }
  return allocated;
}

export function auth() {
  return getAuth(ensureApp());
}

/// Realtime Database keys may not contain "." "$" "#" "[" "]" "/" or control
/// characters, so anything used as a key (usernames) is folded to a safe form.
export function safeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.$#[\]/\x00-\x1f\x7f]/g, "_");
}

/// Realtime Database returns a whole node as one object keyed by child name.
/// This flattens that into the array shape the routes work with.
///
/// When the child keys happen to be sequential integers ("1", "2", …) Firebase
/// hands back a *sparse array* instead — [null, {…}, {…}] — so the gaps have to
/// be dropped or a null record reaches the routes and crashes them.
export function snapshotToArray(snapshot) {
  const value = snapshot.val();
  if (!value || typeof value !== "object") return [];
  return Object.values(value).filter(
    (entry) => entry && typeof entry === "object"
  );
}

/// Agencies log in with a username, but Firebase Auth is email-keyed. Anything
/// that isn't already an email is mapped onto a stable internal address so a
/// single username + password works for both the app and the admin portal.
const LOGIN_DOMAIN = "agency.tripnix.app";

export function loginEmailFor(username) {
  const value = String(username || "").trim().toLowerCase();
  return value.includes("@") ? value : `${value}@${LOGIN_DOMAIN}`;
}

/// The Admin SDK deliberately cannot check a password, so sign-in goes through
/// the Identity Toolkit REST endpoint with the public web API key.
///
/// Returns null when the credentials are simply wrong, and throws for anything
/// that needs the operator's attention. There is no "user exists" shortcut:
/// treating an existing account as authenticated would let any password in.
export async function verifyPassword(username, password) {
  if (!authConfigured) {
    const err = new Error(
      "Firebase sign-in is not configured. Set FIREBASE_PROJECT_ID and FIREBASE_WEB_API_KEY in backend/.env (Project settings -> General -> Web API Key)."
    );
    err.status = 503;
    throw err;
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmailFor(username),
        password,
        returnSecureToken: true
      })
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = data?.error?.message || "INVALID_LOGIN_CREDENTIALS";
    if (
      code.startsWith("EMAIL_NOT_FOUND") ||
      code.startsWith("INVALID_PASSWORD") ||
      code.startsWith("INVALID_LOGIN_CREDENTIALS")
    ) {
      return null;
    }
    if (code.startsWith("CONFIGURATION_NOT_FOUND")) {
      const err = new Error(
        "Firebase Authentication is not enabled for this project. In the Firebase console open Authentication -> Get started and turn on the Email/Password provider."
      );
      err.status = 503;
      throw err;
    }
    if (code.startsWith("API_KEY_INVALID") || code.startsWith("INVALID_API_KEY")) {
      const err = new Error(
        "FIREBASE_WEB_API_KEY is not valid for this project. Copy it from Project settings -> General -> Web API Key."
      );
      err.status = 503;
      throw err;
    }
    if (code.startsWith("USER_DISABLED")) {
      throw new Error("This account has been disabled");
    }
    if (code.startsWith("TOO_MANY_ATTEMPTS")) {
      throw new Error("Too many failed attempts. Try again shortly.");
    }
    throw new Error(code);
  }

  return { uid: data.localId, idToken: data.idToken, email: data.email };
}

/// Creates the Firebase Auth user that backs an agency login.
export async function createAuthUser({ username, password, displayName }) {
  const user = await auth().createUser({
    email: loginEmailFor(username),
    password,
    displayName: displayName || username
  });
  return user.uid;
}

export async function deleteAuthUser(uid) {
  if (!uid) return;
  try {
    await auth().deleteUser(uid);
  } catch (err) {
    if (err?.code !== "auth/user-not-found") throw err;
  }
}

