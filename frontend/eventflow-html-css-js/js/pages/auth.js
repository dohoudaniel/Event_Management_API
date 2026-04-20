/* ============================================================
   pages/auth.js - Auth page controller
   ============================================================ */

(function (global) {
  const authApi = global.EventFlowAuthApi;

  function getNextUrl() {
    const params = new URLSearchParams(global.location.search);
    const next = params.get('next');

    if (!next) return '../index.html';

    if (next.startsWith('http://') || next.startsWith('https://') || next.startsWith('//')) {
      return '../index.html';
    }

    return next;
  }

  function getRequestedTab() {
    const params = new URLSearchParams(global.location.search);
    return params.get('tab');
  }

  function activateTab(target) {
    const wrapper = document.getElementById('authWrapper');
    const tabs = document.querySelectorAll('.auth-tab');
    const panels = document.querySelectorAll('.auth-panel');
    const isRegister = target === 'register';

    if (wrapper) {
      wrapper.classList.toggle('panel-active', isRegister);
    }

    tabs.forEach((tab) => {
      const isActive = tab.dataset.tab === target;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    panels.forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.panel === target);
    });
  }

  function initAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const mobileRegisterBtn = document.getElementById('mobileRegisterBtn');
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    if (!tabs.length) return;
    if (document.body.dataset.authTabsBound === 'true') return;
    document.body.dataset.authTabsBound = 'true';

    const requestedTab = getRequestedTab();
    if (requestedTab === 'register' || requestedTab === 'login') {
      activateTab(requestedTab);
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        activateTab(tab.dataset.tab);
      });
    });

    mobileRegisterBtn?.addEventListener('click', () => activateTab('register'));
    mobileLoginBtn?.addEventListener('click', () => activateTab('login'));
  }

  function setMessage(element, message, color) {
    if (!element) return;
    element.textContent = message || '';
    if (color) {
      element.style.color = color;
    }
  }

  function redirectAfterAuth() {
    global.location.href = getNextUrl();
  }

  function redirectIfAuthenticated() {
    if (authApi?.getSession?.().isLoggedIn) {
      redirectAfterAuth();
    }
  }

  function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form || !authApi) return;
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = form.querySelector('[name="email"]').value.trim();
      const password = form.querySelector('[name="password"]').value;
      const button = form.querySelector('button[type="submit"]');
      const errorElement = document.getElementById('login-error');

      if (!email || !password) {
        setMessage(errorElement, 'Please fill in all fields.', '#c0392b');
        return;
      }

      button.disabled = true;
      button.textContent = 'Signing in...';
      setMessage(errorElement, '', '#c0392b');

      try {
        await authApi.login({ email, password });
        redirectAfterAuth();
      } catch (error) {
        setMessage(errorElement, error.message, '#c0392b');
      } finally {
        button.disabled = false;
        button.textContent = 'Sign in';
      }
    });
  }

  function initRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form || !authApi) return;
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const username = form.querySelector('[name="username"]').value.trim();
      const fullName = form.querySelector('[name="name"]').value.trim();
      const email = form.querySelector('[name="email"]').value.trim();
      const password = form.querySelector('[name="password"]').value;
      const confirm = form.querySelector('[name="confirm"]').value;
      const button = form.querySelector('button[type="submit"]');
      const errorElement = document.getElementById('register-error');

      if (!username) {
        setMessage(errorElement, 'Please choose a username.', '#c0392b');
        return;
      }

      if (/\s/.test(username)) {
        setMessage(errorElement, 'Username cannot contain spaces.', '#c0392b');
        return;
      }

      if (!fullName) {
        setMessage(errorElement, 'Please enter your full name.', '#c0392b');
        return;
      }

      if (!email.includes('@')) {
        setMessage(errorElement, 'Please enter a valid email address.', '#c0392b');
        return;
      }

      if (password.length < 8) {
        setMessage(errorElement, 'Password must be at least 8 characters.', '#c0392b');
        return;
      }

      if (password !== confirm) {
        setMessage(errorElement, 'Passwords do not match.', '#c0392b');
        return;
      }

      button.disabled = true;
      button.textContent = 'Creating account...';
      setMessage(errorElement, '', '#c0392b');

      try {
        await authApi.register({
          username,
          name: fullName,
          email,
          password,
          confirmPassword: confirm,
        });

        redirectAfterAuth();
      } catch (error) {
        setMessage(errorElement, error.message, '#c0392b');
      } finally {
        button.disabled = false;
        button.textContent = 'Create account';
      }
    });
  }

  function boot() {
    initAuthTabs();
    redirectIfAuthenticated();
    initLoginForm();
    initRegisterForm();
  }

  global.initAuthTabs = initAuthTabs;
  global.initLoginForm = initLoginForm;
  global.initRegisterForm = initRegisterForm;
  global.EventFlowAuthPage = { boot };
})(window);
