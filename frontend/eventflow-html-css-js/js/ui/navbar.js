/* ============================================================
   navbar.js - Shared navbar behavior for EventFlow
   ============================================================ */

(function (global) {
  function updateNavbarAuthState() {
    const signinLink = document.querySelector('[data-auth-link]');
    const ctaLink = document.querySelector('[data-auth-cta]');
    const mobileAuthLink = document.querySelector('[data-mobile-auth-link]');
    const authService = global.EventFlowAuthService;

    if (!signinLink || !authService?.isLoggedIn) return;

    if (authService.isLoggedIn()) {
      signinLink.textContent = 'My profile';
      signinLink.href = 'pages/profile.html';

      if (mobileAuthLink) {
        mobileAuthLink.textContent = 'My profile';
        mobileAuthLink.href = 'pages/profile.html';
      }

      if (ctaLink) {
        ctaLink.textContent = 'Log out';
        ctaLink.href = '#';
        ctaLink.addEventListener('click', (event) => {
          event.preventDefault();
          authService.logout();
          global.location.reload();
        });
      }
    }
  }

  function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    global.addEventListener(
      'scroll',
      () => navbar.classList.toggle('scrolled', global.scrollY > 40),
      { passive: true }
    );

    updateNavbarAuthState();
  }

  function initMobileNav() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!hamburger || !mobileMenu) return;

    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  global.EventFlowNavbar = {
    initMobileNav,
    initNavbar,
    updateNavbarAuthState,
  };
})(window);
