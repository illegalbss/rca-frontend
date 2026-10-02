/*
  NEWS & EVENTS — PUBLIC DYNAMIC LOADER — news-events-public.js
  ================================
  Fills in #dynamicNewsItems with real data from the database:
    - GET /api/public/events        (admin-created events, audience "Everyone")
    - GET /api/public/announcements (announcements the admin flagged
                                      with the "Public Website" checkbox)

  Replaces the placeholder div with sibling .news-card-item cards (same
  shape as the hand-written achievement cards above it) so the filter
  tabs in news-filter.js — which look for data-category="event"/"news" —
  work on these too.
*/
(async function loadPublicNewsAndEvents() {
  const placeholder = document.getElementById('dynamicNewsItems');
  if (!placeholder) return;

  const apiUrl = window.RCA_CONFIG?.API_URL || 'http://localhost:3000/api';

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function eventCard(ev) {
    const meta = [ev.time, ev.location].filter(Boolean).join(' · ');
    return `
      <article class="card news-card-item" data-category="event">
        <div class="news-card-body">
          <div class="post-meta">
            <span class="post-date">📅 ${formatDate(ev.event_date)}</span>
            <span class="post-category-tag tag-event">Event</span>
          </div>
          <h3>${escapeHtml(ev.title)}</h3>
          <p>${meta ? escapeHtml(meta) + (ev.description ? ' — ' : '') : ''}${escapeHtml(ev.description || '')}</p>
        </div>
      </article>`;
  }

  function announcementCard(a) {
    // Announcement bodies can contain HTML (newsletters) — strip tags
    // for this preview-style card; the full version isn't published
    // on a standalone page yet, so this is a summary only.
    const plain = String(a.body || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const excerpt = plain.length > 220 ? plain.slice(0, 220) + '…' : plain;
    return `
      <article class="card news-card-item" data-category="news">
        <div class="news-card-body">
          <div class="post-meta">
            <span class="post-date">📅 ${formatDate(a.published_at || a.created_at)}</span>
            <span class="post-category-tag tag-news">News</span>
          </div>
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml(excerpt)}</p>
        </div>
      </article>`;
  }

  try {
    const [eventsRes, annRes] = await Promise.all([
      fetch(`${apiUrl}/public/events`).then(r => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] })),
      fetch(`${apiUrl}/public/announcements`).then(r => r.ok ? r.json() : { announcements: [] }).catch(() => ({ announcements: [] }))
    ]);

    const cardsHtml = [
      ...(eventsRes.events || []).map(eventCard),
      ...(annRes.announcements || []).map(announcementCard)
    ].join('');

    if (!cardsHtml) {
      placeholder.remove();
      return;
    }

    // Replace the placeholder with the new cards as direct siblings in
    // .news-grid (a CSS grid) — nesting them one level deeper inside the
    // placeholder div would break the grid layout.
    placeholder.outerHTML = cardsHtml;
  } catch (e) {
    placeholder.remove();
  }
})();
