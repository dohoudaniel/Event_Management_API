/* ============================================================
   events.api.js - Event and taxonomy requests for EventFlow
   ============================================================ */

(function (global) {
  const client = global.EventFlowApiClient;

  function ensureDependencies() {
    if (!client) {
      throw new Error('EventFlowApiClient is required before events.api.js.');
    }
  }

  function toQueryString(params = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== undefined && item !== null && item !== '') {
            searchParams.append(key, item);
          }
        });
        return;
      }

      searchParams.append(key, value);
    });

    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }

  async function getEvents(params = {}) {
    ensureDependencies();
    return client.get(`/api/events/${toQueryString(params)}`);
  }

  async function getEventBySlug(slug) {
    ensureDependencies();
    return client.get(`/api/events/${encodeURIComponent(slug)}/`);
  }

  async function registerForEvent(slug) {
    ensureDependencies();
    return client.post(`/api/events/${encodeURIComponent(slug)}/register/`, undefined, {
      auth: true,
    });
  }

  async function getCategories(params = {}) {
    ensureDependencies();
    return client.get(`/api/events/categories/${toQueryString(params)}`);
  }

  async function getTags(params = {}) {
    ensureDependencies();
    return client.get(`/api/events/tags/${toQueryString(params)}`);
  }

  async function getVenues(params = {}) {
    ensureDependencies();
    return client.get(`/api/events/venues/${toQueryString(params)}`);
  }

  global.EventFlowEventsApi = {
    getEvents,
    getEventBySlug,
    registerForEvent,
    getCategories,
    getTags,
    getVenues,
  };
})(window);
