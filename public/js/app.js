// ─── Global state ────────────────────────────────────────────────
const AppState = {
  groupId: null,
  userId: null,
  groupCode: null,
  groupName: null,
  userName: null,
  userColor: null
};

const STORAGE_KEY = 'catpawl_session';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.assign(AppState, data);
  } catch {}
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  Object.keys(AppState).forEach(k => AppState[k] = null);
}

// ─── API helper ──────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`/api${path}`, opts);
  const json = await res.json();

  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// ─── Toast ───────────────────────────────────────────────────────
function showToast(message, type = 'info', durationMs = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✓', error: '✕', info: '◆' };
  toast.innerHTML = `<span style="font-weight:700;font-size:13px;">${icons[type] ?? '◆'}</span> ${message}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-4px)';
    toast.style.transition = 'opacity 0.2s, transform 0.2s';
    setTimeout(() => toast.remove(), 200);
  }, durationMs);
}

// ─── Credits pop animation ────────────────────────────────────────
function showCreditsAnimation(credits, el) {
  const pop = document.createElement('div');
  pop.className = 'credits-pop';
  pop.textContent = `+${credits} ⭐`;

  const rect = el.getBoundingClientRect();
  pop.style.left = `${rect.left + rect.width / 2 - 30}px`;
  pop.style.top = `${rect.top - 10}px`;

  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 1300);
}

// ─── Formatting helpers ───────────────────────────────────────────
function formatAmount(n) {
  return '$' + Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(iso) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = diffMs / 60000;
  const diffHours = diffMs / 3600000;
  const diffDays = diffMs / 86400000;

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${Math.floor(diffMins)} min`;
  if (diffHours < 24) return `hace ${Math.floor(diffHours)} h`;
  if (diffDays < 2) return 'ayer';
  if (diffDays < 7) return `hace ${Math.floor(diffDays)} días`;

  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function formatDaysSince(isoDate) {
  const then = new Date(isoDate);
  const now = new Date();
  return Math.floor((now - then) / 86400000);
}

function getCategoryEmoji(cat) {
  const map = {
    comida: '🍕',
    bebida: '🍺',
    transporte: '🚗',
    alojamiento: '🏠',
    entretenimiento: '🎮',
    compras: '🛒',
    otro: '➕'
  };
  return map[cat] || '➕';
}

function getCategoryLabel(cat) {
  const map = {
    comida: 'Comida',
    bebida: 'Bebida',
    transporte: 'Transporte',
    alojamiento: 'Alojamiento',
    entretenimiento: 'Entrete.',
    compras: 'Compras',
    otro: 'Otro'
  };
  return map[cat] || cat;
}

// ─── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();

  Router.init();
});
