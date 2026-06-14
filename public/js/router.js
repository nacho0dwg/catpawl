const Router = (() => {
  const routes = {};
  let currentRoute = null;

  function register(name, renderFn) {
    routes[name] = renderFn;
  }

  function navigate(route, params = {}) {
    if (!routes[route]) {
      console.error(`Route "${route}" not found`);
      return;
    }

    currentRoute = route;

    const container = document.getElementById('screen-container');
    container.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'screen';
    screen.id = `screen-${route}`;
    container.appendChild(screen);

    routes[route](screen, params);
    updateNav(route);

    container.scrollTop = 0;
  }

  function updateNav(route) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });
  }

  function init() {
    // Wire up nav buttons
    document.querySelectorAll('.nav-item[data-route]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (AppState.userId) navigate(btn.dataset.route);
      });
    });

    // Route based on stored session
    if (AppState.userId && AppState.groupId) {
      showNav();
      navigate('feed');
    } else if (AppState.userId) {
      navigate('my-groups');
    } else {
      navigate('onboarding');
    }
  }

  function showNav() {
    document.getElementById('bottom-nav').classList.remove('hidden');
  }

  function hideNav() {
    document.getElementById('bottom-nav').classList.add('hidden');
  }

  function current() { return currentRoute; }

  return { register, navigate, init, showNav, hideNav, current };
})();
