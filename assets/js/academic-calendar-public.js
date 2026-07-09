/* ============================================
   ACADEMIC CALENDAR (PUBLIC) — academic-calendar-public.js
   Royal Crystal Academy
   ============================================
   Renders the Key Dates timeline and Public Holidays table from the
   real calendar (GET /api/public/calendar, no login needed) — the same
   calendar_events the ICT Administrator manages on the admin School
   Calendar page. Editing term dates for a new session just means
   adding/editing entries there; this page picks it up automatically.
*/

document.addEventListener('DOMContentLoaded', async () => {

  const timelineEl = document.getElementById('calTimeline');
  const holidaysBody = document.getElementById('calHolidaysBody');
  if (!timelineEl && !holidaysBody) return;

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function formatRange(start, end) {
    if (!end || end === start) return formatDate(start);
    const s = new Date(start), e = new Date(end);
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    const startStr = sameMonth
      ? s.toLocaleDateString('en-GB', { day: 'numeric' })
      : s.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${startStr} — ${formatDate(end)}`;
  }

  let events = [];
  try {
    const apiUrl = window.RCA_CONFIG?.API_URL || 'http://localhost:3000/api';
    const res = await fetch(`${apiUrl}/public/calendar`);
    const data = await res.json();
    events = data.events || [];
  } catch (e) {
    if (timelineEl) timelineEl.innerHTML = '<p style="text-align:center;color:var(--color-text-light)">Could not load the calendar right now — please check back soon.</p>';
    if (holidaysBody) holidaysBody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--color-text-light)">Could not load holidays.</td></tr>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /* ---- Timeline: academic + exam + event + meeting + fee entries ---- */
  if (timelineEl) {
    const timelineEvents = events
      .filter(e => e.category !== 'holiday' && e.category !== 'holiday_public')
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

    timelineEl.innerHTML = timelineEvents.length
      ? timelineEvents.map(e => {
          const eventDate = new Date(e.event_date);
          const isDone = eventDate < today;
          return `
            <div class="timeline-item">
              <div class="timeline-dot ${isDone ? 'dot-done' : 'dot-upcoming'}"></div>
              <div class="card timeline-content">
                <span class="timeline-date">${formatRange(e.event_date, e.end_date)}</span>
                <h4>${e.title}</h4>
                ${e.description ? `<p>${e.description}</p>` : ''}
              </div>
            </div>`;
        }).join('')
      : '<p style="text-align:center;color:var(--color-text-light)">No dates published yet — please check back soon.</p>';
  }

  /* ---- Public holidays table ---- */
  if (holidaysBody) {
    const holidays = events
      .filter(e => e.category === 'holiday' || e.category === 'holiday_public')
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

    holidaysBody.innerHTML = holidays.length
      ? holidays.map(h => `<tr><td>${formatRange(h.event_date, h.end_date)}</td><td>${h.title}</td></tr>`).join('')
      : '<tr><td colspan="2" style="text-align:center;color:var(--color-text-light)">No holidays published yet.</td></tr>';
  }

  // "Download Calendar (PDF)" — the browser's native print dialog offers
  // "Save as PDF" as a destination, so this always reflects whatever
  // dates are currently published, with no separate file to keep in sync.
  document.getElementById('downloadCalendarBtn')?.addEventListener('click', () => {
    window.print();
  });

});
