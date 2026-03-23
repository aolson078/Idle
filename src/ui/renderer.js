/**
 * Renderer — UI rendering, click handling, game loop.
 * Runs in the Electron renderer process (browser context).
 * No Node.js APIs — uses window.parasiteAPI for persistence.
 */

// ═══════════════════════════════════════
// INLINE: Event Bus (browser-safe, no Node deps)
// ═══════════════════════════════════════

class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(type, cb) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(cb);
    return () => this.off(type, cb);
  }

  off(type, cb) {
    const arr = this._listeners.get(type);
    if (!arr) return;
    const i = arr.indexOf(cb);
    if (i !== -1) arr.splice(i, 1);
  }

  emit(type, data = {}) {
    const event = { type, ts: new Date().toISOString(), ...data };

    // Notify specific listeners
    const listeners = this._listeners.get(type) || [];
    for (const cb of listeners) {
      try { cb(event); } catch (e) { console.error(`[bus] ${type}:`, e); }
    }

    // Notify wildcard listeners
    const wildcards = this._listeners.get('*') || [];
    for (const cb of wildcards) {
      try { cb(event); } catch (e) { console.error('[bus] *:', e); }
    }

    return event;
  }
}

// ═══════════════════════════════════════
// INLINE: Generator definitions
// ═══════════════════════════════════════

const GENERATORS = [
  { id: 'tendril', name: 'Tendril', description: 'A thin thread of something alive. It reaches toward you.', baseCost: 10, baseRate: 0.1, costMultiplier: 1.15 },
  { id: 'root', name: 'Root', description: 'It digs deeper. The orb appreciates your attention.', baseCost: 100, baseRate: 1.0, costMultiplier: 1.15 },
  { id: 'vein', name: 'Vein', description: 'Channels form. Something flows through them.', baseCost: 1100, baseRate: 8.0, costMultiplier: 1.15 },
  { id: 'nerve', name: 'Nerve', description: 'It flinches when you click too fast.', baseCost: 12000, baseRate: 47.0, costMultiplier: 1.15 },
  { id: 'synapse', name: 'Synapse', description: 'Connections spark. Brief patterns, almost like... thought.', baseCost: 130000, baseRate: 260.0, costMultiplier: 1.15 },
  { id: 'cortex', name: 'Cortex', description: 'A structure forms. It hums quietly when you\'re not looking.', baseCost: 1400000, baseRate: 1400.0, costMultiplier: 1.15 },
];

function genCost(gen, owned) {
  return Math.floor(gen.baseCost * Math.pow(gen.costMultiplier, owned));
}

function genRate(gen, owned) {
  return owned === 0 ? 0 : gen.baseRate * owned;
}

// ═══════════════════════════════════════
// INLINE: Upgrade definitions
// ═══════════════════════════════════════

const UPGRADE_DEFS = [
  { id: 'click_power_1', name: 'Firmer Touch', description: 'Each click yields 2× Essence.', cost: 100, type: 'click_multiplier', value: 2, requires: null },
  { id: 'click_power_2', name: 'Heavy Hand', description: 'Each click yields 5× Essence.', cost: 5000, type: 'click_multiplier', value: 5, requires: 'click_power_1' },
  { id: 'click_power_3', name: 'Crushing Grip', description: 'Each click yields 20× Essence. It trembles.', cost: 100000, type: 'click_multiplier', value: 20, requires: 'click_power_2' },
  { id: 'gen_boost_1', name: 'Fertile Ground', description: 'All generators produce 2× Essence.', cost: 500, type: 'gen_multiplier', value: 2, requires: null },
  { id: 'gen_boost_2', name: 'Rich Soil', description: 'All generators produce 3× Essence.', cost: 25000, type: 'gen_multiplier', value: 3, requires: 'gen_boost_1' },
  { id: 'gen_boost_3', name: 'Deep Nutrients', description: 'All generators produce 5× Essence.', cost: 500000, type: 'gen_multiplier', value: 5, requires: 'gen_boost_2' },
  { id: 'offline_1', name: 'Dormant Growth', description: 'Earn 25% of production while away.', cost: 1000, type: 'offline_rate', value: 0.25, requires: null },
  { id: 'offline_2', name: 'Restless Sleep', description: 'Earn 50% while away. It doesn\'t really sleep.', cost: 50000, type: 'offline_rate', value: 0.50, requires: 'offline_1' },
];

// ═══════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════

const bus = new EventBus();

const state = {
  essence: 0,
  totalEssence: 0,
  generators: {},
  purchasedUpgrades: new Set(),
  moltCount: 0,
  moltBonus: 1.0,
  sessionNumber: 1,
  clickCount: 0,
  lastTick: Date.now(),
};

// Init generators
for (const g of GENERATORS) state.generators[g.id] = 0;

// ═══════════════════════════════════════
// GAME LOGIC
// ═══════════════════════════════════════

function getClickMultiplier() {
  let m = 1;
  for (const u of UPGRADE_DEFS) {
    if (state.purchasedUpgrades.has(u.id) && u.type === 'click_multiplier') m = u.value;
  }
  return m;
}

function getGenMultiplier() {
  let m = 1;
  for (const u of UPGRADE_DEFS) {
    if (state.purchasedUpgrades.has(u.id) && u.type === 'gen_multiplier') m *= u.value;
  }
  return m;
}

function getProductionRate() {
  let total = 0;
  for (const g of GENERATORS) total += genRate(g, state.generators[g.id]);
  return total * getGenMultiplier() * state.moltBonus;
}

function getMoltThreshold() {
  return Math.floor(10000 * Math.pow(10, state.moltCount));
}

function doClick() {
  const earned = 1 * getClickMultiplier() * state.moltBonus;
  state.essence += earned;
  state.totalEssence += earned;
  state.clickCount++;
  bus.emit('click', { earned, total: state.essence });
  return earned;
}

function buyGenerator(id) {
  const g = GENERATORS.find(x => x.id === id);
  if (!g) return false;
  const cost = genCost(g, state.generators[id]);
  if (state.essence < cost) return false;
  state.essence -= cost;
  state.generators[id]++;
  bus.emit('purchase', { item: id, count: state.generators[id], cost });
  return true;
}

function buyUpgrade(id) {
  const u = UPGRADE_DEFS.find(x => x.id === id);
  if (!u) return false;
  if (state.purchasedUpgrades.has(id)) return false;
  if (state.essence < u.cost) return false;
  if (u.requires && !state.purchasedUpgrades.has(u.requires)) return false;
  state.essence -= u.cost;
  state.purchasedUpgrades.add(id);
  bus.emit('upgrade_purchased', { upgrade: id, cost: u.cost });
  return true;
}

function doMolt() {
  const threshold = getMoltThreshold();
  if (state.totalEssence < threshold) return false;
  const before = state.totalEssence;
  state.moltCount++;
  state.moltBonus = 1 + state.moltCount * 0.1;
  state.essence = 0;
  state.totalEssence = 0;
  for (const g of GENERATORS) state.generators[g.id] = 0;
  state.purchasedUpgrades.clear();
  bus.emit('molt', { number: state.moltCount, bonus: state.moltBonus, essenceBefore: before });
  return true;
}

// ═══════════════════════════════════════
// TICK — production per frame
// ═══════════════════════════════════════

function tick() {
  const now = Date.now();
  const dt = (now - state.lastTick) / 1000;
  state.lastTick = now;
  const earned = getProductionRate() * dt;
  if (earned > 0) {
    state.essence += earned;
    state.totalEssence += earned;
  }
}

// ═══════════════════════════════════════
// SAVE / LOAD via preload bridge
// ═══════════════════════════════════════

function saveGame() {
  if (!window.parasiteAPI) return;
  window.parasiteAPI.saveGame({
    essence: state.essence,
    totalEssence: state.totalEssence,
    generators: { ...state.generators },
    purchasedUpgrades: [...state.purchasedUpgrades],
    moltCount: state.moltCount,
    sessionNumber: state.sessionNumber,
    lastSave: new Date().toISOString(),
  });
}

function loadGame() {
  if (!window.parasiteAPI) return;
  const data = window.parasiteAPI.loadGame();
  if (!data) return;

  state.essence = data.essence || 0;
  state.totalEssence = data.totalEssence || 0;
  state.moltCount = data.moltCount || 0;
  state.moltBonus = 1 + state.moltCount * 0.1;
  state.sessionNumber = (data.sessionNumber || 1) + 1;

  if (data.generators) {
    for (const [id, count] of Object.entries(data.generators)) {
      if (state.generators.hasOwnProperty(id)) state.generators[id] = count;
    }
  }

  if (data.purchasedUpgrades) {
    for (const id of data.purchasedUpgrades) state.purchasedUpgrades.add(id);
  }

  // Offline progress
  if (data.lastSave) {
    const away = Math.floor((Date.now() - new Date(data.lastSave).getTime()) / 1000);
    if (away > 10) {
      let offlineRate = 0;
      for (const u of UPGRADE_DEFS) {
        if (state.purchasedUpgrades.has(u.id) && u.type === 'offline_rate') offlineRate = u.value;
      }
      if (offlineRate > 0) {
        const earned = getProductionRate() * away * offlineRate;
        state.essence += earned;
        state.totalEssence += earned;
        bus.emit('offline_progress', { secondsAway: away, earned });
      }
    }
  }
}

// ═══════════════════════════════════════
// UI RENDERING
// ═══════════════════════════════════════

function formatNumber(n, decimals) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e15) return (n / 1e15).toFixed(2) + 'Q';
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e4) return Math.floor(n).toLocaleString();
  if (decimals > 0) return n.toFixed(decimals);
  return Math.floor(n).toLocaleString();
}

// --- Generators panel ---
function renderGenerators() {
  const panel = document.getElementById('generators-panel');
  panel.innerHTML = '';

  for (let i = 0; i < GENERATORS.length; i++) {
    const g = GENERATORS[i];
    const owned = state.generators[g.id];
    const cost = genCost(g, owned);
    const canAfford = state.essence >= cost;
    const rate = genRate(g, owned) * getGenMultiplier() * state.moltBonus;

    // Lock: need previous tier first
    const prev = i > 0 ? GENERATORS[i - 1] : null;
    const locked = prev && state.generators[prev.id] === 0 && owned === 0;

    const row = document.createElement('div');
    row.className = 'generator-row' + (locked ? ' locked' : '') + (!canAfford && !locked ? ' cant-afford' : '');

    row.innerHTML = `
      <span class="gen-name">${g.name}</span>
      <span class="gen-cost">${formatNumber(cost)}</span>
      <span class="gen-desc">${g.description}</span>
      <span class="gen-rate">${owned > 0 ? formatNumber(rate, 1) + '/s' : ''}</span>
      <span class="gen-owned">${owned > 0 ? '×' + owned : ''}</span>
    `;

    if (!locked) {
      row.addEventListener('click', () => {
        if (buyGenerator(g.id)) renderGenerators();
      });
    }

    panel.appendChild(row);
  }
}

// --- Upgrades panel ---
function renderUpgrades() {
  const panel = document.getElementById('upgrades-panel');
  panel.innerHTML = '';

  for (const u of UPGRADE_DEFS) {
    const purchased = state.purchasedUpgrades.has(u.id);
    const hasReq = !u.requires || state.purchasedUpgrades.has(u.requires);
    const canAfford = state.essence >= u.cost;
    const locked = !hasReq && !purchased;

    const row = document.createElement('div');
    row.className = 'upgrade-row'
      + (purchased ? ' purchased' : '')
      + (locked ? ' locked' : '')
      + (!canAfford && !purchased && !locked ? ' cant-afford' : '');

    row.innerHTML = `
      <div class="upgrade-name">${u.name}${purchased ? ' ✓' : ''}</div>
      <div class="upgrade-desc">${u.description}</div>
      ${!purchased ? `<div class="upgrade-cost">${formatNumber(u.cost)}</div>` : ''}
    `;

    if (!purchased && !locked) {
      row.addEventListener('click', () => {
        if (buyUpgrade(u.id)) renderUpgrades();
      });
    }

    panel.appendChild(row);
  }
}

// --- Header displays ---
function updateHeader() {
  document.getElementById('essence-display').textContent = formatNumber(Math.floor(state.essence));
  document.getElementById('rate-display').textContent = formatNumber(getProductionRate(), 1) + ' /s';
}

// --- Molt button ---
function updateMolt() {
  const btn = document.getElementById('molt-btn');
  const threshold = getMoltThreshold();
  const can = state.totalEssence >= threshold;
  btn.classList.toggle('available', can);
  btn.textContent = can
    ? `Molt (×${(1 + (state.moltCount + 1) * 0.1).toFixed(1)})`
    : `Molt (need ${formatNumber(threshold)})`;
}

// --- Mystery bar ---
function updateMysteryBar() {
  const pct = Math.min(100, (state.totalEssence / 100000) * 100);
  document.getElementById('mystery-bar-fill').style.width = pct + '%';
}

// ═══════════════════════════════════════
// ORB — Click with visual feedback
// ═══════════════════════════════════════

function setupOrb() {
  const orb = document.getElementById('orb');
  const orbArea = document.getElementById('orb-area');

  orb.addEventListener('click', (e) => {
    const earned = doClick();

    // Ripple
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = e.offsetX + 'px';
    ripple.style.top = e.offsetY + 'px';
    orb.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);

    // Floating number
    const num = document.createElement('div');
    num.className = 'click-number';
    num.textContent = '+' + formatNumber(earned);
    const rect = orbArea.getBoundingClientRect();
    num.style.left = (e.clientX - rect.left) + 'px';
    num.style.top = (e.clientY - rect.top) + 'px';
    orbArea.appendChild(num);
    setTimeout(() => num.remove(), 800);
  });
}

// ═══════════════════════════════════════
// MAIN LOOP — 10fps UI, tick every frame
// ═══════════════════════════════════════

let frameCount = 0;

function mainLoop() {
  tick();
  updateHeader();

  // Render panels less often (every 5th frame = ~2fps for DOM updates)
  if (frameCount % 5 === 0) {
    renderGenerators();
    renderUpgrades();
    updateMolt();
    updateMysteryBar();
  }

  frameCount++;
  setTimeout(mainLoop, 100);
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════

function init() {
  loadGame();

  // Log events to disk via main process
  if (window.parasiteAPI) {
    bus.on('*', (event) => window.parasiteAPI.logEvent(event));
  }

  // Auto-save every 30s
  setInterval(saveGame, 30000);

  // Save on close
  window.addEventListener('beforeunload', saveGame);

  setupOrb();

  // Molt button
  document.getElementById('molt-btn').addEventListener('click', () => {
    if (doMolt()) {
      renderGenerators();
      renderUpgrades();
    }
  });

  bus.emit('session_start', { session: state.sessionNumber });
  mainLoop();
}

document.addEventListener('DOMContentLoaded', init);
