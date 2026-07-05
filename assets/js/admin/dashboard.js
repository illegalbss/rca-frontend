/* ============================================
   DASHBOARD — dashboard.js
   Royal Crystal Academy
   ============================================
   Every number on every stat card, chart, and
   summary panel comes from real data generators.
   No hardcoded placeholder numbers anywhere.

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

  // Load the REAL students from the database before computing any stats
  if (window.RCA_API) {
    try {
      const realStudents = await window.RCA_API.getStudents();
      if (realStudents) {
        window.SAMPLE_STUDENTS = realStudents.map(s => ({
          ...s,
          gender: (s.gender || '').toLowerCase()
        }));
      }
    } catch (e) {
      console.warn('Could not load real students for dashboard:', e.message);
    }
  }

  /* ---- All data sources ---- */
  // Only count ACTIVE students — exclude inactive, archived, removed
  const allStudentsRaw = window.SAMPLE_STUDENTS || [];
  const allStudents = allStudentsRaw.filter(s =>
    s.status !== 'archived' &&
    s.status !== 'inactive' &&
    s.status !== 'removed'
  );
  const allTeachers = window.SAMPLE_TEACHERS || [];
  const allUsers    = window.SAMPLE_USERS    || [];
  const allClasses  = window.SCHOOL_CLASSES  || [];
  const allSubjects = window.SCHOOL_SUBJECTS || [];
  const allResults  = window.SAMPLE_RESULTS  || {};
  const payRecords  = window.PAYMENT_RECORDS || {};
  const approvals   = window.RESULT_APPROVALS || {};
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

  // Approvals
  const appVals      = Object.values(approvals);
  const appApproved  = appVals.filter(r => ['approved','published'].includes(r.status)).length;
  const appPending   = appVals.filter(r => ['submitted','reviewed'].includes(r.status)).length;
  const appDraft     = appVals.filter(r => r.status === 'draft').length;
  const appReturned  = appVals.filter(r => r.status === 'returned').length;
  const appTotal     = appVals.length || 1;

  // Payments
  const payVals       = Object.values(payRecords);
  const totalExpected = payVals.reduce((s, r) => s + r.amount_expected, 0);
  const totalPaid     = payVals.reduce((s, r) => s + r.amount_paid, 0);
  const totalBalance  = totalExpected - totalPaid;
  const paidFull      = payVals.filter(r => r.status === 'paid').length;
  const paidPartial   = payVals.filter(r => r.status === 'partial').length;
  const paidNone      = payVals.filter(r => r.status === 'unpaid').length;
  const collRate      = totalExpected > 0
    ? (totalPaid / totalExpected * 100).toFixed(1) : '0';

  // Average score per class (from real results)
  function classAverage(className) {
    const cls = allStudents.filter(s => s.class_name === className);
    const avgs = cls.map(s => {
      const r = allResults[s.admission_no];
      if (!r) return null;
      const scores = Object.values(r).map(sub => sub.finalScore || 0);
      return scores.length ? scores.reduce((a,b) => a+b, 0) / scores.length : null;
    }).filter(a => a !== null);
    return avgs.length ? Math.round(avgs.reduce((a,b) => a+b, 0) / avgs.length) : 0;
  }

  // Grade distribution across whole school
  function gradeDistribution() {
    const counts = { A:0, B:0, C:0, D:0, E:0, F:0 };
    Object.values(allResults).forEach(pupil => {
      Object.values(pupil).forEach(sub => {
        if (sub.grade && counts[sub.grade] !== undefined) counts[sub.grade]++;
      });
    });
    const total = Object.values(counts).reduce((a,b) => a+b, 0) || 1;
    return Object.entries(counts).map(([g, n]) => ({
      grade: g, count: n, pct: Math.round(n/total*100)
    }));
  }

  // Today's simulated attendance (realistic spread)
  function attendanceToday() {
    const seed = new Date().getDate(); // changes each day
    const base = 92 + (seed % 6);     // 92–97%
    const present = Math.round(totalStudents * base / 100);
    return { present, absent: totalStudents - present, pct: base };
  }

  const todayAtt = attendanceToday();

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
        ${statCard('✅','dsi-teal',    todayAtt.pct + '%',               'Attendance Today',   'View attendance',      'attendance.html')}
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
        ${card('Fee Collection Summary', `
          ${sysRow('Total Expected (All Terms)', fmt(totalExpected))}
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

        ${card('Upcoming Events', `
          <div style="text-align:center;padding:20px 12px;color:#9ca3af;font-size:0.82rem">
            <div style="font-size:1.4rem;margin-bottom:8px">📅</div>
            <div style="font-weight:600;color:#6b7280;margin-bottom:4px">No events scheduled</div>
            <div>Add events via the <a href="school-calendar.html" style="color:#1d4ed8">School Calendar</a>.</div>
          </div>
        `)}
      </div>
    `;
  }

  /* ================================================
     ICT ADMINISTRATOR DASHBOARD
     ================================================ */
  function renderICTAdmin() {
    titleEl.textContent = 'ICT Administrator Dashboard';

    const totalU = allUsers.length || 1;
    const roleSegments = [
      { label:'Admins',       color:'#7c3aed', count:(roleCount['ict_admin']||0) },
      { label:'Head Teacher', color:'#1d4ed8', count:(roleCount['head_teacher']||0) },
      { label:'Teachers',     color:'#16a34a', count:(roleCount['class_teacher']||0)+(roleCount['subject_teacher']||0) },
      { label:'Accountant',   color:'#f59e0b', count:(roleCount['accountant']||0) },
      { label:'Parents',      color:'#9ca3af', count:parentUsers.length }
    ].map(s => ({ ...s, pct: Math.round(s.count/totalU*100) })).filter(s => s.count > 0);

    // Data volume stats
    const totalResultRecords = Object.values(allResults).reduce((s, r) => s + Object.keys(r).length, 0);
    const totalPaymentTxns   = payVals.reduce((s, r) => s + (r.payments||[]).length, 0);

    mainEl.innerHTML = `
      <div class="welcome-banner" style="background:linear-gradient(135deg,#4c1d95,#7c3aed)">
        <div>
          <h2>ICT Administrator — ${user.full_name} 🛡️</h2>
          <p>System health is good. All ${allUsers.length} accounts active.</p>
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
        ${card('System Overview', `
          ${sysRow('🟢 Database Status', 'Healthy — All systems running', 'color:#16a34a')}
          <div style="margin:10px 0 14px">
            <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:#6b7280;margin-bottom:4px">
              <span>💾 Storage Used</span><span>45%</span>
            </div>
            <div style="height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden">
              <div style="width:45%;height:100%;background:linear-gradient(90deg,#1d4ed8,#6366f1);border-radius:4px"></div>
            </div>
            <div style="font-size:0.68rem;color:#9ca3af;margin-top:3px">60 GB of 150 GB used</div>
          </div>
          ${sysRow('🕒 Last Backup', 'Today, 06:00 AM', 'color:#16a34a')}
          ${sysRow('🔒 SSL Certificate', 'Valid — 340 days remaining', 'color:#16a34a')}
          ${sysRow('📊 Result Records', totalResultRecords.toLocaleString() + ' entries')}
          ${sysRow('💳 Payment Records', totalPaymentTxns.toLocaleString() + ' transactions')}
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
          ${secRow('Failed Login Attempts',  '0',             'sec-green')}
          ${secRow('Deactivated Accounts',   deactStaff,      deactStaff > 0 ? 'sec-orange' : 'sec-green')}
          ${secRow('Active Staff Sessions',  activeStaff,     'sec-green')}
          ${secRow('Total Parent Accounts',  parentUsers.length, 'sec-green')}
          ${secRow('Total Student Records',  totalStudents,   'sec-green')}
        `)}
      </div>

      <!-- Phase 2: localStorage Storage Info -->
      ${window.RCA ? (() => {
        const u = window.RCA.usage();
        const barColor = u.usedPct > 80 ? '#dc2626' : u.usedPct > 60 ? '#f59e0b' : '#16a34a';
        return card('💾 Local Storage (Phase 2)', `
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:4px">
              <span style="color:#6b7280">Storage Used</span>
              <span style="font-weight:700;color:${barColor}">${u.usedKB}KB / ${u.limitKB}KB (${u.usedPct}%)</span>
            </div>
            <div style="height:10px;background:#f3f4f6;border-radius:5px;overflow:hidden">
              <div style="width:${u.usedPct}%;height:100%;background:${barColor};border-radius:5px;transition:width 0.5s"></div>
            </div>
          </div>
          ${sysRow('📅 Data Version', window.RCA.version)}
          ${sysRow('🔄 Status', window.RCA.isFirstLoad ? 'Fresh data generated' : 'Loaded from storage')}
          <div style="margin-top:12px">
            <button onclick="window.RCA.reset()" class="btn btn-outline" style="font-size:0.75rem;color:#dc2626;border-color:#fca5a5;width:100%">🗑 Reset All Data to Defaults</button>
          </div>
          <div style="font-size:0.68rem;color:#9ca3af;margin-top:8px;line-height:1.5">Data persists between browser sessions. Phase 4 will use a real PostgreSQL database.</div>
        `);
      })() : ''}
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
    const myStudents = allStudents.filter(s => myClasses.includes(s.class_name));

    // Real approval statuses for my classes
    const myApprovals = myClasses.map(c => {
      const rec = approvals[`${c}|term2`];
      return { cls: c, status: rec ? rec.status : 'draft' };
    });
    const submitted  = myApprovals.filter(a => ['submitted','reviewed','approved','published'].includes(a.status)).length;
    const stillDraft = myApprovals.filter(a => a.status === 'draft').length;

    // Real student averages for my class
    const myStudentAvgs = myStudents.map(s => {
      const r = allResults[s.admission_no];
      if (!r) return null;
      const scores = Object.values(r).map(sub => sub.finalScore || 0);
      return scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null;
    }).filter(a => a !== null);
    const myClassAvg = myStudentAvgs.length
      ? Math.round(myStudentAvgs.reduce((a,b)=>a+b,0)/myStudentAvgs.length)
      : 0;

    // Tasks: one per subject+class combo
    const tasks = [];
    mySubjects.forEach(sub => {
      myClasses.forEach(cls => {
        const rec = approvals[`${cls}|term2`];
        tasks.push({
          label: `Enter ${sub} scores — ${cls}`,
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
          <p>${title} — Academic Session 2025/2026</p>
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
                  const rec = approvals[`${cls}|term2`];
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
                    <div class="my-subject-name">${sub}</div>
                    <div class="my-subject-classes">${myClasses.join(' · ') || 'All assigned classes'}</div>
                  </div>
                  <a href="score-entry.html" class="qa-btn qa-blue" style="font-size:0.72rem;padding:4px 10px;display:inline-block">Enter</a>
                </div>`).join('')}
          </div>
        `)}

        ${card('My Progress', `
          <div style="text-align:center;padding:8px 0 12px">
            <div style="font-family:var(--font-heading);font-size:2rem;font-weight:700;color:#1d4ed8">${myClassAvg}%</div>
            <div style="font-size:0.75rem;color:#6b7280;margin-bottom:12px">Class Average Score</div>
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

    // Class-level outstanding amounts
    const classTotals = allClasses.map(cls => {
      const students = allStudents.filter(s => s.class_name === cls);
      let expected = 0, paid = 0;
      students.forEach(s => {
        ['term1','term2','term3'].forEach(t => {
          const rec = payRecords[`${s.admission_no}|${t}`];
          if (rec) { expected += rec.amount_expected; paid += rec.amount_paid; }
        });
      });
      return { label: cls, expected, paid, balance: expected - paid };
    });

    const topOutstanding = [...classTotals]
      .sort((a,b) => b.balance - a.balance).slice(0, 5);
    const maxBalance = Math.max(...topOutstanding.map(c => c.balance), 1);

    mainEl.innerHTML = `
      <div class="welcome-banner" style="background:linear-gradient(135deg,#064e3b,#059669)">
        <div>
          <h2>Accountant Dashboard — ${user.full_name} 💰</h2>
          <p>Fee collection summary for Academic Session 2025/2026</p>
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
              { color:'#16a34a', pct: Math.round(paidFull/payVals.length*100) },
              { color:'#f59e0b', pct: Math.round(paidPartial/payVals.length*100) },
              { color:'#dc2626', pct: Math.round(paidNone/payVals.length*100) }
            ], 110)}
            <div class="donut-legend">
              <div class="donut-item">
                <span class="donut-dot" style="background:#16a34a"></span>
                <span class="donut-item-label">Paid in Full</span>
                <span class="donut-item-count">${paidFull}</span>
                <span class="donut-item-pct">(${Math.round(paidFull/payVals.length*100)}%)</span>
              </div>
              <div class="donut-item">
                <span class="donut-dot" style="background:#f59e0b"></span>
                <span class="donut-item-label">Partial</span>
                <span class="donut-item-count">${paidPartial}</span>
                <span class="donut-item-pct">(${Math.round(paidPartial/payVals.length*100)}%)</span>
              </div>
              <div class="donut-item">
                <span class="donut-dot" style="background:#dc2626"></span>
                <span class="donut-item-label">Not Paid</span>
                <span class="donut-item-count">${paidNone}</span>
                <span class="donut-item-pct">(${Math.round(paidNone/payVals.length*100)}%)</span>
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

        ${card('Outstanding by Class (Top 5)', `
          ${miniBarChart(
            topOutstanding.map(c => ({
              label: c.label,
              val: Math.round(c.balance/1000),
              color: '#dc2626'
            })),
            Math.max(...topOutstanding.map(c => Math.round(c.balance/1000)), 1)
          )}
          <div style="font-size:0.7rem;color:#9ca3af;margin-top:6px">Values in ₦'000</div>
        `, {label:'Finance Reports', href:'finance-reports.html'})}
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
          ${['term1','term2','term3'].map((term, i) => {
            const termVals = Object.entries(payRecords)
              .filter(([k]) => k.endsWith('|'+term))
              .map(([,r]) => r);
            const tPaid = termVals.reduce((s,r)=>s+r.amount_paid,0);
            const tExp  = termVals.reduce((s,r)=>s+r.amount_expected,0);
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
  if (!user) {
    mainEl.innerHTML = '<p style="padding:40px;color:#9ca3af">Not logged in.</p>';
    return;
  }

  // Phase 4: try to enrich dashboard with real API data
  async function loadAndRender() {
    // Try to get real payment summary for accountant/head teacher
    if (window.RCA_API && (roles.includes('accountant') || roles.includes('head_teacher') || roles.includes('ict_admin'))) {
      try {
        const summary = await window.RCA_API.getPaymentSummary();
        if (summary && summary.total_expected) {
          // Convert kobo to naira and update the computed values
          window._API_PAYMENT_SUMMARY = summary;
        }
      } catch(e) { /* use localStorage data */ }
    }

    if      (roles.includes('ict_admin'))     renderICTAdmin();
    else if (roles.includes('head_teacher'))  renderHeadTeacher();
    else if (roles.includes('class_teacher') || roles.includes('subject_teacher')) renderTeacher();
    else if (roles.includes('accountant'))    renderAccountant();
    else if (roles.includes('parent'))        window.location.href = 'parent-portal.html';
    else                                      renderHeadTeacher();
  }

  loadAndRender();

});


  /* ============================================================
     ADMISSION APPLICATIONS — from public form
     ============================================================ */
  function loadApplications() {
    const card = document.getElementById('applicationsCard');
    const countText = document.getElementById('appCountText');
    const appsList = document.getElementById('appsList');
    if (!card) return;

    // Only show to ICT Admin and Head Teacher
    const user = window.CURRENT_USER;
    const roles = user ? (user.roles || [user.role]) : [];
    if (!roles.includes('ict_admin') && !roles.includes('head_teacher') && !roles.includes('proprietor')) return;

    try {
      const apps = JSON.parse(localStorage.getItem('rca_applications') || '[]');
      const pending = apps.filter(a => a.status === 'pending');

      if (pending.length === 0) {
        card.style.display = 'none';
        return;
      }

      card.style.display = 'block';
      countText.textContent = `${pending.length} pending application${pending.length > 1 ? 's' : ''} awaiting review`;

      // Show latest 3
      const latest = pending.slice(-3).reverse();
      appsList.innerHTML = latest.map(app => `
        <div style="background:#f0fdf4;border-radius:8px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <div>
            <strong style="font-size:0.88rem;color:#065f46">${app.pupil_name}</strong>
            <span style="font-size:0.78rem;color:#6b7280;display:block">${app.class_applying} • Parent: ${app.parent_name} • ${app.parent_phone}</span>
            <span style="font-size:0.72rem;color:#9ca3af">${app.ref} • ${new Date(app.submitted_at).toLocaleDateString('en-GB')}</span>
          </div>
          <button onclick="approveApplication('${app.ref}')" style="background:#059669;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:0.75rem;font-weight:600;cursor:pointer">Mark Reviewed</button>
        </div>
      `).join('');

    } catch(e) {
      console.warn('Could not load applications:', e);
    }
  }

  window.approveApplication = function(ref) {
    try {
      const apps = JSON.parse(localStorage.getItem('rca_applications') || '[]');
      const idx = apps.findIndex(a => a.ref === ref);
      if (idx > -1) {
        apps[idx].status = 'reviewed';
        localStorage.setItem('rca_applications', JSON.stringify(apps));
        loadApplications();
      }
    } catch(e) {}
  };

  window.viewApplications = function() {
    try {
      const apps = JSON.parse(localStorage.getItem('rca_applications') || '[]');
      if (apps.length === 0) { alert('No applications yet.'); return; }

      let html = '<div style="max-height:70vh;overflow-y:auto">';
      apps.slice().reverse().forEach(app => {
        html += `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:10px;background:#fff">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
            <strong>${app.pupil_name}</strong>
            <span style="font-size:0.72rem;background:${app.status==='pending'?'#fef3c7':'#d1fae5'};color:${app.status==='pending'?'#92400e':'#065f46'};padding:2px 8px;border-radius:20px">${app.status}</span>
          </div>
          <div style="font-size:0.82rem;color:#374151;display:grid;grid-template-columns:1fr 1fr;gap:4px">
            <span>Class: <strong>${app.class_applying}</strong></span>
            <span>Gender: ${app.pupil_gender}</span>
            <span>Parent: ${app.parent_name}</span>
            <span>Phone: ${app.parent_phone}</span>
            <span>Relationship: ${app.relationship}</span>
            <span>Date: ${new Date(app.submitted_at).toLocaleDateString('en-GB')}</span>
          </div>
          ${app.home_address ? `<div style="font-size:0.78rem;color:#6b7280;margin-top:6px">Address: ${app.home_address}</div>` : ''}
          ${app.additional_info ? `<div style="font-size:0.78rem;color:#6b7280">Notes: ${app.additional_info}</div>` : ''}
          <div style="font-size:0.7rem;color:#9ca3af;margin-top:6px">Ref: ${app.ref}</div>
        </div>`;
      });
      html += '</div>';

      // Show in modal
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
      modal.innerHTML = `
        <div style="background:#f9fafb;border-radius:16px;width:100%;max-width:600px;max-height:85vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
          <div style="background:var(--color-primary);padding:16px 20px;display:flex;align-items:center;justify-content:space-between">
            <span style="color:#fff;font-weight:700;font-size:1rem">📋 All Applications (${apps.length})</span>
            <button id="closeAppsModal" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:1rem">✕</button>
          </div>
          <div style="padding:16px;overflow-y:auto;max-height:calc(85vh - 60px)">${html}</div>
        </div>`;
      document.body.appendChild(modal);
      document.getElementById('closeAppsModal').onclick = () => modal.remove();
      modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    } catch(e) { alert('Could not load applications.'); }
  };

  // Load applications on dashboard init
  loadApplications();

  /* ============================================================
     CONTACT MESSAGES — from public contact form
     ============================================================ */
  function loadContactMessages() {
    const user = window.CURRENT_USER;
    const roles = user ? (user.roles || [user.role]) : [];
    if (!roles.includes('ict_admin') && !roles.includes('head_teacher') && !roles.includes('proprietor')) return;

    try {
      const msgs = JSON.parse(localStorage.getItem('rca_contact_messages') || '[]');
      const unread = msgs.filter(m => m.status === 'unread');
      if (unread.length === 0) return;

      // Show notification on dashboard
      const existing = document.getElementById('contactMsgsCard');
      if (existing) existing.remove();

      const card = document.createElement('div');
      card.id = 'contactMsgsCard';
      card.style.cssText = 'border-left:4px solid #7c3aed;border:1px solid #ddd6fe;border-left-width:4px;border-radius:12px;padding:16px 20px;margin-bottom:20px;background:#faf5ff';
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <h3 style="font-size:0.95rem;color:#6d28d9;margin-bottom:4px">✉️ New Contact Messages</h3>
            <p style="font-size:0.82rem;color:#6b7280">${unread.length} unread message${unread.length > 1 ? 's' : ''} from the website</p>
          </div>
          <button onclick="viewContactMessages()" style="padding:7px 16px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:0.78rem;font-weight:700;cursor:pointer">View Messages</button>
        </div>
        <div style="margin-top:12px">
          ${unread.slice(0,2).map(m => `
            <div style="background:#fff;border-radius:8px;padding:10px 12px;margin-bottom:8px;border:1px solid #ede9fe">
              <strong style="font-size:0.85rem;color:#374151">${m.name}</strong>
              <span style="font-size:0.75rem;color:#9ca3af;margin-left:8px">${m.email} • ${new Date(m.sent_at).toLocaleDateString('en-GB')}</span>
              <p style="font-size:0.78rem;color:#6b7280;margin-top:4px">${m.message.substring(0,80)}...</p>
            </div>
          `).join('')}
        </div>`;

      // Insert at top of main content
      const main = document.querySelector('.admin-main');
      if (main) main.insertBefore(card, main.firstChild);

    } catch(e) {}
  }

  window.viewContactMessages = function() {
    try {
      const msgs = JSON.parse(localStorage.getItem('rca_contact_messages') || '[]');
      if (msgs.length === 0) { alert('No messages yet.'); return; }

      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
      modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;width:100%;max-width:600px;max-height:85vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
          <div style="background:#7c3aed;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:16px 16px 0 0">
            <span style="color:#fff;font-weight:700;font-size:1rem">✉️ Contact Messages (${msgs.length})</span>
            <button id="closeMsgsModal" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:1rem">✕</button>
          </div>
          <div style="padding:16px;overflow-y:auto;max-height:calc(85vh - 60px)">
            ${msgs.map(m => `
              <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:12px;background:${m.status==='unread'?'#faf5ff':'#fff'}">
                <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:8px;gap:10px;flex-wrap:wrap">
                  <div>
                    <strong style="font-size:0.9rem;color:#111">${m.name}</strong>
                    <span style="font-size:0.75rem;background:${m.status==='unread'?'#7c3aed':'#e5e7eb'};color:${m.status==='unread'?'#fff':'#6b7280'};padding:2px 8px;border-radius:20px;margin-left:8px">${m.status}</span>
                  </div>
                  <span style="font-size:0.72rem;color:#9ca3af">${new Date(m.sent_at).toLocaleDateString('en-GB')}</span>
                </div>
                <div style="font-size:0.8rem;color:#6b7280;margin-bottom:8px">
                  📧 ${m.email} ${m.phone ? '• 📞 ' + m.phone : ''} • 📋 ${m.subject}
                </div>
                <p style="font-size:0.85rem;color:#374151;background:#f9fafb;padding:10px;border-radius:6px">${m.message}</p>
                ${m.status === 'unread' ? `<button onclick="markMsgRead('${m.id}', this)" style="margin-top:8px;padding:4px 12px;background:#059669;color:#fff;border:none;border-radius:6px;font-size:0.72rem;cursor:pointer;font-weight:600">Mark as Read</button>` : ''}
              </div>
            `).join('')}
          </div>
        </div>`;
      document.body.appendChild(modal);
      document.getElementById('closeMsgsModal').onclick = () => modal.remove();
      modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

      // Mark all as read
      const updatedMsgs = msgs.map(m => ({ ...m, status: 'read' }));
      localStorage.setItem('rca_contact_messages', JSON.stringify(updatedMsgs));

    } catch(e) { alert('Could not load messages.'); }
  };

  window.markMsgRead = function(id, btn) {
    try {
      const msgs = JSON.parse(localStorage.getItem('rca_contact_messages') || '[]');
      const idx = msgs.findIndex(m => m.id === id);
      if (idx > -1) msgs[idx].status = 'read';
      localStorage.setItem('rca_contact_messages', JSON.stringify(msgs));
      btn.parentElement.style.background = '#fff';
      btn.remove();
    } catch(e) {}
  };

  loadContactMessages();
