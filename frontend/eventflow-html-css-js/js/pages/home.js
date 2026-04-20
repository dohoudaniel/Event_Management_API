/* ============================================================
   home.js - Homepage controller for EventFlow
   ============================================================ */

(function (global) {
  const eventService = global.EventFlowEventService;
  const eventCard = global.EventFlowEventCard;
  const siteUi = global.EventFlowSiteUi;

  function setContainerMessage(container, message) {
    if (!container) return;

    container.innerHTML = `
      <p style="color:rgba(255,255,255,0.4);font-size:0.9rem;grid-column:1/-1;text-align:center;">
        ${message}
      </p>
    `;
  }

  async function loadEvents() {
    const container = document.getElementById('events-container');
    if (!container) return;

    setContainerMessage(container, 'Loading events...');

    try {
      const response = eventService?.listEvents
        ? await eventService.listEvents()
        : { results: [] };
      const events = Array.isArray(response?.results) ? response.results : [];

      if (!events.length) {
        setContainerMessage(container, 'No events yet - check back soon!');
        return;
      }

      container.innerHTML = events
        .slice(0, 3)
        .map((event) => eventCard.renderEventCard(event))
        .join('');

      siteUi?.initReveal?.(container);
    } catch (error) {
      console.error('Could not load events:', error.message);
      setContainerMessage(
        container,
        'Could not load events. Make sure Django is running and the API is reachable.'
      );
    }
  }

  function boot() {
    siteUi?.boot?.();
    loadEvents();
  }

  global.EventFlowHomePage = {
    boot,
    loadEvents,
  };
})(window);
