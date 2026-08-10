const API_BASE = window.location.origin.includes('3006')
  ? 'http://localhost:3000/api'
  : window.location.origin + '/api';

const SESSION_KEY = 'tripnix_owner';

const state = {
  user: null,
  accounts: null,
  categories: null,
  vehicles: [],
  tracking: null,
  fleetStatus: [],
  diary: []
};

// ─── Helpers ───────────────────────────────────────────────

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/// A loss reads "-₹24,000", not "₹-24,000" — the sign belongs in front of the
/// whole amount, which is where a reader scanning a column expects it.
function money(amount) {
  const n = Number(amount || 0);
  return (n < 0 ? '-₹' : '₹') + Math.abs(n).toLocaleString('en-IN');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showNotice({ icon = '✅', title, lead }) {
  return new Promise(resolve => {
    document.getElementById('notice-icon').textContent = icon;
    document.getElementById('notice-title').textContent = title;
    document.getElementById('notice-lead').textContent = lead || '';
    const modal = document.getElementById('notice');
    const ok = document.getElementById('notice-ok');
    const close = () => {
      modal.classList.add('hidden');
      ok.removeEventListener('click', close);
      resolve();
    };
    ok.addEventListener('click', close);
    modal.classList.remove('hidden');
  });
}

async function api(path, options) {
  const res = await fetch(API_BASE + path, options);
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

// ─── Sign in ───────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  errorEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const user = await api('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('login-username').value.trim(),
        password: document.getElementById('login-password').value
      })
    });

    // Office staff have their own portal. Letting them in here would hand them
    // the agency's takings and its trackers, which is the whole reason the two
    // portals are separate.
    if (!user.isOwner) {
      throw new Error(
        'This is the owner portal. Your login is an office-staff account — use the admin portal instead.'
      );
    }

    state.user = user;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    enterPortal();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

function enterPortal() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  const u = state.user;
  const initial = (u.operatorName || '?').trim()[0].toUpperCase();
  document.getElementById('agency-block').innerHTML = `
    <span class="agency-avatar">${escapeHtml(initial)}</span>
    <div class="agency-meta">
      <strong>${escapeHtml(u.operatorName)}</strong>
      <small>@${escapeHtml(u.username)} · Owner</small>
    </div>`;

  loadAll();
}

function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
  state.user = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-form').reset();
}

// ─── Sidebar ───────────────────────────────────────────────

const NAV_KEY = 'tripnix_owner_nav';

/// One button drives two behaviours, because a sidebar means different things
/// on the two sizes: on a wide screen it collapses to give the charts the room,
/// on a narrow one it slides over as a drawer.
function toggleSidebar() {
  const app = document.getElementById('app');
  if (window.matchMedia('(max-width: 900px)').matches) {
    const open = document.getElementById('sidebar').classList.toggle('is-open');
    document.getElementById('sidebar-overlay').classList.toggle('is-on', open);
    return;
  }
  const collapsed = app.classList.toggle('nav-collapsed');
  // Remembered, so it does not spring back open on every visit.
  localStorage.setItem(NAV_KEY, collapsed ? 'collapsed' : 'open');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('is-open');
  document.getElementById('sidebar-overlay')?.classList.remove('is-on');
}

function restoreSidebar() {
  if (localStorage.getItem(NAV_KEY) === 'collapsed') {
    document.getElementById('app').classList.add('nav-collapsed');
  }
}

// ─── Tabs ──────────────────────────────────────────────────

/// The owner's own concerns, not the whole admin portal. Fleet, bookings, the
/// diary and the subscription are the office's day-to-day work and live in the
/// admin portal — duplicating them here gave the owner two of everything and
/// buried the three things this portal exists for.
const TAB_META = {
  dashboard: ['Dashboard', 'How the money and the fleet are going'],
  accounts:  ['Accounts', 'Capital, income, expenses and how each bus is doing'],
  gps:       ['GPS Tracking', 'Where every bus last reported from']
};

function switchTab(tab) {
  // On a narrow screen the drawer covers the page, so picking a destination
  // has to put it away again.
  closeSidebar();

  document.querySelectorAll('.nav-item[data-tab]').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-page').forEach(p =>
    p.classList.toggle('active', p.id === `tab-${tab}`));

  const [title, sub] = TAB_META[tab] || TAB_META.dashboard;
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-sub').textContent = sub;

  if (tab === 'gps') loadTracking();
  if (tab === 'accounts') loadAccounts();
}

// ─── Loading ───────────────────────────────────────────────

async function loadAll() {
  await Promise.allSettled([
    loadDashboard(),
    loadAccounts(),
    loadTracking()
  ]);
}

async function loadDashboard() {
  const op = state.user.operatorName;
  try {
    const [statuses, vehicles] = await Promise.all([
      api('/trips/fleet-status'),
      api(`/vehicles?operatorName=${encodeURIComponent(op)}`)
    ]);
    state.fleetStatus = statuses.filter(s => s.operatorName === op);

    // The owner's read-only picture of each bus: what it is doing today, drawn
    // from the same diary the office works in.
    const diaries = await Promise.all(
      vehicles.map(v =>
        api(`/vehicles/${v.id}/schedule?operatorName=${encodeURIComponent(op)}`)
          .catch(() => null)
      )
    );
    state.diary = diaries.filter(Boolean);
    state.vehicles = vehicles;
    renderDashboard(vehicles);
  } catch (err) {
    document.getElementById('fleet-status').innerHTML =
      `<p class="empty">❌ ${escapeHtml(err.message)}</p>`;
  }
}

function renderDashboard(vehicles) {
  const today = new Date().toISOString().slice(0, 10);

  const onTrip = state.diary.filter(d =>
    (d.entries || []).some(e =>
      e.status !== 'Completed' && today >= e.departureDate && today <= e.arrivalDate)
  ).length;

  const upcoming = state.diary.reduce((n, d) =>
    n + (d.entries || []).filter(e => e.departureDate > today && e.status !== 'Completed').length, 0);

  document.getElementById('dash-stats').innerHTML = `
    ${statTile('🚌', vehicles.length, 'Buses')}
    ${statTile('🛣️', onTrip, 'Out today')}
    ${statTile('📅', upcoming, 'Upcoming jobs')}
    ${statTile('📢', state.fleetStatus.length, 'Live statuses')}`;

  const rows = state.diary.map(d => {
    const live = (d.entries || []).find(e =>
      e.status !== 'Completed' && today >= e.departureDate && today <= e.arrivalDate);
    const next = (d.entries || [])
      .filter(e => e.departureDate > today && e.status !== 'Completed')
      .sort((a, b) => a.departureDate.localeCompare(b.departureDate))[0];

    const badge = live
      ? `<span class="pill pill-green">OUT NOW</span>`
      : next
        ? `<span class="pill pill-amber">NEXT ${formatDate(next.departureDate)}</span>`
        : `<span class="pill pill-grey">FREE</span>`;

    const detail = live
      ? `${escapeHtml(live.customerName || live.place || 'On a trip')} · back ${formatDate(live.arrivalDate)}`
      : next
        ? `${escapeHtml(next.customerName || next.place || 'Booked')} · ${formatDate(next.departureDate)}`
        : 'Nothing on the books';

    return `
      <div class="row">
        <div class="row-main">
          <strong>${escapeHtml(d.vehicleName)}</strong>
          <code>${escapeHtml(d.vehicleNumber || '—')}</code>
          <span class="row-sub">${detail}</span>
        </div>
        ${badge}
      </div>`;
  }).join('');

  document.getElementById('fleet-status').innerHTML =
    rows || '<p class="empty">No buses in the fleet yet.</p>';

  document.getElementById('dash-statuses').innerHTML = state.fleetStatus.length
    ? state.fleetStatus.map(s => `
        <div class="row">
          <div class="row-main">
            <strong>${escapeHtml(s.place)}</strong>
            <code>${escapeHtml(s.vehicleNumber || '—')}</code>
            <span class="row-sub">${formatDate(s.departureDate)} → ${formatDate(s.arrivalDate)}</span>
          </div>
          <span class="pill ${s.status === 'On Trip' ? 'pill-green' : 'pill-amber'}">${escapeHtml(s.status)}</span>
        </div>`).join('')
    : '<p class="empty">No trip statuses posted. Post them from the admin portal’s Trips tab.</p>';
}

function statTile(icon, value, label) {
  return `
    <div class="stat">
      <span class="stat-icon">${icon}</span>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </div>`;
}

// ─── Accounts ──────────────────────────────────────────────

async function loadAccounts(month) {
  const op = state.user.operatorName;
  try {
    const q = month ? `&month=${encodeURIComponent(month)}` : '';
    const [accounts, categories, vehicles] = await Promise.all([
      api(`/accounts?operatorName=${encodeURIComponent(op)}${q}`),
      state.categories ? Promise.resolve(state.categories) : api('/accounts/categories'),
      api(`/vehicles?operatorName=${encodeURIComponent(op)}`)
    ]);
    state.accounts = accounts;
    state.categories = categories;
    state.vehicles = vehicles;
    renderAccounts();
  } catch (err) {
    document.getElementById('capital-block').innerHTML =
      `<p class="empty">❌ ${escapeHtml(err.message)}</p>`;
  }
}

/// Status band for a bus. Colour never carries this alone — every use pairs it
/// with the icon and the word, which is what makes the four bands readable to
/// someone who cannot separate the hues.
const BANDS = {
  Excellent: { icon: '★', cls: 'band-excellent' },
  Good:      { icon: '▲', cls: 'band-good' },
  Average:   { icon: '■', cls: 'band-average' },
  Loss:      { icon: '▼', cls: 'band-loss' },
  'No data': { icon: '·', cls: 'band-none' }
};

function bandPill(band) {
  const b = BANDS[band] || BANDS['No data'];
  return `<span class="band ${b.cls}"><span aria-hidden="true">${b.icon}</span> ${escapeHtml(band)}</span>`;
}

function renderAccounts() {
  const a = state.accounts;
  if (!a) return;

  const select = document.getElementById('accounts-month');
  if (document.activeElement !== select) {
    select.innerHTML = a.availableMonths.length
      ? a.availableMonths.map(m =>
          `<option value="${m.value}" ${m.value === a.month ? 'selected' : ''}>${escapeHtml(m.label)}</option>`).join('')
      : `<option>${escapeHtml(a.monthLabel)}</option>`;
  }

  document.getElementById('accounts-stats').innerHTML = `
    ${statTile('📥', money(a.income.total), 'Money in')}
    ${statTile('📤', money(a.expense.total), 'Money out')}
    ${statTile(a.profit < 0 ? '📉' : '📈', money(a.profit), `Profit · ${a.margin}% margin`)}
    ${statTile('🏦', money(a.capital.total), 'Capital in buses')}`;

  renderCapital(a);
  renderInOutChart(a);
  renderTrendChart(a);
  renderVehicleProfitChart(a);
  renderRecoveryChart(a);
  renderExpenseBreakdown(a);
  renderEntryList(a);

  // The dashboard shows the same charts, drawn from the same figures — an
  // owner opening the portal should see how the money is going without having
  // to go looking for it.
  renderDashboardMoney(a);
}

/// The money half of the dashboard. Kept here rather than in renderDashboard()
/// because it needs the accounts payload, which loads on its own.
function renderDashboardMoney(a) {
  const box = document.getElementById('dash-money');
  if (!box) return;

  box.innerHTML = `
    ${statTile('📥', money(a.income.total), `In · ${escapeHtml(a.monthLabel)}`)}
    ${statTile('📤', money(a.expense.total), `Out · ${escapeHtml(a.monthLabel)}`)}
    ${statTile(a.profit < 0 ? '📉' : '📈', money(a.profit), `Profit · ${a.margin}% margin`)}
    ${statTile('🏦', a.capital.recoveredPct === null ? '—' : a.capital.recoveredPct + '%', 'Capital earned back')}`;

  const note = document.getElementById('dash-vehicles-note');
  if (note) note.textContent = a.monthLabel;

  renderInOutChart(a, 'dash-chart-inout');
  renderTrendChart(a, 'dash-chart-trend');
  renderVehicleProfitChart(a, 'dash-chart-vehicles');
  renderRecoveryChart(a, 'dash-chart-recovery');
}

function renderCapital(a) {
  const c = a.capital;
  const pct = c.recoveredPct === null ? 0 : Math.min(100, c.recoveredPct);

  document.getElementById('capital-block').innerHTML = c.total > 0
    ? `
      <dl class="lines">
        <div><dt>Put into buses (${c.entries} entr${c.entries === 1 ? 'y' : 'ies'})</dt><dd>${money(c.total)}</dd></div>
        <div><dt>Earned back so far</dt><dd>${money(c.recovered)}</dd></div>
        <div><dt>Still to earn back</dt><dd>${money(c.outstanding)}</dd></div>
      </dl>
      <div class="track" role="img" aria-label="${pct}% of capital earned back">
        <div class="track-fill" style="width:${pct}%"></div>
      </div>
      <p class="hint">
        <strong>${c.recoveredPct === null ? '—' : c.recoveredPct + '%'}</strong> of what you paid for
        the buses has come back as profit. This counts everything since you started, not just
        ${escapeHtml(a.monthLabel)} — a bus takes years to pay for itself.
      </p>`
    : `<p class="empty">
         No capital recorded yet. Add what each bus cost to buy and this will show how much
         of it they have earned back.
       </p>`;
}

// ─── Charts ────────────────────────────────────────────────
//
// Hand-drawn SVG rather than a charting library: four small charts do not
// justify a dependency, and the CSP on the deployed site blocks CDN scripts.
//
// Palette roles, validated against this portal's panel surface (#1e293b):
//   income  #3987e5   expense #d95926   (categorical slots 1 & 2)
//   gain    #3987e5   loss    #e66767   (diverging poles)
// Each chart also labels its values, so colour is never the only channel.

const C = {
  income: '#3987e5',
  expense: '#d95926',
  gain: '#3987e5',
  loss: '#e66767',
  grid: 'rgba(255,255,255,0.10)',
  axis: '#94a3b8'
};

function shortMoney(n) {
  const v = Math.abs(Number(n) || 0);
  const sign = n < 0 ? '-' : '';
  if (v >= 10000000) return `${sign}₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `${sign}₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${sign}₹${Math.round(v / 1000)}k`;
  return `${sign}₹${v}`;
}

/// Grouped bars: income beside expense, one pair per month.
function renderInOutChart(a, target = 'chart-inout') {
  const el = document.getElementById(target);
  if (!el) return;
  const data = a.series;
  if (!data.length) { el.innerHTML = '<p class="empty">Nothing recorded yet.</p>'; return; }

  const W = 100, H = 46, padL = 12, padB = 9, padT = 4;
  const max = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)));
  const plotW = W - padL, plotH = H - padB - padT;
  const slot = plotW / data.length;
  // 2px surface gap between the pair, per the mark spec.
  const barW = Math.min(7, (slot - 3) / 2);

  const ticks = [0, 0.5, 1].map(t => ({ v: max * t, y: padT + plotH - plotH * t }));

  const bars = data.map((d, i) => {
    const x0 = padL + slot * i + (slot - barW * 2 - 1.5) / 2;
    const hIn = (d.income / max) * plotH;
    const hEx = (d.expense / max) * plotH;
    return `
      <rect class="bar" x="${x0}" y="${padT + plotH - hIn}" width="${barW}" height="${hIn}"
            rx="1.2" fill="${C.income}"><title>${escapeHtml(d.label)} · in ${money(d.income)}</title></rect>
      <rect class="bar" x="${x0 + barW + 1.5}" y="${padT + plotH - hEx}" width="${barW}" height="${hEx}"
            rx="1.2" fill="${C.expense}"><title>${escapeHtml(d.label)} · out ${money(d.expense)}</title></rect>`;
  }).join('');

  const labels = data.map((d, i) => `
    <text class="ax" x="${padL + slot * i + slot / 2}" y="${H - 3}" text-anchor="middle">
      ${escapeHtml(d.label.slice(0, 3))}
    </text>`).join('');

  el.innerHTML = `
    <div class="legend">
      <span><i style="background:${C.income}"></i>Money in</span>
      <span><i style="background:${C.expense}"></i>Money out</span>
    </div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img"
         aria-label="Income and expenses by month">
      ${ticks.map(t => `
        <line x1="${padL}" x2="${W}" y1="${t.y}" y2="${t.y}" stroke="${C.grid}" stroke-width="0.3"/>
        <text class="ax" x="${padL - 1.5}" y="${t.y + 1.4}" text-anchor="end">${shortMoney(t.v)}</text>`).join('')}
      ${bars}${labels}
    </svg>
    ${miniTable(
      ['Month', 'In', 'Out'],
      data.map(d => [d.label, money(d.income), money(d.expense)])
    )}`;
}

/// A single line: what was left each month. One series, so no legend — the
/// panel title names it.
function renderTrendChart(a, target = 'chart-trend') {
  const el = document.getElementById(target);
  if (!el) return;
  const data = a.series;
  if (data.length < 2) {
    el.innerHTML = `<p class="empty">${data.length ? 'One month so far — a trend needs at least two.' : 'Nothing recorded yet.'}</p>`;
    return;
  }

  const W = 100, H = 42, padL = 12, padB = 8, padT = 4;
  const values = data.map(d => d.profit);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  const plotW = W - padL, plotH = H - padB - padT;

  const x = i => padL + (data.length === 1 ? plotW / 2 : (plotW / (data.length - 1)) * i);
  const y = v => padT + plotH - ((v - min) / span) * plotH;
  const zeroY = y(0);

  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.profit)}`).join(' ');

  el.innerHTML = `
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Profit by month">
      <line x1="${padL}" x2="${W}" y1="${zeroY}" y2="${zeroY}" stroke="${C.grid}" stroke-width="0.4"/>
      <text class="ax" x="${padL - 1.5}" y="${zeroY + 1.4}" text-anchor="end">₹0</text>
      <path d="${path}" fill="none" stroke="${C.gain}" stroke-width="0.9"
            stroke-linejoin="round" stroke-linecap="round"/>
      ${data.map((d, i) => `
        <circle cx="${x(i)}" cy="${y(d.profit)}" r="1.5"
                fill="${d.profit < 0 ? C.loss : C.gain}" stroke="#1e293b" stroke-width="0.5">
          <title>${escapeHtml(d.label)} · ${money(d.profit)}</title>
        </circle>`).join('')}
      ${data.map((d, i) => `
        <text class="ax" x="${x(i)}" y="${H - 2.5}" text-anchor="middle">${escapeHtml(d.label.slice(0, 3))}</text>`).join('')}
      <text class="val" x="${x(data.length - 1)}" y="${y(data[data.length - 1].profit) - 2.6}"
            text-anchor="end">${shortMoney(data[data.length - 1].profit)}</text>
    </svg>
    ${miniTable(['Month', 'Profit'], data.map(d => [d.label, money(d.profit)]))}`;
}

/// Horizontal bars, one per bus. Profit has a sign, so the two directions take
/// the diverging poles and each bar carries its number.
function renderVehicleProfitChart(a, target = 'chart-vehicles') {
  const el = document.getElementById(target);
  if (!el) return;
  const data = a.perVehicle;
  if (!data.length) { el.innerHTML = '<p class="empty">No buses yet.</p>'; return; }

  const max = Math.max(1, ...data.map(v => Math.abs(v.profit)));

  el.innerHTML = `
    <div class="hbars">
      ${data.map(v => {
        const pct = (Math.abs(v.profit) / max) * 100;
        const negative = v.profit < 0;
        return `
          <div class="hbar">
            <div class="hbar-label">
              <strong>${escapeHtml(v.vehicleName)}</strong>
              <span class="row-sub">${v.orders} order${v.orders === 1 ? '' : 's'} · in ${money(v.income)} · out ${money(v.expense)}</span>
            </div>
            <div class="hbar-track">
              <div class="hbar-fill" style="width:${pct}%;background:${negative ? C.loss : C.gain}"></div>
            </div>
            <strong class="hbar-value ${negative ? 'is-loss' : ''}">${money(v.profit)}</strong>
          </div>`;
      }).join('')}
    </div>
    <p class="hint">
      Bus figures cover ${escapeHtml(a.monthLabel)}. Expenses you recorded against the whole
      agency rather than one bus are in the totals above but not in these bars, so these
      will not always add up to the month's profit.
    </p>`;
}

/// How far each bus is towards paying for itself, with its performance band.
function renderRecoveryChart(a, target = 'chart-recovery') {
  const el = document.getElementById(target);
  if (!el) return;
  const withCapital = a.perVehicle.filter(v => v.capital > 0);

  if (!withCapital.length) {
    el.innerHTML = `<p class="empty">
      No purchase prices recorded. Add a <strong>Capital</strong> entry for a bus and this
      will track how much of it has come back.</p>`;
    return;
  }

  el.innerHTML = `
    <div class="hbars">
      ${withCapital.map(v => {
        const pct = Math.min(100, Math.max(0, v.lifetime.recoveredPct ?? 0));
        return `
          <div class="hbar">
            <div class="hbar-label">
              <strong>${escapeHtml(v.vehicleName)}</strong>
              <span class="row-sub">
                paid ${money(v.capital)} · earned back ${money(Math.max(0, v.lifetime.profit))} ·
                ${money(v.lifetime.outstanding)} to go
              </span>
            </div>
            <div class="hbar-track">
              <div class="hbar-fill" style="width:${pct}%;background:${C.gain}"></div>
            </div>
            <div class="hbar-side">
              <strong class="hbar-value">${v.lifetime.recoveredPct}%</strong>
              ${bandPill(v.band)}
            </div>
          </div>`;
      }).join('')}
    </div>
    <p class="hint">
      The band rates a bus on its lifetime margin, held back while it is still deep in the
      hole — a bus that has earned back under a quarter of its price cannot rank above
      Average however good the month was.
    </p>`;
}

function renderExpenseBreakdown(a) {
  const el = document.getElementById('expense-breakdown');
  const rows = a.expense.byCategory;
  document.getElementById('expense-note').textContent =
    `${money(a.expense.total)} spent in ${a.monthLabel}`;

  if (!rows.length) {
    el.innerHTML = '<p class="empty">No expenses recorded for this month.</p>';
    return;
  }

  const max = Math.max(...rows.map(r => r.amount));
  el.innerHTML = `
    <div class="hbars">
      ${rows.map(r => `
        <div class="hbar">
          <div class="hbar-label"><strong>${escapeHtml(r.category)}</strong></div>
          <div class="hbar-track">
            <div class="hbar-fill" style="width:${(r.amount / max) * 100}%;background:${C.expense}"></div>
          </div>
          <strong class="hbar-value">${money(r.amount)}</strong>
        </div>`).join('')}
    </div>`;
}

function renderEntryList(a) {
  const rows = [
    ...a.entries.orders.map(e => ({ ...e, kindLabel: 'Diary fare', sign: '+' })),
    ...a.entries.manual.map(e => ({
      ...e,
      kindLabel: e.source === 'income' ? 'Income' : 'Expense',
      sign: e.source === 'expense' ? '−' : '+'
    }))
  ].sort((x, y) => String(x.date).localeCompare(String(y.date)));

  document.getElementById('accounts-entries').innerHTML = rows.length
    ? rows.map(e => `
        <div class="row">
          <div class="row-main">
            <strong>${escapeHtml(e.label)}</strong>
            <span class="row-sub">
              ${escapeHtml(e.kindLabel)} · ${escapeHtml(e.vehicleName || 'Whole agency')} ·
              ${formatDate(e.date)}${e.detail ? ' · ' + escapeHtml(e.detail) : ''}
            </span>
          </div>
          <div class="row-right">
            <strong class="amount ${e.sign === '−' ? 'is-loss' : ''}">${e.sign}${money(e.amount)}</strong>
            ${e.source === 'diary'
              ? ''
              : `<button class="btn btn-danger btn-sm" onclick="removeEntry(${e.id})">✕</button>`}
          </div>
        </div>`).join('')
    : '<p class="empty">Nothing recorded for this month yet.</p>';
}

/// The table behind every chart, so the numbers are readable without relying on
/// the picture — and by a screen reader.
function miniTable(headers, rows) {
  return `
    <details class="table-view">
      <summary>Show the numbers</summary>
      <table>
        <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </details>`;
}

// ─── Ledger entries ────────────────────────────────────────

function openEntryModal() {
  const kind = document.querySelector('input[name="kind"]:checked')?.value || 'income';
  document.getElementById('entry-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('entry-amount').value = '';
  document.getElementById('entry-note').value = '';
  syncEntryKind(kind);
  document.getElementById('entry-modal').classList.remove('hidden');
}

function closeEntryModal() {
  document.getElementById('entry-modal').classList.add('hidden');
}

/// Keeps the form honest about what each kind needs: capital belongs to one
/// bus, the other two may sit against the agency as a whole.
function syncEntryKind(kind) {
  const cats = state.categories?.categories?.[kind] || [];
  document.getElementById('entry-category').innerHTML =
    cats.map(c => `<option>${escapeHtml(c)}</option>`).join('');

  const select = document.getElementById('entry-vehicle');
  const options = (state.vehicles || []).map(v =>
    `<option value="${v.id}">${escapeHtml(v.name)} · ${escapeHtml(v.vehicleNumber || '—')}</option>`);
  select.innerHTML = kind === 'capital'
    ? options.join('')
    : `<option value="">Whole agency</option>` + options.join('');

  document.getElementById('entry-vehicle-req').textContent = kind === 'capital' ? '*' : '';
  document.getElementById('entry-hint').textContent = kind === 'capital'
    ? 'What the bus cost to buy. Recorded once, not as a monthly expense — it is the sum the bus has to earn back.'
    : kind === 'income'
      ? 'Money in that is not already a diary order — a private contract, a rental, anything else.'
      : 'Money out: fuel, wages, servicing, insurance, an EMI. Leave the bus blank for costs that cover the whole agency.';
}

async function handleEntrySubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('entry-save');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const kind = document.querySelector('input[name="kind"]:checked').value;
    await api('/accounts/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operatorName: state.user.operatorName,
        kind,
        vehicleId: document.getElementById('entry-vehicle').value || null,
        amount: document.getElementById('entry-amount').value,
        date: document.getElementById('entry-date').value,
        category: document.getElementById('entry-category').value,
        note: document.getElementById('entry-note').value.trim()
      })
    });
    closeEntryModal();
    await loadAccounts(state.accounts?.month);
  } catch (err) {
    await showNotice({ icon: '⚠️', title: 'Could not save the entry', lead: err.message });
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save entry';
  }
}

window.removeEntry = async function(id) {
  if (!confirm('Remove this entry from the books?')) return;
  try {
    await api(`/accounts/entries/${id}?operatorName=${encodeURIComponent(state.user.operatorName)}`,
      { method: 'DELETE' });
    await loadAccounts(state.accounts?.month);
  } catch (err) {
    await showNotice({ icon: '⚠️', title: 'Could not remove the entry', lead: err.message });
  }
};

// ─── CSV review ────────────────────────────────────────────

/// Quotes a cell so a note containing a comma cannot shift every column after
/// it — the classic way a spreadsheet export turns into nonsense.
function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename, rows) {
  const csv = rows.map(r => r.map(csvCell).join(',')).join('\n');
  // A BOM so Excel opens ₹ and names with accents correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadMonthReview() {
  const a = state.accounts;
  if (!a) return;

  const rows = [
    [`${a.operatorName} — accounts review`, a.monthLabel],
    [],
    ['Summary'],
    ['Money in', a.income.total],
    ['  From diary orders', a.income.trips],
    ['  Other income', a.income.other],
    ['Money out', a.expense.total],
    ['Profit', a.profit],
    ['Margin %', a.margin],
    ['App bookings (no fare recorded)', a.income.appBookings],
    [],
    ['Capital'],
    ['Put into buses', a.capital.total],
    ['Earned back', a.capital.recovered],
    ['Still to earn back', a.capital.outstanding],
    ['Recovered %', a.capital.recoveredPct ?? ''],
    [],
    ['Paid to Tripnix (lifetime)'],
    ['Platform membership', a.paidToTripnix.platform],
    ['Fleet plan', a.paidToTripnix.fleet],
    [],
    ['Per bus'],
    ['Bus', 'Number', 'Orders', 'Income', 'Expense', 'Profit', 'Capital', 'Recovered %', 'Band'],
    ...a.perVehicle.map(v => [
      v.vehicleName, v.vehicleNumber, v.orders, v.income, v.expense, v.profit,
      v.capital, v.lifetime.recoveredPct ?? '', v.band
    ]),
    [],
    ['Expenses by category'],
    ...a.expense.byCategory.map(c => [c.category, c.amount]),
    [],
    ['Every entry'],
    ['Date', 'Type', 'Bus', 'Detail', 'Amount'],
    ...a.entries.orders.map(e => [e.date, 'Diary fare', e.vehicleName, `${e.label} ${e.detail}`.trim(), e.amount]),
    ...a.entries.manual.map(e => [
      e.date, e.source === 'income' ? 'Income' : 'Expense',
      e.vehicleName, `${e.label}${e.detail ? ' — ' + e.detail : ''}`, e.amount
    ])
  ];

  downloadCsv(`tripnix-accounts-${a.month}.csv`, rows);
}

function downloadAllMonths() {
  const a = state.accounts;
  if (!a) return;

  downloadCsv(`tripnix-accounts-all-months.csv`, [
    [`${a.operatorName} — month by month`],
    [],
    ['Month', 'Money in', 'Money out', 'Profit'],
    ...a.series.map(s => [s.label, s.income, s.expense, s.profit])
  ]);
}

// ─── GPS ───────────────────────────────────────────────────

async function loadTracking() {
  const op = state.user.operatorName;
  try {
    state.tracking = await api(`/tracking?operatorName=${encodeURIComponent(op)}`);
    renderTracking();
  } catch (err) {
    document.getElementById('gps-list').innerHTML =
      `<p class="empty">❌ ${escapeHtml(err.message)}</p>`;
  }
}

function renderTracking() {
  const t = state.tracking;
  if (!t) return;

  document.getElementById('gps-note').textContent =
    `${t.reporting} of ${t.total} reporting · a bus counts as live for ${t.staleAfterMinutes} minutes after its last fix`;

  document.getElementById('gps-endpoint').textContent =
    `POST ${API_BASE}/tracking/vehicles/<vehicleId>\n` +
    `Content-Type: application/json\n\n` +
    `{ "lat": 9.9312, "lng": 76.2673, "speedKph": 42, "label": "Kochi" }`;

  document.getElementById('gps-list').innerHTML = t.vehicles.length
    ? t.vehicles.map(v => {
        const l = v.location;
        const pill = !l
          ? '<span class="pill pill-grey">NO SIGNAL</span>'
          : l.live
            ? '<span class="pill pill-green">LIVE</span>'
            : `<span class="pill pill-amber">${l.ageMinutes} MIN AGO</span>`;

        const where = !l
          ? 'This bus has never reported a position'
          : `${l.label ? escapeHtml(l.label) + ' · ' : ''}${l.lat.toFixed(5)}, ${l.lng.toFixed(5)}` +
            `${l.speedKph ? ' · ' + Math.round(l.speedKph) + ' km/h' : ''}`;

        const map = l
          ? `<a class="map-link" href="https://www.google.com/maps?q=${l.lat},${l.lng}" target="_blank" rel="noopener">Open map ↗</a>`
          : '';

        return `
          <div class="row">
            <div class="row-main">
              <strong>${escapeHtml(v.vehicleName)}</strong>
              <code>${escapeHtml(v.vehicleNumber || '—')}</code>
              <span class="row-sub">${where}</span>
            </div>
            <div class="row-right">${pill}${map}</div>
          </div>`;
      }).join('')
    : '<p class="empty">No buses in the fleet yet.</p>';

  renderTrackingMap(t, 'gps-map', 'gps-map-note');
  renderTrackingMap(t, 'dash-gps', 'dash-gps-note', { compact: true });
}

/// A self-contained map of where the buses are.
///
/// Drawn as SVG rather than with a tile provider: the deployed site's CSP
/// blocks scripts and images from other hosts, so Google Maps or Leaflet would
/// render as an empty box. This plots each bus by its coordinates inside the
/// area the fleet currently covers — no roads, but it answers "are they
/// together or spread out, and which one is off on its own".
function renderTrackingMap(t, targetId, noteId, { compact = false } = {}) {
  const el = document.getElementById(targetId);
  if (!el) return;

  const note = noteId ? document.getElementById(noteId) : null;
  const placed = t.vehicles.filter(v => v.location);

  if (!placed.length) {
    if (note) note.textContent = t.total ? 'No bus has reported a position yet' : '';
    el.innerHTML = `
      <div class="map-frame is-empty">
        <div class="map-grid" aria-hidden="true"></div>
        <div class="map-empty">
          <span class="map-empty-icon">📡</span>
          <strong>Waiting for the first position</strong>
          <span>
            ${t.total
              ? `${t.total} bus${t.total === 1 ? '' : 'es'} on the books, none reporting yet.`
              : 'No buses in the fleet yet.'}
            Buses appear here the moment a tracker posts a fix.
          </span>
        </div>
      </div>`;
    return;
  }

  // The window is the area the fleet covers, padded so no bus sits on the
  // edge. A single bus has no span at all, so it gets a fixed one around it —
  // otherwise the maths divides by zero and every bus lands in the corner.
  const lats = placed.map(v => v.location.lat);
  const lngs = placed.map(v => v.location.lng);
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lngs) - Math.min(...lngs),
    0.02
  ) * 1.35;
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const midLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;

  const W = 100;
  const H = compact ? 46 : 62;
  // Latitude increases northwards but SVG y increases downwards, so north has
  // to be flipped or the map comes out upside down.
  const x = lng => ((lng - (midLng - span / 2)) / span) * W;
  const y = lat => H - ((lat - (midLat - span / 2)) / span) * H;

  const kmAcross = (span * 111).toFixed(span * 111 < 10 ? 1 : 0);
  if (note) {
    note.textContent =
      `${t.reporting} of ${t.total} reporting · about ${kmAcross} km across`;
  }

  const dots = placed.map(v => {
    const l = v.location;
    const live = l.live;
    // Status colour is backed by the label beneath and the ring shape, never
    // left to carry the meaning by itself.
    const fill = live ? '#0ca30c' : '#fab219';
    const cx = Math.min(W - 4, Math.max(4, x(l.lng)));
    const cy = Math.min(H - 6, Math.max(6, y(l.lat)));

    return `
      <g class="map-bus">
        ${live ? `<circle cx="${cx}" cy="${cy}" r="4.6" fill="${fill}" opacity="0.18"><animate
            attributeName="r" values="3.4;6.2;3.4" dur="2.4s" repeatCount="indefinite"/><animate
            attributeName="opacity" values="0.3;0;0.3" dur="2.4s" repeatCount="indefinite"/></circle>` : ''}
        <circle cx="${cx}" cy="${cy}" r="2.4" fill="${fill}" stroke="#1e293b" stroke-width="0.7"/>
        <text class="map-label" x="${cx}" y="${cy - 3.6}" text-anchor="middle">
          ${escapeHtml(v.vehicleNumber || v.vehicleName)}
        </text>
        <title>${escapeHtml(v.vehicleName)} · ${live ? 'live' : l.ageMinutes + ' min ago'}${
          l.label ? ' · ' + escapeHtml(l.label) : ''}</title>
      </g>`;
  }).join('');

  const silent = t.total - placed.length;

  el.innerHTML = `
    <div class="map-frame">
      <div class="map-grid" aria-hidden="true"></div>
      <svg viewBox="0 0 ${W} ${H}" class="map-svg" role="img"
           aria-label="Map of ${placed.length} reporting bus${placed.length === 1 ? '' : 'es'}">
        ${dots}
      </svg>
      <span class="map-scale">~${kmAcross} km</span>
    </div>
    <div class="map-legend">
      <span><i class="dot" style="background:#0ca30c"></i>Live</span>
      <span><i class="dot" style="background:#fab219"></i>Last seen earlier</span>
      ${silent ? `<span><i class="dot" style="background:#94a3b8"></i>${silent} not reporting</span>` : ''}
    </div>`;
}

// ─── Boot ──────────────────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('logout-btn').addEventListener('click', signOut);
document.getElementById('refresh-btn').addEventListener('click', loadAll);
document.getElementById('accounts-month').addEventListener('change', e => loadAccounts(e.target.value));
document.getElementById('add-entry-btn').addEventListener('click', openEntryModal);
document.getElementById('entry-close').addEventListener('click', closeEntryModal);
document.getElementById('entry-cancel').addEventListener('click', closeEntryModal);
document.getElementById('entry-form').addEventListener('submit', handleEntrySubmit);
document.getElementById('download-month').addEventListener('click', downloadMonthReview);
document.getElementById('download-all').addEventListener('click', downloadAllMonths);
document.querySelectorAll('input[name="kind"]').forEach(r =>
  r.addEventListener('change', e => syncEntryKind(e.target.value)));
document.querySelectorAll('.nav-item[data-tab]').forEach(b =>
  b.addEventListener('click', () => switchTab(b.dataset.tab)));
document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
document.querySelectorAll('[data-goto]').forEach(link =>
  link.addEventListener('click', e => {
    e.preventDefault();
    switchTab(link.dataset.goto);
  }));
restoreSidebar();

// The admin portal sits beside this one in production, and on its own dev port
// when running locally.
const adminUrl = window.location.origin.includes('3006')
  ? 'http://localhost:3005/'
  : '/admin/';
document.getElementById('admin-link').href = adminUrl;
document.getElementById('open-admin').href = adminUrl;

const saved = sessionStorage.getItem(SESSION_KEY);
if (saved) {
  try {
    const user = JSON.parse(saved);
    if (user?.isOwner) {
      state.user = user;
      enterPortal();
    }
  } catch { /* fall through to the sign-in screen */ }
}
