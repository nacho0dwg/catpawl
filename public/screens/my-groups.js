Router.register('my-groups', async (screen) => {
  Router.hideNav();

  let mode = 'list'; // list | create | join

  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function render() {
    if (mode === 'list') await renderList();
    else if (mode === 'create') renderCreate();
    else if (mode === 'join') renderJoin();
  }

  async function renderList() {
    const canGoBack = Boolean(AppState.groupId);

    screen.innerHTML = `
      ${canGoBack ? `
        <div style="padding:16px 16px 0;">
          <button id="btn-back-feed"
            style="display:inline-flex;align-items:center;gap:6px;color:var(--text2);font-size:13px;font-weight:600;padding:8px 0;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Volver al feed
          </button>
        </div>
      ` : ''}

      <div style="padding:${canGoBack ? '12px' : '48px'} 20px 16px;display:flex;align-items:flex-end;justify-content:space-between;">
        <div>
          <div style="font-size:11px;color:var(--text2);font-weight:600;text-transform:uppercase;letter-spacing:.08em;">Bienvenido</div>
          <div style="font-size:26px;font-weight:800;">${escHtml(AppState.userName || 'Mis grupos')}</div>
        </div>
        <div id="my-cat" style="opacity:.7;"></div>
      </div>

      <div id="groups-list" style="padding:0 16px;">
        <div style="padding:40px;text-align:center;color:var(--text2);font-size:14px;">Cargando...</div>
      </div>

      <div style="padding:16px 16px 40px;display:flex;flex-direction:column;gap:10px;">
        <button class="btn btn-accent" id="btn-new-group">+ Crear nuevo grupo</button>
        <button class="btn btn-ghost" id="btn-join-code">Unirme con código</button>
      </div>
    `;

    document.getElementById('my-cat').innerHTML = renderCatSprite({ color: AppState.userColor || 'orange', animation: 'meow_sit', size: 56 });
    document.getElementById('btn-new-group').addEventListener('click', () => { mode = 'create'; render(); });
    document.getElementById('btn-join-code').addEventListener('click', () => { mode = 'join'; render(); });

    if (canGoBack) {
      document.getElementById('btn-back-feed').addEventListener('click', () => {
        Router.showNav();
        Router.navigate('feed');
      });
    }

    try {
      const groups = await api('GET', `/users/${AppState.userId}/groups`);
      const list = document.getElementById('groups-list');

      if (!groups.length) {
        list.innerHTML = `
          <div style="padding:40px 20px;text-align:center;color:var(--text2);">
            <div style="font-size:14px;">No pertenecés a ningún grupo todavía.</div>
            <div style="font-size:12px;margin-top:6px;">Creá uno o pedile el código a alguien.</div>
          </div>
        `;
        return;
      }

      list.innerHTML = groups.map(g => {
        const isActive = g.id === AppState.groupId;
        return `
          <div class="card" style="margin-bottom:10px;${isActive ? 'border-color:var(--accent);' : ''}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;padding-right:8px;">
                ${isActive ? `<div style="width:7px;height:7px;border-radius:50%;background:var(--accent);flex-shrink:0;"></div>` : ''}
                <div style="font-size:16px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(g.name)}</div>
              </div>
              <div style="font-size:11px;font-weight:700;color:var(--accent);background:var(--accent-dim);padding:3px 8px;border-radius:6px;letter-spacing:2px;flex-shrink:0;">${g.code}</div>
            </div>
            <div style="font-size:12px;color:var(--text2);margin-bottom:12px;">${g.member_count} miembro${g.member_count !== 1 ? 's' : ''}</div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-accent btn-sm" data-enter="${g.id}" data-name="${escHtml(g.name)}" data-code="${g.code}" style="flex:1;">
                ${isActive ? 'Estás aquí' : 'Entrar'}
              </button>
              <button class="btn btn-ghost btn-sm" data-leave="${g.id}" data-leave-name="${escHtml(g.name)}" style="color:var(--orange);border-color:var(--orange-dim);flex:0 0 auto;">Salir</button>
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('[data-enter]').forEach(btn => {
        btn.addEventListener('click', () => {
          AppState.groupId = btn.dataset.enter;
          AppState.groupName = btn.dataset.name;
          AppState.groupCode = btn.dataset.code;
          saveToStorage();
          Router.showNav();
          Router.navigate('feed');
        });
      });

      list.querySelectorAll('[data-leave]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const name = btn.dataset.leaveName;
          if (!confirm(`¿Salir del grupo "${name}"?\nTus gastos quedarán en el historial.`)) return;
          try {
            await api('DELETE', `/users/${AppState.userId}/groups/${btn.dataset.leave}`);
            if (AppState.groupId === btn.dataset.leave) clearGroup();
            showToast('Saliste del grupo', 'success');
            await renderList();
          } catch (e) {
            showToast(e.message, 'error');
          }
        });
      });
    } catch (e) {
      document.getElementById('groups-list').innerHTML = `
        <div style="padding:20px;color:var(--orange);font-size:14px;">${escHtml(e.message)}</div>
      `;
    }
  }

  function renderCreate() {
    screen.innerHTML = `
      <div class="onboarding-screen">
        <div style="padding-top:48px;flex:1;display:flex;flex-direction:column;gap:24px;">
          <div>
            <div style="font-size:24px;font-weight:800;margin-bottom:8px;">Crear grupo</div>
            <div style="color:var(--text2);font-size:14px;">Elegí un nombre para el nuevo grupo.</div>
          </div>
          <div class="input-group">
            <label class="input-label" for="group-name">Nombre del grupo</label>
            <input class="input" id="group-name" type="text" placeholder="Ej: Viaje a Bariloche" maxlength="40" autocomplete="off" />
          </div>
          <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-accent" id="btn-create-submit">Crear grupo</button>
            <button class="btn btn-ghost" id="btn-back">← Volver</button>
          </div>
        </div>
      </div>
    `;

    const nameInput = document.getElementById('group-name');
    nameInput.focus();

    document.getElementById('btn-back').addEventListener('click', () => { mode = 'list'; render(); });
    document.getElementById('btn-create-submit').addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) { showToast('Ingresá un nombre para el grupo', 'error'); return; }

      const btn = document.getElementById('btn-create-submit');
      btn.disabled = true;
      btn.textContent = 'Creando...';

      try {
        const group = await api('POST', '/groups', { name });
        await api('POST', `/users/${AppState.userId}/join`, { code: group.code });

        AppState.groupId = group.id;
        AppState.groupName = group.name;
        AppState.groupCode = group.code;
        saveToStorage();

        Router.showNav();
        Router.navigate('feed');
      } catch (e) {
        showToast(e.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Crear grupo';
      }
    });
  }

  function renderJoin() {
    screen.innerHTML = `
      <div class="onboarding-screen">
        <div style="padding-top:48px;flex:1;display:flex;flex-direction:column;gap:24px;">
          <div>
            <div style="font-size:24px;font-weight:800;margin-bottom:8px;">Unirse al grupo</div>
            <div style="color:var(--text2);font-size:14px;">Ingresá el código que te compartieron.</div>
          </div>
          <div class="input-group">
            <label class="input-label" for="group-code">Código de 6 caracteres</label>
            <input class="input" id="group-code" type="text" placeholder="Ej: ABC123" maxlength="6"
              style="font-size:24px;font-weight:700;letter-spacing:6px;text-align:center;text-transform:uppercase;"
              autocomplete="off" autocorrect="off" spellcheck="false" />
          </div>
          <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-accent" id="btn-join-submit">Unirme al grupo</button>
            <button class="btn btn-ghost" id="btn-back">← Volver</button>
          </div>
        </div>
      </div>
    `;

    const codeInput = document.getElementById('group-code');
    codeInput.focus();
    codeInput.addEventListener('input', e => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    document.getElementById('btn-back').addEventListener('click', () => { mode = 'list'; render(); });
    document.getElementById('btn-join-submit').addEventListener('click', async () => {
      const code = codeInput.value.trim().toUpperCase();
      if (code.length !== 6) { showToast('El código tiene 6 caracteres', 'error'); return; }

      const btn = document.getElementById('btn-join-submit');
      btn.disabled = true;
      btn.textContent = 'Uniéndome...';

      try {
        const group = await api('POST', `/users/${AppState.userId}/join`, { code });

        AppState.groupId = group.id;
        AppState.groupName = group.name;
        AppState.groupCode = group.code;
        saveToStorage();

        showToast(`Bienvenido a ${group.name}`, 'success');
        Router.showNav();
        Router.navigate('feed');
      } catch (e) {
        const msg = e.message === 'group not found'
          ? 'Código inválido, revisá que esté bien escrito'
          : e.message || 'Error al unirse al grupo';
        showToast(msg, 'error');
        btn.disabled = false;
        btn.textContent = 'Unirme al grupo';
      }
    });
  }

  await render();
});
