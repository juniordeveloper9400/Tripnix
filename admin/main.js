const API_BASE = window.location.origin.includes('3005')
  ? 'http://localhost:3000/api'
  : window.location.origin + '/api';

// ─── State ───────────────────────────────────────────────
let state = {
  currentUser: JSON.parse(sessionStorage.getItem('tripnix_user') || 'null'),
  vehicles: [],
  bookings: [],
  admins: [],
  plans: null,          // plan catalogue from the backend
  subscription: null,   // this agency's membership + vehicle listings
  agencySubs: [],       // super admin: every agency's subscription state
  trips: [],            // trips this agency has posted
  activeTab: 'dashboard',
  fleetFilter: 'All',
  searchQuery: '',
  editingVehicleId: null,
  vehicleFormImages: [],
  vehicleFormVideos: [],
  diaryVehicleId: null,  // which bus the diary is showing
  diary: null            // that bus's schedule from the API
};

// ─── DOM Refs ─────────────────────────────────────────────
const loginScreen   = document.getElementById('login-screen');
const appLayout     = document.getElementById('app-layout');
const loginForm     = document.getElementById('login-form');
const loginError    = document.getElementById('login-error');
const logoutBtn     = document.getElementById('logout-btn');

const navItems      = document.querySelectorAll('.nav-item');
const tabPages      = document.querySelectorAll('.tab-page');
const navAdmins     = document.getElementById('nav-admins');

const pageTitle     = document.getElementById('page-title');
const pageSubtitle  = document.getElementById('page-subtitle');
const pendingBadge  = document.getElementById('pending-badge');
const refreshBtn    = document.getElementById('refresh-btn');
const addVehicleBtn = document.getElementById('add-vehicle-header-btn');

const vehicleModal  = document.getElementById('vehicle-modal');
const modalTitle    = document.getElementById('modal-title');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn= document.getElementById('modal-cancel-btn');
const vehicleForm   = document.getElementById('vehicle-form');
const createAdminForm = document.getElementById('create-admin-form');

// ─── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupEventListeners();
  pointRegisterLinkAtSite();
  checkAuth();
});

/// The portal is served under /admin; registration lives on the Tripnix site.
function pointRegisterLinkAtSite() {
  const link = document.getElementById('register-link');
  if (!link) return;
  link.href = window.location.origin.includes('3005')
    ? 'http://localhost:3000/'
    : window.location.origin + '/';
}

// ─── Auth ──────────────────────────────────────────────────
function checkAuth() {
  if (!state.currentUser) {
    showLogin();
  } else {
    showApp();
  }
}

function showLogin() {
  loginScreen.classList.remove('hidden');
  appLayout.classList.add('hidden');
}

function showApp() {
  loginScreen.classList.add('hidden');
  appLayout.classList.remove('hidden');
  updateSidebarProfile();
  loadData();
}

function updateSidebarProfile() {
  const user = state.currentUser;
  if (!user) return;

  const agencyName  = user.operatorName || 'Travel Agency';
  const username    = user.username || 'admin';
  const firstLetter = agencyName.charAt(0).toUpperCase();

  // Agency identity block (top of sidebar) — show it
  const agencyBlock = document.getElementById('agency-identity-block');
  if (agencyBlock) agencyBlock.classList.remove('hidden');

  document.getElementById('agency-avatar-letter').textContent    = firstLetter;
  document.getElementById('agency-name-display').textContent     = agencyName;
  document.getElementById('agency-username-display').textContent = '@' + username;

  // Profile mini (bottom logout row) — show it
  const profileRow = document.getElementById('profile-logout-row');
  if (profileRow) profileRow.classList.remove('hidden');

  document.getElementById('profile-mini-avatar').textContent   = firstLetter;
  document.getElementById('profile-mini-name').textContent     = agencyName;
  document.getElementById('profile-mini-username').textContent = '@' + username;

  // Hero greeting
  const heroName = document.getElementById('hero-agency-name');
  if (heroName) heroName.textContent = agencyName;

  // Super Admin → show Manage Admins tab
  if (user.role === 'superadmin') {
    navAdmins.classList.remove('hidden');
  } else {
    navAdmins.classList.add('hidden');
    if (state.activeTab === 'admins') switchTab('dashboard');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  loginError.classList.add('hidden');

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  const submitBtn = document.getElementById('login-submit-btn');
  submitBtn.textContent = 'Signing in…';
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    let userData = null;
    try {
      userData = await res.json();
    } catch (parseErr) {
      userData = null;
    }

    if (!res.ok) {
      throw new Error(userData?.error || 'Invalid username or password');
    }

    if (!userData) {
      throw new Error('Invalid response from backend server');
    }

    state.currentUser = userData;
    sessionStorage.setItem('tripnix_user', JSON.stringify(userData));
    loginForm.reset();
    showApp();

  } catch (err) {
    loginError.textContent = '⚠️ ' + err.message;
    loginError.classList.remove('hidden');
  } finally {
    submitBtn.textContent = 'Sign In';
    submitBtn.disabled = false;
  }
}

function handleLogout() {
  state.currentUser = null;
  state.vehicles = [];
  state.bookings = [];
  state.admins = [];
  sessionStorage.removeItem('tripnix_user');

  // Hide agency identity block and profile row
  const agencyBlock = document.getElementById('agency-identity-block');
  const profileRow  = document.getElementById('profile-logout-row');
  if (agencyBlock) agencyBlock.classList.add('hidden');
  if (profileRow)  profileRow.classList.add('hidden');

  // Clear displayed text
  document.getElementById('agency-avatar-letter').textContent    = '';
  document.getElementById('agency-name-display').textContent     = '';
  document.getElementById('agency-username-display').textContent = '';
  document.getElementById('profile-mini-avatar').textContent     = '';
  document.getElementById('profile-mini-name').textContent       = '';
  document.getElementById('profile-mini-username').textContent   = '';

  showLogin();
}

// ─── Sidebar Toggle (Mobile) ──────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;

  const isOpen = sidebar.classList.contains('active');
  if (isOpen) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.add('active');
  if (overlay) overlay.classList.add('active');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
}

// ─── Navigation ────────────────────────────────────────────
function setupNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.getAttribute('data-tab'));
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;
  closeSidebar();

  navItems.forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
  });
  tabPages.forEach(page => {
    page.classList.toggle('active', page.id === `tab-${tabId}`);
  });

  const titles = {
    dashboard: ['Dashboard Overview',    'Real-time bus schedules and fleet operations'],
    fleet:     ['Fleet Management',       'Add buses, edit details, and post available dates'],
    bookings:  ['Customer Bookings',      'Review and manage booking requests'],
    trips:     ['Trips',                  'Post trips that appear in the traveller app story bar'],
    schedule:  ['Bus Diary',              'The running schedule for each bus in your fleet'],
    subscription: ['Subscription & Plans', 'Platform membership and per-vehicle listing fees'],
    admins:    ['Manage Travel Owners',   'Create and manage Travel Owner login credentials']
  };

  if (titles[tabId]) {
    pageTitle.textContent    = titles[tabId][0];
    pageSubtitle.textContent = titles[tabId][1];
  }

  if (tabId === 'admins') loadAdmins();
  if (tabId === 'subscription') loadSubscription();
  if (tabId === 'trips') loadTrips();
  if (tabId === 'schedule') loadDiary();
}

// ─── Event Listeners ───────────────────────────────────────
function setupEventListeners() {
  loginForm.addEventListener('submit', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);

  document.getElementById('sidebar-toggle-btn')?.addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
  document.getElementById('sidebar-close-btn')?.addEventListener('click', closeSidebar);

  refreshBtn.addEventListener('click', loadData);
  addVehicleBtn.addEventListener('click', () => {
    // Adding vehicles is locked until the yearly platform fee is paid.
    if (state.subscription && !isPlatformActive()) {
      alert('🔒 Your agency is not registered yet.\n\nThe yearly platform fee is paid on the Tripnix site. See the Subscription page for the link.');
      switchTab('subscription');
      return;
    }
    openVehicleModal();
  });
  modalCloseBtn.addEventListener('click', closeVehicleModal);
  modalCancelBtn.addEventListener('click', closeVehicleModal);

  document.querySelectorAll('.filter-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.fleetFilter = chip.getAttribute('data-filter');
      renderFleetGrid();
    });
  });

  document.getElementById('fleet-search').addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderFleetGrid();
  });

  document.getElementById('vehicle-number')?.addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase();
  });

  vehicleForm.addEventListener('submit', handleVehicleFormSubmit);

  // Gallery media upload event listeners
  document.getElementById('upload-images-btn')?.addEventListener('click', () => {
    document.getElementById('vehicle-images-input')?.click();
  });
  document.getElementById('upload-videos-btn')?.addEventListener('click', () => {
    document.getElementById('vehicle-videos-input')?.click();
  });
  document.getElementById('vehicle-images-input')?.addEventListener('change', handleImageFilesSelect);
  document.getElementById('vehicle-videos-input')?.addEventListener('change', handleVideoFilesSelect);

  // Keep the subscription panel in step with the seat count / vehicle type.
  document.getElementById('vehicle-type')?.addEventListener('change', renderVehicleSubscriptionPanel);
  document.getElementById('vehicle-capacity')?.addEventListener('input', renderVehicleSubscriptionPanel);
  if (createAdminForm) createAdminForm.addEventListener('submit', handleCreateAdminSubmit);

  document.getElementById('pricing-form')?.addEventListener('submit', handlePricingSubmit);
  document.getElementById('trip-form')?.addEventListener('submit', handleTripSubmit);
  document.getElementById('trip-image-btn')?.addEventListener('click', () => {
    document.getElementById('trip-image-input')?.click();
  });
  document.getElementById('trip-image-input')?.addEventListener('change', handleTripImageSelect);

  setupCustomTypeDropdown();
}

function setupCustomTypeDropdown() {
  const dropdown = document.getElementById('vehicle-type-dropdown');
  const trigger  = document.getElementById('vehicle-type-trigger');
  const menu     = document.getElementById('vehicle-type-menu');
  const select   = document.getElementById('vehicle-type');
  const iconSpan = document.getElementById('selected-type-icon');
  const textSpan = document.getElementById('selected-type-text');
  const items    = menu?.querySelectorAll('.custom-dropdown-item');

  if (!trigger || !menu || !select) return;

  const icons = {
    Bus: '🚌',
    Traveller: '🚐',
    Car: '🚗'
  };

  window.syncCustomTypeDropdown = function(val) {
    const value = val || select.value || 'Bus';
    select.value = value;
    if (iconSpan) iconSpan.textContent = icons[value] || '🚌';
    if (textSpan) textSpan.textContent = value;

    items?.forEach(item => {
      item.classList.toggle('selected', item.dataset.value === value);
    });
    renderVehicleSubscriptionPanel();
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
      closeCustomTypeDropdown();
    } else {
      openCustomTypeDropdown();
    }
  });

  items?.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = item.dataset.value;
      window.syncCustomTypeDropdown(val);
      closeCustomTypeDropdown();
    });
  });

  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target)) {
      closeCustomTypeDropdown();
    }
  });
}

function openCustomTypeDropdown() {
  const dropdown = document.getElementById('vehicle-type-dropdown');
  const menu     = document.getElementById('vehicle-type-menu');
  dropdown?.classList.add('open');
  menu?.classList.remove('hidden');
}

function closeCustomTypeDropdown() {
  const dropdown = document.getElementById('vehicle-type-dropdown');
  const menu     = document.getElementById('vehicle-type-menu');
  dropdown?.classList.remove('open');
  menu?.classList.add('hidden');
}

/// Uploads a file to Cloudflare R2 and returns its URL.
///
/// Small files go straight through the API. Anything over the serverless body
/// limit is presigned so the browser PUTs it to R2 directly.
async function uploadToR2(file, folder) {
  let cfg;
  try {
    const cfgRes = await fetch(`${API_BASE}/uploads/config`);
    cfg = await cfgRes.json();
  } catch {
    throw new Error(
      `Could not reach the API at ${API_BASE}. Is the backend server running?`
    );
  }

  if (!cfg.configured) {
    throw new Error('R2 storage is not configured on the server yet.');
  }

  const limit = cfg.maxDirectUploadBytes || 4194304;

  if (file.size <= limit) {
    const form = new FormData();
    form.append('files', file);

    let res;
    try {
      res = await fetch(`${API_BASE}/uploads?folder=${encodeURIComponent(folder)}`, {
        method: 'POST',
        body: form
      });
    } catch {
      throw new Error(
        `Upload of "${file.name}" (${formatBytes(file.size)}) was cut off before it finished. ` +
        `Check that the backend is still running, then try again.`
      );
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
    return data.urls[0];
  }

  // Bigger than the server will accept in one request, so the browser has to
  // PUT it to R2 itself using a presigned URL.
  const presignRes = await fetch(`${API_BASE}/uploads/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, folder })
  });
  const presign = await presignRes.json().catch(() => null);
  if (!presignRes.ok) throw new Error(presign?.error || 'Could not presign upload');

  let put;
  try {
    put = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file
    });
  } catch {
    // A blocked CORS preflight rejects fetch outright, so the response-status
    // check below never runs — this is where that failure actually surfaces.
    throw new Error(
      `"${file.name}" is ${formatBytes(file.size)}, above this server's ` +
      `${formatBytes(limit)} direct-upload limit, so the browser must send it to ` +
      `Cloudflare R2 itself — and R2 refused the connection.\n\n` +
      `Add ${window.location.origin} to the bucket's CORS policy in the Cloudflare ` +
      `dashboard (R2 → tripnix → Settings → CORS), or upload a smaller file.`
    );
  }

  if (!put.ok) {
    throw new Error(`Direct upload to R2 failed (${put.status}).`);
  }
  return presign.url;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

async function uploadMediaFiles(e, folder, target) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  const label = document.getElementById('media-upload-status');
  const setStatus = (text) => { if (label) label.textContent = text; };

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Videos are large enough that a bare "Uploading…" looks like a hang.
      setStatus(`Uploading ${i + 1} of ${files.length} — ${file.name} (${formatBytes(file.size)})…`);
      const url = await uploadToR2(file, folder);
      state[target].push(url);
      renderMediaPreviews();
    }
    setStatus('');
  } catch (err) {
    setStatus('');
    alert('❌ ' + err.message);
  } finally {
    e.target.value = '';
  }
}

function handleImageFilesSelect(e) {
  return uploadMediaFiles(e, 'vehicles/images', 'vehicleFormImages');
}

function handleVideoFilesSelect(e) {
  return uploadMediaFiles(e, 'vehicles/videos', 'vehicleFormVideos');
}

function renderMediaPreviews() {
  const imgGrid = document.getElementById('images-preview-grid');
  const vidGrid = document.getElementById('videos-preview-grid');

  if (imgGrid) {
    imgGrid.innerHTML = state.vehicleFormImages.map((url, i) => `
      <div class="media-preview-item">
        <img src="${escapeHtml(url)}" alt="Vehicle image ${i + 1}" />
        <button type="button" class="media-preview-remove" onclick="removeFormImage(${i})" title="Remove image">&times;</button>
      </div>
    `).join('');
  }

  if (vidGrid) {
    vidGrid.innerHTML = state.vehicleFormVideos.map((url, i) => `
      <div class="media-preview-item">
        <video src="${escapeHtml(url)}" muted preload="metadata"></video>
        <button type="button" class="media-preview-remove" onclick="removeFormVideo(${i})" title="Remove video">&times;</button>
      </div>
    `).join('');
  }
}

window.removeFormImage = function(index) {
  state.vehicleFormImages.splice(index, 1);
  renderMediaPreviews();
};

window.removeFormVideo = function(index) {
  state.vehicleFormVideos.splice(index, 1);
  renderMediaPreviews();
};

// ─── Data Loading ──────────────────────────────────────────
async function loadData() {
  try {
    const [vRes, bRes] = await Promise.all([
      fetch(`${API_BASE}/vehicles`),
      fetch(`${API_BASE}/bookings`)
    ]);

    if (!vRes.ok || !bRes.ok) throw new Error('API error');

    const allVehicles = await vRes.json();
    const allBookings = await bRes.json();

    if (state.currentUser && state.currentUser.role !== 'superadmin') {
      // Travel Owner: see only their own operator's fleet
      const op = state.currentUser.operatorName.toLowerCase();
      state.vehicles = allVehicles.filter(v => v.operatorName.toLowerCase() === op);
      state.bookings = allBookings.filter(b => b.operatorName && b.operatorName.toLowerCase() === op);
    } else {
      state.vehicles = allVehicles;
      state.bookings = allBookings;
    }

    renderDashboard();
    renderFleetGrid();
    renderBookingsTable();
    await loadSubscription();
    await loadTrips();

    if (state.currentUser?.role === 'superadmin') await loadAdmins();

  } catch (err) {
    console.error('Load error:', err);
    alert('Cannot connect to backend (http://localhost:3000). Please start the backend first.');
  }
}

// ─── Trips (story bar in the traveller app) ────────────────
// ─── Bus Diary ─────────────────────────────────────────────

/// The diary shows one bus at a time. With a single bus it opens straight on
/// it; with several the agency picks, which is the point of the picker.
async function loadDiary() {
  await loadData();

  const fleet = state.vehicles;
  if (!fleet.length) {
    state.diaryVehicleId = null;
    state.diary = null;
    renderDiary();
    return;
  }

  const stillExists = fleet.some(v => v.id === state.diaryVehicleId);
  if (!stillExists) state.diaryVehicleId = fleet[0].id;

  await loadDiaryFor(state.diaryVehicleId);
}

async function loadDiaryFor(vehicleId) {
  state.diaryVehicleId = vehicleId;
  renderDiaryBusPicker();

  const listEl = document.getElementById('diary-list');
  if (listEl) listEl.innerHTML = '<p class="diary-empty">Loading schedule…</p>';

  try {
    const operator = state.currentUser?.operatorName || '';
    const res = await fetch(
      `${API_BASE}/vehicles/${vehicleId}/schedule?operatorName=${encodeURIComponent(operator)}`
    );
    if (!res.ok) throw new Error('Could not load the schedule');
    state.diary = await res.json();
  } catch (err) {
    state.diary = null;
    if (listEl) listEl.innerHTML = `<p class="diary-empty">❌ ${escapeHtml(err.message)}</p>`;
    return;
  }

  renderDiary();
}
window.loadDiaryFor = loadDiaryFor;

function renderDiary() {
  renderDiaryBusPicker();
  renderDiaryHeader();
  renderDiaryList();
  renderDiaryCalendar();
}

function renderDiaryBusPicker() {
  const box = document.getElementById('diary-bus-picker');
  if (!box) return;

  if (!state.vehicles.length) {
    box.innerHTML = '<p class="diary-empty">Add a bus to your fleet first — its diary appears here.</p>';
    return;
  }

  box.innerHTML = state.vehicles.map(v => `
    <button class="diary-bus${v.id === state.diaryVehicleId ? ' is-active' : ''}"
            onclick="loadDiaryFor(${v.id})">
      <span class="diary-bus-name">${escapeHtml(v.name)}</span>
      <span class="diary-bus-number">${escapeHtml(v.vehicleNumber || '—')}</span>
    </button>`).join('');
}

function renderDiaryHeader() {
  const title = document.getElementById('diary-vehicle-title');
  const sub   = document.getElementById('diary-vehicle-sub');
  const d = state.diary;
  if (!title || !sub) return;

  if (!d) {
    title.textContent = 'Schedule';
    sub.textContent = '';
    return;
  }
  title.textContent = `${d.vehicleName} · ${d.vehicleNumber || '—'}`;
  sub.textContent = `${d.vehicleType} · ${d.seats} seats`;
}

function renderDiaryList() {
  const el = document.getElementById('diary-list');
  const summary = document.getElementById('diary-summary');
  if (!el) return;

  const d = state.diary;
  if (!d) { el.innerHTML = ''; if (summary) summary.innerHTML = ''; return; }

  const upcoming = d.entries.filter(e => e.status !== 'Completed');

  if (summary) {
    summary.innerHTML = `
      <div class="diary-stat"><strong>${upcoming.length}</strong><span>Scheduled</span></div>
      <div class="diary-stat"><strong>${d.bookedDates.length}</strong><span>Days booked</span></div>
      <div class="diary-stat"><strong>${d.entries.filter(e => e.kind === 'booking').length}</strong><span>From bookings</span></div>`;
  }

  if (!d.entries.length) {
    el.innerHTML = '<p class="diary-empty">Nothing scheduled for this bus yet. Post a trip from the Trips tab, or wait for a customer booking.</p>';
    return;
  }

  el.innerHTML = d.entries.map(e => {
    const statusClass = e.status === 'On Trip' ? 'confirmed'
      : e.status === 'Completed' ? 'cancelled' : 'pending';

    // Booking entries carry the traveller's details; agency-posted trips carry
    // a destination and note instead.
    const who = e.kind === 'booking'
      ? `<div class="diary-row-who">👤 ${escapeHtml(e.customerName || 'Customer')}${e.customerPhone ? ` · <a href="tel:${escapeHtml(e.customerPhone)}">${escapeHtml(e.customerPhone)}</a>` : ''}</div>`
      : (e.note ? `<div class="diary-row-who">${escapeHtml(e.note)}</div>` : '');

    return `
      <div class="diary-row">
        <div class="diary-row-dates">
          <strong>${formatDate(e.departureDate)}</strong>
          <span>→ ${formatDate(e.arrivalDate)}</span>
          <small>${e.durationDays} day${e.durationDays === 1 ? '' : 's'}</small>
        </div>
        <div class="diary-row-main">
          <div class="diary-row-place">
            ${e.kind === 'booking' ? '📑 Customer booking' : '🗺️ ' + escapeHtml(e.place || 'Trip')}
          </div>
          ${who}
        </div>
        <div class="diary-row-status">
          <span class="badge-status ${statusClass}">${escapeHtml(e.status)}</span>
        </div>
      </div>`;
  }).join('');
}

/// A month grid for the current and next month, with taken days marked.
function renderDiaryCalendar() {
  const el = document.getElementById('diary-calendar');
  if (!el) return;

  const d = state.diary;
  if (!d) { el.innerHTML = ''; return; }

  const booked = new Set(d.bookedDates);
  const today = new Date();
  const months = [0, 1].map(offset => new Date(today.getFullYear(), today.getMonth() + offset, 1));

  el.innerHTML = months.map(first => {
    const label = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    // Monday-first grid.
    const lead = (first.getDay() + 6) % 7;

    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span class="diary-day is-blank"></span>');
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push(`<span class="diary-day${booked.has(iso) ? ' is-booked' : ''}" title="${iso}">${day}</span>`);
    }

    return `
      <div class="diary-month">
        <div class="diary-month-label">${escapeHtml(label)}</div>
        <div class="diary-weekdays"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
        <div class="diary-grid">${cells.join('')}</div>
      </div>`;
  }).join('');
}

async function loadTrips() {
  const operatorName = state.currentUser?.operatorName;
  if (!operatorName) return;

  try {
    const url = state.currentUser.role === 'superadmin'
      ? `${API_BASE}/trips`
      : `${API_BASE}/trips?operatorName=${encodeURIComponent(operatorName)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load trips');
    state.trips = await res.json();
    renderTripVehicleOptions();
    renderTripsTable();
  } catch (err) {
    console.error('Trips load error:', err);
  }
}

/// Only vehicles with a live subscription can carry a trip, so the picker
/// says why the others are unavailable rather than hiding them.
function renderTripVehicleOptions() {
  const select = document.getElementById('trip-vehicle');
  if (!select) return;

  const listings = state.subscription?.listings || [];
  const isListed = v => listings.some(l => l.vehicleId === v.id && l.status === 'active');

  if (!state.vehicles.length) {
    select.innerHTML = `<option value="">No vehicles in your fleet yet</option>`;
    return;
  }

  const previous = select.value;
  select.innerHTML = state.vehicles.map(v => {
    const ok = isListed(v);
    return `<option value="${v.id}" ${ok ? '' : 'disabled'}>
      ${escapeHtml(v.name)} · ${escapeHtml(v.vehicleNumber || '—')}${ok ? '' : '  (no active subscription)'}
    </option>`;
  }).join('');
  if (previous) select.value = previous;
}

async function handleTripImageSelect(e) {
  const file = (e.target.files || [])[0];
  if (!file) return;

  const status = document.getElementById('trip-image-status');
  const original = status?.textContent;
  if (status) status.textContent = 'Uploading to R2…';

  try {
    const url = await uploadToR2(file, 'trips');
    document.getElementById('trip-image').value = url;
    renderTripImagePreview();
    if (status) status.textContent = 'Uploaded ✓';
  } catch (err) {
    if (status) status.textContent = original || '';
    alert('❌ ' + err.message);
  } finally {
    e.target.value = '';
  }
}

function renderTripImagePreview() {
  const box = document.getElementById('trip-image-preview');
  const url = document.getElementById('trip-image').value.trim();
  if (!box) return;
  box.innerHTML = url
    ? `<img src="${escapeHtml(url)}" alt="Trip image preview" onerror="this.style.display='none'" />`
    : '';
}

function tripStatusClass(status) {
  if (status === 'On Trip') return 'confirmed';
  if (status === 'Completed') return 'cancelled';
  return 'pending';
}

function renderTripsTable() {
  const tbody = document.getElementById('trips-tbody');
  const note = document.getElementById('trips-count-note');
  if (!tbody) return;

  if (!state.trips.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No trips posted yet.</td></tr>`;
    if (note) note.textContent = '';
    return;
  }

  const live = state.trips.filter(t => t.busListed && t.status !== 'Completed').length;
  if (note) note.textContent = `${live} of ${state.trips.length} showing in the app`;

  tbody.innerHTML = state.trips.map(t => `
    <tr>
      <td>
        <strong>${escapeHtml(t.place)}</strong><br>
        <small style="color:var(--text-muted);">${t.durationDays} day${t.durationDays === 1 ? '' : 's'}${t.note ? ' · ' + escapeHtml(t.note) : ''}</small>
      </td>
      <td>
        ${escapeHtml(t.vehicleName || '—')}<br>
        <code class="vehicle-number">${escapeHtml(t.vehicleNumber || '—')}</code>
      </td>
      <td>${formatDate(t.departureDate)}</td>
      <td>${formatDate(t.arrivalDate)}</td>
      <td>
        <span class="badge-status ${tripStatusClass(t.status)}">${escapeHtml(t.status)}</span>
        ${t.busListed ? '' : '<br><small style="color:var(--accent-red);">bus not subscribed</small>'}
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteTrip(${t.id})">🗑️ Delete</button>
      </td>
    </tr>`).join('');
}

async function handleTripSubmit(e) {
  e.preventDefault();
  const vehicleId = document.getElementById('trip-vehicle').value;
  if (!vehicleId) return alert('❌ Add a subscribed vehicle to your fleet first.');

  const payload = {
    operatorName: state.currentUser.operatorName,
    vehicleId: Number(vehicleId),
    place: document.getElementById('trip-place').value.trim(),
    departureDate: document.getElementById('trip-departure').value,
    arrivalDate: document.getElementById('trip-arrival').value,
    imageUrl: document.getElementById('trip-image').value.trim(),
    note: document.getElementById('trip-note').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Failed to post trip');

    document.getElementById('trip-form').reset();
    renderTripImagePreview();
    await loadTrips();
    alert(`✅ Trip to ${data.place} posted!

Bus: ${data.vehicleName} (${data.vehicleNumber})
Departs: ${formatDate(data.departureDate)}
Arrives: ${formatDate(data.arrivalDate)}
Status: ${data.status}`);
  } catch (err) {
    alert('❌ ' + err.message);
  }
}

window.deleteTrip = async function(id) {
  if (!confirm('Remove this trip from the traveller app?')) return;
  try {
    const res = await fetch(`${API_BASE}/trips/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete trip');
    await loadTrips();
  } catch (err) {
    alert('❌ ' + err.message);
  }
};

// ─── Subscription & Plans ──────────────────────────────────
async function loadSubscription() {
  const operatorName = state.currentUser?.operatorName;
  if (!operatorName) return;

  try {
    const [plansRes, subRes] = await Promise.all([
      fetch(`${API_BASE}/subscriptions/plans`),
      fetch(`${API_BASE}/subscriptions?operatorName=${encodeURIComponent(operatorName)}`)
    ]);
    if (!plansRes.ok || !subRes.ok) throw new Error('Failed to load subscription data');

    state.plans = await plansRes.json();
    state.subscription = await subRes.json();

    if (state.currentUser.role === 'superadmin') {
      const overviewRes = await fetch(`${API_BASE}/subscriptions/overview`);
      if (overviewRes.ok) state.agencySubs = await overviewRes.json();
    }

    renderSubscription();
  } catch (err) {
    console.error('Subscription load error:', err);
  }
}

/// Formats an amount using the catalogue currency, e.g. ₹12,000.
function money(amount) {
  const symbol = state.plans?.currencySymbol || '₹';
  return symbol + Number(amount || 0).toLocaleString('en-IN');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

/// The listing plan for a vehicle. One flat fee per vehicle, per period.
///
/// One flat fee covers every vehicle, so this must not match on type. Matching
/// "Bus" against the catalogue's single "All" tier never succeeded, which put
/// "No subscription plan exists for vehicle type Bus" in the Add Vehicle form
/// and replaced the Pay button in the Subscription table with "No matching
/// tier" — so no vehicle could be added or subscribed at all.
///
/// The API charges `vehicleTiers[0]` regardless of type, and this has to agree
/// with it or the price quoted here is not the price charged.
function tierForVehicle() {
  return state.plans?.vehicleTiers?.[0] || null;
}

/// "month" / "year" — whatever the catalogue is billing on.
function period() {
  return state.plans?.billingPeriod || 'month';
}

function isPlatformActive() {
  return state.subscription?.platform?.status === 'active';
}

function renderSubscription() {
  if (!state.plans) return;
  renderMembershipCard();
  renderPlatformPlanOptions();
  renderPlanGrid();
  renderListingsTable();
  renderSuperAdminSubscriptionPanels();
  applyPlatformGate();
}

/// The platform fee is paid on the Tripnix site during agency registration, so
/// the portal only reports its status and expiry — it can't be bought here.
function renderMembershipCard() {
  const plan     = state.plans.platform;
  const platform = state.subscription?.platform;
  const active   = isPlatformActive();
  const siteUrl  = window.location.origin.includes('3005')
    ? 'http://localhost:3000/'
    : window.location.origin + '/';

  document.getElementById('membership-title').textContent = plan.name;

  // Headline shows the plan the agency is actually on; before they subscribe it
  // shows the cheapest entry point, with both options listed underneath.
  const plans   = plan.plans || [];
  const current = plans.find(p => p.id === platform?.planId);
  const cheapest = plans.reduce((a, b) => (a && a.price <= b.price ? a : b), plans[0]);
  const headline = current || cheapest;

  document.getElementById('membership-price').textContent = headline
    ? `${money(headline.price)} / ${headline.period}`
    : money(plan.price);

  const priceLabel = document.querySelector('.membership-price-label');
  if (priceLabel) {
    priceLabel.textContent = current ? 'Your platform plan' : 'Platform fee from';
  }

  document.getElementById('membership-benefits').innerHTML =
    plan.features.map(f => `<li>${escapeHtml(f)}</li>`).join('');

  const badge = document.getElementById('membership-badge');
  const card  = document.getElementById('membership-card');
  const line  = document.getElementById('membership-status-line');
  const note  = document.getElementById('membership-managed-note');

  card.classList.toggle('is-active', active);

  document.getElementById('membership-start').textContent     = formatDate(platform?.startsAt);
  document.getElementById('membership-expiry').textContent    = formatDate(platform?.expiresAt);
  document.getElementById('membership-remaining').textContent = platform && active
    ? `${platform.daysLeft} days`
    : '—';
  document.getElementById('membership-paid').textContent = platform ? money(platform.amount) : '—';

  if (active) {
    badge.className = 'badge-status confirmed';
    badge.textContent = 'ACTIVE';
    line.textContent = `${state.subscription.operatorName} is registered. You can add vehicles and browse other agencies' fleets.`;
    note.innerHTML = `🔒 Managed on the Tripnix site — renew at <a href="${siteUrl}" target="_blank" rel="noopener">${siteUrl}</a> before it expires.`;
  } else if (platform) {
    badge.className = 'badge-status cancelled';
    badge.textContent = 'EXPIRED';
    line.textContent = 'Your membership has lapsed, so your fleet is hidden from travellers.';
    note.innerHTML = `⚠️ Renew on the Tripnix site to go live again: <a href="${siteUrl}" target="_blank" rel="noopener">${siteUrl}</a>`;
  } else {
    badge.className = 'badge-status pending';
    badge.textContent = 'NOT REGISTERED';
    line.textContent = plan.tagline;
    note.innerHTML = `⚠️ Pay the platform fee on the Tripnix site to activate your agency: <a href="${siteUrl}" target="_blank" rel="noopener">${siteUrl}</a>`;
  }

  // Sidebar nag when the agency still owes the platform fee.
  const navBadge = document.getElementById('subscription-badge');
  if (navBadge) navBadge.style.display = active ? 'none' : 'inline-block';
}

/// One flat listing fee covers every vehicle, so this renders a single card
/// rather than one per category.
function renderPlanGrid() {
  const grid = state.plans ? document.getElementById('plan-grid') : null;
  if (!grid) return;

  const tier = state.plans.vehicleTiers[0];
  if (!tier) {
    grid.innerHTML = '<p class="plan-empty">No vehicle plan configured.</p>';
    return;
  }

  grid.innerHTML = `
    <div class="plan-cards">
      <div class="plan-card plan-card-wide">
        <span class="plan-card-tier">🚍 ${escapeHtml(tier.label)}</span>
        <span class="plan-card-seats">${escapeHtml(tier.seatsLabel)}</span>
        <div class="plan-card-price">${money(tier.price)}</div>
        <span class="plan-card-period">per vehicle / ${period()}</span>
      </div>
    </div>`;
}

/// The monthly and yearly platform options, shown beside the membership price.
function renderPlatformPlanOptions() {
  const box = document.getElementById('platform-plan-options');
  if (!box) return;

  const plans = state.plans?.platform?.plans || [];
  if (!plans.length) {
    box.innerHTML = '';
    return;
  }

  const currentId = state.subscription?.platform?.planId;

  box.innerHTML = plans.map(p => `
    <div class="platform-plan${p.id === currentId ? ' is-current' : ''}">
      <div class="platform-plan-head">
        <span class="platform-plan-label">${escapeHtml(p.label)}</span>
        <span class="platform-plan-price">${money(p.price)}</span>
      </div>
      <span class="platform-plan-note">
        ${p.id === currentId ? 'Your current plan' : (p.note ? escapeHtml(p.note) : `Billed every ${escapeHtml(p.period)}`)}
      </span>
    </div>`).join('');
}

function renderListingsTable() {
  const tbody = document.getElementById('listings-tbody');
  const note  = document.getElementById('listing-total-note');
  if (!tbody) return;

  if (!state.vehicles.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No vehicles in your fleet yet.</td></tr>`;
    note.textContent = '';
    return;
  }

  const listings = state.subscription?.listings || [];
  let outstanding = 0;

  tbody.innerHTML = state.vehicles.map(v => {
    const tier = tierForVehicle(v);
    const sub  = listings.find(l => l.vehicleId === v.id);
    const paid = sub?.status === 'active';
    if (!paid && tier) outstanding += tier.price;

    const statusCell = paid
      ? `<span class="badge-status confirmed">LISTED</span><br><small style="color:var(--text-muted);">till ${formatDate(sub.expiresAt)}</small>`
      : sub
        ? `<span class="badge-status cancelled">EXPIRED</span>`
        : `<span class="badge-status pending">UNPAID</span>`;

    const actionCell = !tier
      ? '<small style="color:var(--text-muted);">No matching tier</small>'
      : `<button class="btn btn-secondary btn-sm" onclick="payListingFee(${v.id})">
           ${paid ? '🔄 Renew' : '💳 Pay ' + money(tier.price)}
         </button>`;

    return `
      <tr>
        <td><strong>${escapeHtml(v.name)}</strong></td>
        <td><code class="vehicle-number">${escapeHtml(v.vehicleNumber || '—')}</code></td>
        <td>${escapeHtml(v.type)}</td>
        <td>${v.capacity}</td>
        <td>${tier ? money(tier.price) + '/' + period() : '—'}</td>
        <td>${statusCell}</td>
        <td>${actionCell}</td>
      </tr>`;
  }).join('');

  note.textContent = outstanding > 0
    ? `${money(outstanding)} / ${period()} in vehicle fees outstanding`
    : 'All vehicles are listed and paid up';
}

function renderSuperAdminSubscriptionPanels() {
  const panels = document.getElementById('superadmin-subscription-panels');
  if (!panels) return;

  if (state.currentUser?.role !== 'superadmin') {
    panels.classList.add('hidden');
    return;
  }
  panels.classList.remove('hidden');

  // Pricing form — only repopulate when the owner isn't mid-edit.
  const platformPlans = state.plans.platform.plans || [];
  const monthlyPlan = platformPlans.find(p => p.id === 'monthly');
  const yearlyPlan  = platformPlans.find(p => p.id === 'yearly');

  const platformInput = document.getElementById('price-platform');
  if (platformInput && document.activeElement !== platformInput) {
    platformInput.value = monthlyPlan ? monthlyPlan.price : state.plans.platform.price;
  }

  const yearlyInput = document.getElementById('price-platform-yearly');
  if (yearlyInput && yearlyPlan && document.activeElement !== yearlyInput) {
    yearlyInput.value = yearlyPlan.price;
  }

  const tierInputs = document.getElementById('tier-price-inputs');
  if (!tierInputs.dataset.built) {
    tierInputs.innerHTML = state.plans.vehicleTiers.map(t => `
      <div class="form-group">
        <label for="price-${t.id}">${escapeHtml(t.label)} <small style="color:var(--text-muted);">(per vehicle / ${period()})</small></label>
        <input type="number" id="price-${t.id}" data-tier-id="${t.id}" min="0" step="1" required />
      </div>`).join('');
    tierInputs.dataset.built = 'true';
  }
  state.plans.vehicleTiers.forEach(t => {
    const input = document.getElementById(`price-${t.id}`);
    if (input && document.activeElement !== input) input.value = t.price;
  });

  // Agency overview table
  const tbody = document.getElementById('agency-subs-tbody');
  if (!state.agencySubs.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No agency has subscribed yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.agencySubs.map(a => `
    <tr>
      <td><strong>${escapeHtml(a.operatorName)}</strong></td>
      <td>${a.platform
        ? `<span class="badge-status ${a.platform.status === 'active' ? 'confirmed' : 'cancelled'}">${a.platform.status.toUpperCase()}</span>`
        : `<span class="badge-status pending">NONE</span>`}</td>
      <td>${a.platform ? formatDate(a.platform.expiresAt) : '—'}</td>
      <td>${a.activeListings} / ${a.listingCount}</td>
      <td><strong>${money(a.totalPaid)}</strong></td>
    </tr>`).join('');
}

/// Vehicles can only be added once the yearly platform fee is paid — the
/// backend rejects it too, this just explains why up front.
function applyPlatformGate() {
  const active = isPlatformActive();
  addVehicleBtn.title = active
    ? 'Add a vehicle to your fleet'
    : 'Pay the platform fee first to start adding vehicles';
  addVehicleBtn.classList.toggle('btn-locked', !active);
}

window.payListingFee = async function(vehicleId) {
  const vehicle = state.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return;

  const tier = tierForVehicle();
  if (!tier) return alert('❌ No vehicle listing plan is configured.');

  // The API bills a listing for one billing period, so the confirmation has to
  // quote that same period rather than a hardcoded year.
  if (!confirm(`Confirm payment of ${money(tier.price)} to list "${vehicle.name}" for 1 ${period()}?\n\nTier: ${tier.label} (${tier.seatsLabel})`)) return;

  try {
    const res = await fetch(`${API_BASE}/subscriptions/listing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operatorName: vehicle.operatorName,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        type: vehicle.type,
        capacity: vehicle.capacity
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Payment failed');

    await loadSubscription();
    // Being listed is what makes a bus visible in the app and selectable for a
    // trip, so the views that read that have to be redrawn too — otherwise the
    // fleet card still reads "not listed" until the next full refresh.
    renderFleetGrid();
    renderTripVehicleOptions();

    alert(`✅ ${vehicle.name} is now listed!\n\nPlan: ${tier.label}\nPaid: ${money(tier.price)}\nValid until: ${formatDate(data.expiresAt)}`);
  } catch (err) {
    alert('❌ ' + err.message);
  }
};

async function handlePricingSubmit(e) {
  e.preventDefault();

  const platformPrice = Number(document.getElementById('price-platform').value);
  const yearlyPrice   = Number(document.getElementById('price-platform-yearly').value);
  const tiers = [...document.querySelectorAll('#tier-price-inputs input[data-tier-id]')]
    .map(input => ({ id: input.dataset.tierId, price: Number(input.value) }));

  const platformPlans = [
    { id: 'monthly', price: platformPrice },
    { id: 'yearly',  price: yearlyPrice }
  ];

  try {
    const res = await fetch(`${API_BASE}/subscriptions/plans`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformPrice, platformPlans, tiers })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to save pricing');

    await loadSubscription();
    alert('✅ Plan pricing updated.');
  } catch (err) {
    alert('❌ ' + err.message);
  }
}

// ─── Admins (Super Admin Only) ─────────────────────────────
async function loadAdmins() {
  if (state.currentUser?.role !== 'superadmin') return;
  try {
    const res = await fetch(`${API_BASE}/auth/admins`);
    if (!res.ok) throw new Error('Failed');
    state.admins = await res.json();
    renderAdminsTable();
  } catch (err) {
    console.error('Admins load error:', err);
  }
}

async function handleCreateAdminSubmit(e) {
  e.preventDefault();
  const username     = document.getElementById('admin-username').value.trim();
  const password     = document.getElementById('admin-password').value.trim();
  const operatorName = document.getElementById('admin-operator').value.trim();
  const phone        = document.getElementById('admin-phone').value.trim();

  try {
    const res = await fetch(`${API_BASE}/auth/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, operatorName, phone })
    });
    let errData = null;
    try { errData = await res.json(); } catch { errData = null; }
    if (!res.ok) {
      throw new Error(errData?.error || 'Failed to create account');
    }
    createAdminForm.reset();
    await loadAdmins();
    alert(`✅ Account created!\n\nTravel Agency: ${operatorName}\nUsername: ${username}\nPassword: ${password}\n\nShare these credentials with the travel owner.`);
  } catch (err) {
    alert('❌ ' + err.message);
  }
}

function renderAdminsTable() {
  const tbody = document.getElementById('admins-table-tbody');
  if (!tbody) return;

  if (!state.admins.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No travel owner accounts yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.admins.map(a => `
    <tr>
      <td>#${a.id}</td>
      <td><strong>${escapeHtml(a.username)}</strong></td>
      <td><code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;">${escapeHtml(a.password)}</code></td>
      <td>${escapeHtml(a.operatorName)}</td>
      <td>${a.phone ? escapeHtml(a.phone) : '<span style="color:var(--text-muted);">—</span>'}</td>
      <td><span class="badge-status ${a.role === 'superadmin' ? 'confirmed' : 'pending'}">${a.role === 'superadmin' ? 'Developer' : 'Travel Owner'}</span></td>
      <td>
        ${a.role !== 'superadmin'
          ? `<button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteAdmin(${a.id})">🗑️ Delete</button>`
          : '—'}
      </td>
    </tr>`).join('');
}

window.deleteAdmin = async function(id) {
  if (!confirm('Delete this travel owner account?')) return;
  try {
    const res = await fetch(`${API_BASE}/auth/admins/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    await loadAdmins();
  } catch (err) {
    alert('❌ ' + err.message);
  }
};

// ─── Dashboard Render ──────────────────────────────────────
function renderDashboard() {
  let confirmed = 0, pending = 0;
  state.bookings.forEach(b => {
    if (b.status === 'Confirmed') confirmed++;
    else if (b.status === 'Pending') pending++;
  });

  const uniqueDates = new Set();
  state.vehicles.forEach(v => (v.availableDates || []).forEach(d => uniqueDates.add(d)));

  document.getElementById('stat-fleet').textContent     = `${state.vehicles.length} Units`;
  document.getElementById('stat-schedules').textContent = `${uniqueDates.size} Days`;
  document.getElementById('stat-confirmed').textContent = confirmed;
  document.getElementById('stat-pending').textContent   = pending;

  pendingBadge.textContent = pending;
  pendingBadge.style.display = pending > 0 ? 'inline-block' : 'none';

  const buses      = state.vehicles.filter(v => v.type === 'Bus').length;
  const travellers = state.vehicles.filter(v => v.type === 'Traveller').length;
  const cars       = state.vehicles.filter(v => v.type === 'Car').length;
  document.getElementById('bus-count').textContent             = buses;
  document.getElementById('bus-count-desc').textContent        = `${buses} buses in fleet`;
  document.getElementById('traveller-count').textContent       = travellers;
  document.getElementById('traveller-count-desc').textContent  = `${travellers} travellers in fleet`;
  document.getElementById('car-count').textContent             = cars;
  document.getElementById('car-count-desc').textContent        = `${cars} cars in fleet`;

  const tbody = document.getElementById('recent-bookings-tbody');
  const recent = [...state.bookings].reverse().slice(0, 5);
  tbody.innerHTML = recent.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No bookings yet</td></tr>`
    : recent.map(b => `
      <tr>
        <td><strong>${escapeHtml(b.vehicleName)}</strong></td>
        <td>${escapeHtml(b.userName)}</td>
        <td>${b.startDate} → ${b.endDate}</td>
        <td><span class="badge-status ${b.status.toLowerCase()}">${b.status}</span></td>
      </tr>`).join('');
}

// ─── Fleet Grid Render ─────────────────────────────────────
function renderFleetGrid() {
  const grid = document.getElementById('vehicles-grid');
  const filtered = state.vehicles.filter(v => {
    const catOk = state.fleetFilter === 'All' || v.type === state.fleetFilter;
    const q = state.searchQuery.trim().toLowerCase();
    const searchOk = !q || v.name.toLowerCase().includes(q) || v.operatorName.toLowerCase().includes(q);
    return catOk && searchOk;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);">No vehicles found.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(v => {
    const dates = (v.availableDates || []);
    const datePills = dates.length
      ? dates.map(d => `<span class="date-pill">${d}</span>`).join('')
      : `<span style="font-size:11px;color:var(--text-muted);">No dates posted yet</span>`;

    return `
    <div class="vehicle-admin-card">
      <div class="card-image">
        ${(v.imageUrls || [])[0]
          ? `<img src="${(v.imageUrls || [])[0]}" alt="${escapeHtml(v.name)}" />`
          : `<div class="card-image-empty">No photo uploaded</div>`}
        <span class="card-badge">${v.type.toUpperCase()}</span>
      </div>
      <div class="card-body">
        <h4 class="card-title">${escapeHtml(v.name)}</h4>
        <p class="card-operator">
          <code class="vehicle-number">${escapeHtml(v.vehicleNumber || '—')}</code>
          &nbsp;·&nbsp; ${escapeHtml(v.operatorName)}
        </p>
        <div class="card-specs">
          <span>👥 ${v.capacity} Seats</span>
          <span>⭐ ${v.rating?.toFixed(1) ?? '5.0'}</span>
        </div>
        <div style="margin-top:10px;">
          <span style="font-size:11px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">📅 Available Showcase Dates:</span>
          <div class="date-pills">${datePills}</div>
        </div>
        <div class="card-footer" style="margin-top:14px;">
          <div class="card-actions" style="margin-left:auto;">
            <button class="btn btn-secondary btn-sm" onclick="editVehicle(${v.id})">✏️ Edit</button>
            <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteVehicle(${v.id})">🗑️ Delete</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── Bookings Table ────────────────────────────────────────
function renderBookingsTable() {
  const tbody = document.getElementById('all-bookings-tbody');
  const sorted = [...state.bookings].reverse();

  tbody.innerHTML = !sorted.length
    ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No bookings found.</td></tr>`
    : sorted.map(b => `
      <tr>
        <td>#${b.id}</td>
        <td><strong>${escapeHtml(b.vehicleName)}</strong></td>
        <td>${escapeHtml(b.userName)}</td>
        <td>${escapeHtml(b.userPhone)}</td>
        <td>${b.startDate} → ${b.endDate}</td>
        <td><span class="badge-status ${b.status.toLowerCase()}">${b.status}</span></td>
        <td>${b.status === 'Pending' ? `
          <button class="btn btn-action-confirm" onclick="updateBookingStatus(${b.id}, 'Confirmed')">Confirm</button>
          <button class="btn btn-action-cancel" onclick="updateBookingStatus(${b.id}, 'Cancelled')">Cancel</button>` : '—'}
        </td>
      </tr>`).join('');
}

// ─── Vehicle Modal & Calendar Datepicker ─────────────────
let datePickerInstance = null;

function initDatePicker() {
  const dateInput = document.getElementById('vehicle-dates');
  if (!dateInput) return;

  if (typeof flatpickr !== 'undefined' && !datePickerInstance) {
    datePickerInstance = flatpickr(dateInput, {
      mode: 'multiple',
      dateFormat: 'Y-m-d',
      conjunction: ', ',
      theme: 'dark',
      monthSelectorType: 'dropdown',
      onChange: (selectedDates) => {
        updateDateChips(selectedDates);
      }
    });
    setupDatePresets();
  }
}

function updateDateChips(selectedDates) {
  const container = document.getElementById('selected-date-chips');
  const countBadge = document.getElementById('selected-dates-count');
  if (!container) return;

  const dateStrings = (selectedDates || []).map(d => {
    if (d instanceof Date) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(d).trim();
  }).filter(Boolean).sort();

  if (countBadge) {
    countBadge.textContent = `${dateStrings.length} date${dateStrings.length === 1 ? '' : 's'} selected`;
  }

  if (dateStrings.length === 0) {
    container.innerHTML = `<span class="no-dates-text">No dates selected yet. Click input or presets above to select dates.</span>`;
    return;
  }

  container.innerHTML = dateStrings.map(dStr => `
    <span class="selected-date-chip">
      <span class="chip-date">📅 ${dStr}</span>
      <button type="button" class="chip-remove" data-date="${dStr}" title="Remove date">&times;</button>
    </span>
  `).join('');

  container.querySelectorAll('.chip-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dateToRemove = btn.getAttribute('data-date');
      removeSingleDate(dateToRemove);
    });
  });
}

function removeSingleDate(dateStr) {
  if (!datePickerInstance) return;
  const currentDates = datePickerInstance.selectedDates;
  const filtered = currentDates.filter(d => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}` !== dateStr;
  });
  datePickerInstance.setDate(filtered, true);
}

function setupDatePresets() {
  document.getElementById('preset-today')?.addEventListener('click', () => {
    const today = new Date();
    datePickerInstance?.setDate([today], true);
  });

  document.getElementById('preset-next-7')?.addEventListener('click', () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    datePickerInstance?.setDate(dates, true);
  });

  document.getElementById('preset-next-14')?.addEventListener('click', () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    datePickerInstance?.setDate(dates, true);
  });

  document.getElementById('preset-clear')?.addEventListener('click', () => {
    datePickerInstance?.clear();
    updateDateChips([]);
  });

  document.getElementById('open-calendar-btn')?.addEventListener('click', () => {
    datePickerInstance?.open();
  });
}

function openVehicleModal(vehicle = null) {
  state.editingVehicleId = vehicle?.id ?? null;
  modalTitle.textContent = vehicle ? 'Edit Vehicle' : 'Add New Vehicle';

  // Set here as well as in the subscription panel below, because that panel
  // only runs once the plan catalogue has loaded — until then the button kept
  // whatever label the previous use of the modal left on it.
  const saveBtn = document.getElementById('modal-save-btn');
  if (saveBtn) saveBtn.textContent = vehicle ? 'Update Vehicle' : 'Add Vehicle';

  // Operator is auto-filled from logged-in user (read-only)
  const op = state.currentUser?.operatorName ?? '';

  const typeVal = vehicle?.type ?? 'Bus';
  document.getElementById('vehicle-id').value          = vehicle?.id ?? '';
  document.getElementById('vehicle-type').value        = typeVal;
  document.getElementById('vehicle-operator').value    = vehicle?.operatorName ?? op;
  document.getElementById('vehicle-name').value        = vehicle?.name ?? '';
  document.getElementById('vehicle-number').value      = vehicle?.vehicleNumber ?? '';
  document.getElementById('vehicle-capacity').value    = vehicle?.capacity ?? 36;
  document.getElementById('vehicle-description').value = vehicle?.description ?? '';
  document.getElementById('vehicle-instagram').value   = vehicle?.instagramUrl ?? '';

  if (window.syncCustomTypeDropdown) window.syncCustomTypeDropdown(typeVal);

  state.vehicleFormImages = Array.isArray(vehicle?.imageUrls) ? [...vehicle.imageUrls] : [];
  state.vehicleFormVideos = Array.isArray(vehicle?.videoUrls) ? [...vehicle.videoUrls] : [];
  renderMediaPreviews();

  const selected = vehicle?.features ?? ['AC', 'WiFi'];
  document.querySelectorAll('.features-checkboxes input').forEach(cb => {
    cb.checked = selected.includes(cb.value);
  });

  initDatePicker();
  const dates = vehicle?.availableDates ?? [];
  if (datePickerInstance) {
    datePickerInstance.setDate(dates, false);
    updateDateChips(datePickerInstance.selectedDates);
  } else {
    document.getElementById('vehicle-dates').value = dates.join(', ');
  }

  renderVehicleSubscriptionPanel();
  vehicleModal.classList.remove('hidden');
}

/// Shows which seat-based subscription the vehicle falls into and what saving
/// it will cost. Updates live as the type or seat count changes.
function renderVehicleSubscriptionPanel() {
  const panel = document.getElementById('vehicle-sub-panel');
  if (!panel || !state.plans) return;

  const editing = Boolean(state.editingVehicleId);
  const type = document.getElementById('vehicle-type').value;
  const tier = tierForVehicle();

  const labelEl = document.getElementById('vehicle-sub-tier-label');
  const seatsEl = document.getElementById('vehicle-sub-tier-seats');
  const priceEl = document.getElementById('vehicle-sub-price');
  const noteEl  = document.getElementById('vehicle-sub-note');
  const saveBtn = document.getElementById('modal-save-btn');

  if (!tier) {
    panel.classList.add('is-invalid');
    labelEl.textContent = 'No listing plan configured';
    seatsEl.textContent = type || '';
    priceEl.textContent = '—';
    noteEl.textContent  = 'No vehicle listing plan is configured. Ask the Super Admin to set one on the Subscription page.';
    saveBtn.textContent = editing ? 'Update Vehicle' : 'Add Vehicle';
    // Editing changes details only and never touches the listing fee, so a
    // missing plan must not block it.
    saveBtn.disabled = !editing;
    return;
  }

  panel.classList.remove('is-invalid');
  saveBtn.disabled = false;
  labelEl.textContent = `${tier.label} subscription`;
  seatsEl.textContent = 'Flat fee — any seat count';
  priceEl.textContent = `${money(tier.price)}/${period()}`;

  // Editing never charges: the listing fee is bought once when the vehicle is
  // added, and renewed from the Subscription page. Only the add flow mentions
  // payment at all.
  if (editing) {
    const existing = (state.subscription?.listings || [])
      .find(l => l.vehicleId === state.editingVehicleId);

    noteEl.textContent = existing?.status === 'active'
      ? `Listed until ${formatDate(existing.expiresAt)}. Updating these details does not change the subscription.`
      : 'Updating these details does not change the subscription. Renew it from the Subscription page.';
    saveBtn.textContent = 'Update Vehicle';
  } else {
    // The panel right above already states the fee, so the button just names
    // the action.
    noteEl.textContent = `Adding this vehicle charges ${money(tier.price)} for one ${period()}. It goes live in the app straight after.`;
    saveBtn.textContent = 'Add Vehicle';
  }
}

function closeVehicleModal() {
  if (datePickerInstance) {
    datePickerInstance.clear();
  }
  updateDateChips([]);
  state.vehicleFormImages = [];
  state.vehicleFormVideos = [];
  renderMediaPreviews();
  if (window.syncCustomTypeDropdown) window.syncCustomTypeDropdown('Bus');
  vehicleModal.classList.add('hidden');
  vehicleForm.reset();
}

async function handleVehicleFormSubmit(e) {
  e.preventDefault();
  const id           = state.editingVehicleId;
  const name          = document.getElementById('vehicle-name').value.trim();
  const vehicleNumber = document.getElementById('vehicle-number').value.trim().toUpperCase();
  const type          = document.getElementById('vehicle-type').value;
  const operatorName = document.getElementById('vehicle-operator').value.trim();
  const capacity     = Number(document.getElementById('vehicle-capacity').value);
  const description  = document.getElementById('vehicle-description').value.trim();
  const instagramUrl = document.getElementById('vehicle-instagram').value.trim();

  let availableDates = [];
  if (datePickerInstance && datePickerInstance.selectedDates.length > 0) {
    availableDates = datePickerInstance.selectedDates.map(d => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }).sort();
  } else {
    availableDates = document.getElementById('vehicle-dates').value.split(',').map(s => s.trim()).filter(Boolean);
  }

  const imageUrls    = state.vehicleFormImages;
  const videoUrls    = state.vehicleFormVideos;
  const features     = [...document.querySelectorAll('.features-checkboxes input:checked')].map(cb => cb.value);

  const payload = {
    name, type, vehicleNumber, operatorName, capacity, description, instagramUrl,
    availableDates,
    // Send exactly what the agency uploaded. Substituting stock media here is
    // what used to put a photo of someone else's coach on their listing.
    imageUrls,
    videoUrls,
    features
  };

  // Only adding buys a listing, so a missing plan must not block an edit.
  const tier = tierForVehicle();
  if (!tier && !id) {
    return alert('❌ No vehicle listing plan is configured, so this vehicle cannot be listed yet.');
  }

  const saveBtn = document.getElementById('modal-save-btn');
  const originalLabel = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const url    = id ? `${API_BASE}/vehicles/${id}` : `${API_BASE}/vehicles`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    let data = null;
    try { data = await res.json(); } catch { data = null; }

    if (!res.ok) {
      // 402 = the agency hasn't paid the platform fee yet.
      throw new Error(data?.error || 'Failed to save vehicle');
    }

    // Editing only changes details — the listing fee was already paid when the
    // vehicle was added, and renewals happen on the Subscription page.
    if (id) {
      closeVehicleModal();
      await loadData();
      return alert(`✅ ${name} updated.`);
    }

    // Adding: the API buys the listing as part of creating the vehicle and
    // returns it. Charging it from here as a second request billed the agency
    // twice for the same bus, and left it saved-but-unlisted whenever the
    // second request was the one that failed.
    closeVehicleModal();
    await loadData();

    if (!data.listing) {
      return alert(
        `⚠️ ${name} was saved, but its listing fee could not be charged, so it is ` +
        `not visible to travellers yet.\n\n${data.listingWarning || ''}\n\n` +
        `Pay it from the Subscription page.`
      );
    }

    return alert(
      `✅ ${name} is live in the app!\n\n` +
      `Plan: ${data.listing.tierLabel}\n` +
      `Paid: ${money(tier.price)}\n` +
      `Listed until: ${formatDate(data.listing.expiresAt)}`
    );
  } catch (err) {
    alert('❌ ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalLabel;
  }
}

window.editVehicle = function(id) {
  const v = state.vehicles.find(v => v.id === id);
  if (v) openVehicleModal(v);
};

window.deleteVehicle = async function(id) {
  if (!confirm('Delete this vehicle from your fleet?')) return;
  try {
    const res = await fetch(`${API_BASE}/vehicles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed');
    await loadData();
  } catch (err) {
    alert('❌ ' + err.message);
  }
};

window.updateBookingStatus = async function(id, status) {
  try {
    const res = await fetch(`${API_BASE}/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed');
    await loadData();
  } catch (err) {
    alert('❌ ' + err.message);
  }
};

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}
