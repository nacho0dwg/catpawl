Router.register('store', async (screen) => {
  const STORE_ITEMS = [
    // Sombreros
    { id: 'hat_cap',          type: 'hat',       value: 'cap',         name: 'Gorra urbana',         price:  80, emoji: '🧢',  section: 'hats' },
    { id: 'hat_chef',         type: 'hat',       value: 'chef',        name: 'Gorro de chef',        price: 100, emoji: '👨‍🍳', section: 'hats' },
    { id: 'hat_crown',        type: 'hat',       value: 'crown',       name: 'Corona real',          price: 150, emoji: '👑',  section: 'hats' },
    // Lazos
    { id: 'acc_bow',          type: 'accessory', value: 'bow',         name: 'Lazo rosa',            price: 110, emoji: '🎀',  section: 'bows' },
    { id: 'acc_bow_gold',     type: 'accessory', value: 'bow_gold',    name: 'Lazo dorado',          price:  90, emoji: '🎀',  section: 'bows' },
    { id: 'acc_bow_red',      type: 'accessory', value: 'bow_red',     name: 'Lazo rojo',            price:  90, emoji: '🎀',  section: 'bows' },
    { id: 'acc_bow_blue',     type: 'accessory', value: 'bow_blue',    name: 'Lazo azul ribbon',     price: 140, emoji: '🎀',  section: 'bows' },
    { id: 'acc_bow_green',    type: 'accessory', value: 'bow_green',   name: 'Lazo verde ribbon',    price: 140, emoji: '🎀',  section: 'bows' },
    { id: 'acc_bow_pink2',    type: 'accessory', value: 'bow_pink2',   name: 'Lazo rosa ribbon',     price: 140, emoji: '🎀',  section: 'bows' },
    // Accesorios
    { id: 'acc_collar',       type: 'accessory', value: 'collar',      name: 'Collar con campana',   price: 100, emoji: '🔔',  section: 'accs' },
    { id: 'acc_patch',        type: 'accessory', value: 'patch',       name: 'Parche pirata',        price: 150, emoji: '🏴‍☠️',  section: 'accs' },
    { id: 'acc_glasses_gold', type: 'accessory', value: 'glasses_gold',name: 'Gafas corazón doradas',price: 160, emoji: '🤩',  section: 'accs' },
    { id: 'acc_glasses_red',  type: 'accessory', value: 'glasses_red', name: 'Gafas corazón rojas',  price: 160, emoji: '😍',  section: 'accs' },
    // Especiales
    { id: 'acc_nimbus',       type: 'accessory', value: 'nimbus',      name: 'Aureola',              price: 220, emoji: '😇',  section: 'special' },
    { id: 'acc_wings',        type: 'accessory', value: 'wings',       name: 'Alas de ángel',        price: 280, emoji: '🪽',  section: 'special' },
    { id: 'acc_cupid',        type: 'accessory', value: 'cupid',       name: 'Set cupido',           price: 380, emoji: '💘',  section: 'special' },
  ];

  let user = null;
  let openSections = null;

  const PNG_ACCESSORIES = new Set(['bow','collar','bow_gold','bow_red','bow_blue','bow_green','bow_pink2','glasses_gold','glasses_red','wings','nimbus','cupid']);
  const HAT_PNGS = new Set(['crown','chef','cap']);

  screen.innerHTML = `
    <div>
      <div class="screen-header" style="margin-bottom:16px;">
        <div class="screen-title">Tienda</div>
        <div id="credits-badge" class="badge badge-accent" style="font-size:13px;padding:6px 12px;">
          ⭐ ...
        </div>
      </div>

      <div style="padding:0 16px;">
        <div id="cat-preview-store" style="display:flex;justify-content:center;padding:16px 0 8px;"></div>
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:12px;color:var(--text2);">Así se ve tu gato</div>
        </div>

        <div id="store-sections" style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;"></div>

        <div style="padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:12px;text-align:center;margin-bottom:20px;">
          <div style="font-size:12px;color:var(--text2);margin-bottom:4px;">¿Cómo ganar créditos?</div>
          <div style="font-size:13px;line-height:1.7;">
            Pagá en <strong style="color:var(--accent);">menos de 24h → +15 ⭐</strong><br>
            Pagá en <strong style="color:var(--mint);">1–3 días → +5 ⭐</strong><br>
            Más de 3 días → +0 ⭐<br>
            <strong style="color:var(--orange);">Más de 14 días → −10 ⭐</strong>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    user = await api('GET', `/users/${AppState.userId}`);
    renderStore();
  } catch (e) {
    showToast(e.message, 'error');
  }

  function renderCatWithEquipment(color, size, hat, accessory, animation = 'meow_stand') {
    const pngHat = HAT_PNGS.has(hat) ? hat : null;
    const pngAcc = PNG_ACCESSORIES.has(accessory) ? accessory : null;

    // PNG layers: hat first (underneath), then accessory on top
    const layers = [pngHat, pngAcc].filter(Boolean);
    if (layers.length) {
      return renderCatSpriteMulti({ color, animation, size, accessories: layers });
    }

    // Patch: emoji overlay on cat face (only remaining non-PNG item)
    if (accessory === 'patch') {
      const catHtml = renderCatSprite({ color, animation, size });
      const fs = Math.round(size * 0.36);
      return `<div style="position:relative;width:${size}px;height:${size}px;display:inline-block;flex-shrink:0;">
        ${catHtml}
        <div style="position:absolute;top:${Math.round(size*0.26)}px;left:${Math.round(size*0.06)}px;font-size:${fs}px;line-height:1;pointer-events:none;z-index:1;">🏴‍☠️</div>
      </div>`;
    }

    return renderCatSprite({ color, animation, size });
  }

  function renderStore() {
    document.getElementById('credits-badge').textContent = `⭐ ${user.credits}`;
    updateCatPreview();
    buildAccordion();
  }

  function buildAccordion() {
    const SECTIONS = [
      { id: 'hats',    label: 'Sombreros' },
      { id: 'bows',    label: 'Lazos' },
      { id: 'accs',    label: 'Accesorios' },
      { id: 'special', label: 'Especiales' },
    ];

    // First visit: open sections that have an equipped item; fallback to hats
    if (openSections === null) {
      openSections = new Set();
      for (const sec of SECTIONS) {
        if (STORE_ITEMS.filter(i => i.section === sec.id).some(i => isOwned(i))) {
          openSections.add(sec.id);
        }
      }
      if (openSections.size === 0) openSections.add('hats');
    }

    const container = document.getElementById('store-sections');
    container.innerHTML = SECTIONS.map(sec =>
      '<div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;">' +
        '<button id="acc-hdr-' + sec.id + '" style="width:100%;border:none;background:var(--surface2);display:flex;align-items:center;justify-content:space-between;padding:12px 16px;cursor:pointer;">' +
          '<span style="font-size:12px;color:var(--text2);font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">' + sec.label + '</span>' +
          '<span id="acc-chevron-' + sec.id + '" style="color:var(--text2);display:block;line-height:1;font-size:16px;">▾</span>' +
        '</button>' +
        '<div id="acc-body-' + sec.id + '" style="max-height:0;overflow:hidden;">' +
          '<div id="' + sec.id + '-list" style="padding:0 0 8px;"></div>' +
        '</div>' +
      '</div>'
    ).join('');

    renderSection('hats-list',    STORE_ITEMS.filter(i => i.section === 'hats'));
    renderSection('bows-list',    STORE_ITEMS.filter(i => i.section === 'bows'));
    renderSection('accs-list',    STORE_ITEMS.filter(i => i.section === 'accs'));
    renderSection('special-list', STORE_ITEMS.filter(i => i.section === 'special'));

    // Set initial open/closed without animation
    SECTIONS.forEach(sec => {
      const body    = document.getElementById('acc-body-' + sec.id);
      const chevron = document.getElementById('acc-chevron-' + sec.id);
      if (!body) return;
      const isOpen = openSections.has(sec.id);
      body.style.maxHeight = isOpen ? body.scrollHeight + 'px' : '0';
      if (chevron) chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    // Enable transitions after initial paint
    requestAnimationFrame(() => requestAnimationFrame(() => {
      SECTIONS.forEach(sec => {
        const body    = document.getElementById('acc-body-' + sec.id);
        const chevron = document.getElementById('acc-chevron-' + sec.id);
        if (body)    body.style.transition    = 'max-height 0.3s ease';
        if (chevron) chevron.style.transition = 'transform 0.3s ease';
      });
    }));

    // Click handlers
    SECTIONS.forEach(sec => {
      const hdr = document.getElementById('acc-hdr-' + sec.id);
      if (!hdr) return;
      hdr.addEventListener('click', () => {
        const body    = document.getElementById('acc-body-' + sec.id);
        const chevron = document.getElementById('acc-chevron-' + sec.id);
        if (!body) return;
        const isOpen = openSections.has(sec.id);
        if (isOpen) {
          body.style.maxHeight = '0';
          if (chevron) chevron.style.transform = 'rotate(0deg)';
          openSections.delete(sec.id);
        } else {
          body.style.maxHeight = body.scrollHeight + 'px';
          if (chevron) chevron.style.transform = 'rotate(180deg)';
          openSections.add(sec.id);
        }
      });
    });
  }

  function updateCatPreview(previewItem) {
    const hat = previewItem ? (previewItem.type === 'hat' ? previewItem.value : null) : user.hat;
    const acc = previewItem ? (previewItem.type === 'accessory' ? previewItem.value : null) : user.cat_accessory;
    document.getElementById('cat-preview-store').innerHTML =
      renderCatWithEquipment(user.cat_color, 120, hat, acc);
  }

  function isOwned(item) {
    if (item.type === 'hat') return user.hat === item.value;
    if (item.type === 'accessory') return user.cat_accessory === item.value;
    return false;
  }

  function renderSection(containerId, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map(item => {
      const owned = isOwned(item);
      const previewHat = item.type === 'hat' ? item.value : null;
      const previewAcc = item.type === 'accessory' ? item.value : null;
      return `
        <div class="store-item ${owned ? 'owned' : ''}" data-item-id="${item.id}" style="cursor:pointer;">
          <div style="flex-shrink:0;overflow:visible;">
            ${renderCatWithEquipment(user.cat_color, 48, previewHat, previewAcc)}
          </div>
          <div class="store-item-info">
            <div class="store-item-name">${item.emoji || ''} ${item.name}</div>
            <div class="store-item-price" ${owned ? 'style="color:var(--accent);"' : ''}>
              ${owned ? '✓ Equipado' : `⭐ ${item.price} créditos`}
            </div>
          </div>
          <div style="font-size:20px;color:var(--text3);flex-shrink:0;line-height:1;">›</div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.store-item').forEach(el => {
      el.addEventListener('click', () => {
        const item = items.find(i => i.id === el.dataset.itemId);
        if (item) openItemModal(item);
      });
    });
  }

  function openItemModal(item) {
    document.getElementById('store-item-modal')?.remove();

    const owned = isOwned(item);
    const canAfford = user.credits >= item.price;
    const missing = item.price - user.credits;
    const previewHat = item.type === 'hat' ? item.value : null;
    const previewAcc = item.type === 'accessory' ? item.value : null;
    const preview = renderCatWithEquipment(user.cat_color, 150, previewHat, previewAcc);

    let actionHtml;
    if (owned) {
      actionHtml = `
        <div style="font-size:13px;color:var(--accent);font-weight:600;margin-bottom:8px;text-align:center;">✓ Ya lo tenés equipado</div>
        <button id="modal-unequip" class="btn btn-ghost" style="width:100%;height:44px;font-size:14px;">Quitar accesorio</button>
      `;
    } else if (canAfford) {
      actionHtml = `
        <button id="modal-buy" class="btn btn-accent" style="width:100%;height:48px;font-size:15px;font-weight:700;">
          Comprar · ⭐ ${item.price}
        </button>
      `;
    } else {
      actionHtml = `
        <div style="color:var(--orange,#f28b3b);font-size:13px;font-weight:600;text-align:center;padding:8px 0;">
          Te faltan ${missing} ⭐ créditos
        </div>
      `;
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'store-item-modal';
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.55);';

    backdrop.innerHTML = `
      <div id="modal-card" style="
        background:var(--surface);
        border:1px solid var(--border2);
        border-radius:20px 20px 0 0;
        padding:0 24px 44px;
        width:100%;max-width:430px;
        display:flex;flex-direction:column;align-items:center;gap:12px;
        position:relative;
        transform:translateY(100%);
        transition:transform 0.28s cubic-bezier(0.32,0.72,0,1);
      ">
        <div style="width:40px;height:4px;background:var(--border2);border-radius:2px;margin:14px 0 6px;flex-shrink:0;"></div>
        <button id="modal-close" style="
          position:absolute;top:14px;right:16px;
          width:28px;height:28px;
          background:var(--bg2,#1a1f2e);border:1px solid var(--border);border-radius:50%;
          color:var(--text2);font-size:12px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
        ">✕</button>
        <div style="flex-shrink:0;">${preview}</div>
        <div style="font-size:18px;font-weight:700;color:var(--text);text-align:center;">${item.name}</div>
        <div style="font-size:13px;color:var(--text2);">⭐ ${item.price} créditos</div>
        <div style="width:100%;margin-top:4px;">${actionHtml}</div>
      </div>
    `;

    document.body.appendChild(backdrop);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const card = document.getElementById('modal-card');
      if (card) card.style.transform = 'translateY(0)';
    }));

    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeItemModal(); });
    document.getElementById('modal-close').addEventListener('click', closeItemModal);

    const buyBtn = document.getElementById('modal-buy');
    if (buyBtn) {
      buyBtn.addEventListener('click', async () => {
        buyBtn.disabled = true;
        buyBtn.textContent = '...';
        try {
          const updates = { credits: user.credits - item.price };
          if (item.type === 'hat') updates.hat = item.value;
          if (item.type === 'accessory') updates.cat_accessory = item.value;
          user = await api('PATCH', `/users/${AppState.userId}`, updates);
          AppState.userColor = user.cat_color;
          saveToStorage();
          closeItemModal();
          showToast(`¡${item.name} equipado!`, 'success');
          // Show scratch animation for 2 seconds
          document.getElementById('cat-preview-store').innerHTML =
            renderCatSprite({ color: user.cat_color, animation: 'scratch_r', size: 120 });
          setTimeout(() => renderStore(), 2000);
        } catch (err) {
          showToast(err.message, 'error');
          buyBtn.disabled = false;
          buyBtn.innerHTML = `Comprar · ⭐ ${item.price}`;
        }
      });
    }

    const unequipBtn = document.getElementById('modal-unequip');
    if (unequipBtn) {
      unequipBtn.addEventListener('click', async () => {
        try {
          const updates = {};
          if (item.type === 'hat') updates.hat = null;
          if (item.type === 'accessory') updates.cat_accessory = null;
          user = await api('PATCH', `/users/${AppState.userId}`, updates);
          closeItemModal();
          renderStore();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  }

  function closeItemModal() {
    const modal = document.getElementById('store-item-modal');
    if (!modal) return;
    const card = modal.querySelector('#modal-card');
    if (card) {
      card.style.transform = 'translateY(100%)';
      setTimeout(() => modal.remove(), 280);
    } else {
      modal.remove();
    }
  }

  const _navParent = screen.parentElement;
  if (_navParent) {
    const _navObs = new MutationObserver(() => {
      if (!screen.isConnected) { document.getElementById('store-item-modal')?.remove(); _navObs.disconnect(); }
    });
    _navObs.observe(_navParent, { childList: true });
  }
});
