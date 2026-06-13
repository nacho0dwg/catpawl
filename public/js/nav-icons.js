// Dot matrix canvas icons for the bottom nav.
// Each icon = array of [col, row] positions drawn with ctx.arc().
// Canvas size: (maxCol+2)*STEP × (maxRow+2)*STEP  — gives 1-step margin on all sides.
(function () {
  const STEP   = 5;
  const RADIUS = 2;
  const COLOR_ACTIVE   = '#dff466';
  const COLOR_INACTIVE = '#2a3445';

  const ICONS = {
    feed: [
      [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
      [0,1],[5,1],
      [0,2],[5,2],
      [0,3],[5,3],
      [0,4],[1,4],[3,4],[4,4],[5,4],
      [1,5],[2,5],
    ],
    'add-expense': [
      [2,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],
      [0,2],[2,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],
      [2,4],[4,4],
      [0,5],[1,5],[2,5],[3,5],[4,5],
      [2,6],
    ],
    debts: [
      [1,0],[2,0],[3,0],
      [1,1],[3,1],
      [1,2],[2,2],[3,2],
      [0,4],[1,4],[2,4],[3,4],[4,4],
      [0,5],[4,5],
      [0,6],[4,6],
    ],
    summary: [
      [6,0],
      [4,1],[6,1],
      [2,2],[4,2],[5,2],[6,2],
      [2,3],[4,3],[5,3],[6,3],
      [0,4],[2,4],[3,4],[4,4],[5,4],[6,4],
      [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],
    ],
    store: [
      [0,0],[1,0],[2,0],
      [0,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],
      [0,3],[5,3],
      [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],
      [1,6],[4,6],
    ],
  };

  function drawIcon(canvas, route, isActive) {
    const dots = ICONS[route];
    if (!dots || !dots.length) return;

    const maxCol = Math.max(...dots.map(([c]) => c));
    const maxRow = Math.max(...dots.map(([, r]) => r));
    const cssW   = (maxCol + 2) * STEP;
    const cssH   = (maxRow + 2) * STEP;
    const dpr    = window.devicePixelRatio || 1;

    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = isActive ? COLOR_ACTIVE : COLOR_INACTIVE;

    for (const [col, row] of dots) {
      ctx.beginPath();
      ctx.arc(STEP + col * STEP, STEP + row * STEP, RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function updateAllIcons() {
    document.querySelectorAll('#bottom-nav .nav-item[data-route]').forEach(btn => {
      const canvas = btn.querySelector('.nav-dot-icon');
      if (canvas) drawIcon(canvas, btn.dataset.route, btn.classList.contains('active'));
    });
  }

  function init() {
    updateAllIcons();
    const obs = new MutationObserver(updateAllIcons);
    document.querySelectorAll('#bottom-nav .nav-item').forEach(btn => {
      obs.observe(btn, { attributes: true, attributeFilter: ['class'] });
    });
    const nav = document.getElementById('bottom-nav');
    if (nav) obs.observe(nav, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
