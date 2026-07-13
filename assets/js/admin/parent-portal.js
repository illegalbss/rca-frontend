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

  /* ============================================
     MOBILE SIDEBAR TOGGLE
     The sidebar is translated off-screen below 900px width (see
     parent-portal.css) and only slides back in via the .open class —
     nothing was ever wiring the hamburger button to add it, so on
     mobile the nav was completely unreachable beyond the Dashboard.
     ============================================ */
  const ppSidebar = document.getElementById('ppSidebar');
  const ppOverlay = document.getElementById('ppOverlay');
  function closeSidebar() {
    ppSidebar?.classList.remove('open');
    ppOverlay?.classList.remove('open');
  }
  document.getElementById('ppMenuToggle')?.addEventListener('click', () => {
    ppSidebar?.classList.toggle('open');
    ppOverlay?.classList.toggle('open');
  });
  ppOverlay?.addEventListener('click', closeSidebar);
  document.querySelectorAll('.pp-nav-link[data-page]').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });

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
     DASHBOARD HEADER — topbar name/avatar + welcome banner
     ============================================ */
  function renderDashboardHeader() {
    const nameEl = document.getElementById('ppUserName');
    const avatarEl = document.getElementById('ppAvatar');
    const welcomeEl = document.getElementById('dashWelcomeName');
    if (nameEl) nameEl.textContent = user.full_name || 'Parent';
    if (avatarEl) avatarEl.textContent = (user.full_name || '?').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
    if (welcomeEl) welcomeEl.textContent = (user.full_name || 'Parent').split(' ')[0];
  }

  /* ============================================
     DASHBOARD STAT CARDS — children count, outstanding balance
     (summed across all children, current term), most recent payment
     ============================================ */
  async function renderDashStats() {
    const wrap = document.getElementById('dashStats');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="pp-stat">
        <div class="pp-stat-label">My Children</div>
        <span class="pp-stat-value">${myChildren.length}</span>
        <button class="pp-stat-link" onclick="showPage('children', document.querySelector('[data-page=children]'))">View Details</button>
      </div>
      <div class="pp-stat">
        <div class="pp-stat-label">Outstanding Balance</div>
        <span class="pp-stat-value" id="dashBalanceValue">…</span>
        <button class="pp-stat-link" onclick="showPage('payments', document.querySelector('[data-page=payments]'))">View Payments</button>
      </div>
      <div class="pp-stat">
        <div class="pp-stat-label">Recent Payment</div>
        <span class="pp-stat-value" id="dashRecentValue">…</span>
        <span class="pp-stat-label" id="dashRecentDate"></span>
      </div>
    `;

    if (myChildren.length === 0) {
      document.getElementById('dashBalanceValue').textContent = fmt(0);
      document.getElementById('dashRecentValue').textContent = 'None yet';
      return;
    }

    let totalBalance = 0;
    let mostRecent = null;
    await Promise.all(myChildren.map(async (c) => {
      try {
        const lookup = await window.RCA_API.call(
          `/payments/lookup?admission_no=${encodeURIComponent(c.admission_no)}&term=term2&session=${SESSION}`
        );
        totalBalance += Number(lookup.balance || 0);
      } catch (e) { /* balance stays whatever we've summed so far */ }
      try {
        const hist = await window.RCA_API.call(`/payments?admission_no=${encodeURIComponent(c.admission_no)}`);
        (hist.payments || []).forEach(p => {
          if (!mostRecent || new Date(p.payment_date) > new Date(mostRecent.payment_date)) mostRecent = p;
        });
      } catch (e) { /* leave mostRecent as-is */ }
    }));

    const balanceEl = document.getElementById('dashBalanceValue');
    if (balanceEl) {
      balanceEl.textContent = fmt(totalBalance);
      balanceEl.classList.add(totalBalance > 0 ? 'red' : 'green');
    }
    const recentEl = document.getElementById('dashRecentValue');
    const recentDateEl = document.getElementById('dashRecentDate');
    if (recentEl) recentEl.textContent = mostRecent ? fmt(mostRecent.amount) : 'None yet';
    if (recentDateEl && mostRecent?.payment_date) {
      recentDateEl.textContent = new Date(mostRecent.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  /* ============================================
     DASHBOARD "MY CHILDREN" PREVIEW CARDS
     ============================================ */
  function renderDashChildCards() {
    const wrap = document.getElementById('dashChildCards');
    if (!wrap) return;
    wrap.innerHTML = myChildren.length
      ? myChildren.map(c => `
          <div class="pp-child-dash-card" style="cursor:pointer" onclick="window._openChildDetail('${c.admission_no}')">
            <div class="pp-child-avatar-lg">${c.full_name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()}</div>
            <div class="pp-child-dash-name">${c.full_name}</div>
            <div class="pp-child-dash-meta">${c.class_name}</div>
            <button class="pp-view-profile-btn" onclick="event.stopPropagation();window._openChildDetail('${c.admission_no}')">View Profile</button>
          </div>`).join('')
      : '<p style="color:#9ca3af;font-size:0.82rem">No children linked to your account yet.</p>';
  }

  /* ============================================
     STUDENT PROFILE PAGE — full details for one child, with
     Profile / Academic / Attendance / Documents tabs
     ============================================ */
  function jumpToChildPage(pageId, child) {
    showPage(pageId, document.querySelector(`[data-page="${pageId}"]`));

    function highlightTab(tabsId) {
      document.getElementById(tabsId)?.querySelectorAll('.pp-child-tab').forEach(b => {
        const active = b.dataset.adm === child.admission_no;
        b.style.borderColor = active ? 'var(--color-primary)' : '#e5e7eb';
        b.style.background  = active ? 'rgba(107,15,26,0.08)' : '#fff';
        b.style.color       = active ? 'var(--color-primary)' : '#374151';
      });
    }

    if (pageId === 'payments') { renderFeeSummary(child); highlightTab('payChildTabs'); }
    else if (pageId === 'results') { renderResults(child); highlightTab('resultChildTabs'); }
    else if (pageId === 'attendance') { renderAttendance(); }
  }

  function switchProfileTab(tabName) {
    document.querySelectorAll('.cp-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    document.querySelectorAll('.cp-tab-panel').forEach(p => p.classList.toggle('active', p.id === `cpPanel-${tabName}`));
  }

  document.querySelectorAll('.cp-tab').forEach(tab => {
    tab.addEventListener('click', () => switchProfileTab(tab.dataset.tab));
  });

  function renderChildProfilePage(c) {
    const initials = c.full_name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('cpAvatar').textContent = initials;
    document.getElementById('cpName').textContent = c.full_name;
    document.getElementById('cpStudentId').textContent = `Student ID: ${c.admission_no}`;

    const dob = c.date_of_birth
      ? new Date(c.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const admissionDate = (c.date_of_admission || c.enrolled_at)
      ? new Date(c.date_of_admission || c.enrolled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const gender = (c.gender || '').toLowerCase() === 'male' ? 'Male' : 'Female';

    document.getElementById('cpHeaderMeta').innerHTML = `
      <div><span class="cp-meta-label">Class</span><span class="cp-meta-value">${c.class_name}</span></div>
      <div><span class="cp-meta-label">Gender</span><span class="cp-meta-value">${gender}</span></div>
      <div><span class="cp-meta-label">Date of Birth</span><span class="cp-meta-value">${dob}</span></div>
      <div><span class="cp-meta-label">Admission Date</span><span class="cp-meta-value">${admissionDate}</span></div>
    `;

    // Profile tab — Parent/Guardian info (the real schema stores one
    // parent/guardian contact per pupil, not separate father/mother rows)
    document.getElementById('cpPanel-profile').innerHTML = `
      <div class="cp-info-card">
        <h3>Parent/Guardian Information</h3>
        <div class="cp-info-row"><span>Name</span><span>${c.parent_name || '—'}</span></div>
        <div class="cp-info-row"><span>Email</span><span>${c.parent_email || '—'}</span></div>
        <div class="cp-info-row"><span>Phone</span><span>${c.parent_phone || '—'}</span></div>
        <div class="cp-info-row"><span>Address</span><span>${c.parent_address || c.home_address || '—'}</span></div>
      </div>
      <div class="cp-info-card">
        <h3>Enrollment</h3>
        <div class="cp-info-row"><span>Status</span><span>${(c.status || 'active').charAt(0).toUpperCase() + (c.status || 'active').slice(1)}</span></div>
      </div>
    `;

    // Academic tab
    document.getElementById('cpPanel-academic').innerHTML = `
      <div class="cp-info-card">
        <h3>Academic Background</h3>
        <div class="cp-info-row"><span>Previous School</span><span>${c.previous_school || '—'}</span></div>
        <div class="cp-info-row"><span>Class Passed (Previous)</span><span>${c.class_passed_previous || '—'}</span></div>
        <div class="cp-info-row"><span>Current Class</span><span>${c.class_name}</span></div>
      </div>
      <button class="btn btn-primary" id="cpViewResultsBtn">📋 View Full Results</button>
    `;
    document.getElementById('cpViewResultsBtn')?.addEventListener('click', () => jumpToChildPage('results', c));

    // Attendance tab
    const attPanel = document.getElementById('cpPanel-attendance');
    attPanel.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem">Loading…</p>';
    window.RCA_API.call(`/attendance/summary/${encodeURIComponent(c.admission_no)}`)
      .then(data => {
        const thisTerm = (data.summary || []).find(r => r.term === 'term2');
        if (!thisTerm) { attPanel.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem">No attendance recorded yet this term.</p>'; return; }
        attPanel.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;text-align:center">
            <div class="pp-card" style="padding:16px"><div style="font-weight:700;color:#059669;font-size:1.3rem">${thisTerm.present}</div><div style="font-size:0.75rem;color:#6b7280">Present</div></div>
            <div class="pp-card" style="padding:16px"><div style="font-weight:700;color:#dc2626;font-size:1.3rem">${thisTerm.absent}</div><div style="font-size:0.75rem;color:#6b7280">Absent</div></div>
            <div class="pp-card" style="padding:16px"><div style="font-weight:700;color:#d97706;font-size:1.3rem">${thisTerm.late}</div><div style="font-size:0.75rem;color:#6b7280">Late</div></div>
            <div class="pp-card" style="padding:16px"><div style="font-weight:700;color:var(--color-primary);font-size:1.3rem">${thisTerm.pct}%</div><div style="font-size:0.75rem;color:#6b7280">Attendance Rate</div></div>
          </div>`;
      })
      .catch(() => { attPanel.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem">Attendance data not available yet.</p>'; });

    // Documents tab — admission checklist (physical documents on file,
    // not uploaded scans; matches the same c.docs object the Admission
    // Register page reads/writes)
    const docs = c.docs || {};
    const docList = [
      ['Passport Photograph', docs.passport],
      ['Birth Certificate', docs.birth_cert],
      ['Transfer Letter', docs.transfer_letter],
      ['Other Documents', docs.others],
    ];
    document.getElementById('cpPanel-documents').innerHTML = `
      <div class="cp-info-card">
        <h3>Submitted Documents</h3>
        ${docList.map(([label, has]) => `
          <div class="cp-doc-row">
            <span class="cp-doc-status ${has ? 'yes' : 'no'}">${has ? '✓' : '—'}</span>
            <span>${label}</span>
          </div>`).join('')}
      </div>
    `;

    switchProfileTab('profile');
  }

  window._openChildDetail = function(admissionNo) {
    const c = myChildren.find(x => x.admission_no === admissionNo);
    if (!c) return;
    renderChildProfilePage(c);
    showPage('child-profile');
  };

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
      <div class="pp-card" style="padding:16px 18px;display:flex;align-items:center;gap:14px;margin-bottom:12px;cursor:pointer" onclick="window._openChildDetail('${c.admission_no}')">
        <div style="width:52px;height:52px;border-radius:50%;background:var(--color-primary-dark);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">
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
      <button data-adm="${c.admission_no}" class="pp-child-tab" style="padding:8px 16px;border-radius:8px;border:2px solid ${i===0?'var(--color-primary)':'#e5e7eb'};background:${i===0?'rgba(107,15,26,0.08)':'#fff'};color:${i===0?'var(--color-primary)':'#374151'};font-weight:600;font-size:0.82rem;cursor:pointer">
        ${c.full_name}
      </button>
    `).join('');

    tabs.querySelectorAll('.pp-child-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('.pp-child-tab').forEach(b => {
          b.style.borderColor = '#e5e7eb'; b.style.background = '#fff'; b.style.color = '#374151';
        });
        btn.style.borderColor = 'var(--color-primary)'; btn.style.background = 'rgba(107,15,26,0.08)'; btn.style.color = 'var(--color-primary)';
        onSelect(myChildren.find(c => c.admission_no === btn.dataset.adm));
      });
    });

    onSelect(myChildren[0]);
  }

  /* ============================================
     PAYMENTS PAGE — fee breakdown, recent payments, account summary
     ============================================
     Every term's fee schedule for a child comes from the same
     /payments/lookup endpoint the admin's own Record Payment page uses
     (term-by-term, no single "whole session" endpoint exists) — so a
     full picture for one child means fetching term1/term2/term3 in
     parallel and summing them client-side. Cached per admission_no so
     switching between the breakdown/overview doesn't refetch.
     ============================================ */
  const TERMS_ORDER = ['term1', 'term2', 'term3'];
  const childFeeDataCache = {};

  async function loadChildFullFeeData(child) {
    if (childFeeDataCache[child.admission_no]) return childFeeDataCache[child.admission_no];

    const results = await Promise.all(TERMS_ORDER.map(term =>
      window.RCA_API.call(`/payments/lookup?admission_no=${encodeURIComponent(child.admission_no)}&term=${term}&session=${SESSION}`)
        .catch(() => null)
    ));

    const terms = {};
    let totalFees = 0, totalPaid = 0;
    TERMS_ORDER.forEach((term, i) => {
      terms[term] = results[i];
      if (results[i]) {
        totalFees += Number(results[i].grand_total || 0);
        totalPaid += Number(results[i].amount_paid || 0);
      }
    });

    const data = { terms, totalFees, totalPaid, totalOutstanding: totalFees - totalPaid };
    childFeeDataCache[child.admission_no] = data;
    return data;
  }

  function statusBadgeHtml(status) {
    if (status === 'paid') return '<span class="pp-badge-paid">Paid</span>';
    if (status === 'partial') return '<span class="pp-badge-partial">Partially Paid</span>';
    return '<span class="pp-badge-unpaid">Unpaid</span>';
  }

  /* ---- 4 stat cards across ALL children, computed once ---- */
  async function renderPaymentsOverviewStats() {
    const el = document.getElementById('payOverviewStats');
    if (!el) return;

    if (myChildren.length === 0) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = ['My Children', 'Total Paid', 'Total Outstanding', 'Total Fees']
      .map(label => `
        <div class="pp-stat">
          <div class="pp-stat-label">${label}</div>
          <span class="pp-stat-value">…</span>
        </div>`).join('');

    const allData = await Promise.all(myChildren.map(loadChildFullFeeData));
    const totalPaid = allData.reduce((s, d) => s + d.totalPaid, 0);
    const totalOutstanding = allData.reduce((s, d) => s + d.totalOutstanding, 0);
    const totalFees = allData.reduce((s, d) => s + d.totalFees, 0);

    el.innerHTML = `
      <div class="pp-stat">
        <div class="pp-stat-label">My Children</div>
        <span class="pp-stat-value">${myChildren.length}</span>
      </div>
      <div class="pp-stat">
        <div class="pp-stat-label">Total Paid</div>
        <span class="pp-stat-value green">${fmt(totalPaid)}</span>
      </div>
      <div class="pp-stat">
        <div class="pp-stat-label">Total Outstanding</div>
        <span class="pp-stat-value red">${fmt(totalOutstanding)}</span>
      </div>
      <div class="pp-stat">
        <div class="pp-stat-label">Total Fees (Session)</div>
        <span class="pp-stat-value">${fmt(totalFees)}</span>
      </div>`;
  }

  /* ---- Fees breakdown table: every term, for the selected child ---- */
  function renderFeeBreakdown(child, feeData) {
    const titleEl = document.getElementById('payBreakdownTitle');
    const body = document.getElementById('payBreakdownBody');
    const foot = document.getElementById('payBreakdownFoot');
    if (!body) return;

    if (titleEl) titleEl.textContent = `Fees Breakdown — ${child.full_name} (${child.class_name})`;

    body.innerHTML = TERMS_ORDER.map(term => {
      const t = feeData.terms[term];
      if (!t) return `<tr><td>${TERM_LABELS[term]}</td><td colspan="4" style="color:#9ca3af">Not available</td></tr>`;
      return `
        <tr>
          <td>${TERM_LABELS[term]}</td>
          <td>${fmt(t.grand_total)}</td>
          <td>${fmt(t.amount_paid)}</td>
          <td>${fmt(t.balance)}</td>
          <td>${statusBadgeHtml(t.status)}</td>
        </tr>`;
    }).join('');

    foot.innerHTML = `
      <tr style="font-weight:700">
        <td>Total</td>
        <td>${fmt(feeData.totalFees)}</td>
        <td>${fmt(feeData.totalPaid)}</td>
        <td>${fmt(feeData.totalOutstanding)}</td>
        <td></td>
      </tr>`;
  }

  /* ---- Recent payments list for the selected child ---- */
  async function renderRecentPayments(child) {
    const list = document.getElementById('payRecentList');
    if (!list) return;
    list.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;padding:16px 18px">Loading…</p>';

    try {
      const histData = await window.RCA_API.call(`/payments?admission_no=${encodeURIComponent(child.admission_no)}`);
      const rows = histData.payments || [];
      list.innerHTML = rows.length
        ? rows.slice(0, 8).map(p => {
            const d = p.payment_date ? new Date(p.payment_date) : null;
            return `
              <div class="pp-recent-item">
                <div class="pp-recent-date">
                  <span class="day">${d ? d.getDate() : '—'}</span>
                  <span class="month">${d ? d.toLocaleString('en', { month: 'short' }) : ''}</span>
                </div>
                <div class="pp-recent-info">
                  <div class="pp-recent-title">${TERM_LABELS[p.term] || p.term} — ${p.fee_type === 'ict_fee' ? 'ICT / Portal Fee' : 'School Fees'}</div>
                  <div class="pp-recent-sub">${child.full_name} (${child.class_name}) · ${p.payment_method || '—'}${p.reference ? ' · ' + p.reference : ''}</div>
                </div>
                <div class="pp-recent-amount">
                  <span class="amt">${fmt(p.amount)}</span>
                  ${statusBadgeHtml(p.status === 'paid' ? 'paid' : p.status)}
                </div>
              </div>`;
          }).join('')
        : '<p style="color:#9ca3af;font-size:0.85rem;padding:16px 18px">No payment history yet.</p>';
    } catch (e) {
      list.innerHTML = `<p style="color:#dc2626;font-size:0.85rem;padding:16px 18px">${e.message}</p>`;
    }
  }

  /* ---- Sidebar: Account Summary + Fee Categories for the selected child ---- */
  function renderAccountSummary(feeData) {
    const el = document.getElementById('payAccountSummary');
    if (!el) return;
    el.innerHTML = `
      <div class="pp-summary-row"><span>Total Fees</span><span>${fmt(feeData.totalFees)}</span></div>
      <div class="pp-summary-row"><span>Total Paid</span><span>${fmt(feeData.totalPaid)}</span></div>
      <div class="pp-summary-row"><span>Outstanding Balance</span><span style="color:${feeData.totalOutstanding > 0 ? '#dc2626' : '#059669'}">${fmt(feeData.totalOutstanding)}</span></div>
    `;
  }

  function renderFeeCategories(feeData) {
    const titleEl = document.getElementById('payFeeCategoriesTitle');
    const el = document.getElementById('payFeeCategories');
    if (!el) return;
    const current = feeData.terms.term2 || feeData.terms.term1 || feeData.terms.term3;
    if (titleEl) titleEl.textContent = `Fee Categories (${current ? TERM_LABELS[TERMS_ORDER.find(t => feeData.terms[t] === current)] : 'Current Term'})`;
    el.innerHTML = current && current.lines.length
      ? current.lines.map(l => `<div class="pp-fee-cat-row"><span>${l.label}</span><span>${fmt(l.amount)}</span></div>`).join('')
      : '<p style="color:#9ca3af;font-size:0.8rem">No fee schedule available.</p>';
  }

  /* ---- Orchestrator — called on child-tab select / navigation ---- */
  async function renderFeeSummary(child) {
    selectedChild = child;
    if (!child) return;

    document.getElementById('payBreakdownBody').innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:16px">Loading…</td></tr>';
    document.getElementById('payAccountSummary').innerHTML = '<p style="color:#9ca3af;font-size:0.85rem">Loading…</p>';

    try {
      const feeData = await loadChildFullFeeData(child);
      renderFeeBreakdown(child, feeData);
      renderAccountSummary(feeData);
      renderFeeCategories(feeData);
    } catch (e) {
      document.getElementById('payBreakdownBody').innerHTML = `<tr><td colspan="5" style="text-align:center;color:#dc2626;padding:16px">${e.message}</td></tr>`;
    }

    renderRecentPayments(child);
  }

  /* ---- Action buttons ---- */
  document.getElementById('downloadStatementBtn')?.addEventListener('click', () => window.print());
  document.getElementById('makePaymentBtn')?.addEventListener('click', () => {
    alert('Fees are currently paid at the school office or by bank transfer — the accountant will record your payment and it will appear here.\n\nFor payment details, please contact the school office.');
  });

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

      // Results aren't released to parents until the Head Teacher has
      // approved this class's results for the term (result_approvals).
      const approvals = (await window.RCA_API.getApprovals(term)) || [];
      const approval = approvals.find(a => a.class_name === child.class_name);
      if (!approval || approval.status !== 'approved') {
        content.innerHTML = `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;text-align:center;color:#1e40af">
            📋 Results for ${TERM_LABELS[term]} haven't been approved for release yet. Please check back soon.
          </div>`;
        return;
      }

      const resultsData = await window.RCA_API.getStudentResults(child.admission_no, term);
      const scores = resultsData?.scores || [];

      if (scores.length === 0) {
        content.innerHTML = `<p style="color:#9ca3af;font-size:0.85rem">No scores recorded yet for ${child.full_name} — ${TERM_LABELS[term]}.</p>`;
        return;
      }

      const total = scores.reduce((sum, s) => sum + Number(s.final_score || 0), 0);
      const average = (total / scores.length).toFixed(1);

      content.innerHTML = `
        <div style="margin-bottom:14px;text-align:center">
          <span style="background:var(--color-primary);color:#fff;padding:6px 16px;border-radius:20px;font-size:0.85rem;font-weight:700">Average: ${average}%</span>
        </div>
        <table class="data-table" style="width:100%">
          <thead><tr><th>Subject</th><th>CA (/40)</th><th>Exam (/60)</th><th>Total (/100)</th><th>Grade</th></tr></thead>
          <tbody>
            ${scores.map(s => `<tr>
              <td>${s.subject_name || s.subject_id}</td>
              <td>${Number(s.ca_total)}</td>
              <td>${Number(s.exam)}</td>
              <td><strong>${Number(s.final_score)}</strong></td>
              <td>${s.grade}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        ${resultsData.comment ? `<p style="margin-top:14px;font-size:0.82rem;color:#374151"><strong>Class Teacher's Remark:</strong> "${resultsData.comment}"</p>` : ''}
      `;
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
          <div class="pp-card" style="padding:16px"><div style="font-weight:700;color:var(--color-primary);font-size:1.3rem">${thisTerm.pct}%</div><div style="font-size:0.75rem;color:#6b7280">Attendance Rate</div></div>
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
     NEWSLETTER PAGE — published announcements of type 'newsletter'
     ============================================ */
  async function renderNewsletterPage() {
    const grid = document.getElementById('newsletterGrid');
    if (!grid) return;
    grid.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem">Loading…</p>';

    let items = [];
    try {
      const data = await window.RCA_API.call('/announcements');
      items = (data.announcements || [])
        .filter(a => a.type === 'newsletter' && a.status === 'published')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (e) {
      grid.innerHTML = `<p style="color:#dc2626;font-size:0.85rem">Could not load newsletters: ${e.message}</p>`;
      return;
    }

    grid.innerHTML = items.length
      ? items.map(n => `
          <div class="pp-card" style="padding:18px;margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px">
              <strong style="font-size:0.95rem;color:#111827">📰 ${n.title}</strong>
              <span style="font-size:0.72rem;color:#9ca3af;white-space:nowrap">${new Date(n.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
            </div>
            <p style="font-size:0.85rem;color:#374151;line-height:1.6;white-space:pre-wrap">${n.body}</p>
            <div style="margin-top:10px;font-size:0.75rem;color:#6b7280">— ${n.author || 'Administration'}</div>
          </div>`).join('')
      : '<p style="color:#9ca3af;font-size:0.85rem;text-align:center;padding:24px">No newsletters published yet.</p>';
  }

  /* ============================================
     SCHOOL INFORMATION PAGE
     ============================================
     Timings/uniform/requirements are fixed school policy (not stored
     anywhere in the DB); the fees section pulls live figures from
     GET /payments/fee-schedule so it never drifts from what the ICT
     Administrator has actually configured on the Fee Schedule page.
     ============================================ */
  async function renderSchoolInfoPage() {
    const el = document.getElementById('schoolInfoContent');
    if (!el) return;

    function siCard(icon, title, body) {
      return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px 22px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.05)">'
        + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
        + '<span style="font-size:1.4rem">' + icon + '</span>'
        + '<h3 style="font-family:var(--font-heading);font-size:0.95rem;font-weight:700;color:#1a3a5c;margin:0">' + title + '</h3>'
        + '</div>' + body + '</div>';
    }
    function siRow(label, value, color) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f1f5f9">'
        + '<span style="font-size:0.82rem;color:#374151">' + label + '</span>'
        + '<span style="font-size:0.83rem;font-weight:700;color:' + (color || '#1a3a5c') + '">' + value + '</span>'
        + '</div>';
    }
    function siSec(txt) {
      return '<div style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;padding:12px 0 4px">' + txt + '</div>';
    }

    /* ---- 1. School Timings ---- */
    const timingBody = '<div style="border-top:1px solid #f1f5f9">'
      + siRow('Morning Assembly', '7:20 AM — All pupils must be seated', '#065f46')
      + siSec('Primary School (Basic 1 – Basic 6)')
      + siRow('Monday – Wednesday', 'Closing: 3:30 PM')
      + siRow('Thursday – Friday', 'Closing: 2:00 PM')
      + siSec('Nursery Section (Pre-Nursery – Nursery 3)')
      + siRow('Monday – Wednesday', 'Closing: 2:00 PM')
      + siRow('Thursday – Friday', 'Closing: 12:00 Noon')
      + '</div>'
      + '<div style="margin-top:14px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:0.82rem;color:#92400e;display:flex;gap:8px;align-items:flex-start">'
      + '<span style="font-size:1rem;flex-shrink:0">&#9888;&#65039;</span>'
      + '<span><strong>Late Pickup Fee:</strong> Parents who arrive after closing time will be charged <strong>&#8358;500 per child, per occurrence.</strong> Please endeavour to pick up your wards promptly.</span>'
      + '</div>';
    const timingCard = siCard('🕐', 'School Timings', timingBody);

    /* ---- 2. Approved Uniform Schedule ---- */
    const uniformDays = [
      ['Monday &amp; Wednesday', 'Full School Uniform Day',
       'Full school uniform &nbsp;&middot;&nbsp; Black cover shoes &nbsp;&middot;&nbsp; Black stockings / socks'],
      ['Tuesday &amp; Thursday', 'Sportswear Day',
       'School sportswear &nbsp;&middot;&nbsp; White canvas shoes &nbsp;&middot;&nbsp; White socks'],
      ['Friday', 'Friday Wear',
       'Black jeans &nbsp;&middot;&nbsp; RCA white branded top &nbsp;&middot;&nbsp; White canvas shoes &nbsp;&middot;&nbsp; White stockings / socks'],
      ['1st &amp; Last Tuesday of Every Month', 'Inter-House Sports Wear Day',
       'Inter-house sports uniform &nbsp;&middot;&nbsp; White canvas shoes &nbsp;&middot;&nbsp; White socks'],
    ];
    let uniformBody = '<div style="border-top:1px solid #f1f5f9">';
    uniformDays.forEach((ud, ui) => {
      uniformBody += '<div style="padding:11px 0;border-bottom:1px solid #f1f5f9">'
        + '<div style="display:flex;align-items:flex-start;gap:10px">'
        + '<div style="min-width:24px;height:24px;border-radius:50%;background:#1a3a5c;color:#fff;font-size:0.68rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">' + (ui + 1) + '</div>'
        + '<div>'
        + '<div style="font-size:0.85rem;font-weight:700;color:#1a3a5c">' + ud[0]
        + ' <span style="font-weight:500;color:#64748b;font-size:0.78rem">— ' + ud[1] + '</span></div>'
        + '<div style="font-size:0.78rem;color:#374151;margin-top:3px;line-height:1.5">' + ud[2] + '</div>'
        + '</div></div></div>';
    });
    uniformBody += '</div>'
      + '<div style="margin-top:12px;font-size:0.78rem;color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;line-height:1.6">'
      + '&#9888;&#65039; Pupils in unapproved attire may be sent home to change. Hair must be plain black without accessories.'
      + '</div>';
    const uniformCard = siCard('👕', 'Approved School Uniform Schedule', uniformBody);

    /* ---- 3. Termly Requirements ---- */
    const termReqs = [
      ['2 Big Tissues',      'For classroom hygiene'],
      ['1 Dettol or Bleach', 'Disinfectant for cleaning'],
      ['2 Table Soap',       'For hand washing'],
      ['1 Detergent 280g',   'Cleaning supplies'],
    ];
    let reqBody = '<p style="font-size:0.82rem;color:#374151;margin:0 0 12px">Every pupil must bring the following items at the <strong>start of each term</strong>, no later than the second week of resumption.</p>'
      + '<div style="border-top:1px solid #f1f5f9">';
    termReqs.forEach((rq, ri) => {
      reqBody += '<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #f1f5f9">'
        + '<div style="width:22px;height:22px;border-radius:50%;background:#1a3a5c;color:#fff;font-size:0.68rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + (ri + 1) + '</div>'
        + '<div>'
        + '<div style="font-size:0.85rem;font-weight:700;color:#1a3a5c">' + rq[0] + '</div>'
        + '<div style="font-size:0.75rem;color:#64748b">' + rq[1] + '</div>'
        + '</div></div>';
    });
    reqBody += '</div>';
    const reqCard = siCard('📦', 'Compulsory Termly Requirements', reqBody);

    /* ---- 4. School Fees — live from the real fee schedule ---- */
    let feesCard = '';
    try {
      const feeData = await window.RCA_API.call('/payments/fee-schedule');
      const terms = feeData.terms || [];
      const termLabels = { term1: 'First Term', term2: 'Second Term', term3: 'Third Term' };

      let feesBody = '<p style="font-size:0.82rem;color:#374151;margin:0 0 14px">The following charges apply to every child per term. All fees are payable at the start of each term.</p>';

      terms.forEach(t => {
        const ictFee = Number(t.ict_fee || 0);
        const total = Number(t.school_fees) + Number(t.utility_bill) + Number(t.lesson_fee) + Number(t.levy_amount || 0) + ictFee;
        const isBasic6Levy = t.levy_basic6_amount && Number(t.levy_basic6_amount) > 0;
        feesBody += '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:12px">'
          + '<div style="font-size:0.8rem;font-weight:800;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0">'
          + (termLabels[t.term] || t.term) + '</div>'
          + siRow('School Fees', fmt(t.school_fees))
          + siRow('Utility Bill', fmt(t.utility_bill))
          + siRow('Lesson Fee', fmt(t.lesson_fee))
          + (t.levy_amount > 0 ? siRow(t.levy_label || 'Levy', fmt(t.levy_amount), '#7c3aed') : '')
          + (ictFee > 0 ? siRow('ICT / Portal Fee', fmt(ictFee)) : '')
          + '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;margin-top:2px">'
          + '<span style="font-size:0.88rem;font-weight:700;color:#1a3a5c">Total (per child)</span>'
          + '<span style="font-size:1rem;font-weight:700;color:#065f46">' + fmt(total) + '</span>'
          + '</div>'
          + (isBasic6Levy
            ? '<div style="margin-top:8px;font-size:0.75rem;color:#7c3aed;background:#f5f3ff;border-radius:6px;padding:6px 10px">'
              + '&#127891; <strong>Basic 6 (graduating pupils)</strong> pay ' + fmt(t.levy_basic6_amount) + ' ' + (t.levy_basic6_label || 'graduation levy') + ' — total <strong>' + fmt(Number(t.school_fees) + Number(t.utility_bill) + Number(t.lesson_fee) + Number(t.levy_basic6_amount) + ictFee) + '</strong>.</div>'
            : '')
          + (ictFee > 0
            ? '<p style="margin-top:8px;font-size:0.72rem;color:#6b7280">The ICT / Portal Fee covers website and results-portal maintenance, and must be paid (along with the rest of the fees above) before results are available online.</p>'
            : '')
          + '</div>';
      });

      feesBody += '<div style="margin-top:4px;font-size:0.78rem;color:#64748b;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;line-height:1.6">'
        + '&#9432; Fees are payable at the <strong>beginning of each term</strong>. Please collect your official receipt from the school office after payment. '
        + 'Contact the school accountant for any fee enquiries.'
        + '</div>';
      feesCard = siCard('💳', 'School Fees — Per Term', feesBody);
    } catch (e) {
      feesCard = siCard('💳', 'School Fees — Per Term', `<p style="color:#dc2626;font-size:0.85rem">Could not load fee schedule: ${e.message}</p>`);
    }

    el.innerHTML = timingCard + uniformCard + reqCard + feesCard;
  }

  /* ============================================
     PROFILE PAGE — the logged-in parent's own account
     ============================================ */
  function renderProfilePage() {
    const content = document.getElementById('profileContent');
    if (!content) return;

    const rows = [
      ['Full Name', user.full_name],
      ['Email', user.email],
      ['Phone', user.phone || '—'],
      ['Role', 'Parent / Guardian'],
      ['Status', (user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)],
      ['Linked Children', myChildren.length ? myChildren.map(c => c.full_name).join(', ') : 'None linked yet'],
    ];

    content.innerHTML = `
      <div class="pp-profile-grid">
        ${rows.map(([label, value]) => `
          <div class="pp-profile-row"><span class="pp-profile-label">${label}</span><span class="pp-profile-value">${value || '—'}</span></div>
        `).join('')}
      </div>
      <p style="margin-top:16px;font-size:0.78rem;color:#9ca3af">To update your contact details, please contact the school's ICT Administrator.</p>
    `;
  }

  /* ============================================
     INIT
     ============================================ */
  renderDashboardHeader();
  myChildren = await loadMyChildren();
  renderChildrenList();
  renderDashStats();
  renderDashChildCards();
  renderPaymentsOverviewStats();
  buildChildTabs('payChildTabs', 'payChildSelector', renderFeeSummary);
  buildChildTabs('resultChildTabs', 'resultChildSelector', renderResults);
  renderAttendance();
  renderDashboardWidgets();
  renderAnnouncementsPage();
  renderNewsletterPage();
  renderSchoolInfoPage();
  renderProfilePage();
});
