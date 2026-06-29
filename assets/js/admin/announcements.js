/* ============================================
   ANNOUNCEMENTS & EVENTS — announcements.js
   Royal Crystal Academy
   ============================================
   Who can CREATE/EDIT/DELETE:
     - ict_admin, head_teacher, proprietor
   Who can VIEW:
     - Staff: all published announcements
     - Parents: announcements marked for parents
   Storage: localStorage (rca_announcements, rca_events)
*/

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================
     DATA HELPERS
     ============================================ */
  function getAnnouncements() {
    try { return JSON.parse(localStorage.getItem('rca_announcements') || '[]'); }
    catch(e) { return []; }
  }

  function saveAnnouncements(arr) {
    localStorage.setItem('rca_announcements', JSON.stringify(arr));
    // Also update window.ANNOUNCEMENTS for other pages
    window.ANNOUNCEMENTS = arr;
  }

  function getEvents() {
    try { return JSON.parse(localStorage.getItem('rca_events') || '[]'); }
    catch(e) { return []; }
  }

  function saveEvents(arr) {
    localStorage.setItem('rca_events', JSON.stringify(arr));
    window.SCHOOL_EVENTS = arr;
  }

  /* ============================================
     USER + ACCESS
     ============================================ */
  const user = window.CURRENT_USER;
  const roles = user ? (user.roles || [user.role, user.primary_role]) : [];
  const canManage = roles.some(r => ['ict_admin','head_teacher','proprietor'].includes(r));

  /* ============================================
     TAB SWITCHING
     ============================================ */
  let activeTab = 'announcements';

  document.querySelectorAll('.comm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.comm-tab').forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = '#6b7280';
        t.style.boxShadow = 'none';
      });
      tab.classList.add('active');
      tab.style.background = '#fff';
      tab.style.color = '#111827';
      tab.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';

      activeTab = tab.dataset.tab;

      // Toggle panels
      const annPanel = document.getElementById('announcementsPanel');
      const evtPanel = document.getElementById('eventsPanel');
      const addAnnBtn = document.getElementById('addAnnouncementBtn');
      const addEvtBtn = document.getElementById('addEventBtn');

      if (activeTab === 'announcements') {
        if (annPanel) annPanel.style.display = 'block';
        if (evtPanel) evtPanel.style.display = 'none';
        if (addAnnBtn) addAnnBtn.style.display = canManage ? 'inline-flex' : 'none';
        if (addEvtBtn) addEvtBtn.style.display = 'none';
        renderAnnouncements();
      } else {
        if (annPanel) annPanel.style.display = 'none';
        if (evtPanel) evtPanel.style.display = 'block';
        if (addAnnBtn) addAnnBtn.style.display = 'none';
        if (addEvtBtn) addEvtBtn.style.display = canManage ? 'inline-flex' : 'none';
        renderEvents();
      }
    });
  });

  /* ============================================
     ANNOUNCEMENTS
     ============================================ */
  function renderAnnouncements() {
    const list = document.getElementById('announcementsList');
    if (!list) return;

    const all = getAnnouncements();

    // Show add button only to managers
    const addBtn = document.getElementById('addAnnouncementBtn');
    if (addBtn) addBtn.style.display = canManage ? 'inline-flex' : 'none';

    if (all.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:48px 24px;color:#6b7280">
          <div style="font-size:3rem;margin-bottom:12px">📢</div>
          <h3 style="color:#374151;margin-bottom:6px">No Announcements Yet</h3>
          <p style="font-size:0.85rem">${canManage ? 'Click "+ New Announcement" to post one.' : 'Check back later for announcements from the school.'}</p>
        </div>`;
      return;
    }

    // Sort newest first
    const sorted = [...all].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    list.innerHTML = sorted.map(ann => {
      const typeColors = {
        announcement: { bg:'#eff6ff', border:'#3b82f6', badge:'#1d4ed8', label:'Announcement' },
        urgent:       { bg:'#fef2f2', border:'#dc2626', badge:'#dc2626', label:'⚠ Urgent' },
        newsletter:   { bg:'#f0fdf4', border:'#059669', badge:'#047857', label:'Newsletter' },
        event:        { bg:'#fdf4ff', border:'#9333ea', badge:'#7c3aed', label:'Event' },
      };
      const tc = typeColors[ann.type] || typeColors.announcement;
      const audienceLabel = ann.audience?.includes('parents') && ann.audience?.includes('staff')
        ? 'Staff & Parents'
        : ann.audience?.includes('parents') ? 'Parents only'
        : ann.audience?.includes('staff') ? 'Staff only' : 'All';

      return `
        <div style="border:1px solid ${tc.border};border-radius:12px;background:${tc.bg};padding:18px 20px;margin-bottom:14px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span style="background:${tc.badge};color:#fff;font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:20px">${tc.label}</span>
              <span style="background:#e5e7eb;color:#374151;font-size:0.7rem;font-weight:600;padding:3px 10px;border-radius:20px">👥 ${audienceLabel}</span>
            </div>
            <span style="font-size:0.75rem;color:#9ca3af">${new Date(ann.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})}</span>
          </div>
          <h3 style="font-size:1rem;color:#111827;margin-bottom:6px">${ann.title}</h3>
          <p style="font-size:0.85rem;color:#374151;white-space:pre-wrap;line-height:1.6">${ann.body}</p>
          <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <span style="font-size:0.75rem;color:#6b7280">— ${ann.author || 'Administration'}</span>
            ${canManage ? `
              <div style="display:flex;gap:8px">
                <button onclick="editAnnouncement('${ann.id}')" style="padding:5px 12px;background:#fff;border:1px solid #d1d5db;border-radius:6px;font-size:0.75rem;cursor:pointer;font-weight:600">✏️ Edit</button>
                <button onclick="deleteAnnouncement('${ann.id}')" style="padding:5px 12px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:6px;font-size:0.75rem;cursor:pointer;font-weight:600">🗑 Delete</button>
              </div>
            ` : ''}
          </div>
        </div>`;
    }).join('');
  }

  /* ============================================
     EVENTS
     ============================================ */
  function renderEvents() {
    const list = document.getElementById('eventsList');
    if (!list) return;

    const addBtn = document.getElementById('addEventBtn');
    if (addBtn) addBtn.style.display = canManage ? 'inline-flex' : 'none';

    const all = getEvents();

    if (all.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:48px 24px;color:#6b7280">
          <div style="font-size:3rem;margin-bottom:12px">📅</div>
          <h3 style="color:#374151;margin-bottom:6px">No Events Scheduled</h3>
          <p style="font-size:0.85rem">${canManage ? 'Click "+ New Event" to add one.' : 'No upcoming events at this time.'}</p>
        </div>`;
      return;
    }

    // Sort by date
    const sorted = [...all].sort((a,b) => new Date(a.event_date) - new Date(b.event_date));
    const today = new Date();

    list.innerHTML = sorted.map(ev => {
      const evDate = new Date(ev.event_date);
      const isPast = evDate < today;
      const isToday = evDate.toDateString() === today.toDateString();

      return `
        <div style="border:1px solid ${isPast ? '#e5e7eb' : '#c7d2fe'};border-radius:12px;background:${isPast ? '#f9fafb' : '#eef2ff'};padding:16px 18px;margin-bottom:10px;display:flex;gap:16px;align-items:flex-start;opacity:${isPast ? '0.7' : '1'}">
          <div style="min-width:56px;text-align:center;background:${isToday ? '#4f46e5' : isPast ? '#9ca3af' : '#4f46e5'};color:#fff;border-radius:10px;padding:8px 6px">
            <div style="font-size:1.3rem;font-weight:800;line-height:1">${evDate.getDate()}</div>
            <div style="font-size:0.65rem;font-weight:600;text-transform:uppercase">${evDate.toLocaleString('en',{month:'short'})}</div>
            <div style="font-size:0.65rem">${evDate.getFullYear()}</div>
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <h3 style="font-size:0.95rem;color:#111827;font-weight:700">${ev.title}</h3>
              ${isToday ? '<span style="background:#4f46e5;color:#fff;font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:20px">TODAY</span>' : ''}
              ${isPast ? '<span style="background:#e5e7eb;color:#6b7280;font-size:0.68rem;padding:2px 8px;border-radius:20px">Past</span>' : ''}
            </div>
            ${ev.time ? `<p style="font-size:0.78rem;color:#6b7280;margin-bottom:4px">🕐 ${ev.time}</p>` : ''}
            ${ev.location ? `<p style="font-size:0.78rem;color:#6b7280;margin-bottom:4px">📍 ${ev.location}</p>` : ''}
            ${ev.description ? `<p style="font-size:0.82rem;color:#374151;margin-top:6px">${ev.description}</p>` : ''}
            <p style="font-size:0.72rem;color:#9ca3af;margin-top:6px">👥 ${ev.audience === 'all' ? 'Everyone' : ev.audience === 'parents' ? 'Parents' : 'Staff only'}</p>
          </div>
          ${canManage ? `
            <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
              <button onclick="editEvent('${ev.id}')" style="padding:5px 10px;background:#fff;border:1px solid #d1d5db;border-radius:6px;font-size:0.72rem;cursor:pointer">✏️</button>
              <button onclick="deleteEvent('${ev.id}')" style="padding:5px 10px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:6px;font-size:0.72rem;cursor:pointer">🗑</button>
            </div>
          ` : ''}
        </div>`;
    }).join('');
  }

  /* ============================================
     ADD / EDIT ANNOUNCEMENT MODAL
     ============================================ */
  function showAnnouncementModal(existing = null) {
    document.getElementById('annModalOverlay')?.remove();
    const modal = document.createElement('div');
    modal.id = 'annModalOverlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px';

    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="background:var(--color-primary);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:16px 16px 0 0;position:sticky;top:0;z-index:1">
          <span style="color:#fff;font-weight:700;font-size:1rem">${existing ? '✏️ Edit' : '📢 New'} Announcement</span>
          <button id="closeAnnModal" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem">✕</button>
        </div>
        <div style="padding:24px">
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Type *</label>
            <select id="ann_type" class="form-control">
              <option value="announcement" ${existing?.type==='announcement'?'selected':''}>📢 Announcement</option>
              <option value="urgent" ${existing?.type==='urgent'?'selected':''}>⚠️ Urgent Notice</option>
              <option value="newsletter" ${existing?.type==='newsletter'?'selected':''}>📰 Newsletter</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Title *</label>
            <input type="text" id="ann_title" class="form-control" placeholder="e.g. School Closing for Mid-Term Break" value="${existing?.title || ''}">
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Message *</label>
            <textarea id="ann_body" class="form-control" rows="6" placeholder="Type the full announcement here...">${existing?.body || ''}</textarea>
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Send To *</label>
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:6px">
              <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer">
                <input type="checkbox" id="aud_staff" value="staff" ${!existing || existing.audience?.includes('staff') ? 'checked' : ''}> Staff
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer">
                <input type="checkbox" id="aud_parents" value="parents" ${!existing || existing.audience?.includes('parents') ? 'checked' : ''}> Parents
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer">
                <input type="checkbox" id="aud_website" value="website" ${existing?.audience?.includes('website') ? 'checked' : ''}> Public Website
              </label>
            </div>
          </div>
          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">Author Name</label>
            <input type="text" id="ann_author" class="form-control" value="${existing?.author || user?.full_name || 'Administration'}">
          </div>
          <div style="display:flex;gap:10px">
            <button id="closeAnnModal2" class="btn btn-outline" style="flex:1">Cancel</button>
            <button id="saveAnnBtn" class="btn btn-primary" style="flex:1">${existing ? 'Save Changes' : 'Publish Announcement'}</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    document.getElementById('closeAnnModal').onclick =
    document.getElementById('closeAnnModal2').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('saveAnnBtn').onclick = () => {
      const title  = document.getElementById('ann_title').value.trim();
      const body   = document.getElementById('ann_body').value.trim();
      const type   = document.getElementById('ann_type').value;
      const author = document.getElementById('ann_author').value.trim();

      if (!title || !body) { alert('Please enter a title and message.'); return; }

      const audience = [];
      if (document.getElementById('aud_staff').checked)   audience.push('staff');
      if (document.getElementById('aud_parents').checked) audience.push('parents');
      if (document.getElementById('aud_website').checked) audience.push('website');
      if (audience.length === 0) { alert('Please select at least one audience.'); return; }

      const all = getAnnouncements();
      if (existing) {
        const idx = all.findIndex(a => a.id === existing.id);
        if (idx > -1) all[idx] = { ...all[idx], title, body, type, author, audience, updated_at: new Date().toISOString() };
      } else {
        all.push({
          id: 'ann-' + Date.now(),
          title, body, type, author, audience,
          created_at: new Date().toISOString(),
          status: 'published'
        });
      }
      saveAnnouncements(all);
      modal.remove();
      renderAnnouncements();
      showToast(existing ? 'Announcement updated' : 'Announcement published ✅');
    };
  }

  /* ============================================
     ADD / EDIT EVENT MODAL
     ============================================ */
  function showEventModal(existing = null) {
    document.getElementById('evtModalOverlay')?.remove();
    const modal = document.createElement('div');
    modal.id = 'evtModalOverlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px';

    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="background:#4f46e5;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:16px 16px 0 0;position:sticky;top:0">
          <span style="color:#fff;font-weight:700;font-size:1rem">${existing ? '✏️ Edit' : '📅 New'} Event</span>
          <button id="closeEvtModal" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem">✕</button>
        </div>
        <div style="padding:24px">
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Event Title *</label>
            <input type="text" id="evt_title" class="form-control" placeholder="e.g. Annual Sports Day" value="${existing?.title || ''}">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div class="form-group">
              <label class="form-label">Date *</label>
              <input type="date" id="evt_date" class="form-control" value="${existing?.event_date || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Time</label>
              <input type="time" id="evt_time" class="form-control" value="${existing?.time || ''}">
            </div>
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Location</label>
            <input type="text" id="evt_location" class="form-control" placeholder="e.g. School compound, Church Hall" value="${existing?.location || ''}">
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Description</label>
            <textarea id="evt_description" class="form-control" rows="3" placeholder="Brief description of the event...">${existing?.description || ''}</textarea>
          </div>
          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">Visible To *</label>
            <select id="evt_audience" class="form-control">
              <option value="all" ${existing?.audience==='all'?'selected':''}>Everyone (Staff + Parents)</option>
              <option value="staff" ${existing?.audience==='staff'?'selected':''}>Staff Only</option>
              <option value="parents" ${existing?.audience==='parents'?'selected':''}>Parents Only</option>
            </select>
          </div>
          <div style="display:flex;gap:10px">
            <button id="closeEvtModal2" class="btn btn-outline" style="flex:1">Cancel</button>
            <button id="saveEvtBtn" style="flex:1;padding:10px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">${existing ? 'Save Changes' : 'Add Event'}</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    document.getElementById('closeEvtModal').onclick =
    document.getElementById('closeEvtModal2').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('saveEvtBtn').onclick = () => {
      const title    = document.getElementById('evt_title').value.trim();
      const date     = document.getElementById('evt_date').value;
      const time     = document.getElementById('evt_time').value;
      const location = document.getElementById('evt_location').value.trim();
      const desc     = document.getElementById('evt_description').value.trim();
      const audience = document.getElementById('evt_audience').value;

      if (!title || !date) { alert('Please enter a title and date.'); return; }

      const all = getEvents();
      if (existing) {
        const idx = all.findIndex(e => e.id === existing.id);
        if (idx > -1) all[idx] = { ...all[idx], title, event_date: date, time, location, description: desc, audience };
      } else {
        all.push({
          id: 'evt-' + Date.now(),
          title, event_date: date, time, location,
          description: desc, audience,
          created_at: new Date().toISOString()
        });
      }
      saveEvents(all);
      modal.remove();
      renderEvents();
      showToast('Event saved ✅');
    };
  }

  /* ============================================
     GLOBAL ACTIONS (edit/delete called from HTML)
     ============================================ */
  window.editAnnouncement = (id) => {
    const ann = getAnnouncements().find(a => a.id === id);
    if (ann) showAnnouncementModal(ann);
  };

  window.deleteAnnouncement = (id) => {
    if (!confirm('Delete this announcement?')) return;
    saveAnnouncements(getAnnouncements().filter(a => a.id !== id));
    renderAnnouncements();
    showToast('Announcement deleted');
  };

  window.editEvent = (id) => {
    const ev = getEvents().find(e => e.id === id);
    if (ev) showEventModal(ev);
  };

  window.deleteEvent = (id) => {
    if (!confirm('Delete this event?')) return;
    saveEvents(getEvents().filter(e => e.id !== id));
    renderEvents();
    showToast('Event deleted');
  };

  /* ============================================
     TOAST NOTIFICATION
     ============================================ */
  function showToast(msg, color = '#059669') {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${color};color:#fff;padding:12px 20px;border-radius:10px;z-index:9999;font-size:0.85rem;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2)`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ============================================
     BUTTON WIRING
     ============================================ */
  document.getElementById('addAnnouncementBtn')?.addEventListener('click', () => showAnnouncementModal());
  document.getElementById('addEventBtn')?.addEventListener('click', () => showEventModal());

  /* ============================================
     INIT — CLEAR OLD FAKE DATA & RENDER
     ============================================ */
  // Clear old fake announcements if they have the old format
  const existing = getAnnouncements();
  const hasFakeData = existing.some(a => a.id === 'ann-1' || a.id === 'ann-2' || a.id === 'ann-3');
  if (hasFakeData) {
    saveAnnouncements([]);
    saveEvents([]);
    console.log('RCA: Cleared old fake announcements and events');
  }

  // Initial render
  renderAnnouncements();

});
