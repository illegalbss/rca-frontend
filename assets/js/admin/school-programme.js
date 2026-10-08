/* ============================================
   SCHOOL PROGRAMME OF EVENTS — school-programme.js
   Royal Crystal Academy
   ============================================
   Who can CREATE / EDIT / DELETE : ict_admin, head_teacher, proprietor
   Who can VIEW                   : all staff (not parents — parent portal excluded)

   Backed by the real `school_programmes` table via
   RCA_API.getSchoolProgrammes()/createSchoolProgramme()/
   updateSchoolProgramme()/deleteSchoolProgramme() — this used to live
   only in the creating admin's own browser localStorage, invisible to
   every other staff member and gone the moment that browser's site
   data was cleared.
*/

(function () {

  /* ============================================================
     DATA — fetched once on load, cached here, refreshed after
     every create/update/delete so renders stay in sync without
     re-fetching on every click.
  ============================================================ */
  let _programmes = [];

  // The rest of this file was written against a simpler shape
  // (session/created_by/updated_by as plain display strings) than the
  // real table's columns (session_label, created_by_name as a separate
  // denormalized name next to the numeric created_by id) — normalize
  // once here rather than touching every render function below.
  async function loadProgrammes() {
    const rows = (window.RCA_API ? await window.RCA_API.getSchoolProgrammes() : []) || [];
    _programmes = rows.map(p => ({
      ...p,
      session: p.session_label,
      created_by: p.created_by_name || 'Administration',
      updated_by: p.updated_by_name || p.created_by_name || 'Administration',
    }));
  }

  function getPrograms() { return _programmes; }

  /* ============================================================
     RBAC
  ============================================================ */
  function getAccess() {
    const user  = window.CURRENT_USER;
    const roles = user ? (user.roles || [user.role, user.primary_role]).filter(Boolean) : [];
    return {
      user,
      canManage: roles.some(r => ['ict_admin', 'head_teacher', 'proprietor'].includes(r)),
    };
  }

  /* ============================================================
     CONSTANTS
  ============================================================ */
  const TERM_LABELS = { term1: 'First Term', term2: 'Second Term', term3: 'Third Term' };
  const TERMS       = ['term1', 'term2', 'term3'];
  const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  const ACTIVITY_TYPES = {
    normal:  { label: 'Teaching & Learning', color: '#1a3a5c' },
    exam:    { label: 'Exam / Test',          color: '#1d4ed8' },
    holiday: { label: 'Holiday / Break',      color: '#dc2626' },
    sports:  { label: 'Sports',               color: '#059669' },
    special: { label: 'Special Event',        color: '#7c3aed' },
    meeting: { label: 'Meeting / Assembly',   color: '#92400e' },
    closing: { label: 'School Closing',       color: '#b45309' },
  };

  function currentSession() {
    const now = new Date();
    const yr  = now.getFullYear();
    const mo  = now.getMonth();
    return mo >= 8 ? `${yr}/${yr + 1}` : `${yr - 1}/${yr}`;
  }

  /* Add days to a date string DD/MM/YYYY */
  function addDays(ddmmyyyy, n) {
    if (!ddmmyyyy) return '';
    const [d, m, y] = ddmmyyyy.split('/').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + n);
    return [String(dt.getDate()).padStart(2,'0'), String(dt.getMonth()+1).padStart(2,'0'), dt.getFullYear()].join('/');
  }

  /* Get the Monday of the week after a given date */
  function nextMonday(ddmmyyyy) {
    if (!ddmmyyyy) return '';
    const [d, m, y] = ddmmyyyy.split('/').map(Number);
    const dt = new Date(y, m - 1, d);
    // Find Friday of this week, add 3 days = Monday of next week
    const dayOfWeek = dt.getDay(); // 0=Sun,1=Mon,...,5=Fri
    const daysToFri = 4 - (dayOfWeek === 0 ? -1 : dayOfWeek - 1);
    dt.setDate(dt.getDate() + daysToFri + 3);
    return [String(dt.getDate()).padStart(2,'0'), String(dt.getMonth()+1).padStart(2,'0'), dt.getFullYear()].join('/');
  }

  /* Build a default week object from a Monday date string */
  function buildDefaultWeek(weekNo, mondayDate) {
    return {
      week_no: weekNo,
      rows: DAYS_OF_WEEK.map((day, i) => ({
        date:     mondayDate ? addDays(mondayDate, i) : '',
        day,
        activity: day === 'MONDAY' && weekNo === 1 ? 'CLEANING OF COMPOUND' : 'TEACHING & LEARNING',
        time:     '7:20 – 3:30PM',
        type:     day === 'MONDAY' && weekNo === 1 ? 'special' : 'normal',
      })),
    };
  }

  /* ============================================================
     PAGE STATE
  ============================================================ */
  let _view        = 'list';  // 'list' | 'view' | 'edit'
  let _activeProg  = null;    // programme object being viewed / edited
  let _editWeeks   = [];      // deep copy of weeks during editing
  let _fSession    = currentSession();
  let _fTerm       = 'term3'; // default to current term

  /* ============================================================
     MAIN ENTRY POINT
  ============================================================ */
  document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('progContainer');
    if (container) container.innerHTML = '<p style="padding:40px;text-align:center;color:#9ca3af">Loading programmes…</p>';
    await loadProgrammes();
    render();
    document.getElementById('newProgBtn')?.addEventListener('click', showCreateModal);
  });

  function render() {
    if (_view === 'list') renderList();
    else if (_view === 'view') renderProgramView(_activeProg);
    else if (_view === 'edit') renderEditor();
  }

  /* ============================================================
     LIST VIEW
  ============================================================ */
  function renderList() {
    _view = 'list';
    const { canManage } = getAccess();
    const container = document.getElementById('progContainer');
    if (!container) return;

    // Show / hide create button
    const newBtn = document.getElementById('newProgBtn');
    if (newBtn) newBtn.style.display = canManage ? 'inline-flex' : 'none';

    // Build session tabs
    const allProgs = getPrograms();
    const sessions = [...new Set([currentSession(), ...allProgs.map(p => p.session)])].sort((a,b)=>b.localeCompare(a));

    const sessionTabs = sessions.map(s => `
      <button onclick="window._spSetSession('${s}')"
        style="padding:6px 16px;border-radius:20px;border:1px solid ${_fSession===s?'#1a3a5c':'#d1d5db'};
               background:${_fSession===s?'#1a3a5c':'#fff'};color:${_fSession===s?'#fff':'#374151'};
               font-size:0.8rem;font-weight:600;cursor:pointer;white-space:nowrap">
        ${s}
      </button>`).join('');

    const termTabs = TERMS.map(t => `
      <button onclick="window._spSetTerm('${t}')"
        style="padding:6px 16px;border-radius:8px;border:none;
               background:${_fTerm===t?'#fff':'transparent'};color:${_fTerm===t?'#111827':'#6b7280'};
               font-size:0.85rem;font-weight:600;cursor:pointer;
               box-shadow:${_fTerm===t?'0 1px 4px rgba(0,0,0,0.08)':'none'}">
        ${TERM_LABELS[t]}
      </button>`).join('');

    const filtered = allProgs.filter(p => p.session === _fSession && p.term === _fTerm);

    let body;
    if (filtered.length === 0) {
      body = `
        <div style="text-align:center;padding:64px 24px;color:#6b7280">
          <div style="font-size:3rem;margin-bottom:14px">📅</div>
          <h3 style="color:#374151;margin-bottom:8px;font-size:1.05rem">No Programme for ${TERM_LABELS[_fTerm]} ${_fSession}</h3>
          <p style="font-size:0.85rem">${canManage ? 'Click "+ New Programme" to create it.' : 'The programme has not been created yet.'}</p>
        </div>`;
    } else {
      body = filtered.map(p => {
        const weeks = p.weeks || [];
        const totalRows = weeks.reduce((s, w) => s + w.rows.length, 0);
        const created = new Date(p.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
        return `
          <div style="border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:20px 22px;margin-bottom:14px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
              <div>
                <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px;letter-spacing:0.5px">
                  ${TERM_LABELS[p.term]} • ${p.session}
                </div>
                <h3 style="font-size:1rem;font-weight:700;color:#1a3a5c;margin-bottom:4px">School Programme of Events</h3>
                <p style="font-size:0.8rem;color:#6b7280">${weeks.length} week${weeks.length!==1?'s':''} • ${totalRows} day entries</p>
                <p style="font-size:0.75rem;color:#9ca3af;margin-top:4px">Created ${created} by ${p.created_by || 'Administration'}</p>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start">
                <button onclick="window._spView('${p.id}')" style="padding:7px 14px;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-size:0.8rem;cursor:pointer;font-weight:600">📋 View Programme</button>
                ${canManage ? `
                  <button onclick="window._spEdit('${p.id}')" style="padding:7px 14px;background:#fff;border:1px solid #d1d5db;color:#374151;border-radius:8px;font-size:0.8rem;cursor:pointer;font-weight:600">✏️ Edit</button>
                  <button onclick="window._spDelete('${p.id}')" style="padding:7px 14px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:8px;font-size:0.8rem;cursor:pointer;font-weight:600">🗑 Delete</button>
                ` : ''}
              </div>
            </div>
          </div>`;
      }).join('');
    }

    container.innerHTML = `
      <!-- Session filter -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center">
        <span style="font-size:0.78rem;font-weight:700;color:#6b7280;white-space:nowrap">Session:</span>
        ${sessionTabs}
      </div>
      <!-- Term tabs -->
      <div style="display:flex;gap:4px;background:#f3f4f6;border-radius:10px;padding:4px;margin-bottom:20px;width:fit-content">
        ${termTabs}
      </div>
      <!-- Programme cards -->
      ${body}`;
  }

  window._spSetSession = s => { _fSession = s; renderList(); };
  window._spSetTerm    = t => { _fTerm = t;    renderList(); };

  /* ============================================================
     PROGRAMME TABLE VIEW  (like the image)
  ============================================================ */
  function renderProgramView(prog) {
    _view       = 'list'; // keep back button going to list
    _activeProg = prog;
    const { canManage } = getAccess();
    const container = document.getElementById('progContainer');
    if (!container || !prog) return;

    const newBtn = document.getElementById('newProgBtn');
    if (newBtn) newBtn.style.display = 'none';

    const weeks = prog.weeks || [];
    let sn = 1;

    const tableRows = weeks.map(week => {
      const rowCount = week.rows.length;
      return week.rows.map((row, ri) => {
        const typeConf = ACTIVITY_TYPES[row.type] || ACTIVITY_TYPES.normal;
        const isHoliday = row.type === 'holiday';
        const isExam    = row.type === 'exam';
        const tdStyle   = `padding:7px 10px;border:1px solid #374151;font-size:0.85rem;`;
        const actStyle  = `color:${typeConf.color};font-weight:${isHoliday||isExam?'700':'400'}`;

        const snCell = ri === 0
          ? `<td rowspan="${rowCount}" style="${tdStyle}text-align:center;vertical-align:top;font-weight:700;white-space:nowrap">${sn++}.</td>
             <td rowspan="${rowCount}" style="${tdStyle}font-weight:700;text-align:center;vertical-align:top">WEEK ${week.week_no}</td>`
          : '';

        return `<tr style="${ri===0?'border-top:2px solid #374151':''}">
          ${snCell}
          <td style="${tdStyle}">${row.date || ''}</td>
          <td style="${tdStyle}font-weight:600">${row.day || ''}</td>
          <td style="${tdStyle}${actStyle}">${row.activity || ''}</td>
          <td style="${tdStyle}text-align:center;white-space:nowrap">${row.time || ''}</td>
        </tr>`;
      }).join('');
    }).join('');

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <button onclick="window._spBackToList()" style="padding:7px 14px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:0.82rem;cursor:pointer;font-weight:600">← Back to List</button>
        ${canManage ? `<button onclick="window._spEdit('${prog.id}')" style="padding:7px 14px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:0.82rem;cursor:pointer;font-weight:600">✏️ Edit</button>` : ''}
        <button onclick="window._spPrint('${prog.id}')" style="padding:7px 14px;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-size:0.82rem;cursor:pointer;font-weight:600">🖨️ Print Programme</button>
      </div>

      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;overflow-x:auto">
        <!-- Header -->
        <div style="text-align:center;margin-bottom:18px">
          <h2 style="font-size:1.3rem;font-weight:800;color:#1a3a5c;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Royal Crystal Academy</h2>
          <div style="font-size:0.88rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">
            ${TERM_LABELS[prog.term]} ${prog.session} Academic Session
          </div>
          <div style="font-size:0.88rem;font-weight:700;color:#374151;text-transform:uppercase">School Programme of Events</div>
        </div>

        <!-- Table -->
        <table style="width:100%;border-collapse:collapse;font-family:inherit">
          <thead>
            <tr style="background:#1a3a5c;color:#fff">
              <th style="padding:9px 10px;border:1px solid #374151;text-align:center;font-size:0.82rem;white-space:nowrap">S/N</th>
              <th style="padding:9px 10px;border:1px solid #374151;text-align:center;font-size:0.82rem;white-space:nowrap">WEEK</th>
              <th style="padding:9px 10px;border:1px solid #374151;text-align:center;font-size:0.82rem">DATE</th>
              <th style="padding:9px 10px;border:1px solid #374151;text-align:center;font-size:0.82rem">DAYS</th>
              <th style="padding:9px 10px;border:1px solid #374151;text-align:left;font-size:0.82rem">ACTIVITIES</th>
              <th style="padding:9px 10px;border:1px solid #374151;text-align:center;font-size:0.82rem;white-space:nowrap">TIME</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>

        <div style="margin-top:14px;font-size:0.72rem;color:#9ca3af;text-align:right">
          Created by ${prog.created_by || 'Administration'} • Last updated ${new Date(prog.updated_at || prog.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
        </div>
      </div>`;
  }

  /* ============================================================
     EDITOR VIEW
  ============================================================ */
  function renderEditor() {
    _view = 'edit';
    const { canManage } = getAccess();
    if (!canManage) { showToast('You do not have permission to edit programmes.', '#dc2626'); return; }

    const newBtn = document.getElementById('newProgBtn');
    if (newBtn) newBtn.style.display = 'none';

    const prog  = _activeProg;
    const weeks = _editWeeks;

    const container = document.getElementById('progContainer');
    if (!container) return;

    const weeksHtml = weeks.map((week, wi) => buildWeekEditor(week, wi)).join('');

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <button onclick="window._spCancelEdit()" style="padding:7px 14px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:0.82rem;cursor:pointer;font-weight:600">← Cancel</button>
        <span style="font-size:0.9rem;font-weight:700;color:#1a3a5c">${TERM_LABELS[prog.term]} ${prog.session} — Editor</span>
        <button onclick="window._spSaveEdit()" style="margin-left:auto;padding:8px 20px;background:#059669;color:#fff;border:none;border-radius:8px;font-size:0.85rem;cursor:pointer;font-weight:700">💾 Save Programme</button>
      </div>

      <!-- Week list -->
      <div id="weekEditorList">${weeksHtml}</div>

      <button onclick="window._spAddWeek()" style="margin-top:8px;padding:9px 18px;background:#fff;border:2px dashed #d1d5db;border-radius:10px;color:#374151;font-size:0.85rem;cursor:pointer;font-weight:600;width:100%">
        + Add Next Week
      </button>`;
  }

  function buildWeekEditor(week, wi) {
    const rowsHtml = week.rows.map((row, ri) => buildRowEditor(row, wi, ri)).join('');
    return `
      <div id="week_${wi}" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:14px;overflow:hidden">
        <div style="background:#f3f4f6;padding:10px 16px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px">
          <span style="font-weight:700;color:#1a3a5c;font-size:0.9rem">WEEK ${week.week_no}</span>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <button onclick="window._spAddRow(${wi})" style="padding:4px 10px;background:#fff;border:1px solid #d1d5db;border-radius:6px;font-size:0.75rem;cursor:pointer;font-weight:600">+ Add Row</button>
            <button onclick="window._spDeleteWeek(${wi})" style="padding:4px 10px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:6px;font-size:0.75rem;cursor:pointer;font-weight:600">🗑 Remove Week</button>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;min-width:700px">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:7px 10px;text-align:left;font-size:0.72rem;color:#6b7280;border-bottom:1px solid #e5e7eb;width:110px">DATE (DD/MM/YYYY)</th>
                <th style="padding:7px 10px;text-align:left;font-size:0.72rem;color:#6b7280;border-bottom:1px solid #e5e7eb;width:110px">DAY</th>
                <th style="padding:7px 10px;text-align:left;font-size:0.72rem;color:#6b7280;border-bottom:1px solid #e5e7eb">ACTIVITY</th>
                <th style="padding:7px 10px;text-align:left;font-size:0.72rem;color:#6b7280;border-bottom:1px solid #e5e7eb;width:130px">TIME</th>
                <th style="padding:7px 10px;text-align:left;font-size:0.72rem;color:#6b7280;border-bottom:1px solid #e5e7eb;width:140px">TYPE</th>
                <th style="padding:7px 10px;border-bottom:1px solid #e5e7eb;width:36px"></th>
              </tr>
            </thead>
            <tbody id="weekRows_${wi}">${rowsHtml}</tbody>
          </table>
        </div>
      </div>`;
  }

  function buildRowEditor(row, wi, ri) {
    const typeOptions = Object.entries(ACTIVITY_TYPES).map(([k, v]) =>
      `<option value="${k}" ${row.type===k?'selected':''}>${v.label}</option>`).join('');

    return `
      <tr id="row_${wi}_${ri}" style="border-bottom:1px solid #f1f5f9">
        <td style="padding:6px 8px">
          <input type="text" value="${row.date||''}" placeholder="27/03/2026"
            oninput="window._spUpdateRow(${wi},${ri},'date',this.value)"
            style="width:100%;padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:0.8rem">
        </td>
        <td style="padding:6px 8px">
          <select onchange="window._spUpdateRow(${wi},${ri},'day',this.value)"
            style="width:100%;padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:0.8rem">
            ${DAYS_OF_WEEK.map(d=>`<option value="${d}" ${row.day===d?'selected':''}>${d}</option>`).join('')}
            <option value="SATURDAY" ${row.day==='SATURDAY'?'selected':''}>SATURDAY</option>
          </select>
        </td>
        <td style="padding:6px 8px">
          <input type="text" value="${row.activity||''}" placeholder="e.g. TEACHING & LEARNING"
            oninput="window._spUpdateRow(${wi},${ri},'activity',this.value)"
            style="width:100%;padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:0.8rem;text-transform:uppercase">
        </td>
        <td style="padding:6px 8px">
          <input type="text" value="${row.time||''}" placeholder="7:20 – 3:30PM"
            oninput="window._spUpdateRow(${wi},${ri},'time',this.value)"
            style="width:100%;padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:0.8rem">
        </td>
        <td style="padding:6px 8px">
          <select onchange="window._spUpdateRow(${wi},${ri},'type',this.value)"
            style="width:100%;padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:0.8rem">
            ${typeOptions}
          </select>
        </td>
        <td style="padding:6px 8px;text-align:center">
          <button onclick="window._spDeleteRow(${wi},${ri})" title="Remove row"
            style="background:#fef2f2;border:1px solid #fecaca;color:#dc2626;width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:0.85rem;line-height:1">✕</button>
        </td>
      </tr>`;
  }

  /* ============================================================
     EDITOR ACTIONS
  ============================================================ */
  window._spUpdateRow = (wi, ri, field, val) => {
    if (_editWeeks[wi] && _editWeeks[wi].rows[ri]) {
      _editWeeks[wi].rows[ri][field] = val.toUpperCase ? val.toUpperCase() : val;
    }
  };

  window._spAddRow = (wi) => {
    const week = _editWeeks[wi];
    if (!week) return;
    const lastRow = week.rows[week.rows.length - 1];
    week.rows.push({ date: '', day: 'MONDAY', activity: 'TEACHING & LEARNING', time: '7:20 – 3:30PM', type: 'normal' });
    // Re-render just the tbody
    const tbody = document.getElementById(`weekRows_${wi}`);
    if (tbody) tbody.innerHTML = week.rows.map((r, ri) => buildRowEditor(r, wi, ri)).join('');
  };

  window._spDeleteRow = (wi, ri) => {
    if (_editWeeks[wi]) {
      _editWeeks[wi].rows.splice(ri, 1);
      const tbody = document.getElementById(`weekRows_${wi}`);
      if (tbody) {
        if (_editWeeks[wi].rows.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" style="padding:12px;text-align:center;font-size:0.8rem;color:#9ca3af">No rows — click "Add Row" or remove this week.</td></tr>`;
        } else {
          tbody.innerHTML = _editWeeks[wi].rows.map((r, newRi) => buildRowEditor(r, wi, newRi)).join('');
        }
      }
    }
  };

  window._spAddWeek = () => {
    const lastWeek  = _editWeeks[_editWeeks.length - 1];
    const weekNo    = lastWeek ? lastWeek.week_no + 1 : 1;
    let mondayDate  = '';
    if (lastWeek && lastWeek.rows.length > 0) {
      const lastDate = lastWeek.rows[lastWeek.rows.length - 1].date;
      mondayDate = nextMonday(lastDate);
    }
    const newWeek = buildDefaultWeek(weekNo, mondayDate);
    _editWeeks.push(newWeek);
    const list = document.getElementById('weekEditorList');
    if (list) {
      const div = document.createElement('div');
      div.innerHTML = buildWeekEditor(newWeek, _editWeeks.length - 1);
      list.appendChild(div.firstElementChild);
    }
  };

  window._spDeleteWeek = (wi) => {
    if (!confirm(`Remove Week ${_editWeeks[wi]?.week_no}? All entries in this week will be lost.`)) return;
    _editWeeks.splice(wi, 1);
    // Re-number weeks
    _editWeeks.forEach((w, i) => { w.week_no = i + 1; });
    renderEditor();
  };

  window._spSaveEdit = async () => {
    if (_editWeeks.length === 0) { showToast('Add at least one week before saving.', '#dc2626'); return; }
    if (!window.RCA_API) { showToast('Cannot reach the server.', '#dc2626'); return; }

    const weeks = JSON.parse(JSON.stringify(_editWeeks));
    try {
      let saved;
      if (_activeProg._isNew) {
        saved = await window.RCA_API.createSchoolProgramme({
          session_label: _activeProg.session,
          term: _activeProg.term,
          weeks
        });
      } else {
        saved = await window.RCA_API.updateSchoolProgramme(_activeProg.id, { weeks });
      }
      await loadProgrammes();
      _activeProg = getPrograms().find(p => String(p.id) === String(saved.id)) || saved;
      _view = 'view';
      renderProgramView(_activeProg);
      showToast('Programme saved ✅');
    } catch (e) {
      showToast('Could not save: ' + e.message, '#dc2626');
    }
  };

  window._spCancelEdit = () => {
    if (_activeProg) {
      _view = 'view';
      renderProgramView(_activeProg);
    } else {
      _view = 'list';
      renderList();
    }
  };

  /* ============================================================
     NAVIGATION ACTIONS
  ============================================================ */
  window._spView = (id) => {
    // Real ids are numeric (database serial); onclick attributes pass
    // them through as strings, so compare loosely rather than ===.
    const prog = getPrograms().find(p => String(p.id) === String(id));
    if (!prog) return;
    _activeProg = prog;
    renderProgramView(prog);
  };

  window._spEdit = (id) => {
    const prog = getPrograms().find(p => String(p.id) === String(id));
    if (!prog) return;
    _activeProg = prog;
    _editWeeks  = JSON.parse(JSON.stringify(prog.weeks || []));
    renderEditor();
  };

  window._spDelete = async (id) => {
    const prog = getPrograms().find(p => String(p.id) === String(id));
    if (!prog) return;
    if (!confirm(`Delete the ${TERM_LABELS[prog.term]} ${prog.session} programme? This cannot be undone.`)) return;
    if (!window.RCA_API) { showToast('Cannot reach the server.', '#dc2626'); return; }
    try {
      await window.RCA_API.deleteSchoolProgramme(prog.id);
      await loadProgrammes();
      showToast('Programme deleted.');
      renderList();
    } catch (e) {
      showToast('Could not delete: ' + e.message, '#dc2626');
    }
  };

  window._spBackToList = () => {
    _activeProg = null;
    _view       = 'list';
    renderList();
    const newBtn = document.getElementById('newProgBtn');
    const { canManage } = getAccess();
    if (newBtn) newBtn.style.display = canManage ? 'inline-flex' : 'none';
  };

  /* ============================================================
     CREATE MODAL  (pick session + term → open editor)
  ============================================================ */
  function showCreateModal() {
    document.getElementById('spCreateOverlay')?.remove();
    const modal = document.createElement('div');
    modal.id = 'spCreateOverlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px';

    const termOptions = TERMS.map(t =>
      `<option value="${t}" ${t==='term3'?'selected':''}>${TERM_LABELS[t]}</option>`).join('');

    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="background:#1a3a5c;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:16px 16px 0 0">
          <span style="color:#fff;font-weight:700;font-size:1rem">📅 New School Programme</span>
          <button id="closeSpCreate" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem">✕</button>
        </div>
        <div style="padding:24px">
          <div id="spCreateAlert" style="display:none;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:0.83rem"></div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div class="form-group">
              <label class="form-label">Academic Session *</label>
              <input type="text" id="sp_session" class="form-control" placeholder="e.g. 2025/2026" value="${currentSession()}">
            </div>
            <div class="form-group">
              <label class="form-label">Term *</label>
              <select id="sp_term" class="form-control">${termOptions}</select>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Start Date of Week 1 (Monday)</label>
            <input type="text" id="sp_start" class="form-control" placeholder="DD/MM/YYYY — e.g. 27/04/2026">
            <div style="font-size:0.73rem;color:#6b7280;margin-top:4px">Dates will be auto-filled for all weeks. You can edit them later.</div>
          </div>

          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">Number of Weeks</label>
            <select id="sp_weeks" class="form-control">
              ${[8,9,10,11,12,13,14].map(n=>`<option value="${n}" ${n===10?'selected':''}>${n} weeks</option>`).join('')}
            </select>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:10px">
            <button id="closeSpCreate2" class="btn btn-outline" style="flex:1 1 100px">Cancel</button>
            <button id="spCreateBtn" class="btn btn-primary" style="flex:1 1 160px">Create &amp; Start Editing →</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    const close = () => modal.remove();
    document.getElementById('closeSpCreate').onclick  = close;
    document.getElementById('closeSpCreate2').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    document.getElementById('spCreateBtn').onclick = () => {
      const session  = document.getElementById('sp_session').value.trim();
      const term     = document.getElementById('sp_term').value;
      const startRaw = document.getElementById('sp_start').value.trim();
      const numWeeks = parseInt(document.getElementById('sp_weeks').value, 10);

      const alertEl = document.getElementById('spCreateAlert');
      const err = (msg) => { alertEl.textContent = msg; alertEl.style.display = 'block'; };

      if (!session) { err('Please enter the academic session.'); return; }
      if (!/^\d{4}\/\d{4}$/.test(session)) { err('Session format must be YYYY/YYYY e.g. 2025/2026.'); return; }

      // Check for duplicate
      const existing = getPrograms().find(p => p.session === session && p.term === term);
      if (existing) { err(`A programme for ${TERM_LABELS[term]} ${session} already exists. Edit it instead.`); return; }

      // Build weeks
      const { user } = getAccess();
      const now   = new Date().toISOString();
      const weeks = [];
      let mondayDate = startRaw;
      for (let i = 0; i < numWeeks; i++) {
        weeks.push(buildDefaultWeek(i + 1, mondayDate));
        mondayDate = mondayDate ? nextMonday(weeks[i].rows[4].date) : '';
      }

      const prog = {
        _isNew:     true, // not persisted yet — _spSaveEdit creates it on first save
        session,
        term,
        weeks,
        created_at: now,
        updated_at: now,
        created_by: user?.full_name || 'Administration',
      };

      // Don't save yet — go straight to editor so admin fills in activities
      _activeProg = prog;
      _editWeeks  = JSON.parse(JSON.stringify(prog.weeks));
      _fSession   = session;
      _fTerm      = term;
      close();
      renderEditor();
      showToast('Programme created — fill in activities and save 💾');
    };
  }

  /* ============================================================
     PRINT
  ============================================================ */
  /* ------------------------------------------------------------
     Branded A4 printout (badge, navy/gold, motto) that always fits on
     at most TWO pages. A full term (≈13 weeks × 5 days ≈ 65 rows) is
     laid out compactly; if it's still taller than two pages, the whole
     document is zoomed down just enough to fit (zoom, not transform, so
     page breaks follow the shrunken size). Each week is its own <tbody>
     that never splits across the page break.
  ------------------------------------------------------------ */
  window._spPrint = (id) => {
    const prog = getPrograms().find(p => String(p.id) === String(id)) || _activeProg;
    if (!prog) return;

    const esc = s => String(s ?? '').replace(/[&<>"']/g, ch =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const logoUrl = new URL('../assets/images/logo.png', location.href).href;
    const weeks = prog.weeks || [];
    let sn = 1;

    const weekBodies = weeks.map(week => {
      const rows = week.rows.map((row, ri) => {
        const t = ACTIVITY_TYPES[row.type] || ACTIVITY_TYPES.normal;
        const strong = ['holiday', 'exam', 'closing'].includes(row.type);
        const tinted = row.type && row.type !== 'normal';
        const snCell = ri === 0
          ? `<td rowspan="${week.rows.length}" class="c wk">${sn++}.</td>
             <td rowspan="${week.rows.length}" class="c wk">WEEK<br>${esc(week.week_no)}</td>`
          : '';
        return `<tr${tinted ? ` style="background:${t.color}12"` : ''}>
          ${snCell}
          <td class="c nw">${esc(row.date)}</td>
          <td class="day">${esc(row.day)}</td>
          <td style="color:${t.color};font-weight:${strong ? 700 : tinted ? 600 : 400}">${esc(row.activity)}</td>
          <td class="c nw">${esc(row.time)}</td>
        </tr>`;
      }).join('');
      return `<tbody class="week">${rows}</tbody>`;
    }).join('');

    const legend = Object.values(ACTIVITY_TYPES)
      .map(t => `<span><i style="background:${t.color}"></i>${t.label}</span>`).join('');

    const printWin = window.open('', '_blank');
    if (!printWin) { alert('Please allow pop-ups for this site to print the programme.'); return; }
    printWin.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>School Programme — ${TERM_LABELS[prog.term]} ${esc(prog.session)}</title>
      <style>
        * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        @page { size:A4 portrait; margin:8mm; }
        html, body { margin:0; background:#e5e7eb; }
        body { font-family:Arial, Helvetica, sans-serif; color:#111827; }
        .doc { width:194mm; margin:12px auto; background:#fff; padding:6mm 6mm 4mm; zoom:var(--fit, 1); }
        @media print { html, body { background:#fff; } .doc { margin:0; padding:0; width:calc(194mm / var(--fit, 1)); } .toolbar { display:none !important; } }
        .toolbar { position:sticky; top:0; z-index:5; display:flex; gap:8px; justify-content:center; padding:10px; background:#111827; }
        .toolbar button { font:600 13px Arial; padding:8px 18px; border-radius:6px; border:0; cursor:pointer; background:#c9960c; color:#fff; }
        .toolbar button.alt { background:#374151; }

        .head { display:flex; align-items:center; gap:12px; padding-bottom:6px; border-bottom:3px solid #c9960c; }
        .head img { width:64px; height:64px; object-fit:contain; }
        .name { font-family:Georgia,'Times New Roman',serif; font-size:23px; font-weight:700; color:#13306b; text-transform:uppercase; letter-spacing:.03em; line-height:1.05; }
        .motto { font-family:Georgia,'Times New Roman',serif; font-style:italic; font-size:12px; color:#13306b; margin-top:2px; }
        .sub { font-size:9.5px; color:#374151; margin-top:3px; }
        .banner { margin-top:7px; background:linear-gradient(90deg,#13306b,#1d4690); color:#fff; text-align:center; padding:7px 10px; border-radius:4px; }
        .banner h1 { margin:0; font-size:16px; letter-spacing:.06em; text-transform:uppercase; }
        .banner p { margin:2px 0 0; font-size:11px; color:#f3d98b; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }

        table { width:100%; border-collapse:collapse; margin-top:7px; font-size:10.5px; }
        thead { display:table-header-group; }
        th { background:#13306b; color:#fff; padding:5px 6px; border:1px solid #13306b; font-size:9.5px; letter-spacing:.04em; }
        td { border:1px solid #b8c3d6; padding:3px 6px; vertical-align:middle; line-height:1.25; }
        tbody.week { break-inside:avoid; page-break-inside:avoid; border-top:2px solid #13306b; }
        .c { text-align:center; } .nw { white-space:nowrap; }
        .wk { font-weight:700; color:#13306b; background:#eef3fb; vertical-align:middle; font-size:9.5px; }
        .day { font-weight:700; font-size:9.5px; }

        .foot { margin-top:7px; display:flex; justify-content:space-between; align-items:flex-end; gap:12px; break-inside:avoid; }
        .legend { display:flex; flex-wrap:wrap; gap:3px 12px; font-size:9px; color:#374151; }
        .legend i { display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:4px; vertical-align:-1px; }
        .sign { font-size:9.5px; text-align:center; min-width:150px; }
        .sign div { border-top:1.5px solid #111827; padding-top:3px; margin-top:26px; font-weight:700; }
        .meta { font-size:8.5px; color:#6b7280; margin-top:4px; }
      </style></head><body>
      <div class="toolbar"><button onclick="window.print()">🖨 Print / Save as PDF</button><button class="alt" onclick="window.close()">Close</button></div>
      <div class="doc">
        <div class="head">
          <img src="${logoUrl}" alt="Royal Crystal Academy badge">
          <div>
            <div class="name">Royal Crystal Academy</div>
            <div class="motto">Moral, Excellence &amp; Greatness</div>
            <div class="sub">20/21 Amaigbo Lane, Uwani, Enugu State &nbsp;·&nbsp; 08036721390 / 09080061094</div>
          </div>
        </div>
        <div class="banner">
          <h1>School Programme of Events</h1>
          <p>${TERM_LABELS[prog.term]} — ${esc(prog.session)} Academic Session</p>
        </div>
        <table>
          <thead><tr>
            <th style="width:6%">S/N</th><th style="width:9%">WEEK</th><th style="width:13%">DATE</th>
            <th style="width:13%">DAY</th><th>ACTIVITIES</th><th style="width:15%">TIME</th>
          </tr></thead>
          ${weekBodies || '<tbody><tr><td colspan="6" class="c" style="padding:16px;color:#6b7280">No weeks in this programme yet.</td></tr></tbody>'}
        </table>
        <div class="foot">
          <div>
            <div class="legend">${legend}</div>
            <div class="meta">Created by ${esc(prog.created_by || 'Administration')} · Printed ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <div class="sign"><div>Head Teacher</div></div>
        </div>
      </div>
      <script>
        // Fit to at most two A4 pages: printable height per page is
        // 297mm − 2×8mm margins = 281mm ≈ 1062px. Budget a little under
        // two pages for the repeated table header and for whole weeks
        // being pushed to page 2 rather than split.
        function fit() {
          var root = document.documentElement, doc = document.querySelector('.doc');
          root.style.setProperty('--fit', '1');
          doc.style.padding = '0'; doc.style.width = '194mm';
          var h = doc.getBoundingClientRect().height;
          doc.style.padding = ''; doc.style.width = '';
          var BUDGET = 2 * 1062 - 170;
          var s = h > BUDGET ? Math.max(0.55, Math.floor(BUDGET / h * 1000) / 1000) : 1;
          root.style.setProperty('--fit', String(s));
        }
        window.addEventListener('beforeprint', fit);
        window.addEventListener('load', function () { fit(); setTimeout(function () { window.print(); }, 300); });
      <\/script>
    </body></html>`);
    printWin.document.close();
  };

  /* ============================================================
     TOAST
  ============================================================ */
  function showToast(msg, color = '#059669') {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${color};color:#fff;padding:12px 20px;border-radius:10px;z-index:9999;font-size:0.85rem;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2)`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

})();
