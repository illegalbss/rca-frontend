/* ============================================
   DASHBOARD — dashboard.js
   Royal Crystal Academy
   ============================================
   Every number on every stat card, chart, and summary panel comes
   from the school server (pupils, staff, this term's results,
   attendance, fees and approvals). No sample or made-up numbers.

   Role routing:
     ict_admin       → ICT Administrator Dashboard
     head_teacher    → Head Teacher Dashboard
     class_teacher / subject_teacher → Teacher Dashboard
     accountant      → Accountant Dashboard
     parent          → redirect to parent-portal.html
*/

document.addEventListener('DOMContentLoaded', async () => {

  const user    = window.CURRENT_USER;
  const roles   = user ? (user.roles || [user.role]) : [];
  const mainEl  = document.getElementById('dashboardMain');
  const titleEl = document.getElementById('dashboardTitle');

  if (!user) {
    mainEl.innerHTML = '<p style="padding:40px;color:#9ca3af">Not logged in.</p>';
    return;
  }
  if (roles.includes('parent')) { window.location.href = 'parent-portal.html'; return; }

  /* ---- All data comes from the school server, for the current term ---- */
  const api     = window.RCA_API;
  const TERM    = (window.RCA_CONFIG && window.RCA_CONFIG.CURRENT_TERM) || 'term1';
  const TERMS   = ['term1', 'term2', 'term3'];
  const TERM_LABELS = { term1: 'First Term', term2: 'Second Term', term3: 'Third Term' };
  const TERM_LABEL  = TERM_LABELS[TERM];
  const SESSION = (window.RCA_CONFIG && window.RCA_CONFIG.SESSION) || '';
  const now     = new Date();
  const today   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isFinance = ['ict_admin', 'head_teacher', 'accountant'].some(r => roles.includes(r));
  const safe = p => Promise.resolve(p).catch(() => null);

  mainEl.innerHTML = '<p style="padding:40px;color:#6b7280">Loading the latest figures…</p>';
  const [studentsRaw, staffRaw, usersRaw, approvalList, overview, attToday, calEvents, termReports] = await Promise.all([
    api.getStudents(),
    api.getStaffDirectory(),
    roles.includes('ict_admin') ? api.getUsers() : [],
    window.loadApprovals ? safe(window.loadApprovals(TERM)) : [],
    safe(api.call('/scores/overview?term=' + TERM)),
    safe(api.call('/attendance/today?date=' + today)),
    safe(api.getCalendarEvents()),
    // The accountant sees all three terms; others only need this term.
    isFinance ? Promise.all(TERMS.map(t => (t === TERM || roles.includes('accountant'))
      ? safe(api.call('/payments/report?term=' + t)) : null)) : [null, null, null]
  ]);

  // Only count ACTIVE students — exclude inactive, archived, removed
  const allStudents = (studentsRaw || [])
    .filter(s => !s.status || s.status === 'active')
    .map(s => ({ ...s, gender: (s.gender || '').toLowerCase() }));
  // Staff from the real staff list; full accounts list (with parents) for the ICT admin.
  const allTeachers = (staffRaw || []).map(u => ({ ...u, roles: [u.primary_role] }));
  const allUsers    = (usersRaw || []).map(u => ({ ...u, roles: u.roles || [u.primary_role || u.role] }));
  const allClasses  = window.SCHOOL_CLASSES  || [];
  const allSubjects = window.ALL_SUBJECTS_COMBINED || window.SCHOOL_SUBJECTS || [];
  const subjectName = code => (allSubjects.find(s => s.id === code) || {}).name || code;
  const approvalOf  = cls => (window.RESULT_APPROVALS || {})[`${cls}|${TERM}`];
  const termReport  = termReports[TERMS.indexOf(TERM)];
  const fmt         = window.formatNaira || (n => '₦' + Number(n).toLocaleString());

  /* ---- Access denied banner ---- */
  const denied = sessionStorage.getItem('rca_access_denied');
  if (denied) {
    sessionStorage.removeItem('rca_access_denied');
    const b = document.createElement('div');
    b.style.cssText = 'background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;border-radius:10px;padding:12px 18px;margin-bottom:20px;font-size:0.875rem;display:flex;align-items:center;gap:10px';
    b.innerHTML = '<span>🚫</span><span>' + denied + '</span>';
    mainEl.insertBefore(b, mainEl.firstChild);
    setTimeout(() => b.remove(), 6000);
  }

  /* ================================================
     COMPUTED DATA — calculated once, used everywhere
     ================================================ */

  // Students
  const totalStudents = allStudents.length;
  const maleCount     = allStudents.filter(s => s.gender === 'male').length;
  const femaleCount   = allStudents.filter(s => s.gender === 'female').length;

  // Students per class
  const studentsByClass = {};
  allClasses.forEach(c => {
    studentsByClass[c] = allStudents.filter(s => s.class_name === c).length;
  });

  // Staff
  const staffUsers   = allUsers.filter(u => !u.roles.includes('parent'));
  const parentUsers  = allUsers.filter(u =>  u.roles.includes('parent'));
  const teacherUsers = staffUsers.filter(u =>
    u.roles.includes('class_teacher') || u.roles.includes('subject_teacher'));
  const activeStaff  = staffUsers.filter(u => u.status === 'active').length;
  const deactStaff   = staffUsers.filter(u => u.status === 'deactivated').length;

  // Role breakdown for donut charts
  const roleCount = {};
  allUsers.forEach(u => {
    const r = u.primary_role || u.role;
    roleCount[r] = (roleCount[r] || 0) + 1;
  });

  // Approvals (this term, classes that have pupils)
  const appVals      = approvalList || [];
  const appApproved  = appVals.filter(r => ['approved','published'].includes(r.status)).length;
  const appPending   = appVals.filter(r => ['submitted','reviewed'].includes(r.status)).length;
  const appDraft     = appVals.filter(r => r.status === 'draft').length;
  const appReturned  = appVals.filter(r => r.status === 'returned').length;
  const appTotal     = appVals.length || 1;

  // Payments — this term's real fee report (finance roles only)
  const rep           = termReport || {};
  const totalExpected = rep.total_expected || 0;
  const totalPaid     = rep.total_paid || 0;
  const totalBalance  = rep.total_outstanding != null ? rep.total_outstanding : totalExpected - totalPaid;
  const paidFull      = rep.paid_count || 0;
  const paidPartial   = rep.partial_count || 0;
  const paidNone      = rep.unpaid_count || 0;
  const payCount      = (paidFull + paidPartial + paidNone) || 1;
  const collRate      = totalExpected > 0
    ? (totalPaid / totalExpected * 100).toFixed(1) : '0';

  // Average score per class this term (real scores; 0 = none entered yet)
  const overviewByClass = {};
  ((overview && overview.classes) || []).forEach(c => { overviewByClass[c.class_name] = c; });
  function classAverage(className) {
    return (overviewByClass[className] || {}).average || 0;
  }

  // Grade distribution across whole school this term
  function gradeDistribution() {
    const counts = { A:0, B:0, C:0, D:0, E:0, F:0 };
    Object.entries((overview && overview.grades) || {}).forEach(([g, n]) => {
      if (counts[g] !== undefined) counts[g] = n;
    });
    const total = Object.values(counts).reduce((a,b) => a+b, 0) || 1;
    return Object.entries(counts).map(([g, n]) => ({
      grade: g, count: n, pct: Math.round(n/total*100)
    }));
  }

  // Today's real attendance: present + late out of the pupils marked so far.
  const todayAtt = attToday && attToday.marked
    ? {
        pct: Math.round((attToday.present + attToday.late) / attToday.marked * 100),
        present: attToday.present + attToday.late,
        absent: attToday.absent,
        classes: attToday.classes_marked.length
      }
    : null;
  const attLabel = todayAtt ? todayAtt.pct + '%' : 'Not marked';

  // Upcoming school calendar events
  const day = d => String(d || '').slice(0, 10);
  const upcomingEvents = (calEvents || [])
    .filter(e => day(e.end_date || e.event_date) >= today)
    .sort((a, b) => day(a.event_date).localeCompare(day(b.event_date)))
    .slice(0, 4);
  const fmtDay = d => new Date(day(d) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  /* ================================================
     HTML HELPERS
     ================================================ */
  function statCard(icon, iconClass, num, label, link, href) {
    return `<div class="dash-stat-card">
      <div class="dash-stat-icon-row">
        <div class="dash-stat-icon ${iconClass}">${icon}</div>
      </div>
      <div class="dash-stat-num">${num}</div>
      <div class="dash-stat-label">${label}</div>
      ${link ? `<a href="${href}" class="dash-stat-link">${link}</a>` : ''}
    </div>`;
  }

  function card(title, body, link) {
    return `<div class="dash-card">
      <div class="dash-card-header">
        <span class="dash-card-title">${title}</span>
        ${link ? `<a href="${link.href}" class="dash-card-link">${link.label}</a>` : ''}
      </div>
      <div class="dash-card-body">${body}</div>
    </div>`;
  }

  function actItem(color, text, time) {
    return `<div class="activity-item">
      <div class="activity-dot ${color}"></div>
      <div class="activity-text">${text}</div>
      <div class="activity-time">${time}</div>
    </div>`;
  }

  function qaBtn(label, cls, href) {
    return `<a href="${href}" class="qa-btn ${cls}">${label}</a>`;
  }

  function eventItem(day, month, title, sub) {
    return `<div class="event-item">
      <div class="event-date-badge">
        <span class="event-day">${day}</span>
        <span class="event-month">${month}</span>
      </div>
      <div class="event-info">
        <div class="event-title">${title}</div>
        <div class="event-sub">${sub}</div>
      </div>
    </div>`;
  }

  function sysRow(label, val, style) {
    return `<div class="system-stat-row">
      <span class="system-stat-label">${label}</span>
      <span class="system-stat-val" ${style ? `style="${style}"` : ''}>${val}</span>
    </div>`;
  }

  function secRow(label, val, cls) {
    return `<div class="security-row">
      <span class="security-row-label">${label}</span>
      <span class="security-badge-num ${cls}">${val}</span>
    </div>`;
  }

  /* ---- SVG donut ---- */
  function donutSVG(segments, size) {
    const r = 40, cx = 50, cy = 50;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    const paths = segments.map(s => {
      const dash = (s.pct / 100) * circ;
      const el = `<circle class="donut-ring" cx="${cx}" cy="${cy}" r="${r}"
        stroke="${s.color}"
        stroke-dasharray="${dash} ${circ - dash}"
        stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += dash;
      return el;
    }).join('');
    return `<svg class="donut-svg" width="${size}" height="${size}" viewBox="0 0 100 100">
      <circle class="donut-ring donut-bg" cx="${cx}" cy="${cy}" r="${r}"/>
      ${paths}
    </svg>`;
  }

  /* ---- SVG sparkline ---- */
  function sparklineSVG(points, w, h, color) {
    if (!points.length) return '';
    const max = Math.max(...points), min = Math.min(...points);
    const range = max - min || 1;
    const step = w / Math.max(points.length - 1, 1);
    const pts = points.map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 10) - 5;
      return `${x},${y}`;
    }).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5"
        stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  }

  /* ---- Mini bar chart (horizontal) ---- */
  function miniBarChart(items, maxVal) {
    return items.map(item => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:0.72rem">
        <span style="min-width:80px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.label}</span>
        <div style="flex:1;height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden">
          <div style="width:${Math.round(item.val/maxVal*100)}%;height:100%;background:${item.color||'#1d4ed8'};border-radius:4px;transition:width 0.6s"></div>
        </div>
        <span style="min-width:28px;text-align:right;font-weight:600;color:#111827">${item.val}</span>
      </div>`).join('');
  }

  /* ================================================
     HEAD TEACHER DASHBOARD
     ================================================ */
  function renderHeadTeacher() {
    titleEl.textContent = 'Head Teacher Dashboard';

    const classAverages = allClasses.map(c => ({
      label: c, val: classAverage(c), color: '#1d4ed8'
    }));
    const maxAvg = Math.max(...classAverages.map(c => c.val), 1);

    const gradeDist = gradeDistribution();
    const gradeColors = { A:'#16a34a', B:'#1d4ed8', C:'#f59e0b', D:'#f97316', E:'#ef4444', F:'#9f1239' };

    // Real activity log entries
    const recentTeachers = allTeachers.filter(t =>
      t.roles && (t.roles.includes('subject_teacher') || t.roles.includes('class_teacher'))
    ).slice(0, 3);

    mainEl.innerHTML = `
      <div class="welcome-banner">
        <div>
          <h2>Welcome back, ${user.full_name}! 👋</h2>
          <p>Here's what's happening at Royal Crystal Academy today.</p>
        </div>
        <span class="welcome-emoji">🎓</span>
      </div>

      <div class="dash-stats" style="grid-template-columns:repeat(5,1fr)">
        ${statCard('👥','dsi-blue',   totalStudents,                    'Total Students',     'View all students',    'students.html')}
        ${statCard('👨‍🏫','dsi-green', allTeachers.length,               'Total Staff',        'View all teachers',    'teachers.html')}
        ${statCard('🏫','dsi-purple',  allClasses.length,                'Classes',            'View all classes',     'classes.html')}
        ${statCard('✅','dsi-teal',    attLabel,                         'Attendance Today',   'View attendance',      'attendance.html')}
        ${statCard('⏳','dsi-red',     appPending,                       'Pending Approvals',  'View pending',         'approvals.html')}
      </div>

      <div class="dash-grid-2" style="margin-bottom:16px">
        ${card('Result Approval Summary', `
          <div class="donut-wrap">
            ${donutSVG([
              { color:'#16a34a', pct: Math.round(appApproved/appTotal*100) },
              { color:'#f59e0b', pct: Math.round(appPending/appTotal*100) },
              { color:'#6b7280', pct: Math.round(appDraft/appTotal*100) },
              { color:'#dc2626', pct: Math.round(appReturned/appTotal*100) }
            ], 110)}
            <div class="donut-legend">
              <div class="donut-item">
                <span class="donut-dot" style="background:#16a34a"></span>
                <span class="donut-item-label">Approved</span>
                <span class="donut-item-count">${appApproved}</span>
                <span class="donut-item-pct">(${Math.round(appApproved/appTotal*100)}%)</span>
              </div>
              <div class="donut-item">
                <span class="donut-dot" style="background:#f59e0b"></span>
                <span class="donut-item-label">Pending Review</span>
                <span class="donut-item-count">${appPending}</span>
                <span class="donut-item-pct">(${Math.round(appPending/appTotal*100)}%)</span>
              </div>
              <div class="donut-item">
                <span class="donut-dot" style="background:#6b7280"></span>
                <span class="donut-item-label">Draft</span>
                <span class="donut-item-count">${appDraft}</span>
                <span class="donut-item-pct">(${Math.round(appDraft/appTotal*100)}%)</span>
              </div>
              <div class="donut-item">
                <span class="donut-dot" style="background:#dc2626"></span>
                <span class="donut-item-label">Returned</span>
                <span class="donut-item-count">${appReturned}</span>
                <span class="donut-item-pct">(${Math.round(appReturned/appTotal*100)}%)</span>
              </div>
            </div>
          </div>
        `, {label:'View Approvals', href:'approvals.html'})}

        ${card('Student Overview', `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
            <div style="background:#eff6ff;border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:1.4rem;font-weight:700;color:#1d4ed8;font-family:var(--font-heading)">${maleCount}</div>
              <div style="font-size:0.72rem;color:#6b7280">Male Students</div>
            </div>
            <div style="background:#fdf2f8;border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:1.4rem;font-weight:700;color:#9d174d;font-family:var(--font-heading)">${femaleCount}</div>
              <div style="font-size:0.72rem;color:#6b7280">Female Students</div>
            </div>
          </div>
          <div style="font-size:0.75rem;font-weight:600;color:#374151;margin-bottom:8px">Students by Class</div>
          ${miniBarChart(
            allClasses.map(c => ({ label: c, val: studentsByClass[c], color:'#1d4ed8' })),
            Math.max(...Object.values(studentsByClass))
          )}
        `, {label:'View Students', href:'students.html'})}
      </div>

      <div class="dash-grid-3">
        ${card('Class Performance (Avg %)', `
          <div style="margin-bottom:4px">
            ${miniBarChart(
              classAverages.map(c => ({
                ...c,
                color: c.val >= 70 ? '#16a34a' : c.val >= 50 ? '#f59e0b' : '#ef4444'
              })),
              100
            )}
          </div>
        `, {label:'Score Entry', href:'score-entry.html'})}

        ${card('Grade Distribution', `
          <div class="donut-wrap">
            ${donutSVG(gradeDist.map(g => ({ color: gradeColors[g.grade], pct: g.pct })), 90)}
            <div class="donut-legend" style="gap:4px">
              ${gradeDist.map(g => `
                <div class="donut-item" style="gap:5px">
                  <span class="donut-dot" style="background:${gradeColors[g.grade]}"></span>
                  <span class="donut-item-label">Grade ${g.grade}</span>
                  <span class="donut-item-count" style="font-size:0.72rem">${g.count.toLocaleString()}</span>
                  <span class="donut-item-pct">(${g.pct}%)</span>
                </div>`).join('')}
            </div>
          </div>
        `)}

        ${card('Quick Actions', `
          <div class="quick-actions">
            ${qaBtn('✓ Approve Results',   'qa-green',  'approvals.html')}
            ${qaBtn('📊 Finance Reports',   'qa-blue',   'finance-reports.html')}
            ${qaBtn('📋 Report Cards',      'qa-purple', 'report-card.html')}
            ${qaBtn('👥 Manage Students',   'qa-orange', 'students.html')}
          </div>
        `)}
      </div>

      <div class="dash-grid-2">
        ${card('Fee Collection — ' + TERM_LABEL, `
          ${termReport ? '' : '<p style="color:#9ca3af;font-size:0.8rem;margin:0 0 8px">Fee figures could not be loaded.</p>'}
          ${sysRow('Total Expected', fmt(totalExpected))}
          ${sysRow('Total Collected', fmt(totalPaid), 'color:#16a34a;font-weight:700')}
          ${sysRow('Outstanding Balance', fmt(totalBalance), 'color:#dc2626;font-weight:700')}
          <div style="margin:10px 0 4px">
            <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:#6b7280;margin-bottom:4px">
              <span>Collection Rate</span><span>${collRate}%</span>
            </div>
            <div style="height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden">
              <div style="width:${collRate}%;height:100%;background:linear-gradient(90deg,#16a34a,#059669);border-radius:4px"></div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">
            <div style="text-align:center;background:#d1fae5;border-radius:8px;padding:8px">
              <div style="font-weight:700;color:#065f46">${paidFull}</div>
              <div style="font-size:0.68rem;color:#6b7280">Paid Full</div>
            </div>
            <div style="text-align:center;background:#fef3c7;border-radius:8px;padding:8px">
              <div style="font-weight:700;color:#92400e">${paidPartial}</div>
              <div style="font-size:0.68rem;color:#6b7280">Partial</div>
            </div>
            <div style="text-align:center;background:#fee2e2;border-radius:8px;padding:8px">
              <div style="font-weight:700;color:#991b1b">${paidNone}</div>
              <div style="font-size:0.68rem;color:#6b7280">Unpaid</div>
            </div>
          </div>
        `, {label:'Finance Reports', href:'finance-reports.html'})}

        ${card('Upcoming Events', upcomingEvents.length
          ? upcomingEvents.map(e => sysRow('📅 ' + fmtDay(e.event_date) + (e.end_date && day(e.end_date) !== day(e.event_date) ? ' – ' + fmtDay(e.end_date) : ''),
              String(e.title || '').replace(/[<>&]/g, ''))).join('')
          : `
          <div style="text-align:center;padding:20px 12px;color:#9ca3af;font-size:0.82rem">
            <div style="font-size:1.4rem;margin-bottom:8px">📅</div>
            <div style="font-weight:600;color:#6b7280;margin-bottom:4px">No events scheduled</div>
            <div>Add events via the <a href="school-calendar.html" style="color:#1d4ed8">School Calendar</a>.</div>
          </div>
        `, {label:'School Calendar', href:'school-calendar.html'})}
      </div>
    `;
  }

  /* ================================================
     ICT ADMINISTRATOR DASHBOARD
     ================================================ */
  function renderICTAdmin() {
    // Full-access accounts are shown by who they are (job title), e.g. the
    // School Proprietor, not by the permission level "ICT Administrator".
    const who = window.CURRENT_ROLE_LABEL || 'ICT Administrator';
    titleEl.textContent = who + ' Dashboard';

    const totalU = allUsers.length || 1;
    const roleSegments = [
      { label:'Admins',       color:'#7c3aed', count:(roleCount['ict_admin']||0) },
      { label:'Head Teacher', color:'#1d4ed8', count:(roleCount['head_teacher']||0) },
      { label:'Teachers',     color:'#16a34a', count:(roleCount['class_teacher']||0)+(roleCount['subject_teacher']||0) },
      { label:'Accountant',   color:'#f59e0b', count:(roleCount['accountant']||0) },
      { label:'Parents',      color:'#9ca3af', count:parentUsers.length }
    ].map(s => ({ ...s, pct: Math.round(s.count/totalU*100) })).filter(s => s.count > 0);

    // Data volume stats (this term)
    const totalResultRecords = (overview && overview.entries) || 0;
    const activeAccounts     = allUsers.filter(u => u.status === 'active').length;

    mainEl.innerHTML = `
      <div class="welcome-banner" style="background:linear-gradient(135deg,#4c1d95,#7c3aed)">
        <div>
          <h2>${who} — ${user.full_name} 🛡️</h2>
          <p>${activeAccounts} of ${allUsers.length} accounts active.</p>
        </div>
        <span class="welcome-emoji">💻</span>
      </div>

      <div class="dash-stats" style="grid-template-columns:repeat(5,1fr)">
        ${statCard('👤','dsi-blue',    allUsers.length,        'Total Accounts',  'Manage users',      'user-management.html')}
        ${statCard('👨‍🏫','dsi-green',  teacherUsers.length,   'Teachers',        'View teachers',     'teachers.html')}
        ${statCard('👨‍👩‍👧','dsi-purple', parentUsers.length,   'Parents',         'View accounts',     'user-management.html')}
        ${statCard('🎒','dsi-orange',   totalStudents,          'Students',        'View students',     'students.html')}
        ${statCard('🟢','dsi-teal',     activeStaff,            'Active Staff',    'View active',       'user-management.html')}
      </div>

      <div class="dash-grid-2" style="margin-bottom:16px">
        ${card('School Overview — ' + TERM_LABEL, `
          ${sysRow('🎒 Pupils on roll', totalStudents.toLocaleString())}
          ${sysRow('🏫 Classes', allClasses.length)}
          ${sysRow('📊 Scores entered this term', totalResultRecords.toLocaleString())}
          ${sysRow('✅ Attendance today', todayAtt ? `${todayAtt.pct}% (${todayAtt.classes} class${todayAtt.classes === 1 ? '' : 'es'} marked)` : 'Not marked yet')}
          ${sysRow('💳 Fees collected this term', termReport ? fmt(totalPaid) : '—')}
          ${sysRow('⏳ Results awaiting approval', appPending)}
        `)}

        ${card('User Role Distribution', `
          <div class="donut-wrap">
            ${donutSVG(roleSegments, 110)}
            <div class="donut-legend">
              ${roleSegments.map(s => `
                <div class="donut-item">
                  <span class="donut-dot" style="background:${s.color}"></span>
                  <span class="donut-item-label">${s.label}</span>
                  <span class="donut-item-count">${s.count}</span>
                  <span class="donut-item-pct">(${s.pct}%)</span>
                </div>`).join('')}
            </div>
          </div>
        `)}
      </div>

      <div class="dash-grid-3">
        ${card('Account Status', `
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#d1fae5;border-radius:8px">
              <span style="font-size:0.82rem;font-weight:600;color:#065f46">✅ Active Accounts</span>
              <span style="font-family:var(--font-heading);font-size:1.2rem;font-weight:700;color:#065f46">${activeStaff + parentUsers.filter(u=>u.status==='active').length}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fee2e2;border-radius:8px">
              <span style="font-size:0.82rem;font-weight:600;color:#991b1b">🚫 Deactivated</span>
              <span style="font-family:var(--font-heading);font-size:1.2rem;font-weight:700;color:#991b1b">${deactStaff}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f3f4f6;border-radius:8px">
              <span style="font-size:0.82rem;font-weight:600;color:#374151">👥 Total Users</span>
              <span style="font-family:var(--font-heading);font-size:1.2rem;font-weight:700;color:#374151">${allUsers.length}</span>
            </div>
          </div>
        `, {label:'Manage Users', href:'user-management.html'})}

        ${card('Quick Actions', `
          <div class="quick-actions">
            ${qaBtn('➕ Create Account',   'qa-blue',   'user-management.html')}
            ${qaBtn('📋 View Credentials', 'qa-purple', 'user-management.html')}
            ${qaBtn('📊 Activity Logs',    'qa-teal',   'activity-logs.html')}
            ${qaBtn('✓ Approve Results',   'qa-green',  'approvals.html')}
          </div>
        `)}

        ${card('Security Overview', `
          ${secRow('Deactivated Accounts',   deactStaff,      deactStaff > 0 ? 'sec-orange' : 'sec-green')}
          ${secRow('Active Staff Sessions',  activeStaff,     'sec-green')}
          ${secRow('Total Parent Accounts',  parentUsers.length, 'sec-green')}
          ${secRow('Total Student Records',  totalStudents,   'sec-green')}
        `)}
      </div>

    `;
  }

  /* ================================================
     TEACHER DASHBOARD (Form + Subject)
     ================================================ */
  function renderTeacher() {
    const isForm    = roles.includes('class_teacher');
    const isSubject = roles.includes('subject_teacher');
    const title = isForm && isSubject ? 'Form & Subject Teacher Dashboard'
                : isForm  ? 'Form Teacher Dashboard'
                : 'Subject Teacher Dashboard';
    titleEl.textContent = title;

    const myClasses  = user.linked_classes  || [];
    const mySubjects = user.linked_subjects || [];
    // A link to a whole level ("Basic 3") covers its arms (Basic 3A, 3B).
    const levelOf    = window.classLevel || (c => c);
    const myStudents = allStudents.filter(s => myClasses.includes(s.class_name) || myClasses.includes(levelOf(s.class_name)));

    // Real approval statuses for my classes, this term
    const myApprovals = myClasses.map(c => {
      const rec = approvalOf(c);
      return { cls: c, status: rec ? rec.status : 'draft' };
    });
    const submitted  = myApprovals.filter(a => ['submitted','reviewed','approved','published'].includes(a.status)).length;
    const stillDraft = myApprovals.filter(a => a.status === 'draft').length;

    // Average of all scores entered this term in my classes
    const myOverview = myClasses.map(c => overviewByClass[c]).filter(Boolean);
    const myEntries  = myOverview.reduce((s, c) => s + c.entries, 0);
    const myClassAvg = myEntries
      ? Math.round(myOverview.reduce((s, c) => s + c.average * c.entries, 0) / myEntries)
      : 0;

    // Tasks: one per subject+class combo
    const tasks = [];
    mySubjects.forEach(sub => {
      myClasses.forEach(cls => {
        const rec = approvalOf(cls);
        tasks.push({
          label: `Enter ${subjectName(sub)} scores — ${cls}`,
          status: rec && rec.status !== 'draft' ? 'done' : 'pending'
        });
      });
    });
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const doneTasks    = tasks.filter(t => t.status === 'done').length;

    mainEl.innerHTML = `
      <div class="welcome-banner" style="background:linear-gradient(135deg,#166534,#16a34a)">
        <div>
          <h2>Welcome, ${user.full_name}! 👩‍🏫</h2>
          <p>${title} — ${TERM_LABEL}${SESSION ? ', ' + SESSION : ''}</p>
        </div>
        <span class="welcome-emoji">📋</span>
      </div>

      <div class="dash-stats" style="grid-template-columns:repeat(5,1fr)">
        ${statCard('🏫','dsi-blue',   myClasses.length,  'My Classes',        'View classes',   'classes.html')}
        ${statCard('📚','dsi-green',  mySubjects.length, 'My Subjects',       'View subjects',  'score-entry.html')}
        ${statCard('👥','dsi-purple', myStudents.length, 'My Students',       'View students',  'students.html')}
        ${statCard('✅','dsi-teal',   submitted,         'Scores Submitted',  'View results',   'score-entry.html')}
        ${statCard('⏳','dsi-orange', pendingTasks,      'Pending Tasks',     'Enter scores',   'score-entry.html')}
      </div>

      <div class="dash-grid-3" style="margin-bottom:16px">
        ${card('My Classes', `
          <div class="my-classes-list">
            ${myClasses.length === 0
              ? '<p style="color:#9ca3af;font-size:0.8rem">No classes assigned.</p>'
              : myClasses.map(cls => {
                  const rec = approvalOf(cls);
                  const status = rec ? rec.status : 'draft';
                  const statusColor = {
                    draft:'#9ca3af', submitted:'#f59e0b', reviewed:'#3b82f6',
                    approved:'#16a34a', published:'#16a34a', returned:'#ef4444'
                  }[status] || '#9ca3af';
                  return `<div class="my-class-row">
                    <div>
                      <div class="my-class-name">${cls}</div>
                      <div class="my-class-role" style="display:flex;align-items:center;gap:5px">
                        <span style="width:6px;height:6px;border-radius:50%;background:${statusColor};display:inline-block"></span>
                        ${status.charAt(0).toUpperCase()+status.slice(1)}
                      </div>
                    </div>
                    <a href="score-entry.html" class="btn btn-outline btn-sm" style="font-size:0.72rem;padding:4px 10px">Scores</a>
                  </div>`;
                }).join('')}
          </div>
        `)}

        ${card('My Subjects', `
          <div class="my-subjects-list">
            ${mySubjects.length === 0
              ? '<p style="color:#9ca3af;font-size:0.8rem">No subjects assigned.</p>'
              : mySubjects.map(sub => `
                <div class="my-subject-row">
                  <div>
                    <div class="my-subject-name">${subjectName(sub)}</div>
                    <div class="my-subject-classes">${myClasses.join(' · ') || 'All assigned classes'}</div>
                  </div>
                  <a href="score-entry.html" class="qa-btn qa-blue" style="font-size:0.72rem;padding:4px 10px;display:inline-block">Enter</a>
                </div>`).join('')}
          </div>
        `)}

        ${card('My Progress', `
          <div style="text-align:center;padding:8px 0 12px">
            <div style="font-family:var(--font-heading);font-size:2rem;font-weight:700;color:#1d4ed8">${myClassAvg}%</div>
            <div style="font-size:0.75rem;color:#6b7280;margin-bottom:12px">${myEntries ? 'Average Score — ' + TERM_LABEL : 'No scores entered yet this term'}</div>
          </div>
          ${sysRow('✅ Tasks Completed', doneTasks + ' / ' + tasks.length)}
          ${sysRow('⏳ Still Pending',   pendingTasks + ' task' + (pendingTasks !== 1 ? 's' : ''))}
          ${sysRow('📊 Classes Submitted', submitted + ' / ' + myClasses.length)}
          ${isForm ? sysRow('💬 Form Class', user.form_class || myClasses[0] || '—') : ''}
        `)}
      </div>

      <div class="dash-grid-2">
        ${card('Pending Tasks', `
          <div class="task-list">
            ${tasks.slice(0,6).map(t => `
              <div class="task-row">
                <span class="task-label">${t.label}</span>
                <span class="task-badge ${t.status==='done'?'task-done':'task-pending'}">${t.status==='done'?'Done':'Pending'}</span>
              </div>`).join('')}
            ${tasks.length > 6 ? `<div style="font-size:0.75rem;color:#6b7280;text-align:center;padding-top:8px">+${tasks.length-6} more tasks</div>` : ''}
          </div>
        `)}

        <div class="notes-box">
          <div class="notes-box-title">⚠️ Important Reminders</div>
          <ul>
            <li>You can only enter scores for your own assigned subjects.</li>
            <li>Once submitted, scores are <strong>locked</strong> — no editing.</li>
            <li>Contact the Head Teacher if a correction is needed.</li>
            ${isSubject && !isForm ? '<li>You cannot print report cards or approve results.</li>' : ''}
            ${isForm ? '<li>After all scores are in, complete the Class Review.</li>' : ''}
          </ul>
        </div>
      </div>
    `;
  }

  /* ================================================
     ACCOUNTANT DASHBOARD
     ================================================ */
  function renderAccountant() {
    titleEl.textContent = 'Accountant Dashboard';

    // Amount collected per class this term (from the fee report)
    const topCollected = [...(rep.by_class || [])]
      .sort((a,b) => b.paid - a.paid).slice(0, 5)
      .map(c => ({ label: c.class_name, paid: c.paid }));

    mainEl.innerHTML = `
      <div class="welcome-banner" style="background:linear-gradient(135deg,#064e3b,#059669)">
        <div>
          <h2>Accountant Dashboard — ${user.full_name} 💰</h2>
          <p>Fee collection — ${TERM_LABEL}${SESSION ? ', ' + SESSION : ''}${termReport ? '' : ' (figures could not be loaded)'}</p>
        </div>
        <span class="welcome-emoji">📊</span>
      </div>

      <div class="dash-stats" style="grid-template-columns:repeat(4,1fr)">
        ${statCard('📈','dsi-blue',   fmt(totalExpected),   'Total Expected',   'View fee schedule',  'fees.html')}
        ${statCard('✅','dsi-green',  fmt(totalPaid),       'Total Collected',  'View payments',      'payments.html')}
        ${statCard('⚠️','dsi-red',   fmt(totalBalance),    'Outstanding',      'View balances',      'finance-reports.html')}
        ${statCard('📊','dsi-purple', collRate + '%',       'Collection Rate',  'View report',        'finance-reports.html')}
      </div>

      <div class="dash-grid-2" style="margin-bottom:16px">
        ${card('Payment Status Breakdown', `
          <div class="donut-wrap">
            ${donutSVG([
              { color:'#16a34a', pct: Math.round(paidFull/payCount*100) },
              { color:'#f59e0b', pct: Math.round(paidPartial/payCount*100) },
              { color:'#dc2626', pct: Math.round(paidNone/payCount*100) }
            ], 110)}
            <div class="donut-legend">
              <div class="donut-item">
                <span class="donut-dot" style="background:#16a34a"></span>
                <span class="donut-item-label">Paid in Full</span>
                <span class="donut-item-count">${paidFull}</span>
                <span class="donut-item-pct">(${Math.round(paidFull/payCount*100)}%)</span>
              </div>
              <div class="donut-item">
                <span class="donut-dot" style="background:#f59e0b"></span>
                <span class="donut-item-label">Partial</span>
                <span class="donut-item-count">${paidPartial}</span>
                <span class="donut-item-pct">(${Math.round(paidPartial/payCount*100)}%)</span>
              </div>
              <div class="donut-item">
                <span class="donut-dot" style="background:#dc2626"></span>
                <span class="donut-item-label">Not Paid</span>
                <span class="donut-item-count">${paidNone}</span>
                <span class="donut-item-pct">(${Math.round(paidNone/payCount*100)}%)</span>
              </div>
            </div>
          </div>
          <div style="margin-top:14px">
            <div style="height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden">
              <div style="width:${collRate}%;height:100%;background:linear-gradient(90deg,#16a34a,#059669);border-radius:4px"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:#6b7280;margin-top:4px">
              <span>0%</span><span>${collRate}% collected</span><span>100%</span>
            </div>
          </div>
        `, {label:'Full Report', href:'finance-reports.html'})}

        ${card('Collected by Class (Top 5) — ' + TERM_LABEL, topCollected.length ? `
          ${miniBarChart(
            topCollected.map(c => ({
              label: c.label,
              val: Math.round(c.paid/1000),
              color: '#16a34a'
            })),
            Math.max(...topCollected.map(c => Math.round(c.paid/1000)), 1)
          )}
          <div style="font-size:0.7rem;color:#9ca3af;margin-top:6px">Values in ₦'000. See Finance Reports for who still owes.</div>
        ` : '<p style="color:#9ca3af;font-size:0.8rem">No payments recorded yet this term.</p>', {label:'Finance Reports', href:'finance-reports.html'})}
      </div>

      <div class="dash-grid-2">
        ${card('Quick Actions', `
          <div class="quick-actions">
            ${qaBtn('📝 Record Payment',   'qa-green',  'payments.html')}
            ${qaBtn('🧾 View Receipts',    'qa-blue',   'receipts.html')}
            ${qaBtn('📊 Finance Reports',  'qa-purple', 'finance-reports.html')}
            ${qaBtn('📋 Fee Schedule',     'qa-orange', 'fees.html')}
          </div>
        `)}

        ${card('Term-by-Term Summary', `
          ${TERMS.map((term, i) => {
            const r = termReports[i] || {};
            const tPaid = r.total_paid || 0;
            const tExp  = r.total_expected || 0;
            const tRate = tExp > 0 ? (tPaid/tExp*100).toFixed(0) : 0;
            const labels = ['First Term','Second Term','Third Term'];
            return `<div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:4px">
                <span style="font-weight:600;color:#374151">${labels[i]}</span>
                <span style="color:#6b7280">${fmt(tPaid)} / ${fmt(tExp)}</span>
              </div>
              <div style="height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden">
                <div style="width:${tRate}%;height:100%;background:${i===0?'#1d4ed8':i===1?'#7c3aed':'#16a34a'};border-radius:4px"></div>
              </div>
              <div style="font-size:0.68rem;color:#9ca3af;margin-top:2px">${tRate}% collected</div>
            </div>`;
          }).join('')}
        `)}
      </div>
    `;
  }

  /* ================================================
     ROUTE
     ================================================ */
  if      (roles.includes('ict_admin'))     renderICTAdmin();
  else if (roles.includes('head_teacher'))  renderHeadTeacher();
  else if (roles.includes('class_teacher') || roles.includes('subject_teacher')) renderTeacher();
  else if (roles.includes('accountant'))    renderAccountant();
  else                                      renderHeadTeacher();

});
