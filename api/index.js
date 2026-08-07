// Vercel entry point for the Express API.
//
// The app is imported lazily rather than at module scope on purpose: a failure
// while loading it (a missing dependency in the function bundle, a bad
// environment variable) would otherwise crash the whole function before any
// code of ours runs, and the caller would get Vercel's HTML error page instead
// of a JSON body — which is exactly what makes a deployed sign-in fail with a
// bare "Server error (500)" and nothing to act on.

let appPromise = null;

function loadApp() {
  if (!appPromise) {
    appPromise = import("../backend/src/index.js").then((mod) => mod.default);
  }
  return appPromise;
}

function fail(res, err, stage) {
  console.error(`[api] ${stage} failed:`, err);
  if (res.headersSent) return;
  res.status(500).json({
    error: err?.message || "Internal server error",
    stage,
    // The stack is only useful while a deployment is broken, and it can name
    // internal paths, so it stays behind an explicit opt-in.
    stack: process.env.DEBUG_API_ERRORS ? err?.stack : undefined
  });
}

export default async function handler(req, res) {
  let app;
  try {
    app = await loadApp();
  } catch (err) {
    // A failed load must not be cached, or every later request on this warm
    // instance reports the same error without retrying.
    appPromise = null;
    return fail(res, err, "loading the API");
  }

  try {
    return app(req, res);
  } catch (err) {
    return fail(res, err, "handling the request");
  }
}
