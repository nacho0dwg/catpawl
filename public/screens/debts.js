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

  try {
    const { owes, owed } = await api('GET', `/users/${AppState.userId}/debts`);
    renderDebts(owes, owed);
  } catch (e) {
    document.getElementById('debts-content').innerHTML =
      `<div style="color:var(--orange);font-size:13px;padding:20px 0;">${e.message}</div>`;
  }

  function renderDebts(owes, owed) {
    const content = document.getElementById('debts-content');

    if (!owes.length && !owed.length) {
      content.innerHTML = `
        <div class="empty-state">
          <div style="opacity:.5;">${renderCatSprite({ color: AppState.userColor || 'orange', size: 120, animation: 'on_hind_legs' })}</div>
          <div class="empty-state-title">¡Todo en orden!</div>
          <div class="empty-state-sub">No tenés deudas pendientes. Tu gato está orgulloso.</div>
        </div>
      `;
      return;
    }

    let html = '';

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
                <button class="btn btn-ghost btn-sm mp-btn"
                  data-cbu="${p.to_cbu ? escHtml(p.to_cbu) : ''}"
                  style="color:var(--mint);border-color:var(--mint);">
                  Ir a MP 💸
                </button>
                <button class="btn btn-accent btn-sm confirm-btn"
                  data-id="${p.id}"
                  data-amount="${p.amount}"
                  data-name="${escHtml(p.to_name)}">
                  Pagar
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

    content.innerHTML = html;

    // "Ir a MP" buttons — open Mercado Pago, prefilling the creditor's alias when available
    content.querySelectorAll('.mp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cbu = btn.dataset.cbu;
        const url = cbu
          ? `https://link.mercadopago.com.ar/${encodeURIComponent(cbu)}`
          : 'https://www.mercadopago.com.ar/cobros';
        window.open(url, '_blank');
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
          btn.textContent = 'Pagar';
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
