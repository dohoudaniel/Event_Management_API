# Project Status Update

## Overview

The frontend has been refactored from a monolithic structure toward the modular architecture described in `INTEGRATION_GUIDE.md`.

We have separated responsibilities across:

- `api/` for raw backend communication
- `services/` for shaping backend data into frontend-friendly models
- `utils/` for shared helpers
- `ui/` for reusable UI behavior and rendering
- `pages/` for page-specific controllers
- `main.js` for shared application bootstrap

This gives the project a much cleaner structure and makes future work easier to maintain.

## API Layer

The API layer remains focused on backend communication only:

- `js/api/client.js`
- `js/api/auth.api.js`
- `js/api/users.api.js`
- `js/api/events.api.js`

These files are responsible for sending requests, handling tokens, and exposing endpoint-specific calls.

## Services Added

### `js/services/auth.service.js`

This file now centralizes auth and current-user logic, including:

- login state checks
- session access
- current user loading
- profile updates
- organizer checks
- logout behavior

This avoids scattering auth/session logic across different pages.

### `js/services/event.service.js`

This file now provides the mapping layer recommended in the integration guide.

It translates backend event fields such as:

- `name`
- `max_attendees`
- `ticket_price`
- `categories`

into frontend-friendly fields such as:

- `title`
- `capacity`
- `ticketPrice`
- `category`
- `venueName`
- `registeredCount`

This protects the UI from backend serializer differences and keeps page code simpler.

## Utilities Added

### `js/utils/guards.js`

This file handles shared route and permission protection, including:

- `requireAuth()`
- `requireOrganizer()`
- redirect-to-login flow
- current user requirement flow

### `js/utils/formatters.js`

This file centralizes repeated presentation formatting, including:

- dates
- times
- prices
- venue names
- category names
- attendance summaries
- progress/fullness labels

This reduces repeated formatting logic across pages and UI components.

## UI Layer Added

### `js/ui/event-card.js`

Reusable event card rendering now lives here.

### `js/ui/navbar.js`

Navbar-specific behavior now lives here, including:

- signed-in navbar state
- profile link behavior
- logout CTA behavior
- mobile menu toggle
- scroll-state navbar styling

### `js/ui/site-ui.js`

Shared visual interactions now live here, including:

- custom cursor
- reveal animations
- counters
- smooth scrolling

Navbar logic was intentionally extracted out of this file to keep responsibilities clearer.

## Page Controllers Added

We now have page-specific controllers for major frontend views:

- `js/pages/home.js`
- `js/pages/auth.js`
- `js/pages/booking.js`
- `js/pages/profile.js`

Responsibilities:

- `home.js` loads and renders homepage events
- `auth.js` controls login/register behavior
- `booking.js` loads event details and handles event registration
- `profile.js` protects the profile page, loads current user data, and handles profile updates

## Shared Bootstrap Added

### `js/main.js`

This file is now the shared frontend bootstrap.

It detects the current page and runs the appropriate controller:

- home
- auth
- booking
- profile

We also removed duplicated page-level `DOMContentLoaded` bindings so initialization now flows through one central entry point.

## HTML Pages Updated

### Updated

- `index.html`
- `pages/auth.html`
- `pages/booking.html`

### Added

- `pages/profile.html`

These pages now load the modular JS stack instead of depending on the older monolithic `js/eventflow.js` flow for current feature work.

## Navbar / Profile Flow Improvements

Signed-in navigation has been improved:

- homepage `Sign in` now becomes `My profile` when the user is logged in
- mobile auth link also becomes `My profile`
- primary CTA becomes `Log out`

This makes the new profile page easier to reach in the UI.

We also scoped navbar auth-state selectors carefully so they do not interfere with inner-page back links.

## Auth UI Redesign

The authentication page has been redesigned and merged into the real project flow.

Updated files:

- `pages/auth.html`
- `css/auth.css`
- `js/pages/auth.js`

Changes include:

- split-panel login/register layout
- animated switching between sign-in and sign-up
- improved visual polish
- mobile auth switching
- preserved integration with the real EventFlow auth API logic

The social login icons are currently placeholders only and are not connected to OAuth.

## Why This Refactor Matters

This work adds important value to the project:

- reduces duplication across the frontend
- makes backend/frontend integration safer through service mappers
- improves onboarding for new developers
- makes the codebase easier to extend
- supports future work on booking, profile editing, filters, organizer features, and dashboards
- reduces reliance on the older all-in-one frontend file

## Current State

The frontend is now much closer to the architecture described in `INTEGRATION_GUIDE.md`.

Completed direction:

- modular APIs
- services layer
- guards and formatters
- reusable UI modules
- modular page controllers
- shared bootstrap
- profile page
- improved auth UX
- profile navigation from the navbar

## Important Note

The older `js/eventflow.js` file still exists in the repository, but the current homepage/auth/booking/profile flow has largely been migrated onto the modular structure.

Going forward, new work should continue using:

- `api/`
- `services/`
- `utils/`
- `ui/`
- `pages/`
- `main.js`

rather than adding more feature logic back into the older monolithic file.

## Suggested Next Steps

- continue moving any remaining useful logic out of `js/eventflow.js`
- add browser testing across all updated pages
- connect real OAuth if social sign-in is required
- add filter/search UI using `events.api.js` and `event.service.js`
- continue building organizer-only and dashboard features on the modular structure
