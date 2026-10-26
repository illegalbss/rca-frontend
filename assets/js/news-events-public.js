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

  // Announcement bodies are written by staff and may contain simple
  // formatting (paragraphs, bold, lists, a highlighted dates box). Only
  // those safe pieces are kept before showing it on the public site:
  // no scripts, links, images, event handlers or style tricks.
  const SAFE_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'DIV', 'SPAN',
    'H3', 'H4', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'SMALL']);
  function safeHtml(html) {
    const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
    (function clean(node) {
      [...node.children].forEach(el => {
        if (!SAFE_TAGS.has(el.tagName)) {
          // Keep the text of anything not allowed, drop the element itself.
          el.replaceWith(doc.createTextNode(el.textContent));
          return;
        }
        [...el.attributes].forEach(attr => {
          const ok = attr.name === 'style' && !/url\s*\(|expression|javascript:|position\s*:/i.test(attr.value);
          if (!ok) el.removeAttribute(attr.name);
        });
        clean(el);
      });
    })(doc.body.firstChild);
    return doc.body.firstChild.innerHTML;
  }

  function announcementCard(a) {
    // A short preview on the card; "Read full announcement" opens the
    // whole message (with any highlighted dates) right under it.
    const plain = String(a.body || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const excerpt = plain.length > 220 ? plain.slice(0, 220) + '…' : plain;
    return `
      <article class="card news-card-item news-announcement" data-category="news">
        <div class="news-card-body">
          <div class="post-meta">
            <span class="post-date">📅 ${formatDate(a.published_at || a.created_at)}</span>
            <span class="post-category-tag tag-news">Announcement</span>
          </div>
          <h3>${escapeHtml(a.title)}</h3>
          <p class="ann-excerpt">${escapeHtml(excerpt)}</p>
          <div class="ann-full" hidden>${safeHtml(a.body)}</div>
          <button type="button" class="btn btn-outline btn-sm ann-toggle" aria-expanded="false">Read full announcement</button>
        </div>
      </article>`;
  }

  // Open / close a full announcement (one handler for every card).
  document.addEventListener('click', e => {
    const btn = e.target.closest('.ann-toggle');
    if (!btn) return;
    const card = btn.closest('.news-announcement');
    const full = card.querySelector('.ann-full');
    const open = full.hidden;
    full.hidden = !open;
    card.querySelector('.ann-excerpt').hidden = open;
    btn.textContent = open ? 'Show less' : 'Read full announcement';
    btn.setAttribute('aria-expanded', String(open));
    card.classList.toggle('is-open', open);
  });

  try {
    const [eventsRes, annRes] = await Promise.all([
      fetch(`${apiUrl}/public/events`).then(r => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] })),
      fetch(`${apiUrl}/public/announcements`).then(r => r.ok ? r.json() : { announcements: [] }).catch(() => ({ announcements: [] }))
    ]);

    const eventsHtml = (eventsRes.events || []).map(eventCard).join('');
    // Announcements arrive newest first; they go at the very top of the
    // grid so the latest notice is the first thing parents see.
    const annHtml = (annRes.announcements || []).map(announcementCard).join('');
    const grid = placeholder.parentNode;
    if (annHtml) grid.insertAdjacentHTML('afterbegin', annHtml);

    // Events replace the placeholder as direct siblings in .news-grid (a
    // CSS grid) — nesting them one level deeper would break the layout.
    if (eventsHtml) placeholder.outerHTML = eventsHtml;
    else placeholder.remove();
  } catch (e) {
    placeholder.remove();
  }
})();
