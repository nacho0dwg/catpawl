Router.register('profile', async (screen) => {
  let user = null;
  let selectedColor = AppState.userColor || 'orange';

  screen.innerHTML = `
    <div>
      <div class="screen-header" style="margin-bottom:16px;">
        <div class="screen-title">Mi perfil</div>
      </div>
      <div id="profile-content" style="padding:0 16px 24px;">
        <div style="padding:40px 0;text-align:center;color:var(--text2);font-size:14px;">Cargando...</div>
      </div>
    </div>
  `;

  try {
    user = await api('GET', `/users/${AppState.userId}`);
    selectedColor = user.cat_color || selectedColor;
    renderProfile();
  } catch (e) {
    document.getElementById('profile-content').innerHTML =
      `<div style="color:var(--orange);font-size:13px;padding:20px 0;">${escHtml(e.message)}</div>`;
  }

  function renderProfile() {
    const colors = getCatColors();
    const content = document.getElementById('profile-content');

    content.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:28px;">
        <div id="profile-avatar"></div>
        <div style="font-size:22px;font-weight:800;letter-spacing:-.5px;">${escHtml(user.nickname)}</div>
      </div>

      <div class="section-label">Mi gato</div>
      <div class="cat-color-grid" id="profile-colors" style="margin-bottom:28px;">
        ${colors.map(c => `
          <button class="cat-color-btn ${c.key === selectedColor ? 'active' : ''}"
            data-color="${c.key}" title="${escHtml(c.name)}"
            style="border-color:${c.key === selectedColor ? c.hex : 'transparent'};">
            ${renderCatSprite({ color: c.key, animation: 'meow_sit', size: 32 })}
          </button>
        `).join('')}
      </div>

      <div class="section-label">Mi cuenta</div>
      <div class="input-group" style="margin-bottom:28px;">
        <label class="input-label" for="profile-cbu">Alias de MP</label>
        <input class="input" id="profile-cbu" type="text" placeholder="Ej: nacho.mp o CBU/CVU" maxlength="30"
          autocomplete="off" autocorrect="off" spellcheck="false"
          value="${user.cbu ? escHtml(user.cbu) : ''}" />
        <div style="font-size:11px;color:var(--text2);margin-top:6px;">Tu alias de Mercado Pago o CBU/CVU para recibir transferencias.</div>
      </div>

      <button class="btn btn-accent" id="btn-save-profile" style="width:100%;">Guardar cambios</button>
    `;

    updateAvatar();

    content.querySelectorAll('.cat-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedColor = btn.dataset.color;
        const hex = getCatColors().find(v => v.key === selectedColor)?.hex || '#888';
        content.querySelectorAll('.cat-color-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.color === selectedColor);
          b.style.borderColor = b.dataset.color === selectedColor ? hex : 'transparent';
        });
        updateAvatar();
      });
    });

    document.getElementById('btn-save-profile').addEventListener('click', save);
  }

  function updateAvatar(animation = 'meow_sit') {
    document.getElementById('profile-avatar').innerHTML =
      renderCatSprite({ color: selectedColor, animation, size: 80 });
  }

  async function save() {
    const cbu = document.getElementById('profile-cbu').value.trim();

    const btn = document.getElementById('btn-save-profile');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const updated = await api('PATCH', `/users/${AppState.userId}`, {
        cat_color: selectedColor,
        cbu: cbu || null
      });

      user = updated;

      if (AppState.userColor !== updated.cat_color) {
        AppState.userColor = updated.cat_color;
      }
      saveToStorage();

      // Show on_hind_legs animation for 2 seconds on success
      updateAvatar('on_hind_legs');
      setTimeout(() => updateAvatar('meow_sit'), 2000);

      showToast('Perfil actualizado', 'success');
      btn.disabled = false;
      btn.textContent = 'Guardar cambios';
    } catch (e) {
      showToast(e.message || 'Error al guardar', 'error');
      btn.disabled = false;
      btn.textContent = 'Guardar cambios';
    }
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
