/* ============================================
   PARENT PORTAL — parent-portal.js
   Royal Crystal Academy
   ============================================
   Fully rebuilt to use the real backend throughout:
     - Children: from user.linked_children, resolved via /students
     - Fees:     from /payments/lookup + /payments (history)
     - Attendance: from /attendance/summary/:admissionNo
     - Announcements/Events: from /announcements and /events
   No more window.SAMPLE_STUDENTS / PAYMENT_RECORDS / localStorage.
*/

document.addEventListener('DOMContentLoaded', async () => {

  const fmt = window.formatNaira || (n => '₦' + Number(n).toLocaleString());
  const TERM_LABELS = { term1: 'First Term', term2: 'Second Term', term3: 'Third Term' };
  const SESSION = '2025/2026';

  /* ============================================
     PAGE NAVIGATION (switches between .pp-page sections)
     Defined FIRST, unconditionally — the sidebar's onclick
     handlers need this to exist even if the user data below
     is still loading.
     ============================================ */
  window.showPage = function(pageId, linkEl) {
    document.querySelectorAll('.pp-page').forEach(p => p.style.display = 'none');
    const target = document.getElementById('page-' + pageId);
    if (target) target.style.display = 'block';

    document.querySelectorAll('[data-page]').forEach(l => l.classList.remove('active'));
    if (linkEl) linkEl.classList.add('active');
    else {
      const matching = document.querySelector(`[data-page="${pageId}"]`);
      if (matching) matching.classList.add('active');
    }
  };

  const user = window.CURRENT_USER;
  if (!user) return;

  let myChildren = [];
  let selectedChild = null;
  let selectedResultChild = null;

  /* ============================================
     LOAD REAL CHILDREN
     ============================================ */
  async function loadMyChildren() {
    if (!window.RCA_API) return [];
    const admNos = user.linked_children || [];
    if (admNos.length === 0) return [];
    try {
      const data = await window.RCA_API.call('/students');
      return (data.students || []).filter(s => admNos.includes(s.admission_no));
    } catch (e) {
      console.warn('Could not load children:', e.message);
      return [];
    }
  }

  /* ============================================
     MY CHILDREN PAGE
     ============================================ */
  function renderChildrenList() {
    const list = document.getElementById('childrenList');
    if (!list) return;

    if (myChildren.length === 0) {
      list.innerHTML = `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:18px;text-align:center;color:#92400e;font-size:0.85rem">
        ⚠ No children are linked to your account yet. Please contact the school's ICT Administrator.
      </div>`;
      return;
    }

    list.innerHTML = myChildren.map(c => `
      <div class="pp-card" style="padding:16px 18px;display:flex;align-items:center;gap:14px;margin-bottom:12px">
        <div style="width:52px;height:52px;border-radius:50%;background:#1d4ed8;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">
          ${c.full_name.split(' ').map(p=>p[0]).join('').substring(0,2).toUpperCase()}
        </div>
        <div>
          <div style="font-weight:700;color:#111827">${c.full_name}</div>
          <div style="font-size:0.8rem;color:#6b7280">${c.class_name} • ${c.admission_no} • ${(c.gender||'').toLowerCase()==='male'?'Male':'Female'}</div>
        </div>
      </div>
    `).join('');
  }

  /* ============================================
     GENERIC CHILD TAB BUILDER (used by Payments + Results pages)
     ============================================ */
  function buildChildTabs(containerId, selectorWrapId, onSelect) {
    const wrap = document.getElementById(selectorWrapId);
    const tabs = document.getElementById(containerId);
    if (!wrap || !tabs) return;

    if (myChildren.length <= 1) {
      wrap.style.display = 'none';
      if (myChildren.length === 1) onSelect(myChildren[0]);
      return;
    }

    wrap.style.display = 'block';
    tabs.innerHTML = myChildren.map((c, i) => `
      <button data-adm="${c.admission_no}" class="pp-child-tab" style="padding:8px 16px;border-radius:8px;border:2px solid ${i===0?'#1d4ed8':'#e5e7eb'};background:${i===0?'#eff6ff':'#fff'};color:${i===0?'#1d4ed8':'#374151'};font-weight:600;font-size:0.82rem;cursor:pointer">
        ${c.full_name}
      </button>
    `).join('');

    tabs.querySelectorAll('.pp-child-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('.pp-child-tab').forEach(b => {
          b.style.borderColor = '#e5e7eb'; b.style.background = '#fff'; b.style.color = '#374151';
        });
        btn.style.borderColor = '#1d4ed8'; btn.style.background = '#eff6ff'; btn.style.color = '#1d4ed8';
        onSelect(myChildren.find(c => c.admission_no === btn.dataset.adm));
      });
    });

    onSelect(myChildren[0]);
  }

  /* ============================================
     PAYMENTS PAGE — fee summary + history
     ============================================ */
  async function renderFeeSummary(child) {
    selectedChild = child;
    const cards = document.getElementById('paySummaryCards');
    const historyBody = document.getElementById('payHistoryBody');
    if (!cards || !child) return;

    cards.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem">Loading…</p>';

    try {
      const data = await window.RCA_API.call(
        `/payments/lookup?admission_no=${encodeURIComponent(child.admission_no)}&term=term2&session=${SESSION}`
      );
      const statusColor = data.status === 'paid' ? '#059669' : data.status === 'partial' ? '#d97706' : '#dc2626';
      const statusLabel  = data.status === 'paid' ? 'Fully Paid' : data.status === 'partial' ? 'Partially Paid' : 'Not Paid';

      cards.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:10px">
          <div style="background:#eff6ff;border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:1.1rem;font-weight:700;color:#1d4ed8">${fmt(data.grand_total)}</div>
            <div style="font-size:0.72rem;color:#6b7280">Total Fee (${TERM_LABELS.term2})</div>
          </div>
          <div style="background:#f0fdf4;border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:1.1rem;font-weight:700;color:#059669">${fmt(data.amount_paid)}</div>
            <div style="font-size:0.72rem;color:#6b7280">Paid So Far</div>
          </div>
          <div style="background:#fef2f2;border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:1.1rem;font-weight:700;color:#dc2626">${fmt(data.balance)}</div>
            <div style="font-size:0.72rem;color:#6b7280">Balance Owed</div>
          </div>
        </div>
        <div style="text-align:center">
          <span style="background:${statusColor};color:#fff;padding:4px 14px;border-radius:20px;font-size:0.78rem;font-weight:700">${statusLabel}</span>
        </div>`;
    } catch (e) {
      cards.innerHTML = `<p style="color:#dc2626;font-size:0.85rem">Could not load fee summary: ${e.message}</p>`;
    }

    // Payment history for this child
    if (historyBody) {
      historyBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:16px">Loading…</td></tr>';
      try {
        const histData = await window.RCA_API.call(`/payments?admission_no=${encodeURIComponent(child.admission_no)}`);
        const rows = histData.payments || [];
        historyBody.innerHTML = rows.length
          ? rows.map(p => `
              <tr>
                <td>${p.payment_date ? String(p.payment_date).substring(0,10) : '—'}</td>
                <td>${TERM_LABELS[p.term] || p.term} — ${p.fee_type || 'School Fees'}</td>
                <td>${fmt(p.amount)}</td>
                <td>${p.payment_method || '—'}</td>
                <td>${p.status}</td>
                <td>${p.reference || '—'}</td>
              </tr>`).join('')
          : '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:16px">No payment history yet.</td></tr>';
      } catch (e) {
        historyBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:16px">${e.message}</td></tr>`;
      }
    }
  }

  /* ============================================
     RESULTS PAGE
     ============================================ */
  async function renderResults(child) {
    selectedResultChild = child;
    const content = document.getElementById('resultContent');
    const termSelect = document.getElementById('resultTermSelect');
    if (!content || !child) return;

    const term = termSelect ? termSelect.value : 'term2';
    content.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem">Checking payment status…</p>';

    try {
      const feeData = await window.RCA_API.call(
        `/payments/lookup?admission_no=${encodeURIComponent(child.admission_no)}&term=${term}&session=${SESSION}`
      );

      if (feeData.status !== 'paid') {
        content.innerHTML = `
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:20px;text-align:center;color:#92400e">
            🔒 Results for ${TERM_LABELS[term]} are locked until school fees are paid in full.<br>
            <span style="font-size:0.8rem">Outstanding balance: ${fmt(feeData.balance)}</span>
          </div>`;
        return;
      }

      content.innerHTML = `<p style="color:#9ca3af;font-size:0.85rem">Results for ${child.full_name} — ${TERM_LABELS[term]} will appear here once your school's results system is fully connected.</p>`;
    } catch (e) {
      content.innerHTML = `<p style="color:#dc2626;font-size:0.85rem">Could not check results access: ${e.message}</p>`;
    }
  }

  document.getElementById('resultTermSelect')?.addEventListener('change', () => {
    if (selectedResultChild) renderResults(selectedResultChild);
  });

  /* ============================================
     ATTENDANCE PAGE
     ============================================ */
  async function renderAttendance() {
    const content = document.getElementById('attendanceContent');
    if (!content) return;
    if (myChildren.length === 0) { content.innerHTML = ''; return; }

    content.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem">Loading…</p>';

    const child = myChildren[0];
    try {
      const data = await window.RCA_API.call(`/attendance/summary/${encodeURIComponent(child.admission_no)}`);
      const rows = data.summary || [];
      const thisTerm = rows.find(r => r.term === 'term2');

      if (!thisTerm) {
        content.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem">No attendance recorded yet this term.</p>';
        return;
      }

      content.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;text-align:center">
          <div class="pp-card" style="padding:16px"><div style="font-weight:700;color:#059669;font-size:1.3rem">${thisTerm.present}</div><div style="font-size:0.75rem;color:#6b7280">Present</div></div>
          <div class="pp-card" style="padding:16px"><div style="font-weight:700;color:#dc2626;font-size:1.3rem">${thisTerm.absent}</div><div style="font-size:0.75rem;color:#6b7280">Absent</div></div>
          <div class="pp-card" style="padding:16px"><div style="font-weight:700;color:#d97706;font-size:1.3rem">${thisTerm.late}</div><div style="font-size:0.75rem;color:#6b7280">Late</div></div>
          <div class="pp-card" style="padding:16px"><div style="font-weight:700;color:#1d4ed8;font-size:1.3rem">${thisTerm.pct}%</div><div style="font-size:0.75rem;color:#6b7280">Attendance Rate</div></div>
        </div>`;
    } catch (e) {
      content.innerHTML = `<p style="color:#9ca3af;font-size:0.85rem">Attendance data not available yet.</p>`;
    }
  }

  /* ============================================
     ANNOUNCEMENTS — both the dashboard widget and full page
     ============================================ */
  async function getParentAnnouncements() {
    if (!window.RCA_API) return [];
    try {
      const data = await window.RCA_API.call('/announcements');
      return (data.announcements || [])
        .filter(a => a.status === 'published' && (a.audience || []).includes('parents'))
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (e) {
      console.warn('Could not load announcements:', e.message);
      return [];
    }
  }

  async function getUpcomingEvents() {
    if (!window.RCA_API) return [];
    try {
      const data = await window.RCA_API.call('/events');
      const today = new Date();
      return (data.events || [])
        .filter(e => (e.audience === 'all' || e.audience === 'parents') && new Date(e.event_date) >= today)
        .sort((a,b) => new Date(a.event_date) - new Date(b.event_date));
    } catch (e) {
      console.warn('Could not load events:', e.message);
      return [];
    }
  }

  function announcementCardHtml(a) {
    const typeColors = {
      announcement: { bg:'#eff6ff', color:'#1d4ed8', icon:'📢' },
      urgent:       { bg:'#fef2f2', color:'#dc2626', icon:'⚠️' },
      newsletter:   { bg:'#f0fdf4', color:'#047857', icon:'📰' },
    };
    const tc = typeColors[a.type] || typeColors.announcement;
    return `
      <div style="border-left:4px solid ${tc.color};background:${tc.bg};border-radius:8px;padding:12px 16px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px">
          <strong style="font-size:0.85rem;color:#111827">${tc.icon} ${a.title}</strong>
          <span style="font-size:0.7rem;color:#9ca3af;white-space:nowrap">${new Date(a.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
        </div>
        <p style="font-size:0.8rem;color:#374151;line-height:1.5">${a.body}</p>
      </div>`;
  }

  async function renderDashboardWidgets() {
    const dashAnn = document.getElementById('dashAnnouncements');
    const dashEvt = document.getElementById('dashEvents');

    if (dashAnn) {
      dashAnn.innerHTML = '<p style="color:#9ca3af;font-size:0.82rem">Loading…</p>';
      const items = (await getParentAnnouncements()).slice(0, 3);
      dashAnn.innerHTML = items.length
        ? items.map(announcementCardHtml).join('')
        : '<p style="color:#9ca3af;font-size:0.82rem">No recent announcements.</p>';
    }

    if (dashEvt) {
      dashEvt.innerHTML = '<p style="color:#9ca3af;font-size:0.82rem">Loading…</p>';
      const items = (await getUpcomingEvents()).slice(0, 3);
      dashEvt.innerHTML = items.length
        ? items.map(ev => `
            <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
              <div style="background:#4f46e5;color:#fff;border-radius:8px;padding:6px 10px;text-align:center;min-width:44px">
                <div style="font-weight:700;font-size:0.95rem">${new Date(ev.event_date).getDate()}</div>
                <div style="font-size:0.6rem;text-transform:uppercase">${new Date(ev.event_date).toLocaleString('en',{month:'short'})}</div>
              </div>
              <div>
                <div style="font-weight:600;font-size:0.85rem;color:#111827">${ev.title}</div>
                ${ev.location ? `<div style="font-size:0.72rem;color:#6b7280">📍 ${ev.location}</div>` : ''}
              </div>
            </div>`).join('')
        : '<p style="color:#9ca3af;font-size:0.82rem">No upcoming events.</p>';
    }
  }

  async function renderAnnouncementsPage() {
    const content = document.getElementById('announcementsContent');
    if (!content) return;
    content.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem">Loading…</p>';
    const items = await getParentAnnouncements();
    content.innerHTML = items.length
      ? items.map(announcementCardHtml).join('')
      : '<p style="color:#9ca3af;font-size:0.85rem;text-align:center;padding:24px">No announcements at this time.</p>';
  }

  /* ============================================
     INIT
     ============================================ */
  myChildren = await loadMyChildren();
  renderChildrenList();
  buildChildTabs('payChildTabs', 'payChildSelector', renderFeeSummary);
  buildChildTabs('resultChildTabs', 'resultChildSelector', renderResults);
  renderAttendance();
  renderDashboardWidgets();
  renderAnnouncementsPage();
});
