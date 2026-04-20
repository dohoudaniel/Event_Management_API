# Frontend API Integration Guide

This guide is tailored to the current project structure:

- Backend: `event_planner/`
- Frontend: `Frontend/eventflow-html-css-js/`

It is designed to help integrate the Django EventFlow API into the frontend using a clean, maintainable structure.

## 1. Understanding the API we already had

Your backend routes currently live in:

- `event_planner/EventFlow/urls.py`
- `event_planner/users/urls.py`
- `event_planner/events/urls.py`

Main endpoints likely to be used first:

- `POST /api/users/register/`
- `POST /api/users/token/`
- `POST /api/users/token/refresh/`
- `GET /api/users/profile/`
- `GET /api/events/`
- `GET /api/events/<slug>/`
- `POST /api/events/<slug>/register/`
- `GET /api/events/categories/`
- `GET /api/events/tags/`
- `GET /api/events/venues/`

The full schema can be inspected at:

- `/api/docs/`
- `/api/schema/`

## 2. Keep the frontend modular

Right now, `js/eventflow.js` contains many responsibilities in one file:

- token handling
- API requests
- auth logic
- event rendering
- page boot logic
- UI effects

That works for a small prototype, but it becomes hard to maintain as soon as dashboard pages are added, profile editing, event creation, filtering, and organizer-only actions.

Use this structure instead:

```text
Frontend/eventflow-html-css-js/
  js/
    config.js
    api/
      client.js
      auth.api.js
      events.api.js
      users.api.js
    services/
      auth.service.js
      event.service.js
    utils/
      storage.js
      guards.js
      formatters.js
    pages/
      home.js
      auth.js
      booking.js
      profile.js
    ui/
      navbar.js
      event-card.js
    main.js
```

## 3. Separate raw API calls from UI code

Use this rule:

- `api/` files should only talk to the backend.
- `services/` files should transform backend data into frontend-friendly data.
- `pages/` files should only handle page behavior and DOM updates.
- `ui/` files should render components like cards, lists, badges, and alerts.

This separation keeps our code clean and prevents fetch logic from being mixed into button click handlers everywhere.

## 4. Centralize the API base URL

We already had `js/config.js`, which is good.

Keep only environment-level values there:

- `API_BASE`
- request timeout config
- maybe a flag like `IS_DEV`

Example responsibility:

```js
export const API_BASE = 'http://127.0.0.1:8000';
```

Hint:

- For local development, keep this pointed at your Django server.
- For production, change it to your deployed backend URL.
- Make sure your Django CORS settings allow the frontend origin.

## 5. Build one reusable API client first

Create `js/api/client.js` as your only low-level HTTP layer.

This file should handle:

- `Authorization: Bearer <token>`
- refresh token retry on `401`
- JSON parsing
- standard error formatting
- optional query string building

That means every other API file calls the same client instead of using `fetch()` directly.

## 6. Create endpoint-specific API modules

After `client.js`, split the backend into focused modules.

Suggested modules:

### `api/auth.api.js`

Functions:

- `login(payload)`
- `register(payload)`
- `refreshToken(refresh)`

### `api/users.api.js`

Functions:

- `getProfile()`
- `updateProfile(payload)`

### `api/events.api.js`

Functions:

- `getEvents(params)`
- `getEventBySlug(slug)`
- `registerForEvent(slug)`
- `getCategories()`
- `getTags()`
- `getVenues()`

## 7. Add a mapping layer because your backend shape and frontend shape do not fully match

This is the most important part for the project.

Our current frontend code expects fields like:

- `title`
- `capacity`
- `registered_count`
- `category.name`

But our backend serializer currently returns fields like:

- `name`
- `max_attendees`
- `categories`
- `venue` as a name string

So if we connect them directly without a mapping layer, parts of the UI will break.

Use a mapper in `services/event.service.js`.

Example:

```js
export function mapEventFromApi(event) {
  return {
    id: event.id,
    slug: event.slug,
    title: event.name,
    description: event.description,
    startDate: event.start_date,
    endDate: event.end_date,
    venueName: event.venue || 'Venue TBC',
    categories: event.categories || [],
    tags: event.tags || [],
    capacity: event.max_attendees || 0,
    price: Number(event.ticket_price || 0),
    isPrivate: Boolean(event.is_private),
    status: event.status,
  };
}
```

Hint:

- Do not force the UI to depend on raw backend fields everywhere.
- Convert once in the service layer, then use the cleaner frontend model across the page.

## 8. Wire pages one by one

Do not integrate everything at once. Use this order instead.

### Step 1: Home page events list

Goal:

- Show live events on `index.html`

Do:

- call `getEvents()`
- map API response using `mapEventFromApi`
- render cards with `ui/event-card.js`

Hint:

- The event list endpoint is paginated.
- Handle both `data.results` and a plain array if the API ever changes.

### Step 2: Auth page

Goal:

- login
- register
- persist tokens

Do:

- submit login form to `/api/users/token/`
- submit register form to `/api/users/register/`
- store `access` and `refresh`
- refresh access token automatically on `401`

Hint:

- Your backend returns tokens immediately after registration, so you can log the user in directly after sign-up.

### Step 3: Booking page

Goal:

- load event by slug
- allow authenticated users to register

Do:

- read `slug` from URL
- fetch `/api/events/<slug>/`
- submit `POST /api/events/<slug>/register/`

Hint:

- Private events may reject access unless the user has an accepted invitation.
- Show backend error messages clearly in the UI.

### Step 4: Profile page

Goal:

- show current user data

Do:

- call `GET /api/users/profile/`
- render user info

Hint:

- this is a good first protected page to confirm your token flow is working correctly

### Step 5: Filters and search

Goal:

- let users filter event list

Backend query params already supported:

- `search`
- `start_date`
- `end_date`
- `city`
- `state`
- `organizer`
- `category`
- `tag`

Do:

- collect filter form values
- build a query string
- pass params into `getEvents(params)`

Hint:

- categories and tags use slugs in the API filter
- your event card can still display names, but filtering should use the slug values from backend resources

## 9. Keep auth state in one place

Create `utils/storage.js` for:

- `getAccessToken()`
- `getRefreshToken()`
- `saveTokens()`
- `clearTokens()`

Create `services/auth.service.js` for:

- `isLoggedIn()`
- `logout()`
- maybe `getCurrentUser()`

This avoids scattering `localStorage` calls across every page.

## 10. Protect routes and actions

Create `utils/guards.js`.

Useful helpers:

- `requireAuth(redirectTo)`
- `requireOrganizer()`

Use these for:

- booking actions
- organizer dashboard pages
- event creation forms

Hint:

- the backend only allows event creation for users with `role === 'organizer'`
- check the user profile after login if you want to control organizer-only buttons in the UI

## 11. Match your frontend to the real serializer fields

Before building more UI, align your frontend assumptions with the current backend.

Current backend event serializer uses:

- `name`
- `description`
- `start_date`
- `end_date`
- `start_time`
- `end_time`
- `venue`
- `location_details`
- `status`
- `max_attendees`
- `ticket_price`
- `is_private`
- `categories`
- `tags`

Important note:

- Your current `eventflow.js` uses `event.title`, `event.capacity`, and `event.category?.name`, which do not match the serializer.

If you keep the current serializer, update the frontend mapping layer.

If you want the frontend shape to stay as-is, then update the backend serializer instead.

Pick one source of truth and be consistent.

## 12. Recommended integration workflow

Use this exact workflow while building:

1. Confirm endpoint in `/api/docs/`
2. Test endpoint in Swagger or Postman
3. Add raw API function in `api/`
4. Add mapper in `services/`
5. Render on one page in `pages/`
6. Add loading, empty, and error states
7. Test login and token refresh
8. Only then move to the next feature

This keeps debugging much easier.

## 13. UI states you should always support

For every API-driven section, always handle:

- loading
- success
- empty data
- validation error
- server/network error

Hint:

- users should always know whether data is loading, missing, or failed
- avoid silent failures in the browser console only

## 14. Things you will need to watch out for

### CORS

Your Django settings already include `corsheaders` and allow all origins by default in development.

Check:

- `event_planner/EventFlow/settings.py`

For production:

- set specific allowed origins
- do not leave permissive CORS settings if not needed

### JWT expiry

Your access token lifetime is short.

Current backend:

- access token: 5 minutes
- refresh token: 1 day

So your auto-refresh logic is not optional.

### Paginated responses

The event list endpoint returns paginated data.

Expect:

```json
{
  "count": 10,
  "next": "...",
  "previous": null,
  "results": []
}
```

### Private event rules

Private events are restricted in the backend.

That means:

- some event details may be blocked
- registration may fail for non-invited users
- the frontend should show permission-related messages cleanly

### Organizer-only actions

Creating or editing events should only be shown to users with organizer privileges.

## 15. Practical first implementation order for this repo

If you want to move cleanly without rewriting everything at once, do this:

1. Keep `config.js`
2. Extract token helpers and fetch wrapper out of `eventflow.js` into `api/client.js` and `utils/storage.js`
3. Extract auth requests into `api/auth.api.js`
4. Extract event requests into `api/events.api.js`
5. Add `services/event.service.js` mapper
6. Move homepage logic into `pages/home.js`
7. Move auth page logic into `pages/auth.js`
8. Move booking page logic into `pages/booking.js`
9. Leave cursor, reveal, navbar animation, and smooth scroll in UI-specific files

This gives you a clean structure without breaking everything in one big refactor.

## 16. Simple file responsibility guide

Use this mental model:

- `api/` = how to talk to the backend
- `services/` = how to shape backend data for the app
- `pages/` = what each page does
- `ui/` = how things render
- `utils/` = shared helpers

If a file starts doing too many of those jobs, split it.

## 17. Best next action

Your cleanest next move is:

1. keep the backend as the source of truth
2. create a mapping layer for events
3. split `eventflow.js` into `api`, `services`, and `pages`
4. integrate pages in this order: home, auth, booking, profile, organizer features

That will give you a stable base for the rest of the frontend work.
