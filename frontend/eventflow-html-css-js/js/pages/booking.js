/* ============================================================
   booking.js - Booking page controller for EventFlow
   ============================================================ */

(function (global) {
  const eventService = global.EventFlowEventService;
  const guards = global.EventFlowGuards;
  const formatters = global.EventFlowFormatters;
  const siteUi = global.EventFlowSiteUi;

  function getSlugFromUrl() {
    const params = new URLSearchParams(global.location.search);
    return params.get('slug');
  }

  function setText(selectorOrElement, value) {
    const element = typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;

    if (element) {
      element.textContent = value;
    }
  }

  function setError(message) {
    setText('#booking-error', message || '');
  }

  function setSuccess(message) {
    setText('#booking-success', message || '');
  }

  function disableForm(form) {
    form.querySelectorAll('input, select, button, textarea').forEach((element) => {
      element.disabled = true;
    });
  }

  function setEventSummary(event) {
    const title = event?.title || 'Event details';
    const venueName = formatters?.formatVenueName
      ? formatters.formatVenueName(event)
      : event?.venueName || 'Venue TBC';
    const dateText = formatters?.formatDate
      ? formatters.formatDate(event?.startDate)
      : 'Date TBC';
    const priceText = formatters?.formatCurrency
      ? formatters.formatCurrency(event?.ticketPrice)
      : 'Free';

    setText('#booking-event-title', title);
    setText('[data-booking-event-title]', title);
    setText('[data-booking-event-date]', dateText);
    setText('[data-booking-event-venue]', venueName);
    setText('[data-booking-event-price]', priceText);
  }

  async function loadSelectedEvent(slug) {
    const form = document.getElementById('booking-form');

    if (!slug) {
      setText('#booking-event-title', 'No event selected.');

      if (form) {
        form.innerHTML =
          '<p style="color:var(--ink-muted)">Please go back and select an event.</p>';
      }

      return null;
    }

    try {
      const event = await eventService.getEventBySlug(slug);
      setEventSummary(event);
      return event;
    } catch (error) {
      setText('#booking-event-title', 'Event not found.');
      setError(error.message || 'Could not load this event.');
      return null;
    }
  }

  function bindBookingForm(form, slug) {
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!guards?.requireAuth?.(`booking.html?slug=${encodeURIComponent(slug)}`)) {
        return;
      }

      const button = form.querySelector('button[type="submit"]');

      setError('');
      setSuccess('');

      if (button) {
        button.disabled = true;
        button.textContent = 'Booking...';
      }

      try {
        await eventService.registerForEvent(slug);

        setSuccess("You're registered! Check your email for confirmation.");
        disableForm(form);
      } catch (error) {
        setError(error.message || 'Could not complete your booking.');

        if (button) {
          button.disabled = false;
          button.textContent = 'Confirm booking';
        }
      }
    });
  }

  async function boot() {
    siteUi?.initCursor?.();
    global.EventFlowNavbar?.initNavbar?.();

    const slug = getSlugFromUrl();
    const bookingForm = document.getElementById('booking-form');
    const event = await loadSelectedEvent(slug);

    if (!bookingForm || !event) {
      return;
    }

    bindBookingForm(bookingForm, slug);
  }

  global.EventFlowBookingPage = {
    bindBookingForm,
    boot,
    getSlugFromUrl,
    loadSelectedEvent,
    setEventSummary,
  };
})(window);
