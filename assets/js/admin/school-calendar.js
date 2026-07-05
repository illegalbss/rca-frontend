/* ============================================
   SCHOOL CALENDAR — school-calendar.js
   Royal Crystal Academy — 2025/2026
*/

/* Load calendar events from localStorage — no fake data */
function loadCalendarEvents() {
  try {
    const stored = localStorage.getItem('rca_calendar_events');
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return [];
}

function saveCalendarEvents(events) {
  localStorage.setItem('rca_calendar_events', JSON.stringify(events));
  window.SCHOOL_EVENTS = events;
}

// Clear any old fake events
const _storedCal = localStorage.getItem('rca_calendar_events');
if (!_storedCal) {
  // First load — start fresh, no fake data
  saveCalendarEvents([]);
}

window.SCHOOL_EVENTS = loadCalendarEvents();

document.addEventListener('DOMContentLoaded', () => {

  const curUser  = window.CURRENT_USER;
  const curRoles = curUser ? (curUser.roles || [curUser.role]) : [];
  const canManage= curRoles.includes('ict_admin') || curRoles.includes('head_teacher');

  if (canManage) {
    const addBtn = document.getElementById('addEventBtn');
    if (addBtn) addBtn.style.display = 'block';
  }

  // Calendar state
  const today   = new Date();
  let viewYear  = today.getFullYear();
  let viewMonth = today.getMonth(); // 0-indexed

  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  /* ---- Build month grid ---- */
  function renderCalendar() {
    const label = document.getElementById('calMonthLabel');
    label.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

    const grid = document.getElementById('calGrid');

    // Day name headers
    let html = DAYS.map(d => `<div class="cal-day-name">${d}</div>`).join('');

    const firstDay  = new Date(viewYear, viewMonth, 1).getDay();
    const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevDays  = new Date(viewYear, viewMonth, 0).getDate();

    // Events this month keyed by day
    const monthStr = String(viewMonth + 1).padStart(2,'0');
    const prefix   = `${viewYear}-${monthStr}-`;
    const eventMap = {};
    window.SCHOOL_EVENTS.forEach(e => {
      if (e.date.startsWith(prefix)) {
        const day = parseInt(e.date.slice(8,10));
        if (!eventMap[day]) eventMap[day] = [];
        eventMap[day].push(e);
      }
    });

    // Previous month filler
    for (let i = firstDay - 1; i >= 0; i--) {
      html += `<div class="cal-day other-month">${prevDays - i}</div>`;
    }

    // Current month days
    for (let d = 1; d <= daysCount; d++) {
      const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
      const hasEvent = !!eventMap[d];
      html += `<div class="cal-day ${isToday?'today':''} ${hasEvent?'has-event':''}"
        data-day="${d}" title="${hasEvent ? eventMap[d].map(e=>e.title).join(', ') : ''}">${d}</div>`;
    }

    // Next month filler
    const totalCells = firstDay + daysCount;
    const remaining  = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remaining; d++) {
      html += `<div class="cal-day other-month">${d}</div>`;
    }

    grid.innerHTML = html;

    // Click on a day
    grid.querySelectorAll('.cal-day:not(.other-month)').forEach(cell => {
      cell.addEventListener('click', () => {
        grid.querySelectorAll('.cal-day').forEach(c => c.style.outline = '');
        cell.style.outline = '2px solid #1d4ed8';
        const day = parseInt(cell.dataset.day);
        const dateStr = `${viewYear}-${monthStr}-${String(day).padStart(2,'0')}`;
        showEventsForDate(dateStr);
      });
    });
  }

  /* ---- Events for selected date ---- */
  function showEventsForDate(dateStr) {
    const label  = document.getElementById('eventsForDate');
    const listEl = document.getElementById('calEventsList');
    const d      = new Date(dateStr + 'T12:00:00');
    const fmtDate = d.toLocaleDateString('en-NG', {weekday:'long',day:'numeric',month:'long',year:'numeric'});

    label.textContent = fmtDate;

    const eventsOnDay = window.SCHOOL_EVENTS.filter(e => e.date === dateStr);

    if (eventsOnDay.length === 0) {
      listEl.innerHTML = `<div style="text-align:center;padding:20px;color:#9ca3af;font-size:0.82rem">No events on this date.</div>`;
    } else {
      listEl.innerHTML = eventsOnDay.map(e => `
        <div class="cal-event-item">
          <div class="cal-event-color" style="background:${e.color}"></div>
          <div>
            <div class="cal-event-title">${e.title}</div>
            <div class="cal-event-date">${fmtDate}</div>
          </div>
        </div>`).join('');
    }
  }

  /* ---- Upcoming events list (default view) ---- */
  function showUpcoming() {
    const label  = document.getElementById('eventsForDate');
    const listEl = document.getElementById('calEventsList');
    label.textContent = 'Upcoming Events';

    const todayStr = today.toISOString().split('T')[0];
    const upcoming = window.SCHOOL_EVENTS
      .filter(e => e.date >= todayStr)
      .sort((a,b) => a.date.localeCompare(b.date))
      .slice(0, 10);

    if (upcoming.length === 0) {
      listEl.innerHTML = `<div style="text-align:center;padding:20px;color:#9ca3af;font-size:0.82rem">No upcoming events.</div>`;
      return;
    }

    listEl.innerHTML = upcoming.map(e => {
      const d = new Date(e.date + 'T12:00:00');
      const fmt = d.toLocaleDateString('en-NG', {weekday:'short',day:'numeric',month:'short'});
      return `<div class="cal-event-item">
        <div class="cal-event-color" style="background:${e.color}"></div>
        <div>
          <div class="cal-event-title">${e.title}</div>
          <div class="cal-event-date">${fmt}</div>
        </div>
      </div>`;
    }).join('');
  }

  /* ---- Term overview ---- */
  function renderTermOverview() {
    const el = document.getElementById('termOverview');
    el.innerHTML = `
      <div style="text-align:center;padding:18px 12px;color:#9ca3af;font-size:0.82rem">
        <div style="font-size:1.5rem;margin-bottom:8px">📅</div>
        <div style="font-weight:600;color:#6b7280;margin-bottom:4px">No term dates configured</div>
        <div>The ICT Administrator or Head Teacher can add term dates and events using the <strong>+ Add Entry</strong> button above.</div>
      </div>`;
  }

  /* ---- Nav buttons ---- */
  document.getElementById('calPrev').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
    showUpcoming();
  });

  document.getElementById('calNext').addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
    showUpcoming();
  });

  /* ---- Add event (ICT Admin / Head Teacher) ---- */
  document.getElementById('addEventBtn')?.addEventListener('click', () => {
    const title    = prompt('Event Title:');
    if (!title) return;
    const dateStr  = prompt('Event Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) { alert('Invalid date format.'); return; }

    window.SCHOOL_EVENTS.push({ date: dateStr, title, color:'#7c3aed', category:'event' });
    if (window.RCA) window.RCA.save('events');
    window.SCHOOL_EVENTS.sort((a,b) => a.date.localeCompare(b.date));

    // Switch calendar to that month
    const d = new Date(dateStr + 'T12:00:00');
    viewYear  = d.getFullYear();
    viewMonth = d.getMonth();
    renderCalendar();
    showEventsForDate(dateStr);
  });

  /* ---- Init ---- */
  renderCalendar();
  showUpcoming();
  renderTermOverview();
});


/* ============================================================
   CALENDAR EVENTS & HOLIDAYS — ADD / EDIT / DELETE
   ============================================================ */

window.showCalendarEventModal = function(existing = null) {
  document.getElementById('calEvtModal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'calEvtModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px';

  const categoryColors = {
    academic: '#1d4ed8', holiday: '#16a34a', exam: '#f59e0b',
    event: '#7c3aed', fee: '#dc2626', meeting: '#0f766e', holiday_public: '#059669'
  };

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <div style="background:var(--color-primary);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:16px 16px 0 0;position:sticky;top:0">
        <span style="color:#fff;font-weight:700;font-size:1rem">${existing ? '✏️ Edit' : '📅 Add'} Calendar Entry</span>
        <button id="closeCalModal" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem">✕</button>
      </div>
      <div style="padding:24px">
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">Type *</label>
          <select id="cal_category" class="form-control">
            <option value="academic"      ${existing?.category==='academic'?'selected':''}     >📘 Academic (Term start/end, report cards)</option>
            <option value="exam"          ${existing?.category==='exam'?'selected':''}         >📝 Exam / Test</option>
            <option value="holiday"       ${existing?.category==='holiday'?'selected':''}      >🌴 School Holiday / Closure</option>
            <option value="holiday_public"${existing?.category==='holiday_public'?'selected':''}>🇳🇬 Public Holiday</option>
            <option value="event"         ${existing?.category==='event'?'selected':''}        >🎉 School Event</option>
            <option value="meeting"       ${existing?.category==='meeting'?'selected':''}      >👪 Parent-Teacher Meeting</option>
            <option value="fee"           ${existing?.category==='fee'?'selected':''}          >💰 Fee Deadline</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">Title *</label>
          <input type="text" id="cal_title" class="form-control" placeholder="e.g. First Term Begins" value="${existing?.title || ''}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div class="form-group">
            <label class="form-label">Start Date *</label>
            <input type="date" id="cal_date" class="form-control" value="${existing?.date || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">End Date (optional)</label>
            <input type="date" id="cal_end_date" class="form-control" value="${existing?.end_date || ''}">
          </div>
        </div>
        <div class="form-group" style="margin-bottom:20px">
          <label class="form-label">Note (optional)</label>
          <input type="text" id="cal_note" class="form-control" placeholder="e.g. Parents invited, 9AM–1PM" value="${existing?.note || ''}">
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          <button id="closeCalModal2" class="btn btn-outline" style="flex:1 1 100px">Cancel</button>
          <button id="saveCalEvent" class="btn btn-primary" style="flex:1 1 100px">${existing ? 'Save Changes' : 'Add to Calendar'}</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.getElementById('closeCalModal').onclick =
  document.getElementById('closeCalModal2').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  document.getElementById('saveCalEvent').onclick = () => {
    const title    = document.getElementById('cal_title').value.trim();
    const date     = document.getElementById('cal_date').value;
    const endDate  = document.getElementById('cal_end_date').value;
    const category = document.getElementById('cal_category').value;
    const note     = document.getElementById('cal_note').value.trim();

    if (!title || !date) { alert('Please enter a title and date.'); return; }

    const events = loadCalendarEvents();
    if (existing) {
      const idx = events.findIndex(e => e.id === existing.id);
      if (idx > -1) events[idx] = { ...events[idx], title, date, end_date: endDate, category, note, color: categoryColors[category] };
    } else {
      events.push({
        id: 'cal-' + Date.now(),
        title, date, end_date: endDate, category, note,
        color: categoryColors[category]
      });
    }

    saveCalendarEvents(events);
    window.SCHOOL_EVENTS = events;
    modal.remove();

    // Refresh calendar
    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof renderUpcoming === 'function') renderUpcoming();

    // Toast
    const t = document.createElement('div');
    t.textContent = existing ? '✅ Calendar entry updated' : '✅ Added to calendar';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#059669;color:#fff;padding:12px 20px;border-radius:10px;z-index:9999;font-size:0.85rem;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  };
};

window.deleteCalendarEvent = function(id) {
  if (!confirm('Remove this entry from the calendar?')) return;
  const events = loadCalendarEvents().filter(e => e.id !== id);
  saveCalendarEvents(events);
  window.SCHOOL_EVENTS = events;
  if (typeof renderCalendar === 'function') renderCalendar();
  if (typeof renderUpcoming === 'function') renderUpcoming();
};
