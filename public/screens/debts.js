Router.register('debts', async (screen) => {
  screen.innerHTML = `
    <div>
      <div class="screen-header" style="margin-bottom:16px;">
        <div class="screen-title">Deudas</div>
      </div>
      <div id="debts-content" style="padding:0 16px;">
        <div style="padding:40px 0;text-align:center;color:var(--text2);font-size:14px;">Cargando...</div>
      </div>
    </div>
  `;

  let isFirstLoad = true;

  async function load() {
    try {
      const [{ owes, owed }, history, externals] = await Promise.all([
        api('GET', `/users/${AppState.userId}/debts`),
        api('GET', `/users/${AppState.userId}/payments-history`),
        api('GET', `/expenses/group/${AppState.groupId}/with-externals?userId=${AppState.userId}`)
      ]);
      renderDebts(owes, owed, history, externals);
    } catch (e) {
      // Only surface errors on the first load; silent refreshes keep the last good view
      if (isFirstLoad) {
        document.getElementById('debts-content').innerHTML =
          `<div style="color:var(--orange);font-size:13px;padding:20px 0;">${e.message}</div>`;
      }
    } finally {
      isFirstLoad = false;
    }
  }

  await load();

  // Silent auto-refresh every 30s; stop when the screen leaves the DOM
  const _refresh = setInterval(load, 30000);
  const _refreshParent = screen.parentElement;
  if (_refreshParent) {
    const _refreshObs = new MutationObserver(() => {
      if (!screen.isConnected) { clearInterval(_refresh); _refreshObs.disconnect(); }
    });
    _refreshObs.observe(_refreshParent, { childList: true });
  }

  function renderDebts(owes, owed, history, externals) {
    const content = document.getElementById('debts-content');

    let html = '';

    if (!owes.length && !owed.length) {
      html += `
        <div class="empty-state">
          <img src="https://media.tenor.com/DCm4DNbMlJMAAAAd/emoji-mate.gif" alt="mate" style="width:150px;height:150px;object-fit:contain;" onerror="this.outerHTML='<iframe src=\\'https://tenor.com/embed/5995996843990285223\\' width=\\'150\\' height=\\'150\\' frameborder=\\'0\\'></iframe>'">
          <div style="font-size:18px;color:var(--text2);margin-top:12px;text-align:center;">Todo al día 🧉</div>
        </div>
      `;
    }

    if (owes.length) {
      html += `<div class="section-label">Debés</div>`;
      html += `<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px;">`;
      html += owes.map(p => {
        const days = formatDaysSince(p.created_at);
        const isUrgent = days >= 3;
        return `
          <div class="debt-item" style="${isUrgent ? 'background:rgba(255,87,20,.04);' : ''}">
            <div class="avatar avatar-md">${renderCat({ color: p.to_color, size: 40 })}</div>
            <div class="debt-info">
              <div class="debt-name">${escHtml(p.to_name)}</div>
              <div class="debt-days">${daysLabel(days)}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
              <div class="pill-debt">${formatAmount(p.amount)}</div>
              <div style="display:flex;gap:6px;">
                ${p.to_cbu ? `
                <button class="btn btn-ghost btn-sm copy-alias-btn"
                  data-cbu="${escHtml(p.to_cbu)}">
                  Copiar alias
                </button>` : ''}
                <button class="btn btn-ghost btn-sm mp-btn"
                  data-cbu="${p.to_cbu ? escHtml(p.to_cbu) : ''}"
                  style="color:var(--mint);border-color:var(--mint);">
                  Pagar 💸
                </button>
                <button class="btn btn-accent btn-sm confirm-btn"
                  data-id="${p.id}"
                  data-amount="${p.amount}"
                  data-name="${escHtml(p.to_name)}">
                  Ya pagué
                </button>
              </div>
            </div>
            ${isUrgent ? `<div class="debt-thief">${renderThiefCat(days)}</div>` : ''}
          </div>
        `;
      }).join('');
      html += `</div>`;
    }

    if (owed.length) {
      html += `<div class="section-label">Te deben</div>`;
      html += `<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px;">`;
      html += owed.map(p => `
        <div class="debt-item">
          <div class="avatar avatar-md">${renderCat({ color: p.from_color, size: 40 })}</div>
          <div class="debt-info">
            <div class="debt-name">${escHtml(p.from_name)}</div>
            <div class="debt-days">${formatDaysSince(p.created_at) === 0 ? 'Hoy' : `hace ${formatDaysSince(p.created_at)} día${formatDaysSince(p.created_at) !== 1 ? 's' : ''}`}</div>
          </div>
          <div class="pill-credit">${formatAmount(p.amount)}</div>
        </div>
      `).join('');
      html += `</div>`;
    }

    if (externals && externals.length) {
      const pendingExternals = externals.filter(e => !e.paid);
      const paidExternals = externals.filter(e => e.paid);

      // Group pending externals by name
      const pendingGrouped = {};
      for (const ext of pendingExternals) {
        if (!pendingGrouped[ext.external_name]) {
          pendingGrouped[ext.external_name] = { name: ext.external_name, total: 0, concepts: [], items: [] };
        }
        pendingGrouped[ext.external_name].total += ext.external_share;
        pendingGrouped[ext.external_name].concepts.push(ext.concept);
        pendingGrouped[ext.external_name].items.push(ext);
      }

      const pendingGroups = Object.values(pendingGrouped);

      if (pendingGroups.length) {
        html += `<div class="section-label">Externos</div>`;
        html += `<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px;">`;
        html += pendingGroups.map((grp, idx) => `
          <div class="debt-item">
            <div style="font-size:24px;width:40px;text-align:center;">👤</div>
            <div class="debt-info">
              <div class="debt-name">${escHtml(grp.name)}</div>
              <div class="debt-days">${grp.concepts.map(c => escHtml(c)).join(', ')}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
              <div class="pill-debt" style="background:var(--orange);color:#fff;">${formatAmount(grp.total)}</div>
              <button class="btn btn-accent btn-sm confirm-external-group-btn"
                data-group-idx="${idx}">
                Ya me pagó ✓
              </button>
            </div>
          </div>
        `).join('');
        html += `</div>`;

        // Store grouped data for event handler
        content._pendingGroups = pendingGroups;
      }

      // Group paid externals by name
      const paidGrouped = {};
      for (const ext of paidExternals) {
        if (!paidGrouped[ext.external_name]) {
          paidGrouped[ext.external_name] = { name: ext.external_name, total: 0, concepts: [] };
        }
        paidGrouped[ext.external_name].total += ext.external_share;
        paidGrouped[ext.external_name].concepts.push(ext.concept);
      }

      const paidGroups = Object.values(paidGrouped);

      if (paidGroups.length) {
        html += `<div class="section-label" style="color:var(--text3);">Externos pagados</div>`;
        html += `<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px;background:transparent;">`;
        html += paidGroups.map(grp => `
          <div class="debt-item" style="background:transparent;opacity:0.5;">
            <div style="font-size:24px;width:40px;text-align:center;">👤</div>
            <div class="debt-info">
              <div class="debt-name" style="text-decoration:line-through;color:var(--text3);">${escHtml(grp.name)}</div>
              <div class="debt-days" style="color:var(--text3);">${grp.concepts.map(c => escHtml(c)).join(', ')}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="text-decoration:line-through;color:var(--text3);font-size:14px;">${formatAmount(grp.total)}</span>
              <span style="color:var(--mint);font-weight:700;font-size:15px;">✓</span>
            </div>
          </div>
        `).join('');
        html += `</div>`;
      }
    }

    if (history && history.length) {
      html += `<div class="section-label">Historial</div>`;
      html += `<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px;background:transparent;">`;
      html += history.map(p => {
        const iPaid = p.from_user === AppState.userId;
        const otherName = iPaid ? p.to_name : p.from_name;
        const otherColor = iPaid ? p.to_color : p.from_color;
        const label = iPaid ? `Le pagaste a ${escHtml(otherName)}` : `${escHtml(otherName)} te pagó`;
        return `
          <div class="debt-item" style="background:transparent;">
            <div class="avatar avatar-md" style="opacity:.4;">${renderCat({ color: otherColor, size: 40 })}</div>
            <div class="debt-info">
              <div class="debt-name" style="color:var(--text2);">${label}</div>
              <div class="debt-days" style="color:var(--text3);">${formatDate(String(p.created_at).replace(' ', 'T'))}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="text-decoration:line-through;color:var(--text3);font-size:14px;">${formatAmount(p.amount)}</span>
              <span style="color:var(--mint);font-weight:700;font-size:15px;">✓</span>
            </div>
          </div>
        `;
      }).join('');
      html += `</div>`;
    }

    content.innerHTML = html;

    // "Ir a MP" buttons — open Mercado Pago, prefilling the creditor's alias when available
    content.querySelectorAll('.mp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cbu = btn.dataset.cbu;
        if (!cbu) {
          showToast('Este usuario no tiene alias de MP cargado', 'error');
          return;
        }
        window.open(`mercadopago://send?alias=${encodeURIComponent(cbu)}`, '_blank');
      });
    });

    // "Copiar alias" buttons — copy the creditor's MP alias to the clipboard
    content.querySelectorAll('.copy-alias-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cbu = btn.dataset.cbu;
        navigator.clipboard.writeText(cbu);
        showToast(`Alias copiado: ${cbu}`, 'success');
      });
    });

    // Confirm payment buttons
    content.querySelectorAll('.confirm-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const paymentId = btn.dataset.id;
        const name = btn.dataset.name;
        const amount = btn.dataset.amount;

        btn.disabled = true;
        btn.textContent = '...';

        try {
          const result = await api('POST', `/expenses/payments/${paymentId}/confirm`);

          if (result.credits_earned > 0) {
            showCreditsAnimation(result.credits_earned, btn);
            showToast(`Pago confirmado. +${result.credits_earned} créditos`, 'success');
          } else {
            showToast(`Pago a ${name} confirmado`, 'success');
          }

          // Reload
          setTimeout(() => Router.navigate('debts'), 600);
        } catch (e) {
          showToast(e.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Ya pagué';
        }
      });
    });

    // Confirm external payment buttons (grouped)
    content.querySelectorAll('.confirm-external-group-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const groupIdx = parseInt(btn.dataset.groupIdx, 10);
        const groups = content._pendingGroups;
        if (!groups || !groups[groupIdx]) return;

        const grp = groups[groupIdx];
        btn.disabled = true;
        btn.textContent = '...';

        try {
          // Confirm all items in this group
          for (const ext of grp.items) {
            await api('POST', `/expenses/${ext.expense_id}/external-payment`, {
              external_name: ext.external_name,
              amount: ext.external_share
            });
          }
          showToast(`Pago de ${grp.name} confirmado`, 'success');
          setTimeout(() => load(), 300);
        } catch (e) {
          showToast(e.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Ya me pagó ✓';
        }
      });
    });
  }

  function daysLabel(days) {
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Hace 1 día';
    if (days < 3) return `Hace ${days} días`;
    if (days < 7) return `⚠️ Hace ${days} días — ¡tu gato ladrón crece!`;
    return `🚨 Hace ${days} días — ¡pagá ya!`;
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
});
