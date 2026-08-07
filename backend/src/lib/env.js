// Loads the backend's .env no matter which directory the process was started
// from.
//
// `import "dotenv/config"` only looks in process.cwd(), so the root
// `npm start` (which runs node backend/src/index.js from the repo root) never
// saw backend/.env: Firebase came up unconfigured and the API quietly fell back
// to its in-memory store, which accepts any password and forgets every account
// when the process exits.
//
// This module must be imported before anything that reads process.env at module
// scope — ES modules are evaluated in import order, so it goes first in
// backend/src/index.js.
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// backend/.env wins; a .env beside the process covers root-level setups.
// dotenv never overwrites a variable that is already set, so real environment
// variables — what a hosted deployment provides — always take precedence.
const candidates = [
  process.env.ENV_FILE,
  path.resolve(__dirname, "../../.env"),
  path.resolve(process.cwd(), ".env")
].filter(Boolean);

for (const file of candidates) {
  dotenv.config({ path: file });
}
