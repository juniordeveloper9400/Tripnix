// Where an agency's buses are, on a map.
//
// Shared by the admin and owner portals so the two can never drift into showing
// the fleet differently — the same positions rendered two ways is worse than no
// map at all.
//
// Real Google Maps when GOOGLE_MAPS_API_KEY is configured; otherwise a drawn
// stand-in so the GPS view still works before a key exists. The two share the
// same markers, tooltips and legend, so switching a key on changes the map
// under the fleet and nothing else.

const STYLE_ID = 'tripnix-fleet-map-styles';

/// Dark tiles, so the map belongs to the portals rather than glaring white in
/// the middle of them.
const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1c2c48' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1220' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#4b5563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#7f8ea3' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1f3d2b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3a55' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#16233a' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca8bb' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4a5b78' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#111c30' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#243248' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#132b47' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4f6a8a' }] }
];

/// Loads Leaflet once per page — the keyless path to a real, interactive map
/// with a marker per bus.
///
/// Google's keyless embed can only ever show one place at a time and takes no
/// custom markers, so a fleet had to be stepped through one bus at a time.
/// Leaflet over CARTO's dark basemap puts every bus on one map with no
/// credentials at all, which is what a fleet view is for.
let leafletLoader = null;

function loadLeaflet() {
  if (window.L?.map) return Promise.resolve(window.L);
  if (leafletLoader) return leafletLoader;

  leafletLoader = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const css = document.createElement('link');
      css.id = 'leaflet-css';
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () =>
      window.L?.map ? resolve(window.L) : reject(new Error('Leaflet loaded but unavailable'));
    script.onerror = () => reject(new Error('Could not load the map library'));
    document.head.appendChild(script);
  }).catch(err => {
    leafletLoader = null;
    throw err;
  });

  return leafletLoader;
}

/// The marker: a bus badge with the vehicle number under it, so every bus on
/// the map is identifiable without clicking it.
function busDivIcon(L, v, colour, sample) {
  return L.divIcon({
    className: 'fmap-pin-wrap',
    iconSize: [40, 52],
    iconAnchor: [20, 46],
    popupAnchor: [0, -44],
    html: `
      <div class="fmap-pin${sample ? ' is-sample' : ''}">
        <img src="${busIcon(colour)}" alt="" width="34" height="43">
        <span>${esc(v.vehicleNumber || v.vehicleName)}</span>
      </div>`
  });
}

/// Draws the fleet on Leaflet — every bus marked, no API key.
async function renderLeafletMap(container, t, placed, { noteEl, compact, sample }) {
  let L;
  try {
    L = await loadLeaflet();
  } catch (err) {
    console.warn('[fleet-map]', err.message);
    return false;
  }

  let live = liveMaps.get(container);

  if (!live || !container.querySelector('.fmap-canvas')) {
    container.innerHTML = `
      <div class="fmap fmap-live${compact ? ' is-compact' : ''}">
        <div class="fmap-canvas"></div>
        ${sample ? `
          <div class="fmap-banner is-sample">
            <span>🧭</span>
            <div>
              <strong>Sample positions — no tracker connected</strong>
              <span>This is how tracking will look. These are not where your buses
                    are; real positions replace them the moment a tracker posts a fix.</span>
            </div>
          </div>` : ''}
      </div>
      <div class="fmap-legend"></div>`;

    const map = L.map(container.querySelector('.fmap-canvas'), {
      zoomControl: true,
      attributionControl: true,
      // Scroll should move the page, not the map, until the map is clicked —
      // otherwise scrolling past a dashboard traps the pointer in it.
      scrollWheelZoom: false
    });
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    live = { map, markers: new Map(), L };
    liveMaps.set(container, live);
  }

  const seen = new Set();
  const bounds = [];

  for (const v of placed) {
    const l = v.location;
    const colour = l.live ? '#0ca30c' : '#fab219';
    seen.add(v.vehicleId);
    bounds.push([l.lat, l.lng]);

    const popup = `
      <strong>${esc(v.vehicleName)}</strong><br>
      ${esc(v.vehicleNumber || '')} · ${l.live ? 'Live now' : l.ageMinutes + ' min ago'}<br>
      ${l.label ? esc(l.label) + '<br>' : ''}
      ${l.speedKph ? Math.round(l.speedKph) + ' km/h<br>' : ''}
      <small>${l.lat.toFixed(5)}, ${l.lng.toFixed(5)}</small>
      ${sample ? '<br><em>Sample position</em>' : ''}`;

    let marker = live.markers.get(v.vehicleId);
    if (marker) {
      // Moved rather than rebuilt, so a bus that reports again slides across
      // instead of the whole layer blinking.
      marker.setLatLng([l.lat, l.lng]);
      marker.setIcon(busDivIcon(live.L, v, colour, sample));
      marker.setPopupContent(popup);
    } else {
      marker = live.L
        .marker([l.lat, l.lng], { icon: busDivIcon(live.L, v, colour, sample) })
        .addTo(live.map)
        .bindPopup(popup);
      live.markers.set(v.vehicleId, marker);
    }
  }

  for (const [id, marker] of live.markers) {
    if (!seen.has(id)) {
      marker.remove();
      live.markers.delete(id);
    }
  }

  // Framed once. Refitting on every refresh would yank the view back while
  // someone is panning around it.
  if (!live.framed && bounds.length) {
    if (bounds.length === 1) {
      live.map.setView(bounds[0], 12);
    } else {
      live.map.fitBounds(bounds, { padding: compact ? [30, 30] : [55, 55] });
    }
    live.framed = true;
  }

  // Leaflet measures its container on creation; inside a tab that was hidden
  // then it comes out zero-sized and only paints one grey tile.
  setTimeout(() => live.map.invalidateSize(), 60);

  const silent = t.total - placed.length;
  container.querySelector('.fmap-legend').innerHTML = sample
    ? `<span><i style="background:#fab219"></i>Sample data</span>
       <span class="fmap-note">Tap a bus for its detail</span>`
    : `<span><i style="background:#0ca30c"></i>Live</span>
       <span><i style="background:#fab219"></i>Last seen earlier</span>
       ${silent ? `<span><i style="background:#94a3b8"></i>${silent} not reporting</span>` : ''}
       <span class="fmap-note">Tap a bus for its detail</span>`;

  if (noteEl) {
    noteEl.textContent = sample
      ? `Sample positions · ${placed.length} bus${placed.length === 1 ? '' : 'es'} shown`
      : `${t.reporting} of ${t.total} reporting`;
  }

  return true;
}

/// Loads the Maps JavaScript API once per page, however many maps ask for it.
///
/// Concurrent callers share one promise — the dashboard and the GPS tab both
/// render on load, and two script tags would make the API complain about being
/// included twice.
let mapsLoader = null;

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly`;
    script.async = true;
    script.onload = () =>
      window.google?.maps ? resolve(window.google.maps) : reject(new Error('Maps API loaded but unavailable'));
    script.onerror = () =>
      reject(new Error('Could not load Google Maps — check the API key and its referrer restrictions'));
    document.head.appendChild(script);
  }).catch(err => {
    // Cleared so a later attempt can retry rather than inheriting the failure.
    mapsLoader = null;
    throw err;
  });

  return mapsLoader;
}

/// The bus marker, as an SVG data URI so Google Maps can use it as an icon.
function busIcon(colour) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
      <path d="M22,54 L13,38 h18 z" fill="${colour}"/>
      <circle cx="22" cy="21" r="18" fill="${colour}" stroke="#0b1220" stroke-width="2.5"/>
      <rect x="13" y="11" width="18" height="16" rx="3" fill="#ffffff"/>
      <rect x="15.2" y="13" width="13.6" height="6" rx="1.4" fill="${colour}"/>
      <rect x="15.2" y="20.6" width="13.6" height="2" rx="0.9" fill="${colour}" opacity="0.45"/>
      <circle cx="17" cy="28.4" r="2.3" fill="#0b1220"/>
      <circle cx="27" cy="28.4" r="2.3" fill="#0b1220"/>
    </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg.trim());
}

/// Live map instances, keyed by container. Reused across refreshes so the map
/// does not flash and re-centre every time the fleet reloads.
const liveMaps = new WeakMap();

/// Where the map opens before any bus has reported.
///
/// A real map of somewhere is far more use than a drawing of nowhere: the
/// controls work, the operator can pan to the routes they run, and a bus
/// appearing later lands on the map already on screen. Kochi because the fleet
/// is Kerala-registered; it is only a starting view and moves the moment a
/// tracker posts a fix.
const DEFAULT_VIEW = { lat: 9.9312, lng: 76.2673, zoom: 9 };

/// Towns a Kerala fleet actually runs between, used to place buses on the map
/// before any tracker exists so the view can be seen working.
///
/// Real coordinates rather than random jitter: scattered noise puts buses in
/// fields and out at sea, which looks broken rather than plausible.
const SAMPLE_PLACES = [
  { label: 'Kochi', lat: 9.9312, lng: 76.2673 },
  { label: 'Munnar', lat: 10.0889, lng: 77.0595 },
  { label: 'Thrissur', lat: 10.5276, lng: 76.2144 },
  { label: 'Alappuzha', lat: 9.4981, lng: 76.3388 },
  { label: 'Kottayam', lat: 9.5916, lng: 76.5222 },
  { label: 'Palakkad', lat: 10.7867, lng: 76.6548 },
  { label: 'Kozhikode', lat: 11.2588, lng: 75.7804 },
  { label: 'Thekkady', lat: 9.5939, lng: 77.1600 },
  { label: 'Kollam', lat: 8.8932, lng: 76.6141 },
  { label: 'Wayanad', lat: 11.6854, lng: 76.1320 }
];

/// Gives every bus its own place, so the map shows a spread fleet rather than a
/// stack of markers on one point.
///
/// Deterministic on the vehicle id: the same bus keeps the same sample spot
/// across refreshes, which a random position would not — markers would jump
/// about every few seconds and look like the tracking was broken.
///
/// These are never stored and never leave the browser. Real fixes always win:
/// the moment a tracker reports, this is not used at all.
function sampleFleet(vehicles) {
  return vehicles.map((v, i) => {
    const spot = SAMPLE_PLACES[(Number(v.vehicleId) + i) % SAMPLE_PLACES.length];
    return {
      ...v,
      location: {
        lat: spot.lat,
        lng: spot.lng,
        label: spot.label,
        // Alternating so both marker states are visible in the preview.
        live: i % 3 !== 2,
        ageMinutes: i % 3 === 2 ? 40 + i * 7 : 0,
        speedKph: i % 3 === 2 ? 0 : 30 + i * 9,
        sample: true
      }
    };
  });
}

/// Injected once per page rather than duplicated into each portal's stylesheet,
/// so the map's look travels with the code that draws it.
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .fmap { position: relative; border-radius: 14px; overflow: hidden;
            border: 1px solid rgba(255,255,255,0.12); }
    .fmap svg { display: block; width: 100%; height: auto; }

    /* Google Maps needs a laid-out box with a real height — given none it
       renders as a zero-height strip and looks broken. */
    .fmap-live .fmap-canvas { width: 100%; height: 420px; background: #1c2c48; }
    .fmap-live.is-compact .fmap-canvas { height: 260px; }
    @media (max-width: 620px) {
      .fmap-live .fmap-canvas { height: 300px; }
      .fmap-live.is-compact .fmap-canvas { height: 220px; }
    }
    /* The info window is Google's own white card; keep its close button visible
       against it rather than inheriting the portal's light-on-dark text. */
    .fmap-live .gm-style-iw button span { background-color: #475569 !important; }

    /* The keyless embed. Same box as the JS API map so switching a key on does
       not change the layout around it. */
    .fmap-embed { display: block; width: 100%; height: 420px; border: 0; }
    .fmap-live.is-compact .fmap-embed { height: 260px; }
    @media (max-width: 620px) {
      .fmap-embed { height: 300px; }
      .fmap-live.is-compact .fmap-embed { height: 220px; }
    }

    /* One bus per embed, so the fleet is a row to choose from. */
    .fmap-chips { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 10px; }
    .fmap-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 11px; border-radius: 20px; cursor: pointer;
      background: rgba(255,255,255,0.05); color: #cbd5e1;
      border: 1px solid rgba(255,255,255,0.14);
      font-size: 11.5px; font-weight: 700; font-family: inherit;
      transition: background 0.15s, border-color 0.15s;
    }
    .fmap-chip:hover { background: rgba(255,255,255,0.1); }
    .fmap-chip.is-on { background: #e53935; border-color: #e53935; color: #fff; }
    .fmap-chip i { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .fmap-chip span { opacity: 0.7; font-weight: 600; }
    .fmap-chip.is-on span { opacity: 0.85; }

    .fmap-open { margin-left: auto; color: #93c5fd; text-decoration: none; }
    .fmap-open:hover { text-decoration: underline; }

    /* Every bus marked at once: the badge with its number under it, so the map
       is readable without clicking each one. */
    .fmap-pin-wrap { background: none !important; border: 0 !important; }
    .fmap-pin { display: flex; flex-direction: column; align-items: center; gap: 1px; }
    .fmap-pin img { display: block; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5)); }
    .fmap-pin span {
      font-size: 10px; font-weight: 800; color: #f8fafc; white-space: nowrap;
      background: rgba(9,15,28,0.85); padding: 1px 6px; border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.16);
    }
    .fmap-pin.is-sample img { opacity: 0.9; }

    /* Leaflet's own chrome, toned to the portals. */
    .fmap-live .leaflet-container { background: #0b1220; font-family: inherit; }
    .fmap-live .leaflet-control-attribution {
      background: rgba(9,15,28,0.8); color: #94a3b8; font-size: 9.5px;
    }
    .fmap-live .leaflet-control-attribution a { color: #93c5fd; }
    .fmap-live .leaflet-popup-content-wrapper,
    .fmap-live .leaflet-popup-tip { background: #1c2c48; color: #e2e8f0; }
    .fmap-live .leaflet-popup-content { font-size: 12px; line-height: 1.5; margin: 10px 12px; }
    .fmap-live .leaflet-popup-content small { color: #94a3b8; }
    .fmap-live .leaflet-bar a {
      background: #1c2c48; color: #e2e8f0; border-bottom-color: rgba(255,255,255,0.14);
    }
    .fmap-live .leaflet-bar a:hover { background: #263a5c; }

    /* Sits along the bottom rather than over the middle, so the map stays
       usable — an operator can pan to their routes while waiting. */
    .fmap-banner {
      position: absolute; left: 10px; right: 10px; bottom: 10px;
      display: flex; align-items: flex-start; gap: 10px;
      padding: 11px 13px; border-radius: 12px;
      background: rgba(9,15,28,0.88); border: 1px solid rgba(255,255,255,0.14);
      backdrop-filter: blur(3px); pointer-events: none;
    }
    /* Amber, because sample positions are a caution, not information. */
    .fmap-banner.is-sample {
      background: rgba(120,72,10,0.92); border-color: rgba(250,178,25,0.5);
    }
    .fmap-banner.is-sample strong { color: #fde68a; }
    .fmap-banner.is-sample div span { color: #fcd9a0; }

    .fmap-banner > span { font-size: 18px; line-height: 1.2; }
    .fmap-banner strong { display: block; font-size: 13px; font-weight: 800; color: #f8fafc; }
    .fmap-banner div span { font-size: 11.5px; color: #94a3b8; line-height: 1.45; }
    .fmap-label { font-size: 2.5px; font-weight: 800; fill: #f8fafc;
                  paint-order: stroke; stroke: rgba(9,15,28,0.9); stroke-width: 1px; }
    .fmap-sub { font-size: 1.9px; font-weight: 600; fill: #cbd5e1;
                paint-order: stroke; stroke: rgba(9,15,28,0.9); stroke-width: 0.9px; }
    .fmap-n { font-size: 2.4px; font-weight: 800; fill: #e2e8f0; }
    .fmap-bus { cursor: default; }
    .fmap-bus:hover .fmap-label { fill: #fff; }

    .fmap-scale { position: absolute; left: 10px; bottom: 9px;
                  display: flex; align-items: center; gap: 7px;
                  font-size: 10px; color: #cbd5e1;
                  background: rgba(9,15,28,0.72); padding: 3px 9px; border-radius: 20px; }
    .fmap-scale i { width: 28px; height: 5px; border: 1px solid #cbd5e1;
                    border-top: none; opacity: 0.85; display: block; }

    .fmap-empty { position: absolute; inset: 0; display: flex; flex-direction: column;
                  align-items: center; justify-content: center; text-align: center;
                  gap: 5px; padding: 24px; }
    .fmap-empty b { font-size: 14px; font-weight: 800; color: #f8fafc; }
    .fmap-empty span { font-size: 11.5px; color: #94a3b8; line-height: 1.5; max-width: 320px; }
    .fmap-empty-icon { font-size: 28px; }

    .fmap-legend { display: flex; gap: 15px; flex-wrap: wrap; align-items: center;
                   margin-top: 11px; font-size: 11.5px; color: #94a3b8; }
    .fmap-legend i { width: 9px; height: 9px; border-radius: 50%;
                     display: inline-block; margin-right: 6px; vertical-align: -1px; }
    .fmap-note { margin-left: auto; font-style: italic; opacity: 0.75; }
  `;
  document.head.appendChild(style);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/// The map before any bus has reported: a real Google map at the default view,
/// with a banner explaining why there are no buses on it.
function renderWaitingMap(container, t, { noteEl, compact }) {
  const { lat, lng, zoom } = DEFAULT_VIEW;
  const src = `https://www.google.com/maps?q=${lat},${lng}&hl=en&z=${zoom}&output=embed`;

  if (noteEl) {
    noteEl.textContent = t.total ? 'No bus has reported a position yet' : '';
  }

  container.innerHTML = `
    <div class="fmap fmap-live${compact ? ' is-compact' : ''}">
      <iframe class="fmap-embed" src="${src}" title="Map, awaiting the first position"
              loading="lazy" allowfullscreen
              referrerpolicy="no-referrer-when-downgrade"></iframe>
      <div class="fmap-banner">
        <span>📡</span>
        <div>
          <strong>Waiting for the first position</strong>
          <span>${t.total
            ? `${t.total} bus${t.total === 1 ? '' : 'es'} on the books, none reporting yet — they appear here the moment a tracker posts a fix.`
            : 'No buses in the fleet yet.'}</span>
        </div>
      </div>
    </div>`;
}

/// Real Google Maps in an iframe, with no API key.
///
/// google.com/maps?...&output=embed serves the genuine Maps UI — real streets,
/// labels, zoom, satellite — and needs no credentials. The trade-off is that an
/// embed shows one place at a time and takes no custom markers, so the fleet
/// becomes a row of buses to choose between rather than pins on one view. With
/// GOOGLE_MAPS_API_KEY set the JavaScript API takes over and shows them all at
/// once.
///
/// `output=embed` is long-standing but not a documented API; the supported
/// route is the Maps Embed API, which needs a key.
function renderEmbedMap(container, t, placed, { noteEl, compact, sample = false }) {
  // Survives a refresh, so a reload does not throw the viewer back to the first
  // bus while they are looking at another.
  const wanted = Number(container.dataset.fleetMapBus);
  const selected =
    placed.find(v => v.vehicleId === wanted) ||
    placed.find(v => v.location.live) ||
    placed[0];

  container.dataset.fleetMapBus = String(selected.vehicleId);

  const l = selected.location;
  const src =
    `https://www.google.com/maps?q=${l.lat},${l.lng}&hl=en&z=${compact ? 13 : 14}&output=embed`;

  const chips = placed.map(v => {
    const on = v.vehicleId === selected.vehicleId;
    const live = v.location.live;
    return `
      <button type="button" class="fmap-chip${on ? ' is-on' : ''}"
              data-fleet-map-bus="${v.vehicleId}">
        <i style="background:${live ? '#0ca30c' : '#fab219'}"></i>
        ${esc(v.vehicleNumber || v.vehicleName)}
        <span>${live ? 'live' : v.location.ageMinutes + 'm'}</span>
      </button>`;
  }).join('');

  const silent = t.total - placed.length;

  container.innerHTML = `
    ${placed.length > 1 ? `<div class="fmap-chips">${chips}</div>` : ''}
    <div class="fmap fmap-live${compact ? ' is-compact' : ''}">
      <iframe class="fmap-embed" src="${src}" title="Map of ${esc(selected.vehicleName)}"
              loading="lazy" allowfullscreen
              referrerpolicy="no-referrer-when-downgrade"></iframe>
      ${sample ? `
        <div class="fmap-banner is-sample">
          <span>🧭</span>
          <div>
            <strong>Sample positions — no tracker connected</strong>
            <span>This is how tracking will look. These are not where your buses
                  are; real positions replace them the moment a tracker posts a fix.</span>
          </div>
        </div>` : ''}
    </div>
    <div class="fmap-legend">
      ${sample
        ? `<span><i style="background:#fab219"></i>Sample data</span>`
        : `<span><i style="background:#0ca30c"></i>Live</span>
           <span><i style="background:#fab219"></i>Last seen earlier</span>
           ${silent ? `<span><i style="background:#94a3b8"></i>${silent} not reporting</span>` : ''}`}
      <a class="fmap-open" target="_blank" rel="noopener"
         href="https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}">
        Open in Google Maps ↗</a>
    </div>`;

  container.querySelectorAll('[data-fleet-map-bus]').forEach(btn =>
    btn.addEventListener('click', () => {
      container.dataset.fleetMapBus = btn.dataset.fleetMapBus;
      // The flag has to travel with the re-render, or picking a second bus
      // would drop the "sample" labelling and start looking like real tracking.
      renderEmbedMap(container, t, placed, { noteEl, compact, sample });
    })
  );

  if (noteEl) {
    noteEl.textContent = sample
      ? `Sample positions · showing ${selected.vehicleNumber || selected.vehicleName} near ${l.label}`
      : `${t.reporting} of ${t.total} reporting · showing ${selected.vehicleNumber || selected.vehicleName}` +
        `${l.label ? ' near ' + l.label : ''}`;
  }
}

/// Draws the fleet on a real Google map.
///
/// Returns false when the API could not be used, so the caller can fall back to
/// the drawn map rather than leaving an empty box.
async function renderGoogleMap(container, t, placed, { noteEl, compact, apiKey }) {
  let maps;
  try {
    maps = await loadGoogleMaps(apiKey);
  } catch (err) {
    console.warn('[fleet-map]', err.message);
    return false;
  }

  let live = liveMaps.get(container);

  if (!live) {
    container.innerHTML =
      `<div class="fmap fmap-live${compact ? ' is-compact' : ''}"><div class="fmap-canvas"></div></div>`;
    const canvas = container.querySelector('.fmap-canvas');

    live = {
      map: new maps.Map(canvas, {
        center: { lat: placed[0].location.lat, lng: placed[0].location.lng },
        zoom: 12,
        styles: DARK_STYLE,
        mapTypeControl: !compact,
        streetViewControl: false,
        fullscreenControl: !compact,
        zoomControl: true,
        backgroundColor: '#1c2c48',
        gestureHandling: 'cooperative'
      }),
      markers: new Map(),
      info: new maps.InfoWindow()
    };
    liveMaps.set(container, live);
  }

  const seen = new Set();
  const bounds = new maps.LatLngBounds();

  for (const v of placed) {
    const l = v.location;
    const colour = l.live ? '#0ca30c' : '#fab219';
    const position = { lat: l.lat, lng: l.lng };
    bounds.extend(position);
    seen.add(v.vehicleId);

    const label = v.vehicleNumber || v.vehicleName;
    const detail =
      `${l.live ? 'Live now' : l.ageMinutes + ' min ago'}` +
      `${l.label ? ' · ' + esc(l.label) : ''}` +
      `${l.speedKph ? ' · ' + Math.round(l.speedKph) + ' km/h' : ''}`;

    let marker = live.markers.get(v.vehicleId);
    if (marker) {
      // Moved rather than replaced, so a bus that reports again slides to its
      // new position instead of the whole layer blinking.
      marker.setPosition(position);
      marker.setIcon({ url: busIcon(colour), scaledSize: new maps.Size(34, 43), anchor: new maps.Point(17, 43) });
    } else {
      marker = new maps.Marker({
        map: live.map,
        position,
        title: `${v.vehicleName} · ${detail.replace(/<[^>]*>/g, '')}`,
        icon: { url: busIcon(colour), scaledSize: new maps.Size(34, 43), anchor: new maps.Point(17, 43) },
        zIndex: l.live ? 2 : 1
      });
      live.markers.set(v.vehicleId, marker);
    }

    marker.addListener('click', () => {
      live.info.setContent(
        `<div style="font-family:system-ui;color:#0b1220;min-width:150px">
           <strong style="font-size:13px">${esc(v.vehicleName)}</strong><br>
           <span style="font-size:11px;color:#475569">${esc(label)} · ${detail}</span><br>
           <span style="font-size:10.5px;color:#64748b">${l.lat.toFixed(5)}, ${l.lng.toFixed(5)}</span>
         </div>`
      );
      live.info.open({ map: live.map, anchor: marker });
    });
  }

  // Buses that stopped reporting since the last refresh lose their marker.
  for (const [id, marker] of live.markers) {
    if (!seen.has(id)) {
      marker.setMap(null);
      live.markers.delete(id);
    }
  }

  // Framed only on the first draw; refitting on every refresh would yank the
  // view back while someone is panning around it.
  if (!live.framed) {
    if (placed.length === 1) {
      live.map.setCenter(bounds.getCenter());
      live.map.setZoom(13);
    } else {
      live.map.fitBounds(bounds, compact ? 24 : 48);
    }
    live.framed = true;
  }

  if (noteEl) {
    noteEl.textContent = `${t.reporting} of ${t.total} reporting · live map`;
  }

  const silent = t.total - placed.length;
  const legend = container.querySelector('.fmap-legend');
  const legendHtml = `
    <span><i style="background:#0ca30c"></i>Live</span>
    <span><i style="background:#fab219"></i>Last seen earlier</span>
    ${silent ? `<span><i style="background:#94a3b8"></i>${silent} not reporting</span>` : ''}
    <span class="fmap-note">Tap a bus for its detail</span>`;

  if (legend) {
    legend.innerHTML = legendHtml;
  } else {
    container.insertAdjacentHTML('beforeend', `<div class="fmap-legend">${legendHtml}</div>`);
  }

  return true;
}

/// Draws the map for a tracking payload into `container`.
///
/// `tracking` is the shape GET /api/tracking returns. `noteEl` gets a one-line
/// summary when given. `compact` shortens it for a dashboard tile. `apiKey`
/// switches on the real Google map; without it the drawn stand-in is used.
export function renderFleetMap(
  container,
  tracking,
  { noteEl = null, compact = false, apiKey = '' } = {}
) {
  if (!container) return;
  ensureStyles();

  const positioned = (tracking?.vehicles || []).filter(v => v.location);

  // With nothing reporting, the fleet is placed on sample spots so the map can
  // be seen working before any tracker exists. Clearly marked throughout: a
  // fleet view that quietly invented positions would be worse than an empty
  // one, because someone would dispatch on it.
  if (!positioned.length) {
    liveMaps.delete(container);
    const fleet = (tracking?.vehicles || []);

    if (!fleet.length) {
      delete container.dataset.fleetMapBus;
      renderWaitingMap(container, tracking, { noteEl, compact });
      return;
    }

    const sampled = sampleFleet(fleet);
    const summary = { ...tracking, reporting: 0, total: fleet.length };

    renderLeafletMap(container, summary, sampled, { noteEl, compact, sample: true })
      .then(ok => {
        if (!ok) renderEmbedMap(container, summary, sampled, { noteEl, compact, sample: true });
      });
    return;
  }

  // With a key, Google Maps. Without one, Leaflet — both mark every bus on one
  // map. The single-bus embed is the last resort, for when neither library
  // loads at all.
  if (apiKey) {
    renderGoogleMap(container, tracking, positioned, { noteEl, compact, apiKey }).then(ok => {
      if (ok) return;
      return renderLeafletMap(container, tracking, positioned, { noteEl, compact, sample: false })
        .then(fell => {
          if (!fell) renderEmbedMap(container, tracking, positioned, { noteEl, compact });
        });
    });
    return;
  }

  renderLeafletMap(container, tracking, positioned, { noteEl, compact, sample: false })
    .then(ok => {
      if (!ok) renderEmbedMap(container, tracking, positioned, { noteEl, compact });
    });
}

/// The drawn stand-in, used until a Maps key is configured.
