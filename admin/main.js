const API_BASE = window.location.origin.includes('3005')
  ? 'http://localhost:3000/api'
  : window.location.origin + '/api';

// ─── State ───────────────────────────────────────────────
let state = {
  currentUser: JSON.parse(sessionStorage.getItem('tripnix_user') || 'null'),
  vehicles: [],
  bookings: [],
  admins: [],
  activeTab: 'dashboard',
  fleetFilter: 'All',
  searchQuery: '',
  editingVehicleId: null
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
  checkAuth();
});

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
    admins:    ['Manage Travel Owners',   'Create and manage Travel Owner login credentials']
  };

  if (titles[tabId]) {
    pageTitle.textContent    = titles[tabId][0];
    pageSubtitle.textContent = titles[tabId][1];
  }

  if (tabId === 'admins') loadAdmins();
}

// ─── Event Listeners ───────────────────────────────────────
function setupEventListeners() {
  loginForm.addEventListener('submit', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);

  document.getElementById('sidebar-toggle-btn')?.addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
  document.getElementById('sidebar-close-btn')?.addEventListener('click', closeSidebar);

  refreshBtn.addEventListener('click', loadData);
  addVehicleBtn.addEventListener('click', () => openVehicleModal());
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

  vehicleForm.addEventListener('submit', handleVehicleFormSubmit);
  if (createAdminForm) createAdminForm.addEventListener('submit', handleCreateAdminSubmit);
}

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

    if (state.currentUser?.role === 'superadmin') await loadAdmins();

  } catch (err) {
    console.error('Load error:', err);
    alert('Cannot connect to backend (http://localhost:3000). Please start the backend first.');
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

  try {
    const res = await fetch(`${API_BASE}/auth/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, operatorName })
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
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No travel owner accounts yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.admins.map(a => `
    <tr>
      <td>#${a.id}</td>
      <td><strong>${escapeHtml(a.username)}</strong></td>
      <td><code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;">${escapeHtml(a.password)}</code></td>
      <td>${escapeHtml(a.operatorName)}</td>
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

  const buses = state.vehicles.filter(v => v.type === 'Bus').length;
  const cars  = state.vehicles.filter(v => v.type === 'Car').length;
  document.getElementById('bus-count').textContent      = buses;
  document.getElementById('bus-count-desc').textContent = `${buses} buses in fleet`;
  document.getElementById('car-count').textContent      = cars;
  document.getElementById('car-count-desc').textContent = `${cars} cars in fleet`;

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
        <img src="${(v.imageUrls || [])[0] || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957'}" alt="${escapeHtml(v.name)}" />
        <span class="card-badge">${v.type.toUpperCase()}</span>
      </div>
      <div class="card-body">
        <h4 class="card-title">${escapeHtml(v.name)}</h4>
        <p class="card-operator">by ${escapeHtml(v.operatorName)}</p>
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

  // Operator is auto-filled from logged-in user (read-only)
  const op = state.currentUser?.operatorName ?? '';

  document.getElementById('vehicle-id').value          = vehicle?.id ?? '';
  document.getElementById('vehicle-type').value        = vehicle?.type ?? 'Bus';
  document.getElementById('vehicle-operator').value    = vehicle?.operatorName ?? op;
  document.getElementById('vehicle-name').value        = vehicle?.name ?? '';
  document.getElementById('vehicle-capacity').value    = vehicle?.capacity ?? 36;
  document.getElementById('vehicle-description').value = vehicle?.description ?? '';
  document.getElementById('vehicle-images').value      = (vehicle?.imageUrls ?? []).join(', ');
  document.getElementById('vehicle-videos').value      = (vehicle?.videoUrls ?? []).join(', ');

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

  vehicleModal.classList.remove('hidden');
}

function closeVehicleModal() {
  if (datePickerInstance) {
    datePickerInstance.clear();
  }
  updateDateChips([]);
  vehicleModal.classList.add('hidden');
  vehicleForm.reset();
}

async function handleVehicleFormSubmit(e) {
  e.preventDefault();
  const id           = state.editingVehicleId;
  const name         = document.getElementById('vehicle-name').value.trim();
  const type         = document.getElementById('vehicle-type').value;
  const operatorName = document.getElementById('vehicle-operator').value.trim();
  const capacity     = Number(document.getElementById('vehicle-capacity').value);
  const description  = document.getElementById('vehicle-description').value.trim();

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

  const imageUrls    = document.getElementById('vehicle-images').value.split(',').map(s => s.trim()).filter(Boolean);
  const videoUrls    = document.getElementById('vehicle-videos').value.split(',').map(s => s.trim()).filter(Boolean);
  const features     = [...document.querySelectorAll('.features-checkboxes input:checked')].map(cb => cb.value);

  const payload = {
    name, type, operatorName, capacity, description,
    availableDates,
    imageUrls: imageUrls.length ? imageUrls : ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957'],
    videoUrls: videoUrls.length ? videoUrls : ['https://assets.mixkit.co/videos/preview/mixkit-traffic-in-a-highway-of-a-modern-city-43063-large.mp4'],
    features
  };

  try {
    const url    = id ? `${API_BASE}/vehicles/${id}` : `${API_BASE}/vehicles`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Failed to save');
    closeVehicleModal();
    await loadData();
  } catch (err) {
    alert('❌ Could not save vehicle: ' + err.message);
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
