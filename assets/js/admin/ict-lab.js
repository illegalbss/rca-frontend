/* ============================================
   ICT LAB — ict-lab.js
   Royal Crystal Academy
   ============================================
   Tabbed interface:
   1. Dashboard   — stats overview
   2. Curriculum  — Group 1 (B3+B4) and Group 2 (B5+B6)
   3. Progress    — per-student skill tracking
   4. Computer Lab — inventory + maintenance
   5. Reports     — printable reports
*/

document.addEventListener('DOMContentLoaded', () => {

  const allStudents = window.SAMPLE_STUDENTS || [];
  window.generateICTProgress();

  const ICT_CLASSES = ['Basic 3','Basic 4','Basic 5','Basic 6'];
  const GROUP1      = ['Basic 3','Basic 4'];
  const GROUP2      = ['Basic 5','Basic 6'];

  const ictStudents = allStudents.filter(s => ICT_CLASSES.includes(s.class_name));
  const computers   = window.ICT_COMPUTERS   || [];
  const maintenance = window.ICT_MAINTENANCE || [];
  const schedule    = window.ICT_LAB_SCHEDULE|| [];
  const curriculum  = window.ICT_CURRICULUM  || {};
  const progress    = window.ICT_PROGRESS    || {};
  const skills1     = window.ICT_SKILLS.GROUP1;
  const skills2     = window.ICT_SKILLS.GROUP2;

  const workingPCs  = computers.filter(c => c.status === 'working').length;
  const faultyPCs   = computers.filter(c => c.status === 'faulty').length;
  const maintPCs    = computers.filter(c => c.status === 'maintenance').length;

  /* ---- Current tab ---- */
  let activeTab = 'dashboard';

  /* ---- Tab navigation ---- */
  document.querySelectorAll('.ict-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.ict-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.ict-tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + activeTab)?.classList.add('active');
    });
  });

  /* ================================================
     TAB 1: DASHBOARD
     ================================================ */
  function renderDashboard() {
    const avgScores = {};
    ICT_CLASSES.forEach(cls => {
      const clsStudents = ictStudents.filter(s => s.class_name === cls);
      const clsSkills   = GROUP2.includes(cls) ? skills2 : skills1;
      let total = 0, count = 0;
      clsStudents.forEach(s => {
        const p = progress[s.admission_no];
        if (!p) return;
        clsSkills.forEach(sk => { total += p[sk.id] || 0; count++; });
      });
      avgScores[cls] = count > 0 ? Math.round(total / count) : 0;
    });

    const overallAvg = Math.round(
      ICT_CLASSES.reduce((s,c) => s + avgScores[c], 0) / ICT_CLASSES.length
    );

    document.getElementById('tab-dashboard').innerHTML = `
      <!-- Big stat cards -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
        ${[
          { num: ictStudents.length,  label:'ICT Pupils (Basic 3–6)', color:'#7c3aed', icon:'👥' },
          { num: workingPCs,          label:'Working Computers',       color:'#16a34a', icon:'💻' },
          { num: faultyPCs+maintPCs,  label:'Needing Attention',       color:'#dc2626', icon:'⚠️' },
          { num: overallAvg + '%',    label:'Average ICT Score',       color:'#1d4ed8', icon:'📊' }
        ].map(s => `
          <div style="background:#fff;border-radius:12px;padding:16px 18px;box-shadow:0 1px 4px rgba(0,0,0,0.07);border-left:4px solid ${s.color}">
            <div style="font-size:1.4rem;margin-bottom:6px">${s.icon}</div>
            <div style="font-family:var(--font-heading);font-size:1.6rem;font-weight:700;color:#111827">${s.num}</div>
            <div style="font-size:0.75rem;color:#6b7280">${s.label}</div>
          </div>`).join('')}
      </div>

      <!-- Class performance + Lab status -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

        <!-- Class averages -->
        <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
          <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">📈 Class ICT Performance</div>
          <div style="padding:16px 18px">
            ${ICT_CLASSES.map(cls => {
              const avg = avgScores[cls];
              const color = avg >= 70 ? '#16a34a' : avg >= 50 ? '#f59e0b' : '#dc2626';
              const grp = GROUP1.includes(cls) ? '(Group 1)' : '(Group 2)';
              return `<div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px">
                  <span style="font-weight:600;color:#374151">${cls} <span style="color:#9ca3af;font-weight:400">${grp}</span></span>
                  <span style="font-weight:700;color:${color}">${avg}%</span>
                </div>
                <div style="height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden">
                  <div style="width:${avg}%;height:100%;background:${color};border-radius:4px;transition:width 0.6s"></div>
                </div>
                <div style="font-size:0.68rem;color:#9ca3af;margin-top:2px">${allStudents.filter(s=>s.class_name===cls).length} pupils</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Computer lab status -->
        <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
          <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">💻 Computer Lab Status</div>
          <div style="padding:16px 18px">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
              <div style="text-align:center;background:#d1fae5;border-radius:10px;padding:12px">
                <div style="font-family:var(--font-heading);font-size:1.5rem;font-weight:700;color:#065f46">${workingPCs}</div>
                <div style="font-size:0.7rem;color:#065f46">Working</div>
              </div>
              <div style="text-align:center;background:#fee2e2;border-radius:10px;padding:12px">
                <div style="font-family:var(--font-heading);font-size:1.5rem;font-weight:700;color:#991b1b">${faultyPCs}</div>
                <div style="font-size:0.7rem;color:#991b1b">Faulty</div>
              </div>
              <div style="text-align:center;background:#fef3c7;border-radius:10px;padding:12px">
                <div style="font-family:var(--font-heading);font-size:1.5rem;font-weight:700;color:#92400e">${maintPCs}</div>
                <div style="font-size:0.7rem;color:#92400e">Maintenance</div>
              </div>
            </div>
            <div style="font-size:0.78rem;font-weight:600;color:#374151;margin-bottom:8px">Lab Schedule</div>
            ${schedule.map(s => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f9fafb;font-size:0.78rem">
                <span style="font-weight:600;color:#7c3aed">${s.class}</span>
                <span style="color:#6b7280">${s.day}</span>
                <span style="color:#374151">${s.time}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Recent maintenance -->
      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">🔧 Recent Maintenance</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
            <thead><tr style="background:#f8fafc">
              <th style="padding:9px 14px;text-align:left;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:1px solid #e5e7eb">Date</th>
              <th style="padding:9px 14px;text-align:left;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:1px solid #e5e7eb">Computer</th>
              <th style="padding:9px 14px;text-align:left;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:1px solid #e5e7eb">Type</th>
              <th style="padding:9px 14px;text-align:left;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:1px solid #e5e7eb">Technician</th>
              <th style="padding:9px 14px;text-align:left;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:1px solid #e5e7eb">Cost</th>
              <th style="padding:9px 14px;text-align:left;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:1px solid #e5e7eb">Status</th>
            </tr></thead>
            <tbody>
              ${maintenance.map(m => {
                const sc = m.status === 'completed' ? '#d1fae5;color:#065f46' : '#fee2e2;color:#991b1b';
                return `<tr>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280">${m.date}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;font-weight:600">${m.pc}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6">${m.type}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280">${m.technician}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6">${m.cost > 0 ? '₦'+m.cost.toLocaleString() : '—'}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6">
                    <span style="padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:700;background:${sc}">${m.status}</span>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ================================================
     TAB 2: CURRICULUM
     ================================================ */
  function renderCurriculum() {
    function groupCard(grp) {
      const G = curriculum[grp];
      return `
        <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden;margin-bottom:20px">
          <!-- Header -->
          <div style="background:${grp==='GROUP1'?'linear-gradient(135deg,#1e40af,#1d4ed8)':'linear-gradient(135deg,#4c1d95,#7c3aed)'};padding:18px 22px;color:#fff">
            <div style="font-family:var(--font-heading);font-size:1.05rem;font-weight:700;margin-bottom:4px">
              ${G.label} — ${G.classes.join(' & ')}
            </div>
            <div style="font-size:0.82rem;opacity:0.85">${G.objective}</div>
          </div>

          <!-- Terms -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border-bottom:1px solid #f3f4f6">
            ${Object.entries(G.terms).map(([termKey, term]) => `
              <div style="padding:16px 18px;border-right:1px solid #f3f4f6">
                <div style="font-family:var(--font-heading);font-size:0.82rem;font-weight:700;color:#111827;margin-bottom:10px">📚 ${term.label} — Topics</div>
                ${term.topics.map(t => `
                  <div style="display:flex;align-items:flex-start;gap:6px;padding:4px 0;font-size:0.78rem;color:#374151">
                    <span style="color:#7c3aed;flex-shrink:0;font-size:0.7rem;margin-top:2px">▸</span>
                    ${t}
                  </div>`).join('')}
                <div style="margin-top:12px;font-family:var(--font-heading);font-size:0.78rem;font-weight:700;color:#6b7280;margin-bottom:8px">🛠 Practical Activities</div>
                ${term.practicals.map(p => `
                  <div style="display:flex;align-items:flex-start;gap:6px;padding:3px 0;font-size:0.75rem;color:#6b7280">
                    <span style="color:#16a34a;flex-shrink:0">✓</span>
                    ${p}
                  </div>`).join('')}
              </div>`).join('')}
          </div>

          <!-- End of term assessment -->
          <div style="padding:16px 22px;background:#f9fafb">
            <div style="font-family:var(--font-heading);font-size:0.82rem;font-weight:700;color:#111827;margin-bottom:10px">🎯 End of Term Assessment — Pupils should be able to:</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${G.endOfTermAssessment.map(a => `
                <span style="background:#ede9fe;color:#5b21b6;padding:4px 12px;border-radius:999px;font-size:0.75rem;font-weight:600">${a}</span>`).join('')}
            </div>
          </div>
        </div>`;
    }

    document.getElementById('tab-curriculum').innerHTML = `
      ${groupCard('GROUP1')}
      ${groupCard('GROUP2')}
    `;
  }

  /* ================================================
     TAB 3: STUDENT PROGRESS
     ================================================ */
  function renderProgress() {
    let selectedClass = 'Basic 3';
    let searchTerm    = '';

    function getGroup(cls) { return GROUP2.includes(cls) ? 'GROUP2' : 'GROUP1'; }
    function getSkills(cls){ return getGroup(cls) === 'GROUP2' ? skills2 : skills1; }

    function scoreColor(s) {
      return s >= 70 ? '#065f46' : s >= 50 ? '#92400e' : '#991b1b';
    }
    function scoreBg(s) {
      return s >= 70 ? '#d1fae5' : s >= 50 ? '#fef3c7' : '#fee2e2';
    }

    function renderTable() {
      const clsStudents = ictStudents
        .filter(s => s.class_name === selectedClass)
        .filter(s => !searchTerm || s.full_name.toLowerCase().includes(searchTerm))
        .sort((a,b) => a.full_name.localeCompare(b.full_name));

      const skills = getSkills(selectedClass);

      const tbody = document.getElementById('progressTableBody');
      const thead = document.getElementById('progressTableHead');

      thead.innerHTML = `<tr style="background:#f8fafc">
        <th style="padding:9px 14px;text-align:left;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;border-bottom:1px solid #e5e7eb;white-space:nowrap">Pupil Name</th>
        ${skills.map(sk => `<th style="padding:9px 14px;text-align:center;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;border-bottom:1px solid #e5e7eb;white-space:nowrap">${sk.icon} ${sk.label}</th>`).join('')}
        <th style="padding:9px 14px;text-align:center;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;border-bottom:1px solid #e5e7eb">Practical</th>
        <th style="padding:9px 14px;text-align:center;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;border-bottom:1px solid #e5e7eb">Average</th>
      </tr>`;

      tbody.innerHTML = clsStudents.map(s => {
        const p = progress[s.admission_no];
        if (!p) return '';
        const skillScores = skills.map(sk => p[sk.id] || 0);
        const avg = Math.round((skillScores.reduce((a,b)=>a+b,0) + (p.practical||0)) / (skills.length + 1));

        return `<tr>
          <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;font-weight:600;font-size:0.8rem;white-space:nowrap">${s.full_name}</td>
          ${skills.map(sk => {
            const score = p[sk.id] || 0;
            return `<td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;text-align:center">
              <span style="background:${scoreBg(score)};color:${scoreColor(score)};padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:700">${score}%</span>
            </td>`;
          }).join('')}
          <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;text-align:center">
            <span style="background:${scoreBg(p.practical)};color:${scoreColor(p.practical)};padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:700">${p.practical}/100</span>
          </td>
          <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;text-align:center">
            <span style="background:${scoreBg(avg)};color:${scoreColor(avg)};padding:3px 10px;border-radius:6px;font-size:0.78rem;font-weight:700">${avg}%</span>
          </td>
        </tr>`;
      }).join('');

      // Update count
      const countEl = document.getElementById('progressCount');
      if (countEl) countEl.textContent = `${clsStudents.length} pupils`;
    }

    document.getElementById('tab-progress').innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <div style="display:flex;gap:6px">
          ${ICT_CLASSES.map(cls => `
            <button onclick="window._ictSelectClass('${cls}',this)"
              class="ict-class-tab-btn" data-cls="${cls}"
              style="padding:6px 14px;border-radius:999px;border:1.5px solid ${selectedClass===cls?'#7c3aed':'#e5e7eb'};background:${selectedClass===cls?'#ede9fe':'#fff'};color:${selectedClass===cls?'#5b21b6':'#374151'};font-size:0.78rem;font-weight:600;cursor:pointer">
              ${cls}
            </button>`).join('')}
        </div>
        <div style="position:relative;flex:1;min-width:180px">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9ca3af">🔍</span>
          <input type="search" id="progressSearch" placeholder="Search pupil…" class="form-control" style="padding-left:32px">
        </div>
        <span id="progressCount" style="font-size:0.78rem;color:#6b7280;background:#f3f4f6;padding:5px 12px;border-radius:999px"></span>
        <button onclick="window.print()" class="btn btn-outline" style="font-size:0.78rem">🖨 Print Report</button>
      </div>

      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:0.8rem;min-width:700px">
            <thead id="progressTableHead"></thead>
            <tbody id="progressTableBody"></tbody>
          </table>
        </div>
      </div>
    `;

    window._ictSelectClass = function(cls, btn) {
      selectedClass = cls;
      document.querySelectorAll('.ict-class-tab-btn').forEach(b => {
        b.style.background = b.dataset.cls === cls ? '#ede9fe' : '#fff';
        b.style.color      = b.dataset.cls === cls ? '#5b21b6' : '#374151';
        b.style.borderColor= b.dataset.cls === cls ? '#7c3aed' : '#e5e7eb';
      });
      renderTable();
    };

    document.getElementById('progressSearch').addEventListener('input', e => {
      searchTerm = e.target.value.trim().toLowerCase();
      renderTable();
    });

    renderTable();
  }

  /* ================================================
     TAB 4: COMPUTER LAB
     ================================================ */
  function renderComputerLab() {
    const statusColors = {
      working:     { bg:'#d1fae5', color:'#065f46', label:'Working' },
      faulty:      { bg:'#fee2e2', color:'#991b1b', label:'Faulty' },
      maintenance: { bg:'#fef3c7', color:'#92400e', label:'Maintenance' }
    };

    document.getElementById('tab-lab').innerHTML = `
      <!-- Computer grid -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px">
        ${computers.map(pc => {
          const s = statusColors[pc.status];
          return `
            <div style="background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:14px;border-top:4px solid ${s.color}">
              <div style="font-size:1.5rem;margin-bottom:6px">💻</div>
              <div style="font-weight:700;font-size:0.82rem;color:#111827;margin-bottom:2px">${pc.name}</div>
              <div style="font-size:0.7rem;color:#9ca3af;margin-bottom:6px">${pc.id} · ${pc.brand}</div>
              <span style="background:${s.bg};color:${s.color};padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:700">${s.label}</span>
              ${pc.notes ? `<div style="font-size:0.68rem;color:#dc2626;margin-top:6px;line-height:1.4">${pc.notes}</div>` : ''}
              <div style="font-size:0.65rem;color:#9ca3af;margin-top:6px">Purchased: ${pc.purchased}</div>
            </div>`;
        }).join('')}
      </div>

      <!-- Record fault button -->
      <div style="display:flex;gap:10px;margin-bottom:16px">
        <button class="btn btn-primary" style="font-size:0.82rem" onclick="window._ictRecordFault()">⚠️ Record Fault</button>
        <button class="btn btn-outline" style="font-size:0.82rem" onclick="window.print()">🖨 Equipment Report</button>
      </div>

      <!-- Inventory table -->
      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
        <div style="padding:12px 18px;border-bottom:1px solid #f3f4f6;font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">📋 Equipment Inventory</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
            <thead><tr style="background:#f8fafc">
              ${['Computer ID','Name','Brand','Status','Date Purchased','Last Maintenance','Notes'].map(h =>
                `<th style="padding:9px 14px;text-align:left;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;border-bottom:1px solid #e5e7eb;white-space:nowrap">${h}</th>`
              ).join('')}
            </tr></thead>
            <tbody>
              ${computers.map(pc => {
                const s = statusColors[pc.status];
                return `<tr>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;font-weight:700;color:#7c3aed">${pc.id}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;font-weight:600">${pc.name}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280">${pc.brand}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6">
                    <span style="background:${s.bg};color:${s.color};padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:700">${s.label}</span>
                  </td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280">${pc.purchased}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280">${pc.lastMaintenance}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;font-size:0.72rem;color:${pc.notes?'#dc2626':'#9ca3af'}">${pc.notes || '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    window._ictRecordFault = function() {
      const pcId = prompt('Computer ID (e.g. PC-04):');
      if (!pcId) return;
      const pc = computers.find(c => c.id.toLowerCase() === pcId.toLowerCase());
      if (!pc) { alert('Computer not found.'); return; }
      const note = prompt(`Describe the fault for ${pc.name}:`);
      if (!note) return;
      pc.status = 'faulty';
      pc.notes  = note;
      maintenance.unshift({
        date: new Date().toISOString().split('T')[0],
        pc: pc.id, type: 'Fault Reported',
        technician: window.CURRENT_USER?.full_name || 'ICT Admin',
        cost: 0, status: 'pending', notes: note
      });
      renderComputerLab();
      alert(`Fault recorded for ${pc.name}.`);
    };
  }

  /* ================================================
     TAB 5: REPORTS
     ================================================ */
  function renderReports() {
    const classStats = ICT_CLASSES.map(cls => {
      const clsStudents = ictStudents.filter(s => s.class_name === cls);
      const skills = getGroup(cls) === 'GROUP2' ? skills2 : skills1;
      let totalAvg = 0, count = 0;
      clsStudents.forEach(s => {
        const p = progress[s.admission_no];
        if (!p) return;
        const scores = skills.map(sk => p[sk.id]||0);
        scores.push(p.practical||0);
        totalAvg += scores.reduce((a,b)=>a+b,0)/scores.length;
        count++;
      });
      return { cls, avg: count>0?Math.round(totalAvg/count):0, pupils: clsStudents.length };
    });

    function getGroup(cls) { return GROUP2.includes(cls) ? 'GROUP2' : 'GROUP1'; }

    document.getElementById('tab-reports').innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
        <button onclick="window.print()" class="btn btn-primary" style="font-size:0.82rem">🖨 Print Full ICT Report</button>
        <button onclick="window.print()" class="btn btn-outline" style="font-size:0.82rem">📊 Equipment Inventory</button>
        <button onclick="window.print()" class="btn btn-outline" style="font-size:0.82rem">🔧 Maintenance Report</button>
      </div>

      <!-- Class ICT Report summary -->
      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden;margin-bottom:20px">
        <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">📊 End of Term ICT Performance Report — Second Term 2026</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
            <thead><tr style="background:#f8fafc">
              <th style="padding:10px 16px;text-align:left;font-size:0.68rem;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb">Class</th>
              <th style="padding:10px 16px;text-align:left;font-size:0.68rem;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb">Group</th>
              <th style="padding:10px 16px;text-align:center;font-size:0.68rem;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb">Pupils</th>
              <th style="padding:10px 16px;text-align:center;font-size:0.68rem;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb">Average Score</th>
              <th style="padding:10px 16px;text-align:left;font-size:0.68rem;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb">Performance</th>
              <th style="padding:10px 16px;text-align:left;font-size:0.68rem;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb">Rating</th>
            </tr></thead>
            <tbody>
              ${classStats.map(s => {
                const color = s.avg>=70?'#065f46':s.avg>=50?'#92400e':'#991b1b';
                const bg    = s.avg>=70?'#d1fae5':s.avg>=50?'#fef3c7':'#fee2e2';
                const rating= s.avg>=70?'Excellent':s.avg>=60?'Very Good':s.avg>=50?'Good':s.avg>=40?'Fair':'Needs Support';
                return `<tr>
                  <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;font-weight:700">${s.cls}</td>
                  <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;color:#7c3aed;font-size:0.78rem">${getGroup(s.cls).replace('_',' ')}</td>
                  <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;text-align:center">${s.pupils}</td>
                  <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;text-align:center"><span style="background:${bg};color:${color};padding:3px 10px;border-radius:6px;font-weight:700">${s.avg}%</span></td>
                  <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;min-width:140px">
                    <div style="height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden">
                      <div style="width:${s.avg}%;height:100%;background:${color};border-radius:4px"></div>
                    </div>
                  </td>
                  <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;font-weight:600;color:${color}">${rating}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Maintenance cost summary -->
      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:18px;margin-bottom:20px">
        <div style="font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827;margin-bottom:14px">🔧 Maintenance Cost Summary</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
          <div style="background:#f9fafb;border-radius:8px;padding:12px;text-align:center">
            <div style="font-family:var(--font-heading);font-size:1.2rem;font-weight:700;color:#111827">₦${maintenance.filter(m=>m.status==='completed').reduce((s,m)=>s+m.cost,0).toLocaleString()}</div>
            <div style="font-size:0.72rem;color:#6b7280">Total Spent (This Session)</div>
          </div>
          <div style="background:#fee2e2;border-radius:8px;padding:12px;text-align:center">
            <div style="font-family:var(--font-heading);font-size:1.2rem;font-weight:700;color:#991b1b">${maintenance.filter(m=>m.status==='pending').length}</div>
            <div style="font-size:0.72rem;color:#991b1b">Pending Repairs</div>
          </div>
          <div style="background:#d1fae5;border-radius:8px;padding:12px;text-align:center">
            <div style="font-family:var(--font-heading);font-size:1.2rem;font-weight:700;color:#065f46">${maintenance.filter(m=>m.status==='completed').length}</div>
            <div style="font-size:0.72rem;color:#065f46">Completed Jobs</div>
          </div>
        </div>
      </div>
    `;
  }

  /* ---- Initialize all tabs ---- */
  renderDashboard();
  renderCurriculum();
  renderProgress();
  renderComputerLab();
  renderReports();
});
