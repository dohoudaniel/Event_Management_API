/* ============================================================
   event-card.js - Reusable event card renderer
   ============================================================ */

(function (global) {
  const formatters = global.EventFlowFormatters;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getCategoryColor(categoryName) {
    const colorMap = {
      Conference: 'orange',
      Concert: 'gold',
      Workshop: 'green',
      Networking: 'orange',
      Webinar: 'green',
      Seminar: 'gold',
    };

    return colorMap[categoryName] || 'orange';
  }

  function renderEventCard(event) {
    const categoryName = formatters?.formatCategoryName
      ? formatters.formatCategoryName(event)
      : event.category?.name || 'Event';
    const venueName = formatters?.formatVenueName
      ? formatters.formatVenueName(event)
      : event.venueName || event.venue?.name || event.location || 'Venue TBC';
    const dateText = formatters?.formatDate
      ? formatters.formatDate(event.startDate || event.start_date)
      : 'Date TBC';
    const priceText = formatters?.formatCurrency
      ? formatters.formatCurrency(event.ticketPrice ?? event.ticket_price)
      : 'Free';
    const attendanceText = formatters?.formatAttendanceSummary
      ? formatters.formatAttendanceSummary(
          event.registeredCount ?? event.registered_count,
          event.capacity
        )
      : `${event.registeredCount ?? event.registered_count ?? 0} registered`;
    const progressText = formatters?.formatProgressLabel
      ? formatters.formatProgressLabel(
          event.registeredCount ?? event.registered_count,
          event.capacity
        )
      : 'Open';
    const progressValue = Number.isFinite(Number(event.progress))
      ? Math.max(0, Math.min(100, Number(event.progress)))
      : 0;
    const color = getCategoryColor(categoryName);
    const bookingUrl = event.bookingUrl || `pages/booking.html?slug=${encodeURIComponent(event.slug || '')}`;

    return `
      <div class="ev-card reveal" role="article" tabindex="0">
        <div class="ev-card-top">
          <span class="ev-tag ev-tag-${escapeHtml(color)}">${escapeHtml(categoryName)}</span>
          <div class="ev-live-dot" aria-label="Live event"></div>
        </div>

        <div class="ev-title">${escapeHtml(event.title || event.name || 'Untitled event')}</div>
        <div class="ev-meta">${escapeHtml(dateText)} · ${escapeHtml(venueName)}</div>

        <div class="ev-progress-bg"
             role="progressbar"
             aria-valuenow="${progressValue}"
             aria-valuemin="0"
             aria-valuemax="100">
          <div class="ev-progress-fill fill-${escapeHtml(color)}" style="width:${progressValue}%"></div>
        </div>

        <div class="ev-stats">
          <span>${escapeHtml(attendanceText)}</span>
          <span>${escapeHtml(progressText)}</span>
        </div>

        <div class="ev-footer">
          <div class="ev-price">${escapeHtml(priceText)}</div>
          <button
            class="ev-btn ev-btn-${escapeHtml(color)}"
            onclick="window.location.href='${escapeHtml(bookingUrl)}'">
            Book now
          </button>
        </div>
      </div>
    `;
  }

  global.EventFlowEventCard = {
    getCategoryColor,
    renderEventCard,
  };
})(window);
