Router.register('summary', async (screen) => {
  screen.innerHTML = `
    <div>
      <div class="screen-header" style="margin-bottom:16px;">
        <div class="screen-title">Resumen</div>
        <button class="btn btn-ghost btn-sm" id="btn-copy-summary">Copiar</button>
      </div>
      <div id="summary-content" style="padding:0 16px;">
        <div style="padding:40px 0;text-align:center;color:var(--text2);font-size:14px;">Cargando...</div>
      </div>
    </div>
  `;

  let summaryData = null;
  let expensesData = [];

  try {
    [summaryData, expensesData] = await Promise.all([
      api('GET', `/groups/${AppState.groupId}/summary`),
      api('GET', `/expenses/group/${AppState.groupId}`)
    ]);
    renderSummary(summaryData, expensesData);
  } catch (e) {
    document.getElementById('summary-content').innerHTML =
      `<div style="color:var(--orange);font-size:13px;padding:20px 0;">${e.message}</div>`;
  }

  document.getElementById('btn-copy-summary').addEventListener('click', () => {
    if (!summaryData) return;
    const text = buildSummaryText(summaryData);
    navigator.clipboard.writeText(text).then(() => {
      showToast('Resumen copiado', 'success');
    }).catch(() => {
      showToast('No se pudo copiar', 'error');
    });
  });

  function buildPieChart(expenses) {
    const CHART_COLORS = {
      comida: '#dff466', bebida: '#ff5714', transporte: '#abddc4',
      alojamiento: '#a08bcb', entretenimiento: '#60a5fa', compras: '#f59e0b', otro: '#444444'
    };

    const totals = {};
    for (const exp of expenses) {
      const cat = exp.category || 'otro';
      totals[cat] = (totals[cat] || 0) + exp.amount;
    }

    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    if (!total) return `
      <div class="section-label">Gastos por categoría</div>
      <div class="card" style="margin-bottom:20px;text-align:center;padding:24px 16px;color:var(--text2);font-size:13px;">
        Agregá gastos para ver el resumen
      </div>
    `;

    const slices = Object.entries(totals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({
        cat, amount,
        pct: amount / total,
        color: CHART_COLORS[cat] || '#444444',
        label: getCategoryLabel(cat)
      }));

    const cx = 60, cy = 60, r = 54;
    const svgSize = 120;
    let paths = '';

    if (slices.length === 1) {
      paths = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${slices[0].color}"/>`;
    } else {
      let angle = -Math.PI / 2;
      for (const s of slices) {
        const sa = angle, ea = angle + s.pct * 2 * Math.PI;
        const laf = s.pct > 0.5 ? 1 : 0;
        const x1 = (cx + r * Math.cos(sa)).toFixed(2);
        const y1 = (cy + r * Math.sin(sa)).toFixed(2);
        const x2 = (cx + r * Math.cos(ea)).toFixed(2);
        const y2 = (cy + r * Math.sin(ea)).toFixed(2);
        paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${laf},1 ${x2},${y2} Z" fill="${s.color}" stroke="var(--bg)" stroke-width="2"/>`;
        angle = ea;
      }
    }

    // Donut hole
    paths += `<circle cx="${cx}" cy="${cy}" r="22" fill="var(--surface)"/>`;

    const legend = slices.map(s => `
      <div style="display:flex;align-items:center;gap:6px;">
        ${getCategoryIcon(s.cat, 18)}
        <span style="font-size:11px;color:var(--text2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.label}</span>
        <span style="font-size:11px;font-weight:700;color:var(--text);">${formatAmount(s.amount)}</span>
      </div>
    `).join('');

    return `
      <div class="section-label">Gastos por categoría</div>
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" style="flex-shrink:0;">${paths}</svg>
          <div style="flex:1;display:flex;flex-direction:column;gap:8px;">${legend}</div>
        </div>
      </div>
    `;
  }

  function renderSummary({ members, transfers, totalSpent }, expenses = []) {
    const content = document.getElementById('summary-content');
    const avgPerPerson = members.length ? totalSpent / members.length : 0;

    // Stats row
    let html = `
      <div style="display:flex;gap:10px;margin-bottom:20px;">
        <div class="stat-card">
          <div class="stat-value">${formatAmount(totalSpent)}</div>
          <div class="stat-label">Total gastado</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatAmount(avgPerPerson)}</div>
          <div class="stat-label">Por persona</div>
        </div>
      </div>
    `;

    // Pie chart
    html += buildPieChart(expenses);

    // Transfers
    if (!transfers.length) {
      html += `
        <div class="card" style="text-align:center;padding:32px 20px;margin-bottom:20px;">
          <div style="opacity:.5;margin-bottom:12px;">${renderCatSprite({ color: 'lavender', size: 80, animation: 'wash_sit' })}</div>
          <div style="font-weight:700;margin-bottom:4px;">¡Todo saldado!</div>
          <div style="font-size:13px;color:var(--text2);">No hay deudas pendientes en el grupo.</div>
        </div>
      `;
    } else {
      html += `<div class="section-label">Plan de liquidación</div>`;
      html += `<div class="card" style="padding:8px 16px;margin-bottom:20px;">`;
      html += transfers.map(t => `
        <div class="transfer-row">
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="avatar avatar-sm">${renderCat({ color: t.fromColor, size: 28 })}</div>
            <span style="font-size:14px;font-weight:600;">${escHtml(t.fromName)}</span>
          </div>
          <div class="transfer-arrow">→</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="avatar avatar-sm">${renderCat({ color: t.toColor, size: 28 })}</div>
            <span style="font-size:14px;font-weight:600;">${escHtml(t.toName)}</span>
          </div>
          <div class="transfer-amount">${formatAmount(t.amount)}</div>
        </div>
      `).join('');
      html += `</div>`;
    }

    // Podium (top 3 by credits)
    const ranked = [...members].sort((a, b) => b.credits - a.credits).slice(0, 3);
    if (ranked.length) {
      html += `<div class="section-label">Ranking de créditos</div>`;
      html += `<div class="card" style="margin-bottom:20px;">`;

      // Podium visual — center=1st, left=2nd, right=3rd
      const podiumOrder = ranked.length >= 3
        ? [ranked[1], ranked[0], ranked[2]]
        : ranked.length === 2
          ? [ranked[1], ranked[0]]
          : [ranked[0]];

      const barClasses = ranked.length >= 3
        ? ['podium-bar-2', 'podium-bar-1', 'podium-bar-3']
        : ranked.length === 2
          ? ['podium-bar-2', 'podium-bar-1']
          : ['podium-bar-1'];

      const rankEmojis = ['🥇', '🥈', '🥉'];
      const rankNums = ranked.length >= 3 ? [1, 0, 2] : ranked.length === 2 ? [1, 0] : [0];

      html += `<div class="podium">`;
      podiumOrder.forEach((m, i) => {
        const rankIdx = rankNums[i];
        html += `
          <div class="podium-item">
            <div style="margin-bottom:4px;">${renderCatSprite({ color: m.cat_color, size: 64, animation: 'meow_sit' })}</div>
            <div class="podium-bar ${barClasses[i]}">
              <span class="podium-rank">${rankEmojis[rankIdx]}</span>
            </div>
            <div class="podium-name">${escHtml(m.nickname)}</div>
            <div class="podium-credits">⭐ ${m.credits}</div>
          </div>
        `;
      });
      html += `</div>`;

      // Full list
      if (members.length > 3) {
        html += `<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">`;
        [...members].sort((a, b) => b.credits - a.credits).slice(3).forEach((m, i) => {
          html += `
            <div style="display:flex;align-items:center;gap:10px;padding:6px 0;">
              <span style="color:var(--text2);font-size:12px;width:16px;text-align:right;">${i + 4}</span>
              <div class="avatar avatar-sm">${renderCat({ color: m.cat_color, size: 28 })}</div>
              <span style="font-size:14px;flex:1;">${escHtml(m.nickname)}</span>
              <span style="color:var(--accent);font-size:13px;font-weight:700;">⭐ ${m.credits}</span>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `</div>`;
    }

    content.innerHTML = html;
  }

  function buildSummaryText({ members, transfers, totalSpent }) {
    const lines = [`CatPawl — Resumen del grupo "${AppState.groupName || ''}"`, ''];
    lines.push(`Total gastado: ${formatAmount(totalSpent)}`);
    lines.push(`Participantes: ${members.length}`);
    lines.push('');
    if (transfers.length) {
      lines.push('Quién le paga a quién:');
      transfers.forEach(t => {
        lines.push(`  ${t.fromName} → ${t.toName}: ${formatAmount(t.amount)}`);
      });
    } else {
      lines.push('¡Todo saldado! No hay deudas pendientes.');
    }
    lines.push('');
    lines.push('Generado con CatPawl 🐱');
    return lines.join('\n');
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
});
