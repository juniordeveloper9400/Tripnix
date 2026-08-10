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
  subscription: null,   // this agency's platform membership + fleet plan
  accounts: null,       // the money ledger for the selected month
  accountCategories: null, // capital/income/expense category lists from the API
  tracking: null,       // last known position per bus
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
    accounts:  ['Accounts',               'What the diary earned, against what you have paid Tripnix'],
    gps:       ['GPS Tracking',           'Where every bus last reported from'],
    subscription: ['Subscription & Plans', 'Platform membership and the fleet plan'],
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
  if (tabId === 'accounts') loadAccounts();
  if (tabId === 'gps') loadTracking();
}

// ─── Accounts ──────────────────────────────────────────────

/// The same ledger the owner sees. Office staff need it to answer "has this
/// job been paid for" without being handed the owner portal.
async function loadAccounts(month) {
  const operatorName = state.currentUser?.operatorName;
  if (!operatorName) return;

  try {
    const q = month ? `&month=${encodeURIComponent(month)}` : '';
    const res = await fetch(`${API_BASE}/accounts?operatorName=${encodeURIComponent(operatorName)}${q}`);
    if (!res.ok) throw new Error('Could not load accounts');
    state.accounts = await res.json();

    // The category lists come from the API so the two portals always offer the
    // same ones — a category invented here would not match the owner's books.
    if (!state.accountCategories) {
      const catRes = await fetch(`${API_BASE}/accounts/categories`);
      if (catRes.ok) state.accountCategories = await catRes.json();
    }

    renderAccounts();
  } catch (err) {
    document.getElementById('acc-breakdown').innerHTML =
      `<p class="diary-empty">❌ ${escapeHtml(err.message)}</p>`;
  }
}

// ─── Adding to the books ───────────────────────────────────

function openAccEntryModal() {
  if (!state.vehicles.length) {
    return alert('❌ Add a bus to your fleet first.');
  }
  document.getElementById('acc-entry-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('acc-entry-amount').value = '';
  document.getElementById('acc-entry-note').value = '';
  syncAccEntryKind(document.querySelector('input[name="acc-kind"]:checked')?.value || 'income');
  document.getElementById('acc-entry-modal').classList.remove('hidden');
  document.getElementById('acc-entry-amount').focus();
}

function closeAccEntryModal() {
  document.getElementById('acc-entry-modal').classList.add('hidden');
  document.getElementById('acc-entry-form').reset();
}

/// Keeps the form honest about what each kind needs: capital belongs to one
/// bus, the other two may sit against the agency as a whole.
function syncAccEntryKind(kind) {
  const cats = state.accountCategories?.categories?.[kind] || [];
  document.getElementById('acc-entry-category').innerHTML =
    cats.map(c => `<option>${escapeHtml(c)}</option>`).join('');

  const options = state.vehicles.map(v =>
    `<option value="${v.id}">${escapeHtml(v.name)} · ${escapeHtml(v.vehicleNumber || '—')}</option>`);
  document.getElementById('acc-entry-vehicle').innerHTML = kind === 'capital'
    ? options.join('')
    : `<option value="">Whole agency</option>` + options.join('');

  document.getElementById('acc-entry-vehicle-req').textContent = kind === 'capital' ? '*' : '';
  document.getElementById('acc-entry-hint').textContent = kind === 'capital'
    ? 'What the bus cost to buy. Recorded once, not as a monthly expense — it is the sum the bus has to earn back.'
    : kind === 'income'
      ? 'Money in that is not already a diary order — a private contract, a rental, anything else.'
      : 'Money out: fuel, driver wages, servicing, insurance, an EMI. Leave the bus blank for costs that cover the whole agency.';
}

async function handleAccEntrySubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('acc-entry-save');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const res = await fetch(`${API_BASE}/accounts/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operatorName: state.currentUser.operatorName,
        kind: document.querySelector('input[name="acc-kind"]:checked').value,
        vehicleId: document.getElementById('acc-entry-vehicle').value || null,
        amount: document.getElementById('acc-entry-amount').value,
        date: document.getElementById('acc-entry-date').value,
        category: document.getElementById('acc-entry-category').value,
        note: document.getElementById('acc-entry-note').value.trim()
      })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Could not save this entry');

    closeAccEntryModal();
    // Reload on the month the entry landed in, so a cost dated last month is
    // not saved into a view that then fails to show it.
    await loadAccounts(String(data.date).slice(0, 7));
  } catch (err) {
    alert('❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

window.removeAccEntry = async function(id) {
  if (!confirm('Remove this entry from the books?')) return;
  try {
    const res = await fetch(
      `${API_BASE}/accounts/entries/${id}?operatorName=${encodeURIComponent(state.currentUser.operatorName)}`,
      { method: 'DELETE' }
    );
    if (!res.ok) throw new Error('Could not remove this entry');
    await loadAccounts(state.accounts?.month);
  } catch (err) {
    alert('❌ ' + err.message);
  }
};

function renderAccounts() {
  const a = state.accounts;
  if (!a) return;

  const select = document.getElementById('acc-month');
  if (select && document.activeElement !== select) {
    select.innerHTML = a.availableMonths.length
      ? a.availableMonths.map(m =>
          `<option value="${m.value}" ${m.value === a.month ? 'selected' : ''}>${escapeHtml(m.label)}</option>`).join('')
      : `<option>${escapeHtml(a.monthLabel)}</option>`;
  }

  document.getElementById('acc-stats').innerHTML = `
    <div class="stat-card"><span class="stat-icon">📥</span><div><strong>${money(a.income.total)}</strong><span>Money in</span></div></div>
    <div class="stat-card"><span class="stat-icon">📤</span><div><strong>${money(a.expense.total)}</strong><span>Money out</span></div></div>
    <div class="stat-card"><span class="stat-icon">${a.profit < 0 ? '📉' : '📈'}</span><div><strong>${money(a.profit)}</strong><span>Profit · ${a.margin}%</span></div></div>
    <div class="stat-card"><span class="stat-icon">📕</span><div><strong>${a.income.orders}</strong><span>Orders</span></div></div>`;

  document.getElementById('acc-breakdown').innerHTML = `
    <div class="diary-row"><div class="diary-row-main">Diary fares (${a.income.orders})</div><strong>${money(a.income.trips)}</strong></div>
    <div class="diary-row"><div class="diary-row-main">Other income</div><strong>${money(a.income.other)}</strong></div>
    <div class="diary-row"><div class="diary-row-main">App bookings (${a.income.appBookings})</div><span style="color:var(--text-muted);font-style:italic;">no fare recorded</span></div>
    <div class="diary-row"><div class="diary-row-main">Expenses</div><strong>− ${money(a.expense.total)}</strong></div>
    <div class="diary-row" style="border-bottom:none;padding-top:14px;">
      <div class="diary-row-main"><strong>${escapeHtml(a.monthLabel)} profit</strong></div>
      <strong style="font-size:20px;color:${a.profit < 0 ? 'var(--accent-red)' : 'var(--accent-green)'};">${money(a.profit)}</strong>
    </div>
    ${a.expense.byCategory.length ? `
      <p class="panel-header-note" style="margin-top:14px;">Spent on:
        ${a.expense.byCategory.map(c => `${escapeHtml(c.category)} ${money(c.amount)}`).join(' · ')}
      </p>` : ''}
    <p class="panel-header-note" style="margin-top:10px;line-height:1.6;">
      Diary fares come from the Bus Diary automatically. App bookings carry no fare — travellers
      book without a rate, so nothing is invented for them. Capital and expenses are managed by
      the owner in the Owner Portal.
    </p>`;

  document.getElementById('acc-vehicles').innerHTML = a.perVehicle.length
    ? a.perVehicle.map(v => `
        <div class="diary-row">
          <div class="diary-row-main">
            <strong>${escapeHtml(v.vehicleName)}</strong>
            <div class="diary-row-who">${v.orders} order${v.orders === 1 ? '' : 's'} · in ${money(v.income)} · out ${money(v.expense)}</div>
          </div>
          <strong style="color:${v.profit < 0 ? 'var(--accent-red)' : 'inherit'};">${money(v.profit)}</strong>
        </div>`).join('')
    : '<p class="diary-empty">No buses yet.</p>';

  // Diary fares and hand-written entries share one list, newest last, so the
  // month reads in the order it happened.
  const rows = [
    ...a.entries.orders.map(e => ({ ...e, kindLabel: 'Diary fare', sign: '+' })),
    ...a.entries.manual.map(e => ({
      ...e,
      kindLabel: e.source === 'income' ? 'Income' : 'Expense',
      sign: e.source === 'expense' ? '−' : '+'
    }))
  ].sort((x, y) => String(x.date).localeCompare(String(y.date)));

  document.getElementById('acc-entries').innerHTML = rows.length
    ? rows.map(e => `
        <div class="diary-row">
          <div class="diary-row-main">
            <strong>${escapeHtml(e.label)}</strong>
            <div class="diary-row-who">
              ${escapeHtml(e.kindLabel)} · ${escapeHtml(e.vehicleName || 'Whole agency')} ·
              ${formatDate(e.date)}${e.detail ? ' · ' + escapeHtml(e.detail) : ''}
            </div>
          </div>
          <div class="diary-row-status">
            <strong style="color:${e.sign === '−' ? 'var(--accent-red)' : 'inherit'};">${e.sign}${money(e.amount)}</strong>
            ${e.source === 'diary'
              // A diary fare belongs to its order — removing it here would
              // leave the bus booked with no money against it.
              ? ''
              : `<div class="diary-row-actions">
                   <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);"
                           onclick="removeAccEntry(${e.id})">🗑️</button>
                 </div>`}
          </div>
        </div>`).join('')
    : '<p class="diary-empty">Nothing recorded for this month yet. Use ➕ Add entry to record fuel, wages, servicing or extra income.</p>';
}

// ─── GPS tracking ──────────────────────────────────────────

async function loadTracking() {
  const operatorName = state.currentUser?.operatorName;
  if (!operatorName) return;

  try {
    const res = await fetch(`${API_BASE}/tracking?operatorName=${encodeURIComponent(operatorName)}`);
    if (!res.ok) throw new Error('Could not load tracking');
    state.tracking = await res.json();
    renderTracking();
  } catch (err) {
    document.getElementById('gps-list').innerHTML =
      `<p class="diary-empty">❌ ${escapeHtml(err.message)}</p>`;
  }
}

function renderTracking() {
  const t = state.tracking;
  if (!t) return;

  document.getElementById('gps-note').textContent =
    `${t.reporting} of ${t.total} reporting · live for ${t.staleAfterMinutes} minutes after the last fix`;

  document.getElementById('gps-endpoint').textContent =
    `POST ${API_BASE}/tracking/vehicles/<vehicleId>\n` +
    `Content-Type: application/json\n\n` +
    `{ "lat": 9.9312, "lng": 76.2673, "speedKph": 42, "label": "Kochi" }`;

  document.getElementById('gps-list').innerHTML = t.vehicles.length
    ? t.vehicles.map(v => {
        const l = v.location;
        const badge = !l
          ? '<span class="badge-status pending">NO SIGNAL</span>'
          : l.live
            ? '<span class="badge-status confirmed">LIVE</span>'
            : `<span class="badge-status cancelled">${l.ageMinutes} MIN AGO</span>`;

        const where = !l
          ? 'This bus has never reported a position'
          : `${l.label ? escapeHtml(l.label) + ' · ' : ''}${l.lat.toFixed(5)}, ${l.lng.toFixed(5)}` +
            `${l.speedKph ? ' · ' + Math.round(l.speedKph) + ' km/h' : ''}`;

        const map = l
          ? ` · <a href="https://www.google.com/maps?q=${l.lat},${l.lng}" target="_blank" rel="noopener">Open map ↗</a>`
          : '';

        return `
          <div class="diary-row">
            <div class="diary-row-main">
              <strong>${escapeHtml(v.vehicleName)}</strong>
              <code class="vehicle-number">${escapeHtml(v.vehicleNumber || '—')}</code>
              <div class="diary-row-who">${where}${map}</div>
            </div>
            <div class="diary-row-status">${badge}</div>
          </div>`;
      }).join('')
    : '<p class="diary-empty">No buses in the fleet yet.</p>';
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

  // Bus Diary — the order book.
  document.getElementById('diary-add-btn')?.addEventListener('click', () => openDiaryModal());
  document.getElementById('diary-modal-close')?.addEventListener('click', closeDiaryModal);
  document.getElementById('diary-modal-cancel')?.addEventListener('click', closeDiaryModal);
  document.getElementById('diary-form')?.addEventListener('submit', handleDiarySubmit);
  document.getElementById('acc-month')?.addEventListener('change', e => loadAccounts(e.target.value));
  document.getElementById('acc-add-btn')?.addEventListener('click', openAccEntryModal);
  document.getElementById('acc-entry-close')?.addEventListener('click', closeAccEntryModal);
  document.getElementById('acc-entry-cancel')?.addEventListener('click', closeAccEntryModal);
  document.getElementById('acc-entry-form')?.addEventListener('submit', handleAccEntrySubmit);
  document.querySelectorAll('input[name="acc-kind"]').forEach(r =>
    r.addEventListener('change', e => syncAccEntryKind(e.target.value)));
  // Keeping "to" at or after "from" stops the API rejecting a backwards range
  // after the agency has typed the whole entry.
  document.getElementById('diary-from')?.addEventListener('change', e => {
    const to = document.getElementById('diary-to');
    if (to && (!to.value || to.value < e.target.value)) to.value = e.target.value;
  });

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
// ─── Agency Diary ───────────────────────────────────────────

/// The Agency Diary shows all customer orders and schedule for the travel agency as a whole.
async function loadDiary() {
  await loadData();
  const listEl = document.getElementById('diary-list');
  if (listEl) listEl.innerHTML = '<p class="diary-empty">Loading agency diary…</p>';

  try {
    const operator = state.currentUser?.operatorName || '';
    const res = await fetch(
      `${API_BASE}/trips/agency-diary?operatorName=${encodeURIComponent(operator)}`
    );
    if (!res.ok) throw new Error('Could not load agency diary');
    state.agencyDiaryData = await res.json();
    
    // Build booked dates set across all agency entries
    const entries = state.agencyDiaryData?.entries || [];
    const bookedSet = new Set();
    entries.forEach(e => {
      if (e.status === 'Completed' || !e.departureDate || !e.arrivalDate) return;
      let d = new Date(`${e.departureDate}T00:00:00`);
      const end = new Date(`${e.arrivalDate}T00:00:00`);
      while (d <= end) {
        bookedSet.add(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
      }
    });

    state.diary = {
      entries,
      latestTrip: state.agencyDiaryData?.latestTrip || null,
      bookedDates: Array.from(bookedSet)
    };
  } catch (err) {
    state.diary = null;
    if (listEl) listEl.innerHTML = `<p class="diary-empty">❌ ${escapeHtml(err.message)}</p>`;
    return;
  }

  renderDiary();
}

function renderDiary() {
  renderLatestDiaryTripCard();
  renderDiaryList();
  renderDiaryCalendar();
}

function renderLatestDiaryTripCard() {
  const container = document.getElementById('latest-diary-trip-container');
  if (!container) return;

  const latest = state.diary?.latestTrip;

  if (!latest) {
    container.innerHTML = `
      <div class="latest-diary-card" style="background: rgba(30, 41, 59, 0.6); border-color: rgba(255, 255, 255, 0.1);">
        <div class="latest-diary-header">
          <div class="latest-diary-badge" style="color: #94a3b8; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);">
            🌟 LATEST AGENCY DIARY TRIP
          </div>
        </div>
        <p style="color: var(--text-muted); margin: 0; font-size: 14px;">
          No agency diary trips recorded yet. Click <strong>➕ Add Entry</strong> to record your first order.
        </p>
      </div>`;
    return;
  }

  const statusClass = latest.status === 'On Trip' ? 'confirmed'
    : latest.status === 'Completed' ? 'cancelled' : 'pending';

  container.innerHTML = `
    <div class="latest-diary-card">
      <div class="latest-diary-header">
        <div class="latest-diary-badge">🌟 LATEST AGENCY DIARY TRIP</div>
        <span class="badge-status ${statusClass}">${escapeHtml(latest.status)}</span>
      </div>
      <div class="latest-diary-body">
        <div class="latest-diary-main">
          <div class="latest-diary-place">📕 ${escapeHtml(latest.place || 'Agency Order')}</div>
          <div class="latest-diary-customer">
            👤 <strong>${escapeHtml(latest.customerName || 'Customer')}</strong>
            ${latest.customerPhone ? ` · <a href="tel:${escapeHtml(latest.customerPhone)}">📞 ${escapeHtml(latest.customerPhone)}</a>` : ''}
          </div>
          ${latest.note ? `<div class="latest-diary-note">📝 ${escapeHtml(latest.note)}</div>` : ''}
        </div>
        <div class="latest-diary-meta">
          <div class="latest-diary-dates">
            <span class="meta-label">SCHEDULED DATES</span>
            <strong>${formatDate(latest.departureDate)} → ${formatDate(latest.arrivalDate)}</strong>
            <small>(${latest.durationDays} day${latest.durationDays === 1 ? '' : 's'})</small>
          </div>
          <div class="latest-diary-fare">
            <span class="meta-label">AGREED FARE</span>
            <strong class="fare-amount">${money(latest.fare)}</strong>
          </div>
        </div>
      </div>
    </div>`;
}

function renderDiaryList() {
  const el = document.getElementById('diary-list');
  const summary = document.getElementById('diary-summary');
  if (!el) return;

  const d = state.diary;
  if (!d) { el.innerHTML = ''; if (summary) summary.innerHTML = ''; return; }

  const upcoming = d.entries.filter(e => e.status !== 'Completed');
  const orders = d.entries.filter(e => e.kind === 'diary');
  const earned = orders.reduce((sum, e) => sum + Number(e.fare || 0), 0);

  if (summary) {
    summary.innerHTML = `
      <div class="diary-stat"><strong>${upcoming.length}</strong><span>Active / Scheduled</span></div>
      <div class="diary-stat"><strong>${d.bookedDates.length}</strong><span>Days Booked</span></div>
      <div class="diary-stat"><strong>${orders.length}</strong><span>Diary Orders</span></div>
      <div class="diary-stat"><strong>${money(earned)}</strong><span>Total Fares</span></div>`;
  }

  if (!d.entries.length) {
    el.innerHTML = '<p class="diary-empty">No orders in your agency diary yet. Use ➕ Add Entry to write an order, or tap a date on the calendar.</p>';
    return;
  }

  el.innerHTML = d.entries.map(e => {
    const statusClass = e.status === 'On Trip' ? 'confirmed'
      : e.status === 'Completed' ? 'cancelled' : 'pending';

    const isOrder = e.kind === 'diary';
    const contact = e.customerPhone
      ? ` · <a href="tel:${escapeHtml(e.customerPhone)}">${escapeHtml(e.customerPhone)}</a>`
      : '';

    let who = '';
    if (isOrder || e.kind === 'booking') {
      who = `<div class="diary-row-who">👤 ${escapeHtml(e.customerName || 'Customer')}${contact}${
        e.fare ? ` · <strong>${money(e.fare)}</strong>` : ''
      }</div>`;
    } else if (e.note) {
      who = `<div class="diary-row-who">${escapeHtml(e.note)}</div>`;
    }
    if (isOrder && e.note) {
      who += `<div class="diary-row-who" style="color:var(--text-muted);">📝 ${escapeHtml(e.note)}</div>`;
    }

    const label = isOrder
      ? '📕 ' + escapeHtml(e.place || 'Agency Order')
      : e.kind === 'booking'
        ? '📑 Customer booking'
        : '🗺️ ' + escapeHtml(e.place || 'Trip');

    const actions = isOrder
      ? `<div class="diary-row-actions">
           <button class="btn btn-secondary btn-sm" onclick="editDiaryEntry(${e.id})">✏️ Edit</button>
           <button class="btn btn-secondary btn-sm" style="color:var(--accent-red);" onclick="deleteDiaryEntry(${e.id})">🗑️ Delete</button>
         </div>`
      : '';

    return `
      <div class="diary-row">
        <div class="diary-row-dates">
          <strong>${formatDate(e.departureDate)}</strong>
          <span>→ ${formatDate(e.arrivalDate)}</span>
          <small>${e.durationDays} day${e.durationDays === 1 ? '' : 's'}</small>
        </div>
        <div class="diary-row-main">
          <div class="diary-row-place">${label}</div>
          ${who}
        </div>
        <div class="diary-row-status">
          <span class="badge-status ${statusClass}">${escapeHtml(e.status)}</span>
          ${actions}
        </div>
      </div>`;
  }).join('');
}

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
    const lead = (first.getDay() + 6) % 7;

    const onDate = iso => (d.entries || [])
      .filter(e => e.status !== 'Completed' && iso >= e.departureDate && iso <= e.arrivalDate)
      .map(e => `${e.customerName || 'Booked'}${e.place ? ' — ' + e.place : ''}`)
      .join(' | ');

    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span class="diary-day is-blank"></span>');
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const taken = booked.has(iso);
      const title = taken ? `${iso} — ${onDate(iso)}` : `${iso} — free, tap to write an order`;
      cells.push(
        `<span class="diary-day${taken ? ' is-booked' : ''}" title="${escapeHtml(title)}"` +
        `${taken ? '' : ` role="button" onclick="openDiaryModalForDate('${iso}')"`}>${day}</span>`
      );
    }

    return `
      <div class="diary-month">
        <div class="diary-month-label">${escapeHtml(label)}</div>
        <div class="diary-weekdays"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
        <div class="diary-grid">${cells.join('')}</div>
      </div>`;
  }).join('');
}

// ─── Agency Diary Entries (Order Book) ─────────────────────

function openDiaryModal(entry = null, prefillDate = null) {
  const modal = document.getElementById('diary-modal');
  if (!modal) return;

  document.getElementById('diary-modal-title').textContent =
    entry ? 'Edit Diary Entry' : 'New Diary Entry';
  const modalBus = document.getElementById('diary-modal-bus');
  if (modalBus) modalBus.textContent = '📕 Agency Travel Order';

  document.getElementById('diary-entry-id').value = entry?.id ?? '';
  document.getElementById('diary-customer').value = entry?.customerName ?? '';
  document.getElementById('diary-phone').value    = entry?.customerPhone ?? '';
  document.getElementById('diary-place').value    = entry?.place ?? '';
  document.getElementById('diary-from').value     = entry?.departureDate ?? prefillDate ?? '';
  document.getElementById('diary-to').value       = entry?.arrivalDate ?? prefillDate ?? '';
  document.getElementById('diary-fare').value     = entry?.fare ? String(entry.fare) : '';
  document.getElementById('diary-note').value     = entry?.note ?? '';
  document.getElementById('diary-save-btn').textContent = entry ? 'Update Entry' : 'Save Entry';

  modal.classList.remove('hidden');
  document.getElementById('diary-customer').focus();
}

function closeDiaryModal() {
  document.getElementById('diary-modal')?.classList.add('hidden');
  document.getElementById('diary-form')?.reset();
}

window.openDiaryModalForDate = function(iso) {
  openDiaryModal(null, iso);
};

window.editDiaryEntry = function(id) {
  const entry = (state.diary?.entries || []).find(e => e.id === id);
  if (!entry) return;
  openDiaryModal(entry);
};

window.deleteDiaryEntry = async function(id) {
  const entry = (state.diary?.entries || []).find(e => e.id === id);
  if (!entry) return;
  if (!confirm(`Remove ${entry.customerName || 'this entry'} (${formatDate(entry.departureDate)} → ${formatDate(entry.arrivalDate)}) from the agency diary?`)) return;

  try {
    const res = await fetch(`${API_BASE}/trips/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Could not remove this entry');
    await loadDiary();
  } catch (err) {
    alert('❌ ' + err.message);
  }
};

async function handleDiarySubmit(e) {
  e.preventDefault();

  const id = document.getElementById('diary-entry-id').value;
  const payload = {
    operatorName: state.currentUser?.operatorName,
    customerName: document.getElementById('diary-customer').value.trim(),
    customerPhone: document.getElementById('diary-phone').value.trim(),
    place: document.getElementById('diary-place').value.trim(),
    departureDate: document.getElementById('diary-from').value,
    arrivalDate: document.getElementById('diary-to').value,
    fare: document.getElementById('diary-fare').value,
    note: document.getElementById('diary-note').value.trim()
  };

  const saveBtn = document.getElementById('diary-save-btn');
  const original = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const res = await fetch(
      id ? `${API_BASE}/trips/diary/${id}` : `${API_BASE}/trips/diary`,
      {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Could not save this entry');

    closeDiaryModal();
    await loadDiary();
  } catch (err) {
    alert('❌ ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = original;
  }
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

  if (!state.vehicles.length) {
    select.innerHTML = `<option value="">No vehicles in your fleet yet</option>`;
    return;
  }

  // The fleet fee covers every vehicle at once, so it is the whole fleet that
  // is carryable or not — never one bus and not another.
  const ok = isFleetActive();

  const previous = select.value;
  select.innerHTML = state.vehicles.map(v => `
    <option value="${v.id}" ${ok ? '' : 'disabled'}>
      ${escapeHtml(v.name)} · ${escapeHtml(v.vehicleNumber || '—')}${ok ? '' : '  (fleet fee not paid)'}
    </option>`).join('');
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
  // A loss reads "-₹24,000", not "₹-24,000" — the sign belongs in front of the
  // whole amount, which is where a reader scanning a column expects it.
  const n = Number(amount || 0);
  return (n < 0 ? '-' : '') + symbol + Math.abs(n).toLocaleString('en-IN');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

/// The fleet band a given number of vehicles falls into.
///
/// One fee covers the whole fleet and is priced by fleet size, so nothing here
/// looks at vehicle type. This mirrors the API's own banding exactly — if the
/// two disagreed, the price quoted in the form would not be the price charged.
function fleetTierFor(count) {
  const tiers = state.plans?.fleetTiers || [];
  const size = Math.max(1, Number(count) || 0);
  return (
    tiers.find(
      t => size >= t.minVehicles && (t.maxVehicles === null || size <= t.maxVehicles)
    ) || tiers[tiers.length - 1] || null
  );
}

/// How many vehicles this agency runs right now.
function fleetSize() {
  return state.vehicles.length;
}

/// The agency's fleet subscription, or null before it has paid one.
function fleetSub() {
  return state.subscription?.fleet || null;
}

function isFleetActive() {
  return fleetSub()?.status === 'active';
}

// ─── Payment step & in-app notices ─────────────────────────

/// Shows the payment step and resolves true when the agency confirms.
///
/// Used instead of a browser confirm() so buying a plan from the portal looks
/// and reads the same as paying the platform fee does on the Tripnix site:
/// what the plan is, what it costs, and what is payable right now.
function confirmPayment({ title, lead, planName, planSub, planPrice, lines = [], total, note, actionLabel }) {
  return new Promise(resolve => {
    const modal = document.getElementById('payment-modal');
    if (!modal) return resolve(true);

    document.getElementById('payment-title').textContent = title;
    document.getElementById('payment-lead').textContent = lead || '';
    document.getElementById('payment-plan').innerHTML = `
      <div>
        <span class="pay-plan-name">${escapeHtml(planName)}</span>
        <span class="pay-plan-sub">${escapeHtml(planSub || '')}</span>
      </div>
      <div>
        <span class="pay-plan-price">${planPrice}</span>
        <span class="pay-plan-period">per ${escapeHtml(period())}</span>
      </div>`;
    document.getElementById('payment-lines').innerHTML = lines
      .map(l => `<div><dt>${escapeHtml(l.label)}</dt><dd>${l.value}</dd></div>`)
      .join('');
    document.getElementById('payment-total').textContent = total;
    document.getElementById('payment-note').textContent =
      note || 'No card is charged yet — the payment gateway is being connected. Confirming records this payment against your agency.';

    const confirmBtn = document.getElementById('payment-confirm');
    confirmBtn.textContent = actionLabel || 'Pay & Continue';

    // Listeners are rebound each time and removed on close, so a second
    // payment never fires the previous one's resolver as well.
    const close = answer => {
      modal.classList.add('hidden');
      confirmBtn.removeEventListener('click', onConfirm);
      document.getElementById('payment-cancel').removeEventListener('click', onCancel);
      document.getElementById('payment-close').removeEventListener('click', onCancel);
      resolve(answer);
    };
    const onConfirm = () => close(true);
    const onCancel = () => close(false);

    confirmBtn.addEventListener('click', onConfirm);
    document.getElementById('payment-cancel').addEventListener('click', onCancel);
    document.getElementById('payment-close').addEventListener('click', onCancel);

    modal.classList.remove('hidden');
  });
}

/// An in-app notice, in place of a browser alert.
function showNotice({ icon = '✅', title, lead, lines = [], actionLabel = 'Done' }) {
  return new Promise(resolve => {
    const modal = document.getElementById('notice-modal');
    if (!modal) { alert(`${title}\n\n${lead || ''}`); return resolve(); }

    document.getElementById('notice-icon').textContent = icon;
    document.getElementById('notice-title').textContent = title;
    document.getElementById('notice-lead').textContent = lead || '';
    document.getElementById('notice-lines').innerHTML = lines
      .map(l => `<div><dt>${escapeHtml(l.label)}</dt><dd>${l.value}</dd></div>`)
      .join('');

    const ok = document.getElementById('notice-ok');
    ok.textContent = actionLabel;

    const close = () => {
      modal.classList.add('hidden');
      ok.removeEventListener('click', close);
      resolve();
    };
    ok.addEventListener('click', close);
    modal.classList.remove('hidden');
  });
}

/// What adding one more vehicle costs today: nothing while the fleet stays in
/// its paid band, otherwise the step up to the next band's price.
function costToAddVehicle() {
  const next = fleetTierFor(fleetSize() + 1);
  if (!next) return null;

  const current = fleetSub();
  if (!current || current.status !== 'active') {
    return { tier: next, charge: next.price, upgrade: false };
  }
  if (current.tierId === next.tierId) {
    return { tier: next, charge: 0, upgrade: false };
  }
  return {
    tier: next,
    charge: Math.max(0, next.price - (current.price || 0)),
    upgrade: true
  };
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

/// The fleet-fee ladder: one card per band, with the agency's current band
/// marked so it can see what it is on and what growing would cost.
function renderPlanGrid() {
  const grid = state.plans ? document.getElementById('plan-grid') : null;
  if (!grid) return;

  const tiers = state.plans.fleetTiers || [];
  if (!tiers.length) {
    grid.innerHTML = '<p class="plan-empty">No fleet plan configured.</p>';
    return;
  }

  const currentId = fleetTierFor(fleetSize())?.id;

  grid.innerHTML = `
    <div class="plan-cards">
      ${tiers.map(t => `
        <div class="plan-card${t.id === currentId && fleetSize() > 0 ? ' is-current' : ''}">
          <span class="plan-card-tier">🚍 ${escapeHtml(t.label)}</span>
          <span class="plan-card-seats">${
            t.maxVehicles === null
              ? `${t.minVehicles} or more vehicles`
              : `${t.minVehicles}–${t.maxVehicles} vehicles, one fee`
          }</span>
          <div class="plan-card-price">${money(t.price)}</div>
          <span class="plan-card-period">whole fleet / ${period()}</span>
        </div>`).join('')}
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

  // Every vehicle sits under the one fleet subscription, so the per-vehicle
  // rows all report the same state — what differs is only which band the fleet
  // is on and whether that band is paid up.
  const sub    = fleetSub();
  const paid   = isFleetActive();
  const band   = fleetTierFor(fleetSize());
  const status = paid
    ? `<span class="badge-status confirmed">LISTED</span>`
    : sub
      ? `<span class="badge-status cancelled">EXPIRED</span>`
      : `<span class="badge-status pending">UNPAID</span>`;

  tbody.innerHTML = state.vehicles.map(v => `
    <tr>
      <td><strong>${escapeHtml(v.name)}</strong></td>
      <td><code class="vehicle-number">${escapeHtml(v.vehicleNumber || '—')}</code></td>
      <td>${escapeHtml(v.type)}</td>
      <td>${v.capacity}</td>
      <td><small style="color:var(--text-muted);">covered by fleet plan</small></td>
      <td>${status}</td>
      <td><small style="color:var(--text-muted);">—</small></td>
    </tr>`).join('');

  // The one action there is belongs to the fleet, not to any single row.
  const bandLabel = band ? escapeHtml(band.label) : '—';
  const price = band ? money(band.price) : '—';

  if (paid) {
    note.innerHTML =
      `${fleetSize()} vehicle${fleetSize() === 1 ? '' : 's'} on the <strong>${bandLabel}</strong> plan ` +
      `(${price}/${period()}) · renews ${formatDate(sub.expiresAt)} · ${sub.daysLeft} days left ` +
      `<button class="btn btn-secondary btn-sm" style="margin-left:10px;" onclick="payFleetFee()">🔄 Renew ${price}</button>`;
  } else {
    note.innerHTML =
      `Your fleet of ${fleetSize()} needs the <strong>${bandLabel}</strong> plan (${price}/${period()}). ` +
      `Your vehicles stay hidden from travellers until it is paid. ` +
      `<button class="btn btn-primary btn-sm" style="margin-left:10px;" onclick="payFleetFee()">💳 Pay ${price}</button>`;
  }
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
  const plan = (state.plans.platform.plans || [])[0];

  const platformInput = document.getElementById('price-platform');
  if (platformInput && document.activeElement !== platformInput) {
    platformInput.value = plan ? plan.price : state.plans.platform.price;
  }
  const platformLabel = document.getElementById('price-platform-label');
  if (platformLabel && plan) {
    platformLabel.textContent = `Platform membership (per ${plan.period})`;
  }

  // One input per fleet band. Built once, then only the values are refreshed,
  // so typing a price is never interrupted by a background reload.
  const tierInputs = document.getElementById('tier-price-inputs');
  if (!tierInputs.dataset.built) {
    tierInputs.innerHTML = (state.plans.fleetTiers || []).map(t => `
      <div class="form-group">
        <label for="price-${t.id}">${escapeHtml(t.label)} <small style="color:var(--text-muted);">(whole fleet / ${period()})</small></label>
        <input type="number" id="price-${t.id}" data-tier-id="${t.id}" min="0" step="1" required />
      </div>`).join('');
    tierInputs.dataset.built = 'true';
  }
  (state.plans.fleetTiers || []).forEach(t => {
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
      <td>${a.fleet
        ? `${escapeHtml(a.fleet.tierLabel)} · ${a.vehicleCount} vehicle${a.vehicleCount === 1 ? '' : 's'}` +
          `<br><span class="badge-status ${a.fleet.status === 'active' ? 'confirmed' : 'cancelled'}">${a.fleet.status.toUpperCase()}</span>`
        : '<span class="badge-status pending">NO FLEET PLAN</span>'}</td>
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

/// Pays or renews the one fee that covers the whole fleet.
///
/// There is no per-vehicle payment any more: the band the agency is on is
/// decided by how many vehicles it runs, so this is a single agency-level
/// action rather than one button per bus.
window.payFleetFee = async function() {
  const operatorName = state.currentUser?.operatorName;
  if (!operatorName) return;

  const band = fleetTierFor(fleetSize());
  if (!band) return alert('❌ No fleet plan is configured.');

  const renewing = isFleetActive();
  const confirmed = await confirmPayment({
    title: renewing ? 'Renew Fleet Plan' : 'Confirm Payment',
    lead: renewing
      ? `Extends your fleet plan by another ${period()} from its current expiry.`
      : `One fee covers every vehicle you run — priced by how many that is.`,
    planName: `${band.label} fleet plan`,
    planSub: `Covers all ${fleetSize()} of your vehicle${fleetSize() === 1 ? '' : 's'}`,
    planPrice: money(band.price),
    lines: [
      { label: 'Plan price', value: `${money(band.price)} / ${period()}` },
      { label: 'Vehicles covered', value: String(fleetSize()) },
      ...(renewing
        ? [{ label: 'Extends from', value: formatDate(fleetSub()?.expiresAt) }]
        : [])
    ],
    total: money(band.price),
    actionLabel: renewing ? `Renew · ${money(band.price)}` : `Pay ${money(band.price)}`
  });
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/subscriptions/fleet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorName, vehicleCount: fleetSize() })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Payment failed');

    await loadSubscription();
    // A paid fleet is what makes the buses visible in the app and selectable
    // for a trip, so the views that read that have to be redrawn too.
    renderFleetGrid();
    renderTripVehicleOptions();

    await showNotice({
      icon: renewing ? '🔄' : '🎉',
      title: renewing ? 'Fleet plan renewed' : 'Your fleet is listed!',
      lead: renewing
        ? 'Your vehicles stay visible to travellers for another period.'
        : 'Every vehicle in your fleet is now visible to travellers.',
      lines: [
        { label: 'Fleet plan', value: escapeHtml(data.tierLabel) },
        { label: 'Vehicles covered', value: String(fleetSize()) },
        { label: 'Paid now', value: money(band.price) },
        { label: 'Covered until', value: formatDate(data.expiresAt) }
      ]
    });
  } catch (err) {
    alert('❌ ' + err.message);
  }
};

async function handlePricingSubmit(e) {
  e.preventDefault();

  const platformPrice = Number(document.getElementById('price-platform').value);
  const fleetTiers = [...document.querySelectorAll('#tier-price-inputs input[data-tier-id]')]
    .map(input => ({ id: input.dataset.tierId, price: Number(input.value) }));

  try {
    const res = await fetch(`${API_BASE}/subscriptions/plans`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformPrice, fleetTiers })
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

    // A bus in the workshop is still in the fleet but off the app, so the card
    // says so plainly rather than looking identical to a running bus.
    const heldDays = v.onHold ? daysOnHold(v.heldSince) : 0;

    return `
    <div class="vehicle-admin-card${v.onHold ? ' is-held' : ''}">
      <div class="card-image">
        ${(v.imageUrls || [])[0]
          ? `<img src="${(v.imageUrls || [])[0]}" alt="${escapeHtml(v.name)}" />`
          : `<div class="card-image-empty">No photo uploaded</div>`}
        <span class="card-badge">${v.type.toUpperCase()}</span>
        ${v.onHold ? `<span class="card-hold-badge">⏸️ ON HOLD</span>` : ''}
      </div>
      <div class="card-body">
        <h4 class="card-title">${escapeHtml(v.name)}</h4>
        <p class="card-operator">
          <code class="vehicle-number">${escapeHtml(v.vehicleNumber || '—')}</code>
          &nbsp;·&nbsp; ${escapeHtml(v.operatorName)}
        </p>
        ${v.onHold ? `
          <div class="hold-note">
            <strong>Off the app for ${heldDays} day${heldDays === 1 ? '' : 's'}</strong>
            <span>${v.holdReason ? escapeHtml(v.holdReason) + ' · ' : ''}since ${formatDate(v.heldSince)}</span>
            <span>These days are added back to your plan when you resume it.</span>
          </div>` : ''}
        <div class="card-specs">
          <span>👥 ${v.capacity} Seats</span>
          <span title="Worked out from this vehicle's ${v.ratedOn || 0} amenit${v.ratedOn === 1 ? 'y' : 'ies'} — tick more in Edit to raise it">
            ⭐ ${(v.rating ?? 3).toFixed(1)} · ${escapeHtml(v.ratingLabel || 'Standard')}
          </span>
        </div>
        <div class="rating-basis">
          ${(v.features || []).length
            ? (v.features || []).map(f => `<span class="feature-pill">${escapeHtml(f)}</span>`).join('')
            : `<span class="feature-empty">No amenities ticked — add some in Edit to raise the rating</span>`}
        </div>
        <div style="margin-top:10px;">
          <span style="font-size:11px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">📅 Available Showcase Dates:</span>
          <div class="date-pills">${datePills}</div>
        </div>
        <div class="card-footer" style="margin-top:14px;">
          <div class="card-actions" style="margin-left:auto;">
            ${v.onHold
              ? `<button class="btn btn-primary btn-sm" onclick="resumeVehicle(${v.id})">▶️ Resume</button>`
              : `<button class="btn btn-secondary btn-sm" onclick="holdVehicle(${v.id})">⏸️ Hold</button>`}
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

  const labelEl = document.getElementById('vehicle-sub-tier-label');
  const seatsEl = document.getElementById('vehicle-sub-tier-seats');
  const priceEl = document.getElementById('vehicle-sub-price');
  const noteEl  = document.getElementById('vehicle-sub-note');
  const saveBtn = document.getElementById('modal-save-btn');

  // Editing never charges — the fleet fee is bought when a vehicle is added and
  // renewed from the Subscription page — so it shows the plan the fleet is on
  // rather than a price for this form.
  if (editing) {
    const current = fleetSub();
    const band = fleetTierFor(fleetSize());
    panel.classList.remove('is-invalid');
    saveBtn.disabled = false;
    labelEl.textContent = band ? `${band.label} fleet plan` : 'Fleet plan';
    seatsEl.textContent = `${fleetSize()} vehicle${fleetSize() === 1 ? '' : 's'} covered`;
    priceEl.textContent = band ? `${money(band.price)}/${period()}` : '—';
    noteEl.textContent = current?.status === 'active'
      ? `Covered until ${formatDate(current.expiresAt)}. Updating these details does not change the fee.`
      : 'Updating these details does not change the fee. Pay it from the Subscription page.';
    saveBtn.textContent = 'Update Vehicle';
    return;
  }

  const cost = costToAddVehicle();
  if (!cost) {
    panel.classList.add('is-invalid');
    labelEl.textContent = 'No fleet plan configured';
    seatsEl.textContent = '';
    priceEl.textContent = '—';
    noteEl.textContent  = 'No fleet plan is configured. Ask the Super Admin to set one on the Subscription page.';
    saveBtn.textContent = 'Add Vehicle';
    saveBtn.disabled = true;
    return;
  }

  panel.classList.remove('is-invalid');
  saveBtn.disabled = false;
  labelEl.textContent = `${cost.tier.label} fleet plan`;
  seatsEl.textContent = `This would be vehicle #${fleetSize() + 1}`;

  // The band's own price is the headline — "4–6 vehicles · ₹900" is the figure
  // the agency thinks in. What is payable right now is a separate line, since
  // moving up a band mid-period only costs the difference.
  priceEl.textContent = `${money(cost.tier.price)}/${period()}`;

  if (cost.charge === 0) {
    noteEl.textContent =
      `Your ${cost.tier.label} plan (${money(cost.tier.price)}/${period()}) already covers this ` +
      `vehicle — nothing more to pay. It goes live in the app straight after.`;
  } else if (cost.upgrade) {
    noteEl.textContent =
      `This vehicle moves your fleet onto the ${cost.tier.label} plan at ` +
      `${money(cost.tier.price)}/${period()}. You have already paid ${money(cost.tier.price - cost.charge)} ` +
      `of it, so ${money(cost.charge)} is payable now and your renewal date does not change.`;
  } else {
    noteEl.textContent =
      `Adding this vehicle starts your ${cost.tier.label} plan at ${money(cost.tier.price)} ` +
      `for one ${period()}, covering every vehicle you add inside that band.`;
  }

  saveBtn.textContent = cost.charge > 0
    ? `Add Vehicle · ${money(cost.charge)}`
    : 'Add Vehicle';
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

  // Only adding touches the fleet fee, so a missing plan must not block an edit.
  const cost = id ? null : costToAddVehicle();
  if (!id && !cost) {
    return alert('❌ No fleet plan is configured, so this vehicle cannot be listed yet.');
  }

  // Adding a vehicle can move the agency onto a dearer band, so the payment is
  // shown and confirmed before anything is saved — the same order the platform
  // fee follows at registration. A vehicle that costs nothing extra skips it:
  // there is nothing to confirm.
  if (cost && cost.charge > 0) {
    const paid = cost.tier.price - cost.charge;
    const confirmed = await confirmPayment({
      title: cost.upgrade ? 'Upgrade Fleet Plan' : 'Confirm Payment',
      lead: cost.upgrade
        ? `Adding ${name} takes your fleet to ${fleetSize() + 1} vehicles, which moves you onto the ${cost.tier.label} plan.`
        : `Adding ${name} starts your fleet plan. One fee covers every vehicle in the band.`,
      planName: `${cost.tier.label} fleet plan`,
      planSub: `Covers ${fleetSize() + 1} vehicle${fleetSize() + 1 === 1 ? '' : 's'}`,
      planPrice: money(cost.tier.price),
      lines: [
        { label: 'Plan price', value: `${money(cost.tier.price)} / ${period()}` },
        ...(paid > 0 ? [{ label: 'Already paid this period', value: `− ${money(paid)}` }] : []),
        { label: 'Billing period', value: period() }
      ],
      total: money(cost.charge),
      actionLabel: `Pay ${money(cost.charge)} & Add`
    });
    if (!confirmed) return;
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
      return showNotice({
        icon: '✏️',
        title: `${name} updated`,
        lead: 'The details are saved. Your fleet plan and renewal date are unchanged.'
      });
    }

    // Adding: the API settles the fleet fee as part of creating the vehicle and
    // returns the resulting plan. Charging it from here as a second request
    // billed the agency twice, and left the bus saved-but-unlisted whenever the
    // second request was the one that failed.
    closeVehicleModal();
    await loadData();

    if (!data.fleet) {
      return showNotice({
        icon: '⚠️',
        title: `${name} saved, but not listed`,
        lead: data.listingWarning ||
          'The fleet fee could not be charged, so your vehicles are not visible to travellers yet. Pay it from the Subscription page.',
        actionLabel: 'Got it'
      });
    }

    // `charge` is what was actually billed — zero when the vehicle fitted
    // inside the band already paid for.
    const charged = Number(data.fleet.charge || 0);
    return showNotice({
      icon: '🎉',
      title: `${name} is live in the app!`,
      lead: `Travellers can now see it. Your fleet plan covers every vehicle in the ${data.fleet.tierLabel} band.`,
      lines: [
        { label: 'Fleet plan', value: escapeHtml(data.fleet.tierLabel) },
        { label: 'Vehicles covered', value: String(data.fleet.vehicleCount ?? fleetSize()) },
        {
          label: 'Paid now',
          value: charged > 0
            ? money(charged) + (data.fleet.upgraded ? ' (upgrade)' : '')
            : 'Nothing — already covered'
        },
        { label: 'Covered until', value: formatDate(data.fleet.expiresAt) }
      ]
    });
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

// ─── Holding a bus off the road ────────────────────────────

/// Whole days a bus has been on hold, counting the day it went on hold — the
/// same reckoning the API credits by, so the card never quotes a different
/// number from the one the plan is extended by.
function daysOnHold(heldSince) {
  const from = new Date(`${heldSince}T00:00:00`);
  if (Number.isNaN(from.getTime())) return 0;
  const startDay = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const now = new Date();
  const endDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(1, Math.round((endDay - startDay) / 86400000) + 1);
}

window.holdVehicle = async function(id) {
  const vehicle = state.vehicles.find(v => v.id === id);
  if (!vehicle) return;

  const reason = prompt(
    `Hold "${vehicle.name}" off the app?\n\n` +
    `It stays in your fleet but travellers stop seeing it, and it cannot be given a trip. ` +
    `Every day it is held is added back to your fleet plan when you resume it.\n\n` +
    `Why is it off the road? (optional)`,
    'Workshop / maintenance'
  );
  // prompt() returns null on Cancel and '' when the reason is cleared — only
  // the first means "do not do this".
  if (reason === null) return;

  try {
    const res = await fetch(`${API_BASE}/vehicles/${id}/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorName: vehicle.operatorName, reason })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Could not hold this vehicle');

    await loadData();
    await showNotice({
      icon: '⏸️',
      title: `${vehicle.name} is on hold`,
      lead: 'Travellers can no longer see it. Resume it when it is back on the road and the days it sat out will be added to your fleet plan.'
    });
  } catch (err) {
    alert('❌ ' + err.message);
  }
};

window.resumeVehicle = async function(id) {
  const vehicle = state.vehicles.find(v => v.id === id);
  if (!vehicle) return;

  const days = daysOnHold(vehicle.heldSince);
  if (!confirm(
    `Put "${vehicle.name}" back on the app?\n\n` +
    `It has been on hold for ${days} day${days === 1 ? '' : 's'}. ` +
    `Those days will be added to your fleet plan's expiry.`
  )) return;

  try {
    const res = await fetch(`${API_BASE}/vehicles/${id}/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorName: vehicle.operatorName })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Could not resume this vehicle');

    await loadData();

    const hold = data.hold || {};
    // Credited can be fewer than held when another bus was off the road over
    // the same dates — those days were already given back once.
    const lead = hold.creditedDays === hold.days
      ? `It was off the app for ${hold.days} day${hold.days === 1 ? '' : 's'}, and your fleet plan has been extended by the same.`
      : hold.creditedDays > 0
        ? `It was off the app for ${hold.days} days. ${hold.creditedDays} were added to your plan — the rest overlapped another bus's hold and had already been credited.`
        : `It was off the app for ${hold.days} day${hold.days === 1 ? '' : 's'}, all of which overlapped another bus's hold and had already been added to your plan.`;

    await showNotice({
      icon: '▶️',
      title: `${vehicle.name} is back on the app`,
      lead,
      lines: hold.fleetExpiresAt
        ? [{ label: 'Fleet plan now runs until', value: formatDate(hold.fleetExpiresAt) }]
        : []
    });
  } catch (err) {
    alert('❌ ' + err.message);
  }
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
