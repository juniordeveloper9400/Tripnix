#!/usr/bin/env bash
# Assembles the deployed site:
#
#   /          Flutter web app  (frontend/)
#   /admin/    office-staff portal (admin/)
#   /owner/    agency-owner portal (owner/)
#   /public/   shared images    (backend/public/)
#   /api/*     Express handler  (api/index.js, deployed as a function)
#
set -euo pipefail

FLUTTER_VERSION="3.38.7"
FLUTTER_DIR="${PWD}/.flutter"
OUT_DIR="${PWD}/dist"

echo "==> Flutter SDK ${FLUTTER_VERSION}"
if [ ! -d "${FLUTTER_DIR}" ]; then
  git clone --depth 1 --branch "${FLUTTER_VERSION}" \
    https://github.com/flutter/flutter.git "${FLUTTER_DIR}"
fi
export PATH="${FLUTTER_DIR}/bin:${PATH}"
# Vercel's builder runs as a different user than the one that cloned the SDK.
git config --global --add safe.directory "${FLUTTER_DIR}" || true
flutter --version

echo "==> Building Flutter web app"
(cd frontend && flutter pub get && flutter build web --release --no-wasm-dry-run)

echo "==> Building admin portal"
(cd admin && npm ci && npm run build)

echo "==> Building owner portal"
(cd owner && npm ci && npm run build)

echo "==> Assembling ${OUT_DIR}"
rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}/admin" "${OUT_DIR}/owner" "${OUT_DIR}/public"
cp -R frontend/build/web/. "${OUT_DIR}/"
cp -R admin/dist/. "${OUT_DIR}/admin/"
cp -R owner/dist/. "${OUT_DIR}/owner/"
cp -R backend/public/. "${OUT_DIR}/public/"

echo "==> Done"
ls -la "${OUT_DIR}"
