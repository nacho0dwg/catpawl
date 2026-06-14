Router.register('onboarding', (screen) => {
  Router.hideNav();

  let step = 'home'; // home | create-group | join-group | setup-user | recover
  let pendingGroupId = null;
  let pendingGroupName = null;
  let selectedColor = 'orange';
  let fromCreate = false;

  function render() {
    screen.innerHTML = '';
    const views = {
      home: renderHome,
      'create-group': renderCreateGroup,
      'join-group': renderJoinGroup,
      'setup-user': renderSetupUser,
      recover: renderRecover
    };
    (views[step] || renderHome)();
  }

  function renderHome() {
    screen.innerHTML = `
      <div class="onboarding-screen">
        <div class="onboarding-hero">
          <div id="hero-cat"></div>
          <div class="logo-text">CatPawl</div>
          <div class="logo-sub">Compartí gastos con tus amigos.<br>Tus gatitos llevan la cuenta.</div>
        </div>
        <div class="step-indicator">
          <div class="step-dot active"></div>
          <div class="step-dot"></div>
          <div class="step-dot"></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <button class="btn btn-accent" id="btn-create">Crear grupo</button>
          <button class="btn btn-ghost" id="btn-join">Unirme con código</button>
          <button class="btn btn-ghost" id="btn-recover" style="color:var(--text2);font-size:13px;">Ya tengo cuenta</button>
        </div>
      </div>
    `;

    document.getElementById('hero-cat').innerHTML = renderCatSprite({ color: 'orange', animation: 'on_hind_legs', size: 96 });
    document.getElementById('hero-cat').style.animation = 'bounce 2s ease-in-out infinite';

    document.getElementById('btn-create').addEventListener('click', () => { fromCreate = true; step = 'create-group'; render(); });
    document.getElementById('btn-join').addEventListener('click', () => { fromCreate = false; step = 'join-group'; render(); });
    document.getElementById('btn-recover').addEventListener('click', () => { step = 'recover'; render(); });
  }

  function renderCreateGroup() {
    screen.innerHTML = `
      <div class="onboarding-screen">
        <div style="padding-top:48px;flex:1;display:flex;flex-direction:column;gap:24px;">
          <div>
            <div style="font-size:24px;font-weight:800;margin-bottom:8px;">Crear grupo</div>
            <div style="color:var(--text2);font-size:14px;">Elegí un nombre para el grupo de gastos.</div>
          </div>
          <div class="input-group">
            <label class="input-label" for="group-name">Nombre del grupo</label>
            <input class="input" id="group-name" type="text" placeholder="Ej: Viaje a Bariloche" maxlength="40" autocomplete="off" />
          </div>
          <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-accent" id="btn-create-submit">Crear grupo</button>
            <button class="btn btn-ghost" id="btn-back">Volver</button>
          </div>
        </div>
      </div>
    `;

    const nameInput = document.getElementById('group-name');
    nameInput.focus();

    document.getElementById('btn-back').addEventListener('click', () => { step = 'home'; render(); });
    document.getElementById('btn-create-submit').addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) { showToast('Ingresá un nombre para el grupo', 'error'); return; }

      const btn = document.getElementById('btn-create-submit');
      btn.disabled = true;
      btn.textContent = 'Creando...';

      try {
        const group = await api('POST', '/groups', { name });
        pendingGroupId = group.id;
        pendingGroupName = group.name;
        AppState.groupCode = group.code;

        // Show code briefly before going to user setup
        screen.innerHTML = `
          <div class="onboarding-screen">
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;text-align:center;">
              <div style="font-size:40px;">🎉</div>
              <div style="font-size:20px;font-weight:700;">¡Grupo creado!</div>
              <div style="color:var(--text2);font-size:14px;">Compartí este código con tus amigos</div>
              <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:12px;padding:20px 32px;">
                <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:var(--accent);">${group.code}</div>
              </div>
              <div style="color:var(--text2);font-size:12px;">El código no tiene límite de tiempo</div>
            </div>
            <button class="btn btn-accent" id="btn-continue">Continuar</button>
          </div>
        `;

        document.getElementById('btn-continue').addEventListener('click', () => { step = 'setup-user'; render(); });
      } catch (e) {
        showToast(e.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Crear grupo';
      }
    });
  }

  function renderJoinGroup() {
    screen.innerHTML = `
      <div class="onboarding-screen">
        <div style="padding-top:48px;flex:1;display:flex;flex-direction:column;gap:24px;">
          <div>
            <div style="font-size:24px;font-weight:800;margin-bottom:8px;">Unirse al grupo</div>
            <div style="color:var(--text2);font-size:14px;">Ingresá el código que te compartieron.</div>
          </div>
          <div class="input-group">
            <label class="input-label" for="group-code">Código de 6 letras</label>
            <input class="input" id="group-code" type="text" placeholder="Ej: ABC123" maxlength="6"
              style="font-size:24px;font-weight:700;letter-spacing:6px;text-align:center;text-transform:uppercase;" autocomplete="off" />
          </div>
          <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-accent" id="btn-join-submit">Buscar grupo</button>
            <button class="btn btn-ghost" id="btn-back">Volver</button>
          </div>
        </div>
      </div>
    `;

    const codeInput = document.getElementById('group-code');
    codeInput.focus();
    codeInput.addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });

    document.getElementById('btn-back').addEventListener('click', () => { step = 'home'; render(); });
    document.getElementById('btn-join-submit').addEventListener('click', async () => {
      const code = codeInput.value.trim().toUpperCase();
      if (code.length !== 6) { showToast('El código tiene 6 caracteres', 'error'); return; }

      const btn = document.getElementById('btn-join-submit');
      btn.disabled = true;
      btn.textContent = 'Buscando...';

      try {
        const group = await api('GET', `/groups/code/${code}`);
        pendingGroupId = group.id;
        pendingGroupName = group.name;
        AppState.groupCode = group.code;
        step = 'setup-user';
        render();
      } catch (e) {
        showToast('Código inválido o grupo no encontrado', 'error');
        btn.disabled = false;
        btn.textContent = 'Buscar grupo';
      }
    });
  }

  function renderSetupUser() {
    const colors = getCatColors();

    screen.innerHTML = `
      <div class="onboarding-screen">
        <div style="padding-top:40px;flex:1;display:flex;flex-direction:column;gap:24px;">
          <div>
            <div style="font-size:24px;font-weight:800;margin-bottom:8px;">Tu perfil</div>
            <div style="color:var(--text2);font-size:14px;">¿Cómo querés que te vean tus amigos?</div>
          </div>

          <div style="display:flex;justify-content:center;padding:8px 0;" id="cat-preview-wrap">
            <div id="cat-preview"></div>
          </div>

          <div class="input-group">
            <label class="input-label" for="nickname">Tu nombre</label>
            <input class="input" id="nickname" type="text" placeholder="Ej: Nacho" maxlength="20" autocomplete="off" />
          </div>

          <div class="input-group">
            <label class="input-label" for="alias">Alias de recuperación <span style="font-weight:400;color:var(--text2);">(opcional)</span></label>
            <input class="input" id="alias" type="text" placeholder="Ej: nacho-viajes" maxlength="30"
              autocomplete="off" autocorrect="off" spellcheck="false" style="text-transform:lowercase;" />
            <div style="font-size:11px;color:var(--text2);margin-top:4px;">Solo vos lo sabés. Permite recuperar tu cuenta si perdés el acceso.</div>
          </div>

          <div>
            <div class="input-label" style="margin-bottom:10px;">Color de tu gato</div>
            <div class="cat-color-grid">
              ${colors.map(c => `
                <button class="cat-color-btn ${c.key === selectedColor ? 'active' : ''}"
                  data-color="${c.key}"
                  title="${c.name}"
                  style="border-color:${c.key === selectedColor ? c.hex : 'transparent'};">
                  ${renderCatSprite({ color: c.key, animation: 'meow_sit', size: 32 })}
                </button>
              `).join('')}
            </div>
          </div>

          <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-accent" id="btn-enter">Entrar al grupo</button>
          </div>
        </div>
      </div>
    `;

    function updatePreview() {
      document.getElementById('cat-preview').innerHTML = renderCatSprite({ color: selectedColor, animation: 'wash_sit', size: 96 });
    }
    updatePreview();

    document.querySelectorAll('.cat-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedColor = btn.dataset.color;
        const hex = getCatSpriteVariants().find(v => v.key === selectedColor)?.hex || '#888';
        document.querySelectorAll('.cat-color-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.color === selectedColor);
          b.style.borderColor = b.dataset.color === selectedColor ? hex : 'transparent';
        });
        updatePreview();
      });
    });

    document.getElementById('btn-enter').addEventListener('click', async () => {
      const nickname = document.getElementById('nickname').value.trim();
      if (!nickname) { showToast('Ingresá tu nombre', 'error'); return; }

      const aliasRaw = document.getElementById('alias').value.trim().toLowerCase();
      // Auto-generate alias if blank so recovery always works
      const alias = aliasRaw ||
        nickname.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) +
        Math.random().toString(36).slice(2, 6);

      const btn = document.getElementById('btn-enter');
      btn.disabled = true;
      btn.textContent = 'Entrando...';

      try {
        const user = await api('POST', '/users', {
          group_id: pendingGroupId,
          nickname,
          alias,
          cat_color: selectedColor
        });

        // Persist token for cross-device / redeploy recovery
        localStorage.setItem(TOKEN_KEY, user.token);

        AppState.groupId = pendingGroupId;
        AppState.userId = user.id;
        AppState.groupName = pendingGroupName;
        AppState.userName = nickname;
        AppState.userColor = selectedColor;
        saveToStorage();

        // Show recovery key before entering
        screen.innerHTML = `
          <div class="onboarding-screen">
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;text-align:center;padding:0 8px;">
              <div style="font-size:36px;">🔑</div>
              <div style="font-size:20px;font-weight:800;">Tu alias de recuperación</div>
              <div style="color:var(--text2);font-size:13px;max-width:280px;">Anotalo. Si perdés el acceso en este dispositivo, lo usás para recuperar tu cuenta.</div>
              <div style="background:var(--surface2);border:2px solid var(--accent);border-radius:12px;padding:18px 32px;">
                <div style="font-size:28px;font-weight:800;color:var(--accent);letter-spacing:2px;">${alias}</div>
              </div>
            </div>
            <button class="btn btn-accent" id="btn-enter-final">¡Entrar al grupo!</button>
          </div>
        `;

        document.getElementById('btn-enter-final').addEventListener('click', () => {
          Router.showNav();
          Router.navigate('feed');
        });
      } catch (e) {
        const msg = e.message === 'alias already taken'
          ? 'Ese alias ya está tomado, elegí otro'
          : e.message;
        showToast(msg, 'error');
        btn.disabled = false;
        btn.textContent = 'Entrar al grupo';
      }
    });
  }

  function renderRecover() {
    screen.innerHTML = `
      <div class="onboarding-screen">
        <div style="padding-top:48px;flex:1;display:flex;flex-direction:column;gap:24px;">
          <div>
            <div style="font-size:24px;font-weight:800;margin-bottom:8px;">Recuperar cuenta</div>
            <div style="color:var(--text2);font-size:14px;">Ingresá el alias que usaste al registrarte.</div>
          </div>
          <div class="input-group">
            <label class="input-label" for="recovery-alias">Tu alias secreto</label>
            <input class="input" id="recovery-alias" type="text" placeholder="Ej: nacho-viajes"
              autocomplete="off" autocorrect="off" spellcheck="false" style="text-transform:lowercase;" />
          </div>
          <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-accent" id="btn-recover-submit">Recuperar cuenta</button>
            <button class="btn btn-ghost" id="btn-back">← Volver</button>
          </div>
        </div>
      </div>
    `;

    const aliasInput = document.getElementById('recovery-alias');
    aliasInput.focus();

    document.getElementById('btn-back').addEventListener('click', () => { step = 'home'; render(); });
    document.getElementById('btn-recover-submit').addEventListener('click', async () => {
      const alias = aliasInput.value.trim();
      if (!alias) { showToast('Ingresá tu alias de recuperación', 'error'); return; }

      const btn = document.getElementById('btn-recover-submit');
      btn.disabled = true;
      btn.textContent = 'Buscando...';

      try {
        const data = await api('POST', '/auth/recover', { alias });

        localStorage.setItem(TOKEN_KEY, data.token);
        AppState.userId = data.userId;
        AppState.userName = data.userName;
        AppState.userColor = data.userColor;

        if (data.groups.length === 1) {
          AppState.groupId = data.groups[0].id;
          AppState.groupName = data.groups[0].name;
          AppState.groupCode = data.groups[0].code;
        }
        saveToStorage();

        showToast(`Bienvenido de vuelta, ${data.userName}!`, 'success');
        Router.showNav();
        AppState.groupId ? Router.navigate('feed') : Router.navigate('my-groups');
      } catch (e) {
        const msg = e.message === 'alias not found'
          ? 'Alias no encontrado. Revisá que esté bien escrito.'
          : e.message || 'Error al recuperar la cuenta';
        showToast(msg, 'error');
        btn.disabled = false;
        btn.textContent = 'Recuperar cuenta';
      }
    });
  }

  render();
});
