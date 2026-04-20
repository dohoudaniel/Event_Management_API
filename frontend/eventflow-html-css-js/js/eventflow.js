/* ==========================================================
   evently.js — Fully wired to EventFlow Django backend
   Requires: js/config.js to be loaded first (defines API_BASE)
   ========================================================== */


// ── Token Helpers ─────────────────────────────────────────
// Tokens are like a wristband at a concert.
// You get one when you log in. You show it on every
// request to prove "I am allowed to be here."

function getCookieValue(name) {
  const prefix = `${name}=`;
  const cookies = document.cookie ? document.cookie.split('; ') : [];

  for (const cookie of cookies) {
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }

  return null;
}

function setCookieValue(name, value, maxAgeSeconds) {
  if (!value) return;

  const options = [`Path=/`, `SameSite=Lax`, `Max-Age=${maxAgeSeconds}`];
  if (window.location.protocol === 'https:') {
    options.push('Secure');
  }

  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    options.join('; '),
  ].join('; ');
}

function deleteCookieValue(name) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function getAccessToken()  {
  return window.EventFlowStorage
    ? window.EventFlowStorage.getAccessToken()
    : getCookieValue('access_token');
}

function getRefreshToken() {
  return window.EventFlowStorage
    ? window.EventFlowStorage.getRefreshToken()
    : getCookieValue('refresh_token');
}

function saveTokens(access, refresh) {
  if (window.EventFlowStorage) {
    window.EventFlowStorage.saveTokens(access, refresh);
    return;
  }

  setCookieValue('access_token', access, 60 * 5);
  setCookieValue('refresh_token', refresh, 60 * 60 * 24);
}

function clearTokens() {
  if (window.EventFlowStorage) {
    window.EventFlowStorage.clearTokens();
    return;
  }

  deleteCookieValue('access_token');
  deleteCookieValue('refresh_token');
}

function isLoggedIn() {
  return window.EventFlowStorage
    ? window.EventFlowStorage.hasSession()
    : !!getAccessToken();
}


// ── Auto Refresh Token ────────────────────────────────────
// Your access token expires every 5 minutes (set in settings.py).
// This function silently fetches a new one using the refresh token
// so the user is never randomly kicked out mid-session.

async function refreshAccessToken() {
  if (window.EventFlowAuthApi) {
    const data = await window.EventFlowAuthApi.refreshToken();
    return data?.access || null;
  }

  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE}/api/users/token/refresh/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      // The refresh token itself has expired — user must log in again
      clearTokens();
      return null;
    }

    const data = await res.json();
    // Save the brand new access token
    if (window.EventFlowStorage) {
      window.EventFlowStorage.setAccessToken(data.access);
    } else {
      setCookieValue('access_token', data.access, 60 * 5);
    }
    return data.access;

  } catch {
    return null;
  }
}


// ── Smart Fetch (apiFetch) ────────────────────────────────
// A wrapper around the browser's built-in fetch().
// It automatically:
//   1. Attaches your Bearer token to every request
//   2. If the token expired (401), silently refreshes it and retries once
//   3. Parses the JSON response
//   4. Throws a human-readable error if Django returns an error
//
// Think of it as a smart waiter who remembers your membership
// card number and shows it every time you order — you never
// have to think about it.

async function apiFetch(url, options = {}) {
  let token = getAccessToken();

  // Build headers — always send JSON, attach token if we have one
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // Make the first attempt
  let res = await fetch(url, { ...options, headers });

  // 401 = "Unauthorised" — token probably expired
  if (res.status === 401) {
    token = await refreshAccessToken();

    if (token) {
      // Got a fresh token — retry the exact same request once more
      headers['Authorization'] = `Bearer ${token}`;
      res = await fetch(url, { ...options, headers });
    } else {
      // Refresh also failed — user needs to log in again
      clearTokens();
      window.location.href = '/pages/auth.html';
      return;
    }
  }

  // 204 = "No Content" — success but nothing to return (e.g. DELETE)
  if (res.status === 204) return true;

  const data = await res.json();

  // Any 4xx or 5xx status = something went wrong
  if (!res.ok) {
    // Django error responses look like:
    //   { "detail": "Not found." }
    //   { "email": ["This field must be unique."] }
    //   { "password": ["Password fields didn't match."] }
    // We flatten all of these into one readable string.
    const message =
      data.detail ||
      Object.entries(data)
        .map(([field, errors]) => {
          const msgs = Array.isArray(errors) ? errors.join(' ') : errors;
          return `${field}: ${msgs}`;
        })
        .join(' | ') ||
      'Something went wrong. Please try again.';

    throw new Error(message);
  }

  return data;
}


// ── Custom Cursor ─────────────────────────────────────────
// Shows a small orange dot that follows your mouse.
// On touchscreens (phones/tablets) we skip this entirely.

function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor || window.matchMedia('(pointer: coarse)').matches) return;

  document.body.style.cursor = 'none';

  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
  });

  // Make the cursor grow when hovering over clickable things
  document.querySelectorAll('a, button, .ev-card, .feat, .testi-card, .price-card')
    .forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('expand'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('expand'));
    });
}


// ── Navbar ────────────────────────────────────────────────
// Adds a border to the navbar when you scroll down.
// Also updates the auth buttons based on login state.

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll',
    () => navbar.classList.toggle('scrolled', window.scrollY > 40),
    { passive: true }
  );

  updateNavbarAuthState();
}

function updateNavbarAuthState() {
  const signinLink = document.querySelector('.nav-signin');
  const ctaLink    = document.querySelector('.nav-cta');
  if (!signinLink) return;

  if (isLoggedIn()) {
    // User is logged in — swap "Sign in" for "Dashboard"
    signinLink.textContent = 'Dashboard';
    signinLink.href        = 'http://127.0.0.1:8000/admin/';

    // Swap "Get started" for "Log out"
    if (ctaLink) {
      ctaLink.textContent = 'Log out';
      ctaLink.href        = '#';
      ctaLink.addEventListener('click', (e) => {
        e.preventDefault();
        clearTokens();
        window.location.reload();
      });
    }
  }
}


// ── Mobile Nav Toggle ─────────────────────────────────────
// Shows/hides the dropdown menu on small screens.

function initMobileNav() {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
  });

  // Close the menu when any link inside it is clicked
  mobileMenu.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => mobileMenu.classList.remove('open'))
  );
}


// ── Scroll Reveal ─────────────────────────────────────────
// Elements with class "reveal" start invisible.
// When they scroll into view they fade + slide up into place.

function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    }),
    { threshold: 0.12 }
  );

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}


// ── Animated Counters ─────────────────────────────────────
// The numbers in the stats bar (48K+, 3.2M, etc.)
// count up from zero when they scroll into view.

function animateCounter(el, target, suffix, decimals = 0) {
  if (!el) return;
  let startTime = null;
  const duration = 1800; // milliseconds

  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    // "Ease out cubic" — starts fast, slows down at the end
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = eased * target;
    el.textContent = (decimals ? value.toFixed(decimals) : Math.round(value)) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

function initCounters() {
  const statsBar = document.querySelector('.stats-bar');
  if (!statsBar) return;

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;

    animateCounter(document.getElementById('stat-events'),  48,  'K+');
    animateCounter(document.getElementById('stat-tickets'), 3.2, 'M',  1);
    animateCounter(document.getElementById('stat-uptime'),  99,  '%');
    animateCounter(document.getElementById('stat-cities'),  120, '+');

    observer.disconnect(); // Only animate once
  }, { threshold: 0.3 });

  observer.observe(statsBar);
}


// ── Render One Event Card ─────────────────────────────────
// Takes one event object from your Django API and builds
// an HTML string for the event card.
//
// Your Django API returns events that look like:
// {
//   id:               1,
//   title:            "Lagos Tech Summit 2026",
//   slug:             "lagos-tech-summit-2026",
//   start_date:       "2026-03-20T09:00:00Z",
//   venue:            { name: "Landmark Centre" },
//   category:         { name: "Conference" },
//   capacity:         500,
//   registered_count: 360,
//   ticket_price:     "15000.00",
//   status:           "published"
// }

function renderEventCard(event) {
  // How full is the event? (as a percentage 0-100)
  const capacity   = event.capacity || 1;
  const registered = event.registered_count || event.attendees_count || 0;
  const progress   = Math.min(Math.round((registered / capacity) * 100), 100);

  // Format the date: "20 Mar 2026"
  const dateStr = event.start_date
    ? new Date(event.start_date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : 'Date TBC';

  // Format the ticket price: "₦15,000" or "Free"
  const price = event.ticket_price && Number(event.ticket_price) > 0
    ? `₦${Number(event.ticket_price).toLocaleString()}`
    : 'Free';

  // Pick a colour theme based on the category
  const categoryName = event.category?.name || 'Event';
  const colorMap = {
    'Conference': 'orange',
    'Concert':    'gold',
    'Workshop':   'green',
    'Networking': 'orange',
    'Webinar':    'green',
    'Seminar':    'gold',
  };
  const color = colorMap[categoryName] || 'orange';

  // Venue name — handle both object and plain string
  const venueName = event.venue?.name || event.location || 'Venue TBC';

  return `
    <div class="ev-card reveal" role="article" tabindex="0">
      <div class="ev-card-top">
        <span class="ev-tag ev-tag-${color}">${categoryName}</span>
        <div class="ev-live-dot" aria-label="Live event"></div>
      </div>

      <div class="ev-title">${event.title}</div>
      <div class="ev-meta">${dateStr} · ${venueName}</div>

      <div class="ev-progress-bg"
           role="progressbar"
           aria-valuenow="${progress}"
           aria-valuemin="0"
           aria-valuemax="100">
        <div class="ev-progress-fill fill-${color}" style="width:${progress}%"></div>
      </div>

      <div class="ev-stats">
        <span>${registered} registered</span>
        <span>${progress}% full</span>
      </div>

      <div class="ev-footer">
        <div class="ev-price">${price}</div>
        <button
          class="ev-btn ev-btn-${color}"
          onclick="window.location.href='pages/booking.html?slug=${event.slug}'">
          Book now
        </button>
      </div>
    </div>
  `;
}


// ── Load Events from Django API ───────────────────────────
// Called on index.html to fill the events showcase section.
// Fetches from GET /api/events/ and renders the first 3 results.
//
// Django returns paginated results like:
// {
//   "count":    10,
//   "next":     "http://...?page=2",
//   "previous": null,
//   "results":  [ {...}, {...}, ... ]
// }

async function loadEvents() {
  const container = document.getElementById('events-container');
  if (!container) return;

  // Show loading state while we wait for Django
  container.innerHTML = `
    <p style="color:rgba(255,255,255,0.4);font-size:0.9rem;grid-column:1/-1;text-align:center;">
      Loading events…
    </p>`;

  try {
    // GET http://127.0.0.1:8000/api/events/
    const data = window.EventFlowEventsApi
      ? await window.EventFlowEventsApi.getEvents()
      : await apiFetch(`${API_BASE}/api/events/`);

    // Handle both paginated ({ results: [...] }) and plain array responses
    const events = Array.isArray(data) ? data : (data.results || []);

    if (!events.length) {
      container.innerHTML = `
        <p style="color:rgba(255,255,255,0.4);font-size:0.9rem;grid-column:1/-1;text-align:center;">
          No events yet — check back soon!
        </p>`;
      return;
    }

    // Render only first 3 on the landing page
    container.innerHTML = events.slice(0, 3).map(renderEventCard).join('');

    // Run reveal animations on the newly injected cards
    initReveal();

  } catch (err) {
    console.error('Could not load events:', err.message);
    container.innerHTML = `
      <p style="color:rgba(255,255,255,0.4);font-size:0.9rem;grid-column:1/-1;text-align:center;">
        Could not load events. Make sure Django is running at ${API_BASE}
      </p>`;
  }
}


// ── Auth Tabs (auth.html) ─────────────────────────────────
// Switches between the Login and Register panels.

function initAuthTabs() {
  const tabs   = document.querySelectorAll('.auth-tab');
  const panels = document.querySelectorAll('.auth-panel');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t   => t.classList.toggle('active', t.dataset.tab   === target));
      panels.forEach(p => p.classList.toggle('active', p.dataset.panel === target));
    });
  });
}


// ── Login ─────────────────────────────────────────────────
// POST /api/users/token/
// Sends: { email, password }
// Gets back: { access, refresh }

function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    const btn      = form.querySelector('button[type="submit"]');
    const errEl    = document.getElementById('login-error');

    // Basic validation before hitting the API
    if (!email || !password) {
      if (errEl) errEl.textContent = 'Please fill in all fields.';
      return;
    }

    btn.textContent = 'Signing in…';
    btn.disabled    = true;
    if (errEl) {
      errEl.style.color = '#c0392b';
      errEl.textContent = '';
    }

    try {
      // POST http://127.0.0.1:8000/api/users/token/
      // Returns: { "access": "eyJ...", "refresh": "eyJ..." }
      const data = window.EventFlowAuthApi
        ? await window.EventFlowAuthApi.login({ email, password })
        : await apiFetch(`${API_BASE}/api/users/token/`, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });

      // Save both tokens into browser cookies
      // access_token  = short-lived key for API requests (5 mins)
      // refresh_token = long-lived key to silently get new access tokens (1 day)
      if (!window.EventFlowAuthApi) {
        saveTokens(data.access, data.refresh);
      }

      // Redirect to homepage — now logged in
      window.location.href = '../index.html';

    } catch (err) {
      // Common Django errors:
      // "No active account found with the given credentials"
      if (errEl) errEl.textContent = err.message;

    } finally {
      btn.textContent = 'Sign in';
      btn.disabled    = false;
    }
  });
}


// ── Register ──────────────────────────────────────────────
// POST /api/users/register/
//
// Your UserRegistrationSerializer requires these exact fields:
// ┌────────────┬──────────────────────────────────────────┐
// │ username   │ unique, no spaces                        │
// │ email      │ unique                                   │
// │ first_name │ required                                 │
// │ last_name  │ required                                 │
// │ password   │ min 8 chars                              │
// │ password2  │ must match password (checked by Django)  │
// └────────────┴──────────────────────────────────────────┘
//
// Returns: { id, username, email, tokens: { access, refresh } }
// Your backend logs the user in immediately after registering.

function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = form.querySelector('[name="username"]').value.trim();
    const fullName = form.querySelector('[name="name"]').value.trim();
    const email    = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    const confirm  = form.querySelector('[name="confirm"]').value;
    const btn      = form.querySelector('button[type="submit"]');
    const errEl    = document.getElementById('register-error');

    // ── Client-side validation ─────────────────────────────
    // Check everything BEFORE calling the API.
    // This gives instant feedback without a network round-trip.

    if (!username) {
      if (errEl) errEl.textContent = 'Please choose a username.';
      return;
    }
    if (/\s/.test(username)) {
      if (errEl) errEl.textContent = 'Username cannot contain spaces.';
      return;
    }
    if (!fullName) {
      if (errEl) errEl.textContent = 'Please enter your full name.';
      return;
    }
    if (!email.includes('@')) {
      if (errEl) errEl.textContent = 'Please enter a valid email address.';
      return;
    }
    if (password.length < 8) {
      if (errEl) errEl.textContent = 'Password must be at least 8 characters.';
      return;
    }
    if (password !== confirm) {
      if (errEl) errEl.textContent = 'Passwords do not match.';
      return;
    }

    // ── Split full name into first + last ──────────────────
    // "Clement Obi"       → first: "Clement",  last: "Obi"
    // "Clement Obi James" → first: "Clement",  last: "Obi James"
    // "Clement"           → first: "Clement",  last: "Clement" (single name fallback)
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

    btn.textContent = 'Creating account…';
    btn.disabled    = true;
    if (errEl) {
      errEl.style.color = '#c0392b';
      errEl.textContent = '';
    }

    try {
      // POST http://127.0.0.1:8000/api/users/register/
      const data = window.EventFlowAuthApi
        ? await window.EventFlowAuthApi.register({
            username,
            email,
            firstName,
            lastName,
            password,
            confirmPassword: confirm,
          })
        : await apiFetch(`${API_BASE}/api/users/register/`, {
            method: 'POST',
            body: JSON.stringify({
              username,
              email,
              first_name: firstName,
              last_name: lastName,
              password,
              password2: confirm,  // Django validates this server-side too
            }),
          });

      // ── Backend returns tokens immediately on register ─────
      // data = {
      //   "id": 1,
      //   "username": "clement_obi",
      //   "email": "clement@example.com",
      //   "tokens": {
      //     "access":  "eyJ...",
      //     "refresh": "eyJ..."
      //   }
      // }
      if (data.tokens?.access) {
        if (!window.EventFlowAuthApi) {
          saveTokens(data.tokens.access, data.tokens.refresh);
        }
        // Logged in straight away — go to homepage
        window.location.href = '../index.html';

      } else {
        // No tokens in response — fall back to login tab
        const loginTab = document.querySelector('[data-tab="login"]');
        if (loginTab) loginTab.click();

        const loginErr = document.getElementById('login-error');
        if (loginErr) {
          loginErr.style.color = '#3a6a10';
          loginErr.textContent = '✓ Account created! Please sign in.';
        }
      }

    } catch (err) {
      // Django error examples:
      // "username: A user with that username already exists."
      // "email: This field must be unique."
      if (errEl) errEl.textContent = err.message;

    } finally {
      btn.textContent = 'Create account';
      btn.disabled    = false;
    }
  });
}


// ── Booking / RSVP (booking.html) ─────────────────────────
// Reads the event slug from the URL, loads the event details,
// then POSTs to /api/events/<slug>/register/ when submitted.
//
// URL format: booking.html?slug=lagos-tech-summit-2026

async function initBookingForm() {
  const form    = document.getElementById('booking-form');
  if (!form) return;

  const params  = new URLSearchParams(window.location.search);
  const slug    = params.get('slug');
  const titleEl = document.getElementById('booking-event-title');

  // No slug in URL — nothing to book
  if (!slug) {
    if (titleEl) titleEl.textContent = 'No event selected.';
    form.innerHTML = `<p style="color:var(--ink-muted)">Please go back and select an event.</p>`;
    return;
  }

  // Load and display the event name at top of the form
  try {
    // GET http://127.0.0.1:8000/api/events/lagos-tech-summit-2026/
    const event = window.EventFlowEventsApi
      ? await window.EventFlowEventsApi.getEventBySlug(slug)
      : await apiFetch(`${API_BASE}/api/events/${slug}/`);
    if (titleEl) titleEl.textContent = event.title || event.name || 'Event details';
  } catch {
    if (titleEl) titleEl.textContent = 'Event not found.';
    return;
  }

  // Handle the booking form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // User must be logged in to book
    if (!isLoggedIn()) {
      // Save where they were trying to go, then send to login
      window.location.href = `auth.html?next=${encodeURIComponent(`booking.html?slug=${slug}`)}`;
      return;
    }

    const btn    = form.querySelector('button[type="submit"]');
    const errEl  = document.getElementById('booking-error');
    const succEl = document.getElementById('booking-success');

    btn.textContent = 'Booking…';
    btn.disabled    = true;
    if (errEl)  errEl.textContent  = '';
    if (succEl) succEl.textContent = '';

    try {
      // POST http://127.0.0.1:8000/api/events/lagos-tech-summit-2026/register/
      // Header: Authorization: Bearer <access_token>
      // Body: {} — Django gets the user identity from the token
      if (window.EventFlowEventsApi) {
        await window.EventFlowEventsApi.registerForEvent(slug);
      } else {
        await apiFetch(`${API_BASE}/api/events/${slug}/register/`, {
          method: 'POST',
          body:   JSON.stringify({}),
        });
      }

      // Show success message
      if (succEl) {
        succEl.textContent = '🎉 You\'re registered! Check your email for confirmation.';
      }

      // Disable the form so they can't double-book
      form.querySelectorAll('input, select, button').forEach(el => {
        el.disabled = true;
      });

    } catch (err) {
      // Common errors:
      // "You are already registered for this event."
      // "This event is fully booked."
      if (errEl) errEl.textContent = err.message;

    } finally {
      btn.textContent = 'Confirm booking';
      // Only re-enable the button if there was an error
      if (document.getElementById('booking-success')?.textContent === '') {
        btn.disabled = false;
      }
    }
  });
}


// ── Smooth Scroll ─────────────────────────────────────────
// Makes clicking navbar anchor links (#features, #pricing etc.)
// scroll smoothly instead of jumping.

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}


// ── Boot ──────────────────────────────────────────────────
// This runs once when the browser has fully loaded the page HTML.
// It starts every feature above.

// Auth page behavior now lives in js/pages/auth.js.
// These no-op overrides keep the shared bundle from binding auth handlers.
function initAuthTabs() {}
function initLoginForm() {}
function initRegisterForm() {}

document.addEventListener('DOMContentLoaded', () => {
  initCursor();       // custom mouse cursor
  initNavbar();       // scroll effect + auth state
  initMobileNav();    // hamburger menu on mobile
  initReveal();       // scroll-triggered fade animations
  initCounters();     // animated stat numbers
  initSmoothScroll(); // smooth anchor scrolling

  // Page-specific — each function checks if its
  // required element exists before doing anything
  loadEvents();        // index.html  — fetches events from Django
  initAuthTabs();      // auth.html   — login/register tab switching
  initLoginForm();     // auth.html   — login form
  initRegisterForm();  // auth.html   — register form
  initBookingForm();   // booking.html — RSVP / ticket booking
});
