/* ============================================================
   profile.js - Profile page controller for EventFlow
   ============================================================ */

(function (global) {
  const authService = global.EventFlowAuthService;
  const guards = global.EventFlowGuards;
  const siteUi = global.EventFlowSiteUi;

  function setText(selectorOrElement, value) {
    const element = typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;

    if (element) {
      element.textContent = value;
    }
  }

  function setValue(selectorOrElement, value) {
    const element = typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;

    if (element) {
      element.value = value ?? '';
    }
  }

  function setMessage(type, message) {
    setText('#profile-success', type === 'success' ? message : '');
    setText('#profile-error', type === 'error' ? message : '');
  }

  function renderProfile(user) {
    if (!user) return;

    setText('#profile-name', user.fullName);
    setText('#profile-email', user.email);
    setText('#profile-username', user.username);
    setText('#profile-role', user.role);

    setText('[data-profile-name]', user.fullName);
    setText('[data-profile-email]', user.email);
    setText('[data-profile-username]', user.username);
    setText('[data-profile-role]', user.role);

    setValue('[name="first_name"]', user.firstName);
    setValue('[name="firstName"]', user.firstName);
    setValue('[name="last_name"]', user.lastName);
    setValue('[name="lastName"]', user.lastName);
    setValue('[name="email"]', user.email);
    setValue('[name="username"]', user.username);
  }

  async function loadProfile(options = {}) {
    const user = await authService.getCurrentUser({ force: Boolean(options.force) });
    renderProfile(user);
    return user;
  }

  function bindProfileForm() {
    const form = document.getElementById('profile-form');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const button = form.querySelector('button[type="submit"]');
      const formData = new FormData(form);
      const payload = {
        username: String(formData.get('username') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        firstName: String(formData.get('first_name') || formData.get('firstName') || '').trim(),
        lastName: String(formData.get('last_name') || formData.get('lastName') || '').trim(),
      };

      setMessage('success', '');
      setMessage('error', '');

      if (button) {
        button.disabled = true;
        button.textContent = 'Saving...';
      }

      try {
        const user = await authService.updateCurrentUser(payload);
        renderProfile(user);
        setMessage('success', 'Profile updated successfully.');
      } catch (error) {
        setMessage('error', error.message || 'Could not update profile.');
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = 'Save changes';
        }
      }
    });
  }

  async function boot() {
    siteUi?.initCursor?.();
    global.EventFlowNavbar?.initNavbar?.();

    const user = await guards?.requireCurrentUser?.('profile.html');
    if (!user) {
      return;
    }

    renderProfile(user);
    bindProfileForm();
  }

  global.EventFlowProfilePage = {
    bindProfileForm,
    boot,
    loadProfile,
    renderProfile,
  };
})(window);
