Router.register('feed', async (screen) => {
  screen.innerHTML = `
    <div style="position:relative;min-height:100%;">
      <div class="feed-bg-cat" id="parallax-cat"></div>

      <div class="feed-header">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div>
            <div style="font-size:11px;color:var(--text2);font-weight:600;text-transform:uppercase;letter-spacing:.08em;">Grupo</div>
            <div style="font-size:20px;font-weight:800;letter-spacing:-.5px;" id="group-name-title">Cargando...</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button class="btn btn-ghost btn-sm" id="copy-code-btn" style="white-space:nowrap;">
              <span id="code-display">...</span>
            </button>
            <button class="btn btn-ghost btn-sm" id="btn-logout" style="width:auto;padding:8px 10px;font-size:15px;" title="Cambiar usuario">⚙</button>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;" id="members-row"></div>
      </div>

      <div id="expenses-list" style="padding:8px 0 8px;">
        <div style="padding:40px 20px;text-align:center;color:var(--text2);">
          <div style="font-size:14px;">Cargando gastos...</div>
        </div>
      </div>
    </div>
  `;

  // Parallax bg cat
  const bgCat = document.getElementById('parallax-cat');
  bgCat.innerHTML = renderCat({ color: AppState.userColor || 'orange', size: 260 });

  const container = document.getElementById('screen-container');
  container.addEventListener('scroll', () => {
    const y = container.scrollTop;
    bgCat.style.transform = `translateY(${y * 0.3}px)`;
  }, { passive: true });

  // Group name + code
  if (AppState.groupName) {
    document.getElementById('group-name-title').textContent = AppState.groupName;
  }
  if (AppState.groupCode) {
    document.getElementById('code-display').textContent = AppState.groupCode;
  }

  // Logout / change user
  document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('¿Cambiar de usuario o grupo?')) {
      clearSession();
      Router.hideNav();
      Router.navigate('onboarding');
    }
  });

  // Copy code
  document.getElementById('copy-code-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(AppState.groupCode || '').then(() => {
      showToast('Código copiado al portapapeles', 'success');
    }).catch(() => {
      showToast(AppState.groupCode, 'info', 5000);
    });
  });

  // Load data
  try {
    const [expenses, members, summary] = await Promise.all([
      api('GET', `/expenses/group/${AppState.groupId}`),
      api('GET', `/groups/${AppState.groupId}/members`),
      api('GET', `/groups/${AppState.groupId}/summary`)
    ]);

    // Build balance map from summary
    const balanceMap = {};
    (summary?.members || []).forEach(m => { balanceMap[m.userId] = m.balance; });

    // Members row — avatar + name + balance
    const membersRow = document.getElementById('members-row');
    membersRow.innerHTML = members.map(m => {
      const bal = balanceMap[m.id] || 0;
      const balColor = bal > 0.01 ? 'var(--mint)' : bal < -0.01 ? 'var(--orange)' : 'var(--text2)';
      const balLabel = Math.abs(bal) < 0.01 ? '✓' : (bal > 0 ? '+' : '') + formatAmount(bal);
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0;">
          ${renderCat({ color: m.cat_color, size: 64 })}
          <div style="font-size:10px;color:var(--text2);max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">${m.nickname}</div>
          <div style="font-size:10px;font-weight:700;color:${balColor};">${balLabel}</div>
        </div>
      `;
    }).join('');

    renderExpenses(expenses, members);
  } catch (e) {
    document.getElementById('expenses-list').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">Error al cargar gastos</div>
        <div class="empty-state-sub">${e.message}</div>
      </div>
    `;
  }

  function renderExpenses(expenses, members) {
    const list = document.getElementById('expenses-list');

    if (!expenses.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div style="opacity:.4;">${renderCat({ color: AppState.userColor || 'orange', size: 120 })}</div>
          <div class="empty-state-title">Sin gastos todavía</div>
          <div class="empty-state-sub">Agregá el primer gasto del grupo y empezá a llevar la cuenta.</div>
        </div>
      `;
      return;
    }

    // Group by date label
    const groups = [];
    let lastLabel = null;

    for (const exp of expenses) {
      const label = dateLabel(exp.expense_date);
      if (label !== lastLabel) {
        groups.push({ type: 'header', label });
        lastLabel = label;
      }
      groups.push({ type: 'expense', data: exp });
    }

    list.innerHTML = groups.map(item => {
      if (item.type === 'header') {
        return `<div style="padding:12px 20px 6px;font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;">${item.label}</div>`;
      }
      return renderExpenseCard(item.data);
    }).join('');

    // Delete handler
    list.querySelectorAll('.delete-expense-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (!confirm('¿Eliminar este gasto?')) return;
        try {
          await api('DELETE', `/expenses/${id}`, { user_id: AppState.userId });
          showToast('Gasto eliminado', 'success');
          Router.navigate('feed');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  function renderExpenseCard(exp) {
    const myShare = exp.members.find(m => m.user_id === AppState.userId)
      ? formatAmount(exp.amount / exp.members.length)
      : null;
    const isPayer = exp.payer_id === AppState.userId;

    const memberAvatars = exp.members.slice(0, 4).map(m =>
      `<div class="avatar avatar-sm">${renderCat({ color: m.cat_color, size: 30 })}</div>`
    ).join('');

    const payerHex = (CAT_PALETTES[exp.payer_color] || CAT_PALETTES.orange).body;

    return `
      <div class="expense-card" style="border-left: 2.5px solid ${payerHex}; padding-left: 14px;">
        <div class="avatar avatar-md">${renderCat({ color: exp.payer_color, size: 40 })}</div>
        <div style="min-width:0;">
          <div class="expense-concept">${escHtml(exp.concept)}</div>
          <div class="expense-meta">
            <span class="badge badge-neutral">${getCategoryIcon(exp.category, 20)}${getCategoryLabel(exp.category)}</span>
            <span>${exp.payer_name}</span>
            <span style="color:var(--text3);">·</span>
            <span>${formatDate(exp.expense_date + 'T12:00:00')}</span>
          </div>
          <div style="margin-top:6px;display:flex;gap:4px;" class="avatar-stack">${memberAvatars}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
          <div class="expense-amount">${formatAmount(exp.amount)}</div>
          ${myShare ? `<div class="expense-your-share">te toca ${myShare}</div>` : ''}
          ${isPayer ? `<button class="delete-expense-btn" data-id="${exp.id}"
            style="font-size:11px;color:var(--text3);margin-top:4px;padding:2px 0;">eliminar</button>` : ''}
        </div>
      </div>
    `;
  }

  function dateLabel(isoDate) {
    const d = new Date(isoDate + 'T12:00:00');
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return d.toLocaleDateString('es-AR', { weekday: 'long' });
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
});
