/* ============================================================
   main.js - Shared application bootstrap for EventFlow
   Loads all modules and boots the current page
   ============================================================ */

(function (global) {
  const scripts = [
    'config.js',
    'utils/storage.js',
    'utils/formatters.js',
    'utils/guards.js',
    'api/client.js',
    'api/auth.api.js',
    'api/users.api.js',
    'api/events.api.js',
    'services/auth.service.js',
    'services/event.service.js',
    'ui/navbar.js',
    'ui/site-ui.js',
    'ui/event-card.js',
    'pages/home.js',
    'pages/auth.js',
    'pages/booking.js',
    'pages/profile.js',
  ];

  let loadedCount = 0;

  function getJsBase() {
    return window.location.pathname.includes('/pages/') ? '../js/' : 'js/';
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = getJsBase() + src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  function detectPage() {
    if (document.getElementById('events-container')) return 'home';
    if (document.getElementById('login-form') || document.getElementById('register-form')) {
      return 'auth';
    }
    if (document.getElementById('booking-form')) return 'booking';
    if (document.getElementById('profile-form')) return 'profile';
    return 'unknown';
  }

  function bootPage(page) {
    const bootMap = {
      home: global.EventFlowHomePage?.boot,
      auth: global.EventFlowAuthPage?.boot,
      booking: global.EventFlowBookingPage?.boot,
      profile: global.EventFlowProfilePage?.boot,
    };

    const boot = bootMap[page];
    if (typeof boot === 'function') {
      return boot();
    }

    return undefined;
  }

  function boot() {
    const page = detectPage();
    bootPage(page);
  }

  async function loadAllScripts() {
    for (const src of scripts) {
      await loadScript(src);
    }
    boot();
  }

  // Start loading all scripts and boot when done
  loadAllScripts().catch(error => {
    console.error('Failed to load scripts:', error);
  });

  global.EventFlowApp = {
    boot,
    bootPage,
    detectPage,
  };
})(window);
