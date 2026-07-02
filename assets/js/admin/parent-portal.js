/* ============================================
   PARENT PORTAL — parent-portal.js
   Full sidebar dashboard: Dashboard, My Children,
   Payments, Results, Newsletter, Announcements, Profile
   ============================================ */

/* ---- Payment tracking (session-only; Phase 4 → Paystack) ---- */
if (!window.PARENT_PAYMENTS) window.PARENT_PAYMENTS = {};

function hasParentPaid(userId, admNo, term) {
  return window.PARENT_PAYMENTS[`${userId}|${admNo}|${term}`] === true;
}
function recordParentPayment(userId, admNo, term) {
  window.PARENT_PAYMENTS[`${userId}|${admNo}|${term}`] = true;
}

/* ---- Page navigation ---- */
window.showPage = function(pageId, linkEl) {
  document.querySelectorAll('.pp-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.pp-nav-link').forEach(l => l.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  if (linkEl) linkEl.classList.add('active');
  const titles = {
    dashboard:'Dashboard', children:'My Children', payments:'Payments',
    results:'Results', newsletter:'Newsletter', announcements:'Announcements',
    'school-info':'School Information', profile:'Profile'
  };
  document.getElementById('ppPageTitle').textContent = titles[pageId] || pageId;
  // Close mobile sidebar
  document.getElementById('ppSidebar').classList.remove('open');
  document.getElementById('ppOverlay').classList.remove('open');
};

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Auth guard ---- */
  const role = sessionStorage.getItem('rca_demo_role');
  if (!role) { window.location.href = 'parent-login.html'; return; }
  if (role !== 'parent') { window.location.href = 'dashboard.html'; return; }

  /* ---- Data sources ---- */
  const allUsers    = window.SAMPLE_USERS    || [];
  const allStudents = window.SAMPLE_STUDENTS || [];
  const allSubjects = window.SCHOOL_SUBJECTS || [];
  const results     = window.SAMPLE_RESULTS  || {};
  const ratings     = window.BEHAVIOR_RATINGS|| {};
  const traits      = window.BEHAVIOR_TRAITS || [];
  const payRecords  = window.PAYMENT_RECORDS || {};
  const fmt         = window.formatNaira || (n => '₦' + Number(n).toLocaleString());
  const scoreToGrade= window.scoreToGrade;
  const ratingLabel = window.ratingValueToLabel;
  const TERM_LABELS = { term1:'First Term 2025/2026', term2:'Second Term 2025/2026', term3:'Third Term 2025/2026' };

  /* ---- Current user ---- */
  const userId = sessionStorage.getItem('rca_user_id');
  // Check both SAMPLE_USERS (staff) and RCA_PARENTS (parent accounts)
  const parent = allUsers.find(u => u.id === userId)
    || (window.RCA_PARENTS ? window.RCA_PARENTS.getAll().find(p => p.id === userId) : null);
  if (!parent) { window.location.href = 'parent-login.html'; return; }

  // Parent accounts use 'children'; legacy field was 'linked_students'
  const children = (parent.children || parent.linked_students || [])
    .map(adm => allStudents.find(s => s.admission_no === adm))
    .filter(Boolean);

  /* ---- Set header info ---- */
  const firstName = parent.full_name.replace('Mr/Mrs ', '').split(' ')[0];
  document.getElementById('ppUserName').textContent = parent.full_name;
  const avatarEl = document.getElementById('ppAvatar');
  avatarEl.innerHTML = '<img src="../assets/images/logo.png" alt="RCA" style="width:36px;height:36px;object-fit:contain;border-radius:6px;background:#fff;padding:2px;">';
  avatarEl.style.background = 'transparent';
  avatarEl.style.padding = '0';
  avatarEl.title = parent.full_name;
  document.getElementById('dashWelcomeName').textContent = parent.full_name.replace('Mr/Mrs ','');

  /* ---- Logout ---- */
  document.getElementById('ppLogout').addEventListener('click', () => sessionStorage.clear());

  /* ---- Mobile sidebar toggle ---- */
  document.getElementById('ppMenuToggle').addEventListener('click', () => {
    document.getElementById('ppSidebar').classList.toggle('open');
    document.getElementById('ppOverlay').classList.toggle('open');
  });
  document.getElementById('ppOverlay').addEventListener('click', () => {
    document.getElementById('ppSidebar').classList.remove('open');
    document.getElementById('ppOverlay').classList.remove('open');
  });

  /* ================================================
     SAMPLE DATA: announcements, events, newsletters
     (In Phase 4 these come from the database)
     ================================================ */
  // Pull from real window.ANNOUNCEMENTS (set by announcements.js)
  // Fall back to empty arrays if that script isn't loaded
  const ANNOUNCEMENTS = (window.ANNOUNCEMENTS || []).filter(a => a.status === 'published');

  const EVENTS = (window.SCHOOL_EVENTS || [])
    .filter(e => e.date >= new Date().toISOString().split('T')[0])
    .slice(0, 6)
    .map(e => ({
      date:  new Date(e.date + 'T12:00:00').toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}),
      label: e.title,
      color: e.color === '#16a34a' ? 'green'
           : e.color === '#dc2626' ? 'red'
           : e.color === '#f59e0b' ? 'orange'
           : 'blue'
    }));

  // Read ALL published newsletters from the permanent rca_newsletters store.
  // This key is never wiped by DATA_VERSION bumps or RCA.reset(), so newsletters
  // from previous terms and years remain available permanently.
  const _rawNewsletters = (() => {
    try { return JSON.parse(localStorage.getItem('rca_newsletters') || '[]'); } catch(e) { return []; }
  })();
  const NEWSLETTERS = _rawNewsletters
    .filter(n => n.status === 'published' && (n.audience || ['staff','parents']).includes('parents'))
    .sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at));

  /* ================================================
     DASHBOARD PAGE
     ================================================ */
  function buildDashboard() {
    // Stat cards
    const totalOwed = children.reduce((sum, ch) => {
      let balance = 0;
      ['term1','term2','term3'].forEach(t => {
        const rec = payRecords[`${ch.admission_no}|${t}`];
        if (rec) balance += rec.balance;
      });
      return sum + balance;
    }, 0);

    const lastPayment = children.reduce((last, ch) => {
      ['term1','term2','term3'].forEach(t => {
        const rec = payRecords[`${ch.admission_no}|${t}`];
        if (rec && rec.payments.length) {
          const latest = rec.payments[rec.payments.length - 1];
          if (!last || latest.date > last.date) last = latest;
        }
      });
      return last;
    }, null);

    document.getElementById('dashStats').innerHTML = `
      <div class="pp-stat">
        <div class="pp-stat-label">My Children</div>
        <span class="pp-stat-value">${children.length}</span>
        <button class="pp-stat-link" onclick="showPage('children',document.querySelector('[data-page=children]'))">View Details</button>
      </div>
      <div class="pp-stat">
        <div class="pp-stat-label">Outstanding Balance</div>
        <span class="pp-stat-value ${totalOwed > 0 ? 'red' : 'green'}">${fmt(totalOwed)}</span>
        <button class="pp-stat-link" onclick="showPage('payments',document.querySelector('[data-page=payments]'))">View Payments</button>
      </div>
      <div class="pp-stat">
        <div class="pp-stat-label">Recent Payment</div>
        <span class="pp-stat-value green">${lastPayment ? fmt(lastPayment.amount) : '₦0'}</span>
        <div style="font-size:0.7rem;color:#94a3b8">${lastPayment ? lastPayment.date : '—'}</div>
      </div>
      <div class="pp-stat">
        <div class="pp-stat-label">Announcements</div>
        <span class="pp-stat-value" style="color:#e63946">${ANNOUNCEMENTS.length}</span>
        <button class="pp-stat-link" onclick="showPage('announcements',document.querySelector('[data-page=announcements]'))">View All</button>
      </div>
    `;

    // Compact school timings notice — always show both sections
    const noticeEl = document.createElement('div');
    noticeEl.style.cssText = 'background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:20px;display:flex;gap:10px;align-items:flex-start;font-size:0.82rem;color:#1e40af';
    noticeEl.innerHTML = `<span style="font-size:1rem;flex-shrink:0">🕐</span>
      <div><strong>School Timings:</strong> Assembly <strong>7:20 AM</strong> &nbsp;·&nbsp; Primary: Mon–Wed <strong>3:30 PM</strong> · Thu–Fri <strong>2:00 PM</strong> &nbsp;·&nbsp; Nursery: Mon–Wed <strong>2:00 PM</strong> · Thu–Fri <strong>12 Noon</strong>
      &nbsp;&nbsp;<span style="color:#92400e;font-weight:600">⚠ Late pickup: ₦500/child.</span>
      <a href="#" onclick="showPage('school-info',document.querySelector('[data-page=school-info]'));return false" style="margin-left:8px;color:#2563eb;text-decoration:underline;font-size:0.78rem">View full info →</a></div>`;
    const statsEl = document.getElementById('dashStats');
    statsEl.parentNode.insertBefore(noticeEl, statsEl.nextSibling);

    // Announcements
    document.getElementById('dashAnnouncements').innerHTML = ANNOUNCEMENTS.slice(0,3).map(a => `
      <div class="pp-announcement">
        <div class="pp-ann-icon ${a.color}">${a.icon}</div>
        <div>
          <div class="pp-ann-title">${a.title}</div>
          <div class="pp-ann-date">${a.date}</div>
          <div class="pp-ann-body">${a.body}</div>
        </div>
      </div>
    `).join('');

    // Events
    document.getElementById('dashEvents').innerHTML = EVENTS.map(e => `
      <div class="pp-event-row">
        <span class="pp-event-date">${e.date}</span>
        <span class="pp-event-dot ${e.color}"></span>
        <span class="pp-event-label">${e.label}</span>
      </div>
    `).join('');

    // My Children cards
    document.getElementById('dashChildCards').innerHTML = children.map(ch => `
      <div class="pp-child-dash-card">
        <div class="pp-child-avatar-lg">${ch.full_name.split(' ').map(p=>p[0]).join('').substring(0,2)}</div>
        <div class="pp-child-dash-name">${ch.full_name}</div>
        <div class="pp-child-dash-meta">${ch.class_name}</div>
        <button class="pp-view-profile-btn" onclick="showPage('children',document.querySelector('[data-page=children]'))">View Profile</button>
      </div>
    `).join('');
  }

  /* ================================================
     MY CHILDREN PAGE
     ================================================ */
  function buildChildren() {
    document.getElementById('childrenList').innerHTML = children.map(ch => `
      <div class="pp-child-row">
        <div class="pp-child-avatar-lg" style="width:52px;height:52px;border-radius:50%;background:#1a3a5c;color:#fff;font-weight:700;font-size:1.1rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${ch.full_name.split(' ').map(p=>p[0]).join('').substring(0,2)}
        </div>
        <div class="pp-child-info">
          <div class="pp-child-name">${ch.full_name}</div>
          <div class="pp-child-details">
            <span>Student ID: <strong>${ch.admission_no}</strong></span>
            <span>Class: <strong>${ch.class_name}</strong></span>
            <span>Gender: <strong>${ch.gender === 'male' ? 'Male' : 'Female'}</strong></span>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="showPage('results',document.querySelector('[data-page=results]'))">View Results</button>
      </div>
    `).join('');
  }

  /* ================================================
     PAYMENTS PAGE
     ================================================ */
  let activePayChild = children[0];

  function buildPayChildTabs() {
    if (children.length < 2) return;
    document.getElementById('payChildSelector').style.display = 'block';
    document.getElementById('payChildTabs').innerHTML = children.map((ch, i) => `
      <button class="child-tab ${i===0?'active':''}" style="padding:6px 14px;border:1px solid var(--color-border);border-radius:999px;font-size:0.8rem;font-weight:600;cursor:pointer;background:${i===0?'#1a3a5c':'#fff'};color:${i===0?'#fff':'#1a3a5c'}"
        onclick="selectPayChild('${ch.admission_no}', this)">
        ${ch.full_name.split(' ')[0]}
      </button>
    `).join('');
  }

  window.selectPayChild = function(admNo, btn) {
    activePayChild = children.find(c => c.admission_no === admNo);
    document.querySelectorAll('#payChildTabs button').forEach(b => {
      b.style.background = '#fff'; b.style.color = '#1a3a5c';
    });
    btn.style.background = '#1a3a5c'; btn.style.color = '#fff';
    renderPayments();
  };

  function renderPayments() {
    if (!activePayChild) return;
    const adm = activePayChild.admission_no;
    let totalExpected = 0, totalPaid = 0, totalBalance = 0;
    const allPayRows = [];

    ['term1','term2','term3'].forEach(term => {
      const rec = payRecords[`${adm}|${term}`];
      if (!rec) return;
      totalExpected += rec.amount_expected;
      totalPaid     += rec.amount_paid;
      totalBalance  += rec.balance;
      (rec.payments || []).forEach(pay => {
        allPayRows.push({ term, ...pay, expected: rec.amount_expected, status: rec.status });
      });
    });

    // Summary cards
    document.getElementById('paySummaryCards').innerHTML = `
      <div class="pp-pay-stat">
        <div class="pp-pay-stat-label">Outstanding Balance</div>
        <div class="pp-pay-stat-value ${totalBalance > 0 ? 'red' : 'green'}">${fmt(totalBalance)}</div>
        <div class="pp-pay-stat-sub">Across all terms</div>
      </div>
      <div class="pp-pay-stat">
        <div class="pp-pay-stat-label">Total Paid</div>
        <div class="pp-pay-stat-value green">${fmt(totalPaid)}</div>
        <div class="pp-pay-stat-sub">Last: ${allPayRows.length ? allPayRows[allPayRows.length-1].date : '—'}</div>
      </div>
      <div class="pp-pay-stat">
        <div class="pp-pay-stat-label">Total Fee (Session)</div>
        <div class="pp-pay-stat-value blue">${fmt(totalExpected)}</div>
        <div class="pp-pay-stat-sub">3 terms combined</div>
      </div>
    `;

    // History table
    const BADGE = { paid:'pp-badge-paid', partial:'pp-badge-partial', unpaid:'pp-badge-unpaid' };
    const rows = allPayRows.sort((a,b) => (b.date||'').localeCompare(a.date||''));

    document.getElementById('payHistoryBody').innerHTML = rows.length === 0
      ? '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px">No payment records found.</td></tr>'
      : rows.map(r => `
          <tr>
            <td>${r.date}</td>
            <td>${TERM_LABELS[r.term] || r.term} Fee</td>
            <td style="font-weight:600">${fmt(r.amount)}</td>
            <td>${r.method}</td>
            <td><span class="${BADGE[r.status]}">${r.status}</span></td>
            <td>
              <button style="font-size:0.75rem;color:#3b82f6;background:none;border:none;cursor:pointer;font-weight:500"
                onclick="window.ppViewReceipt(${JSON.stringify(r)})">
                View
              </button>
            </td>
          </tr>
        `).join('');
  }

  // Make a Payment — opens manual payment instructions modal
  document.getElementById('makePaymentBtn').addEventListener('click', () => {
    if (!activePayChild) return;
    ppShowPaymentModal(activePayChild);
  });

  function ppShowPaymentModal(child) {
    var existing = document.getElementById('ppPayModal');
    if (existing) existing.remove();

    var adm = child.admission_no;
    var TERM_NAMES = { term1: 'First Term', term2: 'Second Term', term3: 'Third Term' };
    var outstanding = [];
    var totalDue = 0;

    ['term1','term2','term3'].forEach(function(t) {
      var rec = payRecords[adm + '|' + t];
      if (rec && rec.balance > 0) {
        outstanding.push({ term: t, label: TERM_NAMES[t], balance: rec.balance, expected: rec.amount_expected, paid: rec.amount_paid });
        totalDue += rec.balance;
      }
    });

    if (outstanding.length === 0) {
      ppShowNotice('All Fees Paid', 'There are no outstanding fees for ' + child.full_name + '. All terms are fully paid. Thank you!', 'green');
      return;
    }

    var termRows = outstanding.map(function(o) {
      return '<tr>' +
        '<td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;font-size:0.82rem">' + o.label + ' Fee</td>' +
        '<td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;font-size:0.82rem;text-align:right;color:#dc2626;font-weight:700">' + fmt(o.balance) + '</td>' +
        '</tr>';
    }).join('');

    var m = document.createElement('div');
    m.id = 'ppPayModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';
    m.innerHTML =
      '<div id="ppPayModalInner" style="background:#fff;border-radius:16px;max-width:480px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,0.2);overflow:hidden;max-height:90vh;overflow-y:auto">' +

        // Header
        '<div style="background:#1a3a5c;padding:18px 22px;color:#fff;display:flex;align-items:center;justify-content:space-between">' +
          '<div>' +
            '<div style="font-family:Poppins,sans-serif;font-weight:700;font-size:0.95rem">Make a Payment</div>' +
            '<div style="font-size:0.75rem;opacity:0.75;margin-top:2px">' + child.full_name + ' &mdash; ' + child.class_name + '</div>' +
          '</div>' +
          '<button onclick="document.getElementById(\'ppPayModal\').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center">&times;</button>' +
        '</div>' +

        '<div style="padding:20px 22px">' +

          // Outstanding balance table
          '<div style="font-size:0.72rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Outstanding Balance</div>' +
          '<table style="width:100%;border-collapse:collapse;margin-bottom:4px">' +
            '<tbody>' + termRows + '</tbody>' +
            '<tfoot><tr>' +
              '<td style="padding:8px 6px;font-weight:700;font-size:0.85rem">Total Due</td>' +
              '<td style="padding:8px 6px;font-weight:700;font-size:0.9rem;color:#dc2626;text-align:right">' + fmt(totalDue) + '</td>' +
            '</tr></tfoot>' +
          '</table>' +

          // Divider
          '<hr style="border:none;border-top:1px solid #f3f4f6;margin:16px 0">' +

          // How to pay
          '<div style="font-size:0.72rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">How to Pay</div>' +

          '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">' +
            '<div style="display:flex;gap:10px;align-items:flex-start">' +
              '<span style="background:#dbeafe;color:#1e40af;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;flex-shrink:0">1</span>' +
              '<div style="font-size:0.82rem;color:#374151">Visit the school office with the exact amount or your bank teller</div>' +
            '</div>' +
            '<div style="display:flex;gap:10px;align-items:flex-start">' +
              '<span style="background:#dbeafe;color:#1e40af;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;flex-shrink:0">2</span>' +
              '<div style="font-size:0.82rem;color:#374151">Our accountant will record your payment and issue an <strong>official receipt</strong></div>' +
            '</div>' +
            '<div style="display:flex;gap:10px;align-items:flex-start">' +
              '<span style="background:#dbeafe;color:#1e40af;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;flex-shrink:0">3</span>' +
              '<div style="font-size:0.82rem;color:#374151">Your payment history will update here automatically</div>' +
            '</div>' +
          '</div>' +

          // Payment methods
          '<div style="background:#f8fafc;border-radius:10px;padding:12px 14px;margin-bottom:14px">' +
            '<div style="font-size:0.72rem;font-weight:700;color:#64748b;margin-bottom:8px">Accepted Payment Methods</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
              '<span style="background:#d1fae5;color:#065f46;padding:3px 12px;border-radius:999px;font-size:0.75rem;font-weight:600">&#128181; Cash</span>' +
              '<span style="background:#dbeafe;color:#1e40af;padding:3px 12px;border-radius:999px;font-size:0.75rem;font-weight:600">&#127984; Bank Transfer</span>' +
              '<span style="background:#f3e8ff;color:#6b21a8;padding:3px 12px;border-radius:999px;font-size:0.75rem;font-weight:600">&#128179; POS</span>' +
              '<span style="background:#fef9c3;color:#92400e;padding:3px 12px;border-radius:999px;font-size:0.75rem;font-weight:600">&#127381; Cheque</span>' +
            '</div>' +
          '</div>' +

          // School address
          '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 14px;margin-bottom:18px">' +
            '<div style="font-size:0.72rem;font-weight:700;color:#92400e;margin-bottom:4px">&#128205; School Address</div>' +
            '<div style="font-size:0.82rem;color:#374151;font-weight:600">Royal Crystal Academy</div>' +
            '<div style="font-size:0.8rem;color:#6b7280">20/22 Amaigbo Lane, Uwani, Enugu State</div>' +
            '<div style="font-size:0.8rem;color:#6b7280;margin-top:3px">&#128222; 08108419563 &nbsp;|&nbsp; 09026324650</div>' +
          '</div>' +

          // Action buttons
          '<div style="display:flex;gap:10px">' +
            '<button onclick="ppPrintAdviceSlip(' + JSON.stringify({adm: adm, name: child.full_name, cls: child.class_name, outstanding: outstanding, total: totalDue}) + ')" ' +
              'style="flex:1;padding:11px;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:0.82rem;cursor:pointer">' +
              '&#128424; Print Advice Slip' +
            '</button>' +
            '<button onclick="document.getElementById(\'ppPayModal\').remove()" ' +
              'style="padding:11px 18px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-weight:600;font-size:0.82rem;cursor:pointer">' +
              'Close' +
            '</button>' +
          '</div>' +

        '</div>' +
      '</div>';

    document.body.appendChild(m);
    m.addEventListener('click', function(e) { if (e.target === m) m.remove(); });
  }

  window.ppPrintAdviceSlip = function(data) {
    var termNames = { term1: 'First Term', term2: 'Second Term', term3: 'Third Term' };
    var rows = data.outstanding.map(function(o) {
      return '<tr><td style="padding:6px 8px;border:1px solid #ddd">' + termNames[o.term] + ' Fee</td>' +
             '<td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:700">' + fmt(o.balance) + '</td></tr>';
    }).join('');

    var today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
    var slipWin = window.open('', '_blank', 'width=600,height=700');
    slipWin.document.write(
      '<!DOCTYPE html><html><head><title>Payment Advice Slip</title>' +
      '<style>body{font-family:Arial,sans-serif;padding:30px;max-width:520px;margin:0 auto;color:#111}' +
      '.header{text-align:center;border-bottom:3px solid #1a3a5c;padding-bottom:14px;margin-bottom:18px}' +
      '.badge{width:64px;height:64px;margin:0 auto 8px}' +
      '.badge img{width:64px;height:64px;object-fit:contain}' +
      'h1{font-size:16pt;margin:4px 0;color:#1a3a5c}' +
      '.meta{font-size:8pt;color:#555}' +
      '.slip-title{background:#1a3a5c;color:#fff;text-align:center;padding:8px;font-weight:700;font-size:11pt;margin-bottom:16px;border-radius:4px}' +
      '.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px}' +
      '.info-box{background:#f8f8f8;border:1px solid #e5e7eb;border-radius:4px;padding:8px 10px}' +
      '.info-label{font-size:7pt;color:#888;text-transform:uppercase;font-weight:700;margin-bottom:2px}' +
      '.info-val{font-size:9pt;font-weight:700;color:#111}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:12px}' +
      'th{background:#f3f4f6;padding:7px 8px;border:1px solid #ddd;text-align:left;font-size:9pt}' +
      'td{font-size:9pt}.total-row td{font-weight:700;background:#fff3cd;padding:7px 8px;border:1px solid #ddd}' +
      '.methods{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}' +
      '.method{background:#e8f4fd;border:1px solid #bee3f8;padding:3px 10px;border-radius:4px;font-size:8pt;font-weight:600;color:#1a3a5c}' +
      '.footer{border-top:1px dashed #ccc;margin-top:16px;padding-top:12px;font-size:8pt;color:#555;text-align:center}' +
      '.notice{background:#fffbeb;border:1px solid #fde68a;border-radius:4px;padding:8px 12px;font-size:8pt;color:#92400e;margin-bottom:14px;text-align:center}' +
      '@media print{body{padding:10px}button{display:none}}' +
      '</style></head><body>' +
      '<div class="header">' +
        '<div class="badge"><img src="../assets/images/logo.png" alt="RCA"></div>' +
        '<h1>Royal Crystal Academy</h1>' +
        '<div class="meta">20/22 Amaigbo Lane, Uwani, Enugu State</div>' +
        '<div class="meta">Tel: 08108419563 | 09026324650</div>' +
      '</div>' +
      '<div class="slip-title">PAYMENT ADVICE SLIP</div>' +
      '<div class="notice">&#9432; Present this slip at the school office when making payment</div>' +
      '<div class="info-grid">' +
        '<div class="info-box"><div class="info-label">Pupil Name</div><div class="info-val">' + data.name + '</div></div>' +
        '<div class="info-box"><div class="info-label">Admission No.</div><div class="info-val">' + data.adm + '</div></div>' +
        '<div class="info-box"><div class="info-label">Class</div><div class="info-val">' + data.cls + '</div></div>' +
        '<div class="info-box"><div class="info-label">Date Issued</div><div class="info-val">' + today + '</div></div>' +
      '</div>' +
      '<table><thead><tr><th>Description</th><th style="text-align:right">Amount Due</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot><tr class="total-row"><td>TOTAL OUTSTANDING</td><td style="text-align:right">' + fmt(data.total) + '</td></tr></tfoot>' +
      '</table>' +
      '<div style="font-size:8pt;font-weight:700;color:#374151;margin-bottom:6px">Accepted Payment Methods:</div>' +
      '<div class="methods"><span class="method">Cash</span><span class="method">Bank Transfer</span><span class="method">POS</span><span class="method">Cheque</span></div>' +
      '<div class="footer">' +
        'Academic Session: 2025/2026 &nbsp;|&nbsp; Royal Crystal Academy<br>' +
        'This slip is valid for the current term only. Please pay promptly to avoid disruption.' +
      '</div>' +
      '<br><button onclick="window.print()" style="width:100%;padding:10px;background:#1a3a5c;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:10pt;cursor:pointer">&#128424; Print This Slip</button>' +
      '</body></html>'
    );
    slipWin.document.close();
  };

  /* ── Simple notice modal for parent portal ── */
  function ppShowNotice(title, body, color) {
    var existing = document.getElementById('ppNoticeModal');
    if (existing) existing.remove();
    var colors = { blue:'#1d4ed8', green:'#16a34a', orange:'#d97706' };
    var m = document.createElement('div');
    m.id = 'ppNoticeModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    m.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:420px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.18);text-align:center">
        <div style="width:52px;height:52px;border-radius:50%;background:${color==='green'?'#d1fae5':color==='blue'?'#dbeafe':'#fef3c7'};display:flex;align-items:center;justify-content:center;font-size:1.6rem;margin:0 auto 16px">
          ${color==='green'?'✓':color==='blue'?'🔒':'ℹ️'}
        </div>
        <h3 style="font-family:Poppins,sans-serif;font-weight:700;font-size:1rem;color:#111827;margin:0 0 10px">${title}</h3>
        <p style="font-size:0.85rem;color:#6b7280;line-height:1.6;margin:0 0 20px">${body}</p>
        <button onclick="document.getElementById('ppNoticeModal').remove()" style="padding:10px 28px;background:${colors[color]||'#1d4ed8'};color:#fff;border:none;border-radius:8px;font-weight:700;font-size:0.85rem;cursor:pointer">
          OK
        </button>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', function(e){ if(e.target===m) m.remove(); });
  }

  /* ── View receipt modal ── */
  window.ppViewReceipt = function(pay) {
    var existing = document.getElementById('ppReceiptModal');
    if (existing) existing.remove();
    var d = document.createElement('div');
    d.id = 'ppReceiptModal';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    var term = pay.term ? ({'term1':'First Term','term2':'Second Term','term3':'Third Term'}[pay.term] || pay.term) : '';
    d.innerHTML = `
      <div style="background:#fff;border-radius:16px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);overflow:hidden">
        <div style="background:#1a3a5c;padding:20px 24px;color:#fff">
          <div style="font-family:Poppins,sans-serif;font-weight:700;font-size:1rem">Royal Crystal Academy</div>
          <div style="font-size:0.75rem;opacity:0.75;margin-top:2px">Official Payment Receipt</div>
        </div>
        <div style="padding:24px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <span style="font-size:1.1rem;font-weight:700;color:#111827">₦${Number(pay.amount).toLocaleString('en-NG')}</span>
            <span style="background:#d1fae5;color:#065f46;padding:3px 12px;border-radius:999px;font-size:0.72rem;font-weight:700">PAID</span>
          </div>
          <table style="width:100%;font-size:0.82rem;border-collapse:collapse">
            ${[
              ['Receipt No.', pay.receipt_no || '—'],
              ['Date', pay.date || '—'],
              ['Term', term || '—'],
              ['Payment Method', pay.method || '—'],
              ['Recorded By', pay.recorded_by || 'School Office'],
            ].map(r=>`<tr><td style="color:#6b7280;padding:5px 0;border-bottom:1px solid #f3f4f6">${r[0]}</td><td style="font-weight:600;color:#111827;text-align:right;padding:5px 0;border-bottom:1px solid #f3f4f6">${r[1]}</td></tr>`).join('')}
          </table>
          ${pay.notes ? `<div style="margin-top:12px;background:#f9fafb;border-radius:8px;padding:10px 12px;font-size:0.78rem;color:#6b7280"><strong>Notes:</strong> ${pay.notes}</div>` : ''}
          <button onclick="document.getElementById('ppReceiptModal').remove()" style="margin-top:18px;width:100%;padding:11px;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:0.85rem;cursor:pointer">
            Close
          </button>
        </div>
      </div>`;
    document.body.appendChild(d);
    d.addEventListener('click', function(e){ if(e.target===d) d.remove(); });
  };

  /* ================================================
     RESULTS PAGE
     ================================================ */
  let activeResultChild = children[0];
  let resultTerm = 'term2';

  function buildResultChildTabs() {
    if (children.length < 2) return;
    document.getElementById('resultChildSelector').style.display = 'block';
    document.getElementById('resultChildTabs').innerHTML = children.map((ch, i) => `
      <button style="padding:6px 14px;border:1px solid var(--color-border);border-radius:999px;font-size:0.8rem;font-weight:600;cursor:pointer;background:${i===0?'#1a3a5c':'#fff'};color:${i===0?'#fff':'#1a3a5c'}"
        onclick="selectResultChild('${ch.admission_no}',this)">
        ${ch.full_name.split(' ')[0]}
      </button>
    `).join('');
  }

  window.selectResultChild = function(admNo, btn) {
    activeResultChild = children.find(c => c.admission_no === admNo);
    document.querySelectorAll('#resultChildTabs button').forEach(b => { b.style.background='#fff'; b.style.color='#1a3a5c'; });
    btn.style.background='#1a3a5c'; btn.style.color='#fff';
    renderResults();
  };

  document.getElementById('resultTermSelect').addEventListener('change', e => {
    resultTerm = e.target.value;
    renderResults();
  });

  function renderResults() {
    const student = activeResultChild;
    if (!student) return;
    const contentEl = document.getElementById('resultContent');
    const approval  = window.getApprovalRecord ? window.getApprovalRecord(student.class_name, resultTerm) : { status:'published' };
    const published = approval.status === 'published';
    const paid      = hasParentPaid(userId, student.admission_no, resultTerm);

    /* Gate 1: Pay ₦1,000 */
    if (!paid) {
      contentEl.innerHTML = `
        <div class="pp-table-card">
          <div class="pp-card-body" style="padding:0">
            <div class="pp-payment-gate">
              <div class="pp-payment-gate-icon">🔒</div>
              <h3>Access Fee Required</h3>
              <p>A fee of <strong>₦1,000</strong> is required to access <strong>${student.full_name.split(' ')[0]}'s</strong> results for ${TERM_LABELS[resultTerm]}.</p>
              <div class="pp-fee-amount">₦1,000</div>
              <button class="btn btn-primary" style="padding:10px 32px" id="payResultBtn">Pay ₦1,000 (Demo)</button>
              <div class="pp-demo-note">ℹ️ Demo only — in Phase 4 this opens a secure Paystack checkout.</div>
            </div>
          </div>
        </div>`;
      document.getElementById('payResultBtn').addEventListener('click', () => {
        recordParentPayment(userId, student.admission_no, resultTerm);
        renderResults();
      });
      return;
    }

    /* Gate 2: Not yet published */
    if (!published) {
      contentEl.innerHTML = `
        <div class="pp-table-card">
          <div class="pp-card-body" style="padding:24px">
            <div class="pp-not-published">
              🔒 Results for <strong>${TERM_LABELS[resultTerm]}</strong> have not been published yet.<br>
              Please check back after the school releases results.<br>
              <span style="color:#2a9d8f;font-size:0.8rem">✓ Your ₦1,000 payment is recorded — no repeat payment needed.</span>
            </div>
          </div>
        </div>`;
      return;
    }

    /* Full results */
    const pupilResults = results[student.admission_no] || {};
    const pupilRatings = ratings[student.admission_no] || { ratings:{}, comment:'' };

    const avg = allSubjects.length
      ? allSubjects.reduce((s,sub) => s + ((pupilResults[sub.id]||{}).finalScore||0), 0) / allSubjects.length
      : 0;

    const subjectRows = allSubjects.map(sub => {
      const r = pupilResults[sub.id];
      if (!r) return '';
      return `<tr>
        <td>${sub.name}</td>
        <td style="text-align:center">${r.caTotal}</td>
        <td style="text-align:center">${r.examScore}</td>
        <td style="text-align:center;font-weight:600">${r.finalScore}</td>
        <td style="text-align:center" class="grade-${r.grade}">${r.grade}</td>
        <td style="font-size:0.75rem;color:#64748b">${scoreToGrade ? gradeRemark(r.grade) : ''}</td>
      </tr>`;
    }).join('');

    // Class position
    const classStudents = allStudents.filter(s => s.class_name === student.class_name);
    const averages = classStudents.map(s => ({
      adm: s.admission_no,
      avg: allSubjects.reduce((sum,sub) => sum + ((results[s.admission_no]||{})[sub.id]||{}).finalScore||0, 0) / (allSubjects.length||1)
    })).sort((a,b) => b.avg - a.avg);
    const position = 1 + averages.filter(a => a.avg > avg).length;

    const ratingRows = traits.map(t => {
      const val = pupilRatings.ratings[t.id] || 0;
      const dots = [1,2,3,4,5].map(n => `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:3px;background:${n<=val?'#1a3a5c':'#e2e8f0'};border:1.5px solid ${n<=val?'#1a3a5c':'#cbd5e1'}"></span>`).join('');
      return `<tr>
        <td>${t.label}</td>
        <td>${dots}</td>
        <td style="font-size:0.75rem;color:#64748b">${val ? ratingLabel(val) : '—'}</td>
      </tr>`;
    }).join('');

    contentEl.innerHTML = `
      <!-- Summary stats -->
      <div class="pp-result-summary">
        <div class="pp-result-stat">
          <span class="pp-result-stat-num">${avg.toFixed(1)}%</span>
          <span class="pp-result-stat-label">Average Score</span>
        </div>
        <div class="pp-result-stat">
          <span class="pp-result-stat-num">${scoreToGrade ? scoreToGrade(avg) : ''}</span>
          <span class="pp-result-stat-label">Overall Grade</span>
        </div>
        <div class="pp-result-stat">
          <span class="pp-result-stat-num">${ordinal(position)}</span>
          <span class="pp-result-stat-label">Class Position</span>
        </div>
        <div class="pp-result-stat">
          <span class="pp-result-stat-num">${classStudents.length}</span>
          <span class="pp-result-stat-label">Class Size</span>
        </div>
      </div>

      <!-- Subject table -->
      <div class="pp-table-card">
        <div class="pp-table-card-header">Academic Results — ${student.full_name} · ${student.class_name} · ${TERM_LABELS[resultTerm]}</div>
        <div style="overflow-x:auto">
          <table class="pp-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th style="text-align:center">CA (/40)</th>
                <th style="text-align:center">Exam (/60)</th>
                <th style="text-align:center">Total</th>
                <th style="text-align:center">Grade</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>${subjectRows}</tbody>
          </table>
        </div>
      </div>

      <!-- Behavioural ratings -->
      <div class="pp-table-card" style="margin-top:16px">
        <div class="pp-table-card-header">Behavioural &amp; Affective Assessment</div>
        <div style="overflow-x:auto">
          <table class="pp-table">
            <thead><tr><th>Trait</th><th>Rating</th><th>Label</th></tr></thead>
            <tbody>${ratingRows}</tbody>
          </table>
        </div>
        ${pupilRatings.comment ? `
          <div style="padding:12px 18px;border-top:1px solid #f1f5f9">
            <div style="font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:4px">CLASS TEACHER'S COMMENT</div>
            <div style="font-style:italic;color:#334155;font-size:0.875rem;border-left:3px solid #1a3a5c;padding-left:12px">"${pupilRatings.comment}"</div>
          </div>` : ''}
      </div>

      <div style="text-align:right;margin-top:12px">
        <button class="btn btn-outline" onclick="window.print()">🖨️ Print / Save as PDF</button>
      </div>
    `;
  }

  function gradeRemark(g) {
    return { A:'Excellent', B:'Very Good', C:'Good', D:'Pass', E:'Weak Pass', F:'Fail' }[g] || '';
  }

  function ordinal(n) {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  }

  /* ================================================
     NEWSLETTER PAGE
     ================================================ */
  function buildNewsletter() {
    const wrap = document.getElementById('newsletterGrid');
    if (!wrap) return;

    // Store on window for the viewer function
    window._PP_NEWSLETTERS = NEWSLETTERS;

    if (NEWSLETTERS.length === 0) {
      wrap.innerHTML = `
        <div style="text-align:center;padding:56px 24px;color:#6b7280;grid-column:1/-1">
          <div style="font-size:3rem;margin-bottom:14px">📰</div>
          <div style="font-weight:600;color:#374151;margin-bottom:6px">No Newsletters Yet</div>
          <div style="font-size:0.83rem">The school will publish newsletters here. Check back soon.</div>
        </div>`;
      return;
    }

    // Group by academic session, newest session first
    const groups = {};
    NEWSLETTERS.forEach(n => {
      const s = n.session || '—';
      if (!groups[s]) groups[s] = [];
      groups[s].push(n);
    });
    const sessionOrder = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    // Build HTML: each session gets a heading row then a card grid
    wrap.style.display = 'block'; // override grid for section headings
    wrap.innerHTML = sessionOrder.map(sess => {
      const cards = groups[sess].map(n => {
        const pubDate = (n.published_at || n.created_at)
          ? new Date(n.published_at || n.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
          : '';
        const preview = (n.body || '').split('\n').filter(l => l.trim().length > 20)[0]
          || (n.body || '').substring(0, 130) + '…';
        const safeId = n.id.replace(/[^a-zA-Z0-9]/g, '_');
        return `
          <div class="pp-newsletter-card" style="cursor:default">
            <div class="pp-newsletter-img" style="font-size:2.4rem;display:flex;align-items:center;justify-content:center;background:#f0fdf4;border-radius:10px 10px 0 0;padding:22px 16px">📰</div>
            <div class="pp-newsletter-body">
              <div class="pp-newsletter-title">${n.title}</div>
              ${n.issue ? `<div style="font-size:0.73rem;color:#4b5563;margin-bottom:4px;font-weight:600">${n.issue}</div>` : ''}
              <div class="pp-newsletter-date">${pubDate}</div>
              <div class="pp-newsletter-desc">${preview}</div>
              <button class="btn btn-outline btn-sm" onclick="ppViewNewsletter('${safeId}')" style="margin-top:10px;width:100%">Read Full Newsletter →</button>
            </div>
          </div>`;
      }).join('');

      return `
        <div style="margin-bottom:28px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <span style="font-size:0.73rem;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">
              📅 Session ${sess}
            </span>
            <div style="flex:1;height:1px;background:#e5e7eb"></div>
            <span style="font-size:0.72rem;color:#9ca3af">${groups[sess].length} newsletter${groups[sess].length !== 1 ? 's' : ''}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">
            ${cards}
          </div>
        </div>`;
    }).join('');
  }

  window.ppViewNewsletter = function(safeId) {
    const nl = (window._PP_NEWSLETTERS || []).find(n => n.id.replace(/[^a-zA-Z0-9]/g, '_') === safeId);
    if (!nl) return;
    document.getElementById('ppNlViewOverlay')?.remove();
    const modal = document.createElement('div');
    modal.id = 'ppNlViewOverlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px';
    const pubDate = (nl.published_at || nl.created_at)
      ? new Date(nl.published_at || nl.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:700px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="background:#1a3a5c;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:16px 16px 0 0;position:sticky;top:0;z-index:1">
          <span style="color:#fff;font-weight:700">📰 Newsletter</span>
          <button id="closePpNlView" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem">✕</button>
        </div>
        <div style="padding:32px">
          <div style="text-align:center;border-bottom:2px solid #1a3a5c;padding-bottom:22px;margin-bottom:26px">
            <div style="font-size:0.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">
              Royal Crystal Academy${nl.session ? ' • Session ' + nl.session : ''}
            </div>
            <h2 style="font-size:1.4rem;color:#1a3a5c;font-weight:800;margin-bottom:6px">${nl.title}</h2>
            ${nl.issue ? `<div style="font-size:0.85rem;color:#4b5563;margin-bottom:4px">${nl.issue}</div>` : ''}
            <div style="font-size:0.8rem;color:#9ca3af">${pubDate}</div>
          </div>
          <div style="font-size:0.9rem;color:#374151;line-height:1.85;white-space:pre-wrap">${nl.body}</div>
          <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e5e7eb;font-size:0.78rem;color:#9ca3af;text-align:center">
            — ${nl.author || 'The Administration'} • Royal Crystal Academy
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('closePpNlView').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  };

  /* ================================================
     ANNOUNCEMENTS PAGE
     ================================================ */
  function buildAnnouncements() {
    const TYPE_ICONS  = { announcement:'📢', newsletter:'📰', event:'📅', urgent:'🚨' };
    const TYPE_BG     = { announcement:'#dbeafe', newsletter:'#d1fae5', event:'#fef3c7', urgent:'#fee2e2' };
    const pubAnns = ANNOUNCEMENTS;

    const annHtml = pubAnns.length === 0
      ? `<div style="text-align:center;padding:40px 24px;color:#94a3b8">
           <div style="font-size:2rem;margin-bottom:10px">📭</div>
           <div style="font-weight:600;color:#6b7280;margin-bottom:4px">No announcements yet</div>
           <div style="font-size:0.82rem">The school will post important notices here. Check back soon.</div>
         </div>`
      : pubAnns.map(a => {
          const icon = TYPE_ICONS[a.type] || '📢';
          const bg   = TYPE_BG[a.type]   || '#dbeafe';
          const date = a.publishedAt
            ? new Date(a.publishedAt).toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})
            : '';
          const body = (a.body || '');
          const preview = body.split('\n').filter(l=>l.trim()).slice(0,2).join(' ');
          return `
            <div style="display:flex;gap:14px;align-items:flex-start;padding:16px 18px;border-bottom:1px solid #f1f5f9;cursor:pointer"
              onclick="const nx=this.nextElementSibling;nx.style.display=nx.style.display==='none'?'block':'none'">
              <div style="width:38px;height:38px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${icon}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:0.9rem;color:#111827;margin-bottom:3px">${a.title}</div>
                <div style="font-size:0.72rem;color:#94a3b8;margin-bottom:4px">${date}${a.author ? ' · ' + a.author : ''}</div>
                <div style="font-size:0.82rem;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${preview.substring(0,120)}</div>
              </div>
              <div style="font-size:0.72rem;color:#94a3b8;flex-shrink:0">▼</div>
            </div>
            <div style="display:none;padding:14px 18px 18px 70px;background:#f8fafc;border-bottom:1px solid #f1f5f9;font-size:0.83rem;color:#374151;line-height:1.8;white-space:pre-wrap">${body}</div>`;
        }).join('');

    const eventsHtml = EVENTS.length === 0
      ? `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:0.82rem">No upcoming events scheduled.</div>`
      : EVENTS.map(e => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:0.83rem">
            <span style="min-width:100px;color:#94a3b8;font-size:0.75rem">${e.date}</span>
            <span style="width:8px;height:8px;border-radius:50%;background:${e.color === 'green' ? '#16a34a' : e.color === 'red' ? '#dc2626' : e.color === 'orange' ? '#f59e0b' : '#1d4ed8'};flex-shrink:0"></span>
            <span style="color:#374151;font-weight:500">${e.label}</span>
          </div>`).join('');

    document.getElementById('announcementsContent').innerHTML = `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:16px">
        <div style="padding:14px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
          <span style="font-weight:700;font-size:0.95rem;color:#111827">📢 School Announcements</span>
          <span style="font-size:0.75rem;background:#f3f4f6;padding:3px 10px;border-radius:20px;color:#6b7280">${pubAnns.length} posted</span>
        </div>
        ${annHtml}
      </div>

      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid #f1f5f9">
          <span style="font-weight:700;font-size:0.95rem;color:#111827">📅 Upcoming Events</span>
        </div>
        <div style="padding:4px 18px 8px">${eventsHtml}</div>
      </div>
    `;
  }

  /* ================================================
     PROFILE PAGE
     ================================================ */
  function buildProfile() {
    document.getElementById('profileContent').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 24px;font-size:0.875rem">
        <div><span style="color:#94a3b8;font-size:0.7rem;text-transform:uppercase;display:block;margin-bottom:2px">Full Name</span><strong>${parent.full_name}</strong></div>
        <div><span style="color:#94a3b8;font-size:0.7rem;text-transform:uppercase;display:block;margin-bottom:2px">Email Address</span><strong>${parent.email}</strong></div>
        <div><span style="color:#94a3b8;font-size:0.7rem;text-transform:uppercase;display:block;margin-bottom:2px">Phone</span><strong>${parent.phone || '—'}</strong></div>
        <div><span style="color:#94a3b8;font-size:0.7rem;text-transform:uppercase;display:block;margin-bottom:2px">Account Status</span><strong style="color:#2a9d8f">Active</strong></div>
        <div style="grid-column:1/-1"><span style="color:#94a3b8;font-size:0.7rem;text-transform:uppercase;display:block;margin-bottom:6px">Linked Children</span>
          ${children.map(ch => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9">
              <div style="width:28px;height:28px;border-radius:50%;background:#1a3a5c;color:#fff;font-size:0.7rem;font-weight:700;display:flex;align-items:center;justify-content:center">
                ${ch.full_name.split(' ').map(p=>p[0]).join('').substring(0,2)}
              </div>
              <div>
                <strong>${ch.full_name}</strong>
                <span style="color:#94a3b8;font-size:0.75rem;margin-left:8px">${ch.class_name} · ${ch.admission_no}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /* ================================================
     ATTENDANCE PAGE
     ================================================ */
  function buildAttendance() {
    const attEl = document.getElementById('attendanceContent');
    if (!attEl) return;

    if (!children.length) {
      attEl.innerHTML = '<div style="text-align:center;padding:48px 24px;color:#9ca3af"><div style="font-size:2.5rem;margin-bottom:12px">📋</div>'
        + '<p style="font-size:0.9rem;font-weight:600;color:#374151;margin-bottom:8px">No attendance records available</p>'
        + '<p style="font-size:0.82rem">No children are currently linked to your account.<br>Please contact the school office to link your child\'s profile.</p></div>';
      return;
    }

    // Simulate realistic attendance for each child from real attendance data
    // In Phase 4 this reads from the database per pupil
    function getAttendance(child) {
      const seed = child.admission_no.charCodeAt(child.admission_no.length-1);
      const totalDays = 45; // school days this term
      const present   = Math.min(totalDays, 38 + (seed % 7));
      const absent    = Math.floor((totalDays - present) * 0.6);
      const late      = totalDays - present - absent;
      const pct       = Math.round(present / totalDays * 100);
      return { totalDays, present, absent, late, pct };
    }

    const activeChild = children[0]; // default to first child
    const att = getAttendance(activeChild);
    const color = att.pct >= 90 ? '#065f46' : att.pct >= 75 ? '#92400e' : '#991b1b';
    const bg    = att.pct >= 90 ? '#d1fae5'  : att.pct >= 75 ? '#fef3c7'  : '#fee2e2';

    attEl.innerHTML = `
      ${children.length > 1 ? `
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
          ${children.map((ch,i) => `
            <button onclick="window._ppSelectAttChild('${ch.admission_no}',this)"
              style="padding:6px 14px;border-radius:999px;border:1.5px solid ${i===0?'#1a3a5c':'#e2e8f0'};
              background:${i===0?'#1a3a5c':'#fff'};color:${i===0?'#fff':'#1a3a5c'};font-size:0.78rem;font-weight:600;cursor:pointer"
              data-adm="${ch.admission_no}">
              ${ch.full_name.split(' ')[0]}
            </button>`).join('')}
        </div>` : ''}

      <div id="attChildContent">
        ${renderAttChild(activeChild)}
      </div>
    `;

    window._ppSelectAttChild = function(admNo, btn) {
      const ch = children.find(c => c.admission_no === admNo);
      document.querySelectorAll('[data-adm]').forEach(b => {
        b.style.background = b.dataset.adm === admNo ? '#1a3a5c' : '#fff';
        b.style.color      = b.dataset.adm === admNo ? '#fff' : '#1a3a5c';
        b.style.borderColor= b.dataset.adm === admNo ? '#1a3a5c' : '#e2e8f0';
      });
      document.getElementById('attChildContent').innerHTML = renderAttChild(ch);
    };

    function renderAttChild(ch) {
      const att = getAttendance(ch);
      const color = att.pct >= 90 ? '#065f46' : att.pct >= 75 ? '#92400e' : '#991b1b';
      const bg    = att.pct >= 90 ? '#d1fae5'  : att.pct >= 75 ? '#fef3c7'  : '#fee2e2';
      const rating = att.pct >= 95 ? 'Excellent' : att.pct >= 90 ? 'Very Good'
                   : att.pct >= 80 ? 'Good'       : att.pct >= 75 ? 'Fair' : 'Poor — Please Contact School';

      return `
        <div class="pp-table-card" style="margin-bottom:14px">
          <div class="pp-table-card-header">${ch.full_name} · ${ch.class_name} · Second Term 2025/2026</div>
          <div style="padding:18px">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">
              <div style="text-align:center;background:#f8fafc;border-radius:10px;padding:14px">
                <div style="font-family:var(--font-heading);font-size:1.5rem;font-weight:700;color:#1a3a5c">${att.totalDays}</div>
                <div style="font-size:0.72rem;color:#64748b">School Days</div>
              </div>
              <div style="text-align:center;background:#d1fae5;border-radius:10px;padding:14px">
                <div style="font-family:var(--font-heading);font-size:1.5rem;font-weight:700;color:#065f46">${att.present}</div>
                <div style="font-size:0.72rem;color:#065f46">Present</div>
              </div>
              <div style="text-align:center;background:#fee2e2;border-radius:10px;padding:14px">
                <div style="font-family:var(--font-heading);font-size:1.5rem;font-weight:700;color:#991b1b">${att.absent}</div>
                <div style="font-size:0.72rem;color:#991b1b">Absent</div>
              </div>
              <div style="text-align:center;background:#fef3c7;border-radius:10px;padding:14px">
                <div style="font-family:var(--font-heading);font-size:1.5rem;font-weight:700;color:#92400e">${att.late}</div>
                <div style="font-size:0.72rem;color:#92400e">Late</div>
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-size:0.82rem;font-weight:600;color:#374151">Attendance Rate</span>
              <span style="font-weight:700;color:${color};font-size:1rem">${att.pct}%</span>
            </div>
            <div style="height:12px;background:#f1f5f9;border-radius:6px;overflow:hidden;margin-bottom:8px">
              <div style="width:${att.pct}%;height:100%;background:${color};border-radius:6px;transition:width 0.6s"></div>
            </div>
            <div style="font-size:0.78rem;font-weight:600;color:${color};background:${bg};padding:6px 12px;border-radius:6px;display:inline-block">${rating}</div>

            <div style="margin-top:16px;font-size:0.78rem;color:#64748b;background:#f8fafc;border-radius:8px;padding:10px 14px;line-height:1.6">
              ℹ️ Attendance records are updated by the class teacher each school day.
              If you believe there is an error, please contact the school office.
            </div>
          </div>
        </div>`;
    }
  }

  /* ================================================
     SCHOOL INFORMATION PAGE
     ================================================ */
  function buildSchoolInfo() {
    var el = document.getElementById('schoolInfoContent');
    if (!el) return;

    var f = window.formatNaira || function(n) { return '₦' + Number(n).toLocaleString(); };

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
    var timingBody = '<div style="border-top:1px solid #f1f5f9">'
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
    var timingCard = siCard('🕐', 'School Timings', timingBody);

    /* ---- 2. Approved Uniform Schedule ---- */
    var uniformDays = [
      ['Monday &amp; Wednesday', 'Full School Uniform Day',
       'Full school uniform &nbsp;&middot;&nbsp; Black cover shoes &nbsp;&middot;&nbsp; Black stockings / socks'],
      ['Tuesday &amp; Thursday', 'Sportswear Day',
       'School sportswear &nbsp;&middot;&nbsp; White canvas shoes &nbsp;&middot;&nbsp; White socks'],
      ['Friday', 'Friday Wear',
       'Black jeans &nbsp;&middot;&nbsp; RCA white branded top &nbsp;&middot;&nbsp; White canvas shoes &nbsp;&middot;&nbsp; White stockings / socks'],
      ['1st &amp; Last Tuesday of Every Month', 'Inter-House Sports Wear Day',
       'Inter-house sports uniform &nbsp;&middot;&nbsp; White canvas shoes &nbsp;&middot;&nbsp; White socks'],
    ];
    var uniformBody = '<div style="border-top:1px solid #f1f5f9">';
    for (var ui = 0; ui < uniformDays.length; ui++) {
      var ud = uniformDays[ui];
      uniformBody += '<div style="padding:11px 0;border-bottom:1px solid #f1f5f9">'
        + '<div style="display:flex;align-items:flex-start;gap:10px">'
        + '<div style="min-width:24px;height:24px;border-radius:50%;background:#1a3a5c;color:#fff;font-size:0.68rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">' + (ui + 1) + '</div>'
        + '<div>'
        + '<div style="font-size:0.85rem;font-weight:700;color:#1a3a5c">' + ud[0]
        + ' <span style="font-weight:500;color:#64748b;font-size:0.78rem">— ' + ud[1] + '</span></div>'
        + '<div style="font-size:0.78rem;color:#374151;margin-top:3px;line-height:1.5">' + ud[2] + '</div>'
        + '</div></div></div>';
    }
    uniformBody += '</div>'
      + '<div style="margin-top:12px;font-size:0.78rem;color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;line-height:1.6">'
      + '&#9888;&#65039; Pupils in unapproved attire may be sent home to change. Hair must be plain black without accessories.'
      + '</div>';
    var uniformCard = siCard('👕', 'Approved School Uniform Schedule', uniformBody);

    /* ---- 3. Termly Requirements ---- */
    var termReqs = [
      ['2 Big Tissues',      'For classroom hygiene'],
      ['1 Dettol or Bleach', 'Disinfectant for cleaning'],
      ['2 Table Soap',       'For hand washing'],
      ['1 Detergent 280g',   'Cleaning supplies'],
    ];
    var reqBody = '<p style="font-size:0.82rem;color:#374151;margin:0 0 12px">Every pupil must bring the following items at the <strong>start of each term</strong>, no later than the second week of resumption.</p>'
      + '<div style="border-top:1px solid #f1f5f9">';
    for (var ri = 0; ri < termReqs.length; ri++) {
      var rq = termReqs[ri];
      reqBody += '<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #f1f5f9">'
        + '<div style="width:22px;height:22px;border-radius:50%;background:#1a3a5c;color:#fff;font-size:0.68rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + (ri + 1) + '</div>'
        + '<div>'
        + '<div style="font-size:0.85rem;font-weight:700;color:#1a3a5c">' + rq[0] + '</div>'
        + '<div style="font-size:0.75rem;color:#64748b">' + rq[1] + '</div>'
        + '</div></div>';
    }
    reqBody += '</div>';
    var reqCard = siCard('📦', 'Compulsory Termly Requirements', reqBody);

    /* ---- 4. School Fees ---- */
    var FS = window.FEE_STRUCTURE || {};
    var feeTerms = [
      { key: 'term1', label: 'First Term',  levy_label: 'Christmas Party Levy',           levy: (FS.term1 && FS.term1.levy_amount) || 5000 },
      { key: 'term2', label: 'Second Term', levy_label: 'Inter-House Sports Levy',        levy: (FS.term2 && FS.term2.levy_amount) || 5000 },
      { key: 'term3', label: 'Third Term',  levy_label: 'Graduation Levy (non-graduating)',levy: (FS.term3 && FS.term3.levy_amount) || 5000 },
    ];
    var base_fees    = (FS.term1 && FS.term1.school_fees)   || 30000;
    var utility_bill = (FS.term1 && FS.term1.utility_bill)  || 5000;
    var lesson_fee   = (FS.term1 && FS.term1.lesson_fee)    || 5000;
    var grad_levy    = (FS.term3 && FS.term3.levy_basic6_amount) || 8000;

    var feesBody = '<p style="font-size:0.82rem;color:#374151;margin:0 0 14px">The following charges apply to every child per term. All fees are payable at the start of each term.</p>';

    for (var fi = 0; fi < feeTerms.length; fi++) {
      var ft = feeTerms[fi];
      var total = base_fees + utility_bill + lesson_fee + ft.levy;
      feesBody += '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:12px">'
        + '<div style="font-size:0.8rem;font-weight:800;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0">'
        + ft.label + '</div>'
        + siRow('School Fees', f(base_fees))
        + siRow('Utility Bill', f(utility_bill))
        + siRow('Lesson Fee', f(lesson_fee))
        + siRow(ft.levy_label, f(ft.levy), '#7c3aed')
        + '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;margin-top:2px">'
        + '<span style="font-size:0.88rem;font-weight:700;color:#1a3a5c">Total (per child)</span>'
        + '<span style="font-size:1rem;font-weight:700;color:#065f46">' + f(total) + '</span>'
        + '</div>'
        + (fi === 2
          ? '<div style="margin-top:8px;font-size:0.75rem;color:#7c3aed;background:#f5f3ff;border-radius:6px;padding:6px 10px">'
            + '&#127891; <strong>Basic 6 (graduating pupils)</strong> pay ' + f(grad_levy) + ' graduation levy — total <strong>' + f(base_fees + utility_bill + lesson_fee + grad_levy) + '</strong>. Subject to government approval.</div>'
          : '')
        + '</div>';
    }

    feesBody += '<div style="margin-top:4px;font-size:0.78rem;color:#64748b;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;line-height:1.6">'
      + '&#9432; Fees are payable at the <strong>beginning of each term</strong>. Please collect your official receipt from the school office after payment. '
      + 'Contact the school accountant for any fee enquiries.'
      + '</div>';
    var feesCard = siCard('💳', 'School Fees — Per Term', feesBody);

    el.innerHTML = timingCard + uniformCard + reqCard + feesCard;
  }

  /* ================================================
     INITIALIZE ALL PAGES
     ================================================ */
  buildDashboard();
  buildChildren();
  buildPayChildTabs();
  renderPayments();
  buildResultChildTabs();
  renderResults();
  buildAttendance();
  buildNewsletter();
  buildAnnouncements();
  buildSchoolInfo();
  buildProfile();

});
