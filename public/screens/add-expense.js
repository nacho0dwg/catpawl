Router.register('add-expense', async (screen) => {
  const CATEGORIES = [
    { key: 'comida',          label: 'Comida' },
    { key: 'bebida',          label: 'Bebida' },
    { key: 'transporte',      label: 'Transporte' },
    { key: 'alojamiento',     label: 'Aloj.' },
    { key: 'entretenimiento', label: 'Entrete.' },
    { key: 'compras',         label: 'Compras' },
    { key: 'farmacia',        label: 'Farmacia' },
    { key: 'mascota',         label: 'Mascota' },
    { key: 'regalos',         label: 'Regalos' },
    { key: 'musica',          label: 'Música' },
    { key: 'deportes',        label: 'Deportes' },
    { key: 'juegos',          label: 'Juegos' },
    { key: 'tecnologia',      label: 'Tecnol.' },
    { key: 'cocteles',        label: 'Cócteles' },
    { key: 'cine',            label: 'Cine' },
    { key: 'avion',           label: 'Avión' },
    { key: 'otro',            label: 'Otro' },
  ];

  let selectedCategory = 'otro';
  let selectedMembers = new Set();
  let members = [];
  let amountRaw = '';

  const today = new Date().toISOString().slice(0, 10);

  // ── Date picker ───────────────────────────────────────────────────
  let selectedDate = new Date(today + 'T12:00:00');
  let dpYear = selectedDate.getFullYear();
  let dpMonth = selectedDate.getMonth();

  const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const MONTHS_SHORT_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const DAYS_SHORT_ES = ['dom','lun','mar','mié','jue','vie','sáb'];

  function formatDateDisplay(d) {
    return DAYS_SHORT_ES[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_SHORT_ES[d.getMonth()];
  }

  function formatDateISO(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function openDatePicker() {
    document.getElementById('date-picker-overlay')?.remove();
    dpYear = selectedDate.getFullYear();
    dpMonth = selectedDate.getMonth();

    const overlay = document.createElement('div');
    overlay.id = 'date-picker-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.55);';
    overlay.innerHTML = `
      <div id="dp-card" style="
        background:var(--surface);border:1px solid var(--border2);
        border-radius:20px 20px 0 0;padding:0 20px 36px;
        width:100%;max-width:430px;
        transform:translateY(100%);
        transition:transform 0.26s cubic-bezier(0.32,0.72,0,1);
      ">
        <div style="width:40px;height:4px;background:var(--border2);border-radius:2px;margin:14px auto 20px;"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding:0 4px;">
          <button id="dp-prev" style="width:32px;height:32px;border-radius:50%;background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;line-height:1;">‹</button>
          <span id="dp-title" style="font-size:15px;font-weight:700;color:var(--text);"></span>
          <button id="dp-next" style="width:32px;height:32px;border-radius:50%;background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;line-height:1;">›</button>
        </div>
        <div id="dp-weekdays" style="display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:8px;"></div>
        <div id="dp-days" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const weekdaysEl = document.getElementById('dp-weekdays');
    ['L','M','M','J','V','S','D'].forEach(h => {
      const el = document.createElement('div');
      el.style.cssText = 'text-align:center;font-size:11px;font-weight:700;color:var(--text2);padding:4px 0;';
      el.textContent = h;
      weekdaysEl.appendChild(el);
    });

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const card = document.getElementById('dp-card');
      if (card) card.style.transform = 'translateY(0)';
    }));

    function renderDpCalendar() {
      const title = document.getElementById('dp-title');
      const grid  = document.getElementById('dp-days');
      if (!title || !grid) return;

      title.textContent = MONTHS_ES[dpMonth] + ' ' + dpYear;

      const todayD   = new Date(today + 'T12:00:00');
      const firstDay = new Date(dpYear, dpMonth, 1);
      const lastDay  = new Date(dpYear, dpMonth + 1, 0).getDate();
      const offset0  = (firstDay.getDay() + 6) % 7;
      const prevLast = new Date(dpYear, dpMonth, 0).getDate();
      const isoSel   = formatDateISO(selectedDate);
      const isoToday = formatDateISO(todayD);

      const cells = [];
      for (let i = offset0 - 1; i >= 0; i--) cells.push({ day: prevLast - i, mo: -1 });
      for (let d = 1; d <= lastDay; d++)         cells.push({ day: d, mo:  0 });
      const rem = (7 - cells.length % 7) % 7;
      for (let d = 1; d <= rem; d++)              cells.push({ day: d, mo:  1 });

      grid.innerHTML = '';
      cells.forEach(({ day, mo }) => {
        const cd  = new Date(dpYear, dpMonth + mo, day, 12);
        const iso = formatDateISO(cd);
        const isSel    = iso === isoSel;
        const isDToday = iso === isoToday;
        const isFuture = iso > isoToday;
        const isOther  = mo !== 0;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = day;
        btn.dataset.date = iso;

        const bg  = isSel ? 'var(--accent)' : 'transparent';
        const bdr = isDToday && !isSel ? '1.5px solid var(--accent)' : 'none';
        const fg  = isSel ? '#0a0a0a' : (isOther || isFuture) ? 'var(--text3)' : 'var(--text)';
        const fw  = isSel ? '700' : '400';

        btn.style.cssText = 'display:flex;align-items:center;justify-content:center;' +
          'aspect-ratio:1;border-radius:50%;font-size:13px;font-family:inherit;' +
          'font-weight:' + fw + ';background:' + bg + ';border:' + bdr + ';' +
          'color:' + fg + ';cursor:' + (isFuture && !isOther ? 'default' : 'pointer') + ';';

        if (isFuture && !isOther) btn.disabled = true;

        btn.addEventListener('click', () => {
          const [y, m, d] = iso.split('-').map(Number);
          selectedDate = new Date(y, m - 1, d, 12);
          const disp = document.getElementById('date-display');
          if (disp) disp.textContent = formatDateDisplay(selectedDate);
          closeDatePicker();
        });

        grid.appendChild(btn);
      });
    }

    renderDpCalendar();
    overlay.addEventListener('click', e => { if (e.target === overlay) closeDatePicker(); });
    document.getElementById('dp-prev').addEventListener('click', () => {
      if (--dpMonth < 0) { dpMonth = 11; dpYear--; }
      renderDpCalendar();
    });
    document.getElementById('dp-next').addEventListener('click', () => {
      if (++dpMonth > 11) { dpMonth = 0; dpYear++; }
      renderDpCalendar();
    });
  }

  function closeDatePicker() {
    const ov = document.getElementById('date-picker-overlay');
    if (!ov) return;
    const card = ov.querySelector('#dp-card');
    if (card) { card.style.transform = 'translateY(100%)'; setTimeout(() => ov.remove(), 260); }
    else ov.remove();
  }
  // ─────────────────────────────────────────────────────────────────

  screen.innerHTML = `
    <div class="add-screen">
      <div style="font-size:20px;font-weight:800;letter-spacing:-.5px;">Nuevo gasto</div>

      <!-- Amount -->
      <div>
        <div class="input-label">Monto</div>
        <div class="amount-tap-area" id="amount-tap">
          <div class="amount-display">
            <span class="currency">$</span>
            <span id="amount-display-text">0</span>
          </div>
          <input class="amount-input-hidden" id="amount-input" type="number" min="0" step="any" inputmode="decimal" />
        </div>
      </div>

      <!-- Concept -->
      <div class="input-group">
        <label class="input-label" for="concept">Concepto</label>
        <input class="input" id="concept" type="text" placeholder="Ej: Pizza en Lo de Carlitos" maxlength="60" autocomplete="off" />
      </div>

      <!-- Category -->
      <div>
        <div class="input-label" style="margin-bottom:8px;">Categoría</div>
        <div class="category-grid">
          ${CATEGORIES.map(c => `
            <button class="category-chip ${c.key === selectedCategory ? 'active' : ''}" data-cat="${c.key}">
              ${getCategoryIcon(c.key, 24)}
              <span>${c.label}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Date -->
      <div class="input-group">
        <div class="input-label">Fecha del gasto</div>
        <button type="button" id="date-trigger" class="input" style="text-align:left;display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
          <span id="date-display">${formatDateDisplay(selectedDate)}</span>
          <span style="color:var(--text2);font-size:12px;pointer-events:none;">▾</span>
        </button>
      </div>

      <!-- Members -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div class="input-label" style="margin-bottom:0;">¿Quién participó?</div>
          <button style="font-size:12px;color:var(--accent);font-weight:600;" id="btn-select-all">Todos</button>
        </div>
        <div id="members-list" style="display:flex;flex-direction:column;gap:8px;">
          <div style="color:var(--text2);font-size:14px;">Cargando...</div>
        </div>
      </div>

      <!-- Per-person preview -->
      <div id="share-preview" style="display:none;background:var(--surface);border:1px solid var(--border2);border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:13px;color:var(--text2);">Por persona</span>
        <span style="font-size:16px;font-weight:700;color:var(--accent);" id="per-person-amount">$0</span>
      </div>

      <button class="btn btn-accent" id="btn-submit" style="margin-top:auto;">Agregar gasto</button>
    </div>
  `;

  // Amount tap
  const amountTap = document.getElementById('amount-tap');
  const amountInput = document.getElementById('amount-input');
  const amountText = document.getElementById('amount-display-text');

  amountTap.addEventListener('click', () => amountInput.focus());
  amountInput.addEventListener('input', () => {
    amountRaw = amountInput.value;
    const n = parseFloat(amountRaw);
    amountText.textContent = isNaN(n) ? '0' : n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    updateSharePreview();
  });

  // Category
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedCategory = chip.dataset.cat;
      document.querySelectorAll('.category-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === selectedCategory));
    });
  });

  // Date trigger
  document.getElementById('date-trigger').addEventListener('click', openDatePicker);

  // Cleanup date picker on navigation
  const _dpParent = screen.parentElement;
  if (_dpParent) {
    const _dpObs = new MutationObserver(() => {
      if (!screen.isConnected) { document.getElementById('date-picker-overlay')?.remove(); _dpObs.disconnect(); }
    });
    _dpObs.observe(_dpParent, { childList: true });
  }

  // Load members
  try {
    members = await api('GET', `/groups/${AppState.groupId}/members`);
    selectedMembers = new Set(members.map(m => m.id)); // default: all selected

    renderMembersList();

    document.getElementById('btn-select-all').addEventListener('click', () => {
      const allSelected = selectedMembers.size === members.length;
      if (allSelected) {
        // keep at least the payer
        selectedMembers = new Set([AppState.userId]);
      } else {
        selectedMembers = new Set(members.map(m => m.id));
      }
      renderMembersList();
      updateSharePreview();
    });
  } catch (e) {
    document.getElementById('members-list').innerHTML = `<div style="color:var(--orange);font-size:13px;">${e.message}</div>`;
  }

  function renderMembersList() {
    const list = document.getElementById('members-list');
    list.innerHTML = members.map(m => `
      <div class="member-chip ${selectedMembers.has(m.id) ? 'active' : ''}" data-uid="${m.id}">
        <div class="avatar avatar-sm">${renderCat({ color: m.cat_color, size: 28 })}</div>
        <span style="font-size:14px;font-weight:600;">${escHtml(m.nickname)}</span>
        ${m.id === AppState.userId ? `<span class="badge badge-accent" style="font-size:10px;">vos</span>` : ''}
        <div class="check">${selectedMembers.has(m.id) ? '✓' : ''}</div>
      </div>
    `).join('');

    list.querySelectorAll('.member-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const uid = chip.dataset.uid;
        if (selectedMembers.has(uid)) {
          if (selectedMembers.size <= 1) return; // at least one
          selectedMembers.delete(uid);
        } else {
          selectedMembers.add(uid);
        }
        renderMembersList();
        updateSharePreview();
      });
    });
  }

  function updateSharePreview() {
    const n = parseFloat(amountRaw) || 0;
    const count = selectedMembers.size;
    const preview = document.getElementById('share-preview');
    const perPerson = document.getElementById('per-person-amount');

    if (n > 0 && count > 0) {
      preview.style.display = 'flex';
      perPerson.textContent = formatAmount(n / count);
    } else {
      preview.style.display = 'none';
    }
  }

  // Submit
  document.getElementById('btn-submit').addEventListener('click', async () => {
    const amount = parseFloat(amountRaw);
    const concept = document.getElementById('concept').value.trim();
    const expenseDate = formatDateISO(selectedDate);

    if (!amount || amount <= 0) { showToast('Ingresá un monto válido', 'error'); return; }
    if (!concept) { showToast('Ingresá un concepto', 'error'); return; }
    if (selectedMembers.size === 0) { showToast('Seleccioná al menos un participante', 'error'); return; }

    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      await api('POST', '/expenses', {
        group_id: AppState.groupId,
        payer_id: AppState.userId,
        amount,
        concept,
        category: selectedCategory,
        expense_date: expenseDate,
        member_ids: Array.from(selectedMembers)
      });

      showToast('Gasto agregado', 'success');
      Router.navigate('feed');
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Agregar gasto';
    }
  });

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
});
