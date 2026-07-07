/* ============================================
   ICT LAB — ict-lab.js
   Royal Crystal Academy
   ============================================
   Tabbed interface:
   1. Dashboard   — stats overview
   2. Curriculum  — Group 1 (B3+B4) and Group 2 (B5+B6) — fixed
      pedagogical reference content, not stored anywhere (like the
      main Subjects & Grading page's grade boundaries)
   3. Progress    — per-student skill tracking (real, editable)
   4. Computer Lab — inventory + maintenance (real, editable)
   5. Reports     — printable reports, derived from the above

   Computers/maintenance/schedule/progress all come from the real
   ict_computers/ict_maintenance/ict_lab_schedule/ict_progress tables
   via /api/ict-lab/*. This used to be entirely hardcoded fixture data
   (including per-student scores generated from a hash of their
   admission number) that reset on every reload.
*/

document.addEventListener('DOMContentLoaded', async () => {

  const ICT_CLASSES = ['Basic 3','Basic 4','Basic 5','Basic 6'];
  const GROUP1      = ['Basic 3','Basic 4'];
  const GROUP2      = ['Basic 5','Basic 6'];
  const curriculum  = window.ICT_CURRICULUM || {};
  const skills1     = window.ICT_SKILLS.GROUP1;
  const skills2     = window.ICT_SKILLS.GROUP2;
  function getGroup(cls) { return GROUP2.includes(cls) ? 'GROUP2' : 'GROUP1'; }
  function getSkills(cls){ return getGroup(cls) === 'GROUP2' ? skills2 : skills1; }

  const cu = window.CURRENT_USER;
  const canEdit = cu && (cu.roles || [cu.role]).some(r => ['ict_admin','head_teacher'].includes(r));

  let allStudents = [];
  let ictStudents  = [];
  let computers    = [];
  let maintenance  = [];
  let schedule     = [];
  let progress     = {}; // { admission_no: { skill_code: score } }
  let currentTerm  = 'term2';

  async function loadAll() {
    const [students, comp, maint, sched, prog] = await Promise.all([
      window.RCA_API.getStudents(),
      window.RCA_API.call('/ict-lab/computers'),
      window.RCA_API.call('/ict-lab/maintenance'),
      window.RCA_API.call('/ict-lab/schedule'),
      window.RCA_API.call(`/ict-lab/progress?term=${currentTerm}`)
    ]);
    allStudents = students || [];
    ictStudents = allStudents.filter(s => ICT_CLASSES.includes(s.class_name));
    computers   = comp.computers || [];
    maintenance = maint.maintenance || [];
    schedule    = sched.schedule || [];

    progress = {};
    (prog.progress || []).forEach(row => {
      if (!progress[row.admission_no]) progress[row.admission_no] = {};
      progress[row.admission_no][row.skill_code] = row.score;
    });
  }

  function scoreOf(admissionNo, skillCode) {
    return (progress[admissionNo] && progress[admissionNo][skillCode]) || 0;
  }
  function classAverage(cls) {
    const clsStudents = ictStudents.filter(s => s.class_name === cls);
    const skills = getSkills(cls);
    let total = 0, count = 0;
    clsStudents.forEach(s => {
      skills.concat([{id:'practical'}]).forEach(sk => {
        const sc = scoreOf(s.admission_no, sk.id);
        if (sc > 0) { total += sc; count++; }
      });
    });
    return count > 0 ? Math.round(total / count) : 0;
  }

  /* ---- Current tab ---- */
  let activeTab = 'dashboard';

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
    const workingPCs = computers.filter(c => c.status === 'working').length;
    const faultyPCs  = computers.filter(c => c.status === 'faulty').length;
    const maintPCs   = computers.filter(c => c.status === 'maintenance').length;

    const avgScores = {};
    ICT_CLASSES.forEach(cls => { avgScores[cls] = classAverage(cls); });
    const withData = ICT_CLASSES.filter(c => avgScores[c] > 0);
    const overallAvg = withData.length ? Math.round(withData.reduce((s,c) => s + avgScores[c], 0) / withData.length) : 0;

    document.getElementById('tab-dashboard').innerHTML = `
      <div style="overflow-x:auto;margin-bottom:20px;-webkit-overflow-scrolling:touch">
        <div style="display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:14px;min-width:600px">
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
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

        <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
          <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">📈 Class ICT Performance</div>
          <div style="padding:16px 18px">
            ${ICT_CLASSES.map(cls => {
              const avg = avgScores[cls];
              const color = avg>=70?'#16a34a':avg>=50?'#d97706':'#dc2626';
              return `<div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px">
                  <span style="font-weight:600;color:#111827">${cls} <span style="font-weight:400;color:#9ca3af">(${getGroup(cls).replace('GROUP','Group ')})</span></span>
                  <span style="font-weight:700;color:${color}">${avg}%</span>
                </div>
                <div style="height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden">
                  <div style="width:${avg}%;height:100%;background:${color};border-radius:4px"></div>
                </div>
                <div style="font-size:0.7rem;color:#9ca3af;margin-top:2px">${ictStudents.filter(s=>s.class_name===cls).length} pupils</div>
              </div>`;
            }).join('')}
            <div style="font-size:0.78rem;font-weight:600;color:#374151;margin-bottom:8px;margin-top:12px">Lab Schedule</div>
            ${schedule.length ? schedule.map(s => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f9fafb;font-size:0.78rem">
                <span style="font-weight:600;color:#7c3aed">${s.class_name}</span>
                <span style="color:#6b7280">${s.day_of_week}</span>
                <span style="color:#374151">${s.time_slot}</span>
                ${canEdit ? `<button onclick="window._ictDeleteSchedule(${s.id})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:0.75rem">✕</button>` : ''}
              </div>`).join('') : '<div style="color:#9ca3af;font-size:0.78rem;padding:6px 0">No schedule set yet.</div>'}
            ${canEdit ? `<button onclick="window._ictAddSchedule()" class="btn btn-outline btn-sm" style="font-size:0.72rem;margin-top:10px">+ Add Schedule Slot</button>` : ''}
          </div>
        </div>

        <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
          <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between">
            <span style="font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">🔧 Recent Maintenance</span>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
              <thead><tr style="background:#f8fafc">
                ${['Date','Computer','Type','Technician','Cost','Status'].map(h =>
                  `<th style="padding:9px 14px;text-align:left;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:1px solid #e5e7eb">${h}</th>`
                ).join('')}
              </tr></thead>
              <tbody>
                ${maintenance.length ? maintenance.slice(0, 10).map(m => {
                  const sc = m.status === 'completed' ? '#d1fae5;color:#065f46' : '#fee2e2;color:#991b1b';
                  return `<tr>
                    <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280">${m.maintenance_date}</td>
                    <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;font-weight:600">${m.computer_code}</td>
                    <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6">${m.type}</td>
                    <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280">${m.technician || m.recorded_by_name || '—'}</td>
                    <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6">${m.cost > 0 ? '₦'+Number(m.cost).toLocaleString() : '—'}</td>
                    <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6">
                      <span style="padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:700;background:${sc}">${m.status}</span>
                    </td>
                  </tr>`;
                }).join('') : '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">No maintenance records yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  window._ictAddSchedule = async function() {
    const cls = prompt('Class (e.g. Basic 3):');
    if (!cls) return;
    const day = prompt('Day of week (e.g. Monday):');
    if (!day) return;
    const time = prompt('Time slot (e.g. 10:00 – 10:45 AM):');
    if (!time) return;
    try {
      await window.RCA_API.call('/ict-lab/schedule', { method: 'POST', body: { class_name: cls, day_of_week: day, time_slot: time } });
    } catch (e) { alert('Could not save: ' + e.message); return; }
    await loadAll();
    renderDashboard();
  };

  window._ictDeleteSchedule = async function(id) {
    if (!confirm('Remove this schedule slot?')) return;
    try {
      await window.RCA_API.call(`/ict-lab/schedule/${id}`, { method: 'DELETE' });
    } catch (e) { alert('Could not delete: ' + e.message); return; }
    await loadAll();
    renderDashboard();
  };

  /* ================================================
     TAB 2: CURRICULUM (fixed reference content)
     ================================================ */
  function renderCurriculum() {
    function groupCard(grp) {
      const G = curriculum[grp];
      return `
        <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden;margin-bottom:20px">
          <div style="background:${grp==='GROUP1'?'linear-gradient(135deg,#1e40af,#1d4ed8)':'linear-gradient(135deg,#4c1d95,#7c3aed)'};padding:18px 22px;color:#fff">
            <div style="font-family:var(--font-heading);font-size:1.05rem;font-weight:700;margin-bottom:4px">
              ${G.label} — ${G.classes.join(' & ')}
            </div>
            <div style="font-size:0.82rem;opacity:0.85">${G.objective}</div>
          </div>
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
     TAB 3: STUDENT PROGRESS (real, editable)
     ================================================ */
  function renderProgress() {
    let selectedClass = 'Basic 3';
    let searchTerm    = '';

    function scoreColor(s) { return s >= 70 ? '#065f46' : s >= 50 ? '#92400e' : '#991b1b'; }
    function scoreBg(s)    { return s >= 70 ? '#d1fae5' : s >= 50 ? '#fef3c7' : '#fee2e2'; }

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

      if (clsStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${skills.length + 3}" style="text-align:center;padding:24px;color:#9ca3af">No pupils in this class.</td></tr>`;
      } else {
        tbody.innerHTML = clsStudents.map(s => {
          const skillScores = skills.map(sk => scoreOf(s.admission_no, sk.id));
          const practical = scoreOf(s.admission_no, 'practical');
          const allScores = [...skillScores, practical];
          const scoredCount = allScores.filter(v => v > 0).length;
          const avg = scoredCount > 0 ? Math.round(allScores.reduce((a,b)=>a+b,0) / scoredCount) : 0;

          return `<tr>
            <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;font-weight:600;font-size:0.8rem;white-space:nowrap">${s.full_name}</td>
            ${skills.map(sk => {
              const score = scoreOf(s.admission_no, sk.id);
              return `<td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;text-align:center">
                <span ${canEdit ? `onclick="window._ictEditScore('${s.admission_no}','${sk.id}',${score})" style="cursor:pointer"` : ''}
                  title="${canEdit ? 'Click to edit' : ''}"
                  style="background:${scoreBg(score)};color:${scoreColor(score)};padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:700;display:inline-block;min-width:32px">${score || '—'}</span>
              </td>`;
            }).join('')}
            <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;text-align:center">
              <span ${canEdit ? `onclick="window._ictEditScore('${s.admission_no}','practical',${practical})" style="cursor:pointer"` : ''}
                title="${canEdit ? 'Click to edit' : ''}"
                style="background:${scoreBg(practical)};color:${scoreColor(practical)};padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:700;display:inline-block;min-width:32px">${practical || '—'}</span>
            </td>
            <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;text-align:center">
              <span style="background:${scoreBg(avg)};color:${scoreColor(avg)};padding:3px 10px;border-radius:6px;font-size:0.78rem;font-weight:700">${avg}%</span>
            </td>
          </tr>`;
        }).join('');
      }

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
      ${canEdit ? '<p style="font-size:0.75rem;color:#9ca3af;margin-bottom:10px">Click any score to edit it.</p>' : ''}

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

  window._ictEditScore = async function(admissionNo, skillCode, current) {
    const input = prompt(`Score (0–100):`, current || '');
    if (input === null) return;
    const score = parseInt(input, 10);
    if (isNaN(score) || score < 0 || score > 100) { alert('Please enter a number between 0 and 100.'); return; }

    try {
      await window.RCA_API.call(`/ict-lab/progress/${encodeURIComponent(admissionNo)}/${skillCode}`, {
        method: 'PUT', body: { score, term: currentTerm }
      });
    } catch (e) { alert('Could not save score: ' + e.message); return; }

    if (!progress[admissionNo]) progress[admissionNo] = {};
    progress[admissionNo][skillCode] = score;
    renderProgress();
  };

  /* ================================================
     TAB 4: COMPUTER LAB (real, editable)
     ================================================ */
  function renderComputerLab() {
    const statusColors = {
      working:     { bg:'#d1fae5', color:'#065f46', label:'Working' },
      faulty:      { bg:'#fee2e2', color:'#991b1b', label:'Faulty' },
      maintenance: { bg:'#fef3c7', color:'#92400e', label:'Maintenance' }
    };

    document.getElementById('tab-lab').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:12px;margin-bottom:20px;overflow-x:auto">
        ${computers.length ? computers.map(pc => {
          const s = statusColors[pc.status] || statusColors.working;
          return `
            <div style="background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:14px;border-top:4px solid ${s.color}">
              <div style="font-size:1.5rem;margin-bottom:6px">💻</div>
              <div style="font-weight:700;font-size:0.82rem;color:#111827;margin-bottom:2px">${pc.name}</div>
              <div style="font-size:0.7rem;color:#9ca3af;margin-bottom:6px">${pc.code}${pc.brand ? ' · ' + pc.brand : ''}</div>
              <span style="background:${s.bg};color:${s.color};padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:700">${s.label}</span>
              ${pc.notes ? `<div style="font-size:0.68rem;color:#dc2626;margin-top:6px;line-height:1.4">${pc.notes}</div>` : ''}
              ${pc.purchased_date ? `<div style="font-size:0.65rem;color:#9ca3af;margin-top:6px">Purchased: ${pc.purchased_date}</div>` : ''}
            </div>`;
        }).join('') : '<div style="grid-column:1/-1;color:#9ca3af;padding:20px;text-align:center">No computers registered yet.</div>'}
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
        ${canEdit ? `<button class="btn btn-primary" style="font-size:0.82rem" onclick="window._ictAddComputer()">➕ Add Computer</button>` : ''}
        ${canEdit ? `<button class="btn btn-primary" style="font-size:0.82rem" onclick="window._ictRecordFault()">⚠️ Record Fault</button>` : ''}
        <button class="btn btn-outline" style="font-size:0.82rem" onclick="window.print()">🖨 Equipment Report</button>
      </div>

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
              ${computers.length ? computers.map(pc => {
                const s = statusColors[pc.status] || statusColors.working;
                return `<tr>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;font-weight:700;color:#7c3aed">${pc.code}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;font-weight:600">${pc.name}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280">${pc.brand || '—'}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6">
                    <span style="background:${s.bg};color:${s.color};padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:700">${s.label}</span>
                  </td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280">${pc.purchased_date || '—'}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280">${pc.last_maintenance || '—'}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #f3f4f6;font-size:0.72rem;color:${pc.notes?'#dc2626':'#9ca3af'}">${pc.notes || '—'}</td>
                </tr>`;
              }).join('') : '<tr><td colspan="7" style="text-align:center;padding:20px;color:#9ca3af">No computers registered yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    window._ictAddComputer = async function() {
      const code = prompt('Computer ID (e.g. PC-11):');
      if (!code) return;
      const name = prompt('Display name (e.g. Computer 11):', code);
      if (!name) return;
      const brand = prompt('Brand (optional):') || null;
      try {
        await window.RCA_API.call('/ict-lab/computers', { method: 'POST', body: { code, name, brand } });
      } catch (e) { alert('Could not save: ' + e.message); return; }
      await loadAll();
      renderComputerLab();
      renderDashboard();
    };

    window._ictRecordFault = async function() {
      const pcCode = prompt('Computer ID (e.g. PC-04):');
      if (!pcCode) return;
      const pc = computers.find(c => c.code.toLowerCase() === pcCode.toLowerCase());
      if (!pc) { alert('Computer not found.'); return; }
      const note = prompt(`Describe the fault for ${pc.name}:`);
      if (!note) return;

      try {
        await window.RCA_API.call('/ict-lab/maintenance', {
          method: 'POST',
          body: {
            computer_code: pc.code, type: 'Fault Reported', cost: 0, status: 'pending',
            notes: note, new_pc_status: 'faulty'
          }
        });
      } catch (e) { alert('Could not record fault: ' + e.message); return; }

      await loadAll();
      renderComputerLab();
      renderDashboard();
      alert(`Fault recorded for ${pc.name}.`);
    };
  }

  /* ================================================
     TAB 5: REPORTS
     ================================================ */
  function renderReports() {
    const classStats = ICT_CLASSES.map(cls => ({
      cls, avg: classAverage(cls), pupils: ictStudents.filter(s => s.class_name === cls).length
    }));

    document.getElementById('tab-reports').innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
        <button onclick="window.print()" class="btn btn-primary" style="font-size:0.82rem">🖨 Print Full ICT Report</button>
        <button onclick="window.print()" class="btn btn-outline" style="font-size:0.82rem">📊 Equipment Inventory</button>
        <button onclick="window.print()" class="btn btn-outline" style="font-size:0.82rem">🔧 Maintenance Report</button>
      </div>

      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden;margin-bottom:20px">
        <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">📊 End of Term ICT Performance Report</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
            <thead><tr style="background:#f8fafc">
              ${['Class','Group','Pupils','Average Score','Performance','Rating'].map(h =>
                `<th style="padding:10px 16px;text-align:left;font-size:0.68rem;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb">${h}</th>`
              ).join('')}
            </tr></thead>
            <tbody>
              ${classStats.map(s => {
                const color = s.avg>=70?'#065f46':s.avg>=50?'#92400e':'#991b1b';
                const bg    = s.avg>=70?'#d1fae5':s.avg>=50?'#fef3c7':'#fee2e2';
                const rating= s.avg>=70?'Excellent':s.avg>=60?'Very Good':s.avg>=50?'Good':s.avg>=40?'Fair':s.avg>0?'Needs Support':'No data yet';
                return `<tr>
                  <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;font-weight:700">${s.cls}</td>
                  <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;color:#7c3aed;font-size:0.78rem">${getGroup(s.cls).replace('GROUP','Group ')}</td>
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

      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:18px;margin-bottom:20px">
        <div style="font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827;margin-bottom:14px">🔧 Maintenance Cost Summary</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
          <div style="background:#f9fafb;border-radius:8px;padding:12px;text-align:center">
            <div style="font-family:var(--font-heading);font-size:1.2rem;font-weight:700;color:#111827">₦${maintenance.filter(m=>m.status==='completed').reduce((s,m)=>s+Number(m.cost||0),0).toLocaleString()}</div>
            <div style="font-size:0.72rem;color:#6b7280">Total Spent</div>
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
  await loadAll();
  renderDashboard();
  renderCurriculum();
  renderProgress();
  renderComputerLab();
  renderReports();
});
