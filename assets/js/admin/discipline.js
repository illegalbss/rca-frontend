/* ============================================
   DISCIPLINE RECORDS — discipline.js
   ============================================
   Depends on window.SAMPLE_STUDENTS, window.SCHOOL_CLASSES,
   and window.SAMPLE_DISCIPLINE (see script order in
   discipline.html).

   Same two-view pattern as students.js: a class picker, then
   a per-class detail view - but here the detail view is an
   INCIDENT LOG (filterable by severity) rather than a pupil
   roster, and there's a NEW piece: a modal FORM for logging
   new incidents, which appends to our in-memory data array.
*/

document.addEventListener('DOMContentLoaded', () => {

  // Only count ACTIVE students
  const allStudents = (window.SAMPLE_STUDENTS || []).filter(s =>
    s.status !== 'archived' && s.status !== 'inactive' && s.status !== 'removed'
  );

  // Determine which classes this user can access
  const user = window.CURRENT_USER;
  const userRoles = user ? (user.roles || [user.role, user.primary_role]) : [];
  const isFullAccess = userRoles.includes('ict_admin') || userRoles.includes('head_teacher') || userRoles.includes('proprietor');
  const isFormTeacher = userRoles.includes('class_teacher');

  // Discipline is a form-teacher responsibility — only show their form class.
  // Use form_class if set (dual-role teachers); fall back to linked_classes
  // only for pure form teachers (who have exactly one class in linked_classes).
  let allClasses;
  if (isFullAccess) {
    allClasses = window.SCHOOL_CLASSES || [];
  } else if (isFormTeacher && user) {
    const formClass = user.form_class;
    if (formClass) {
      allClasses = (window.SCHOOL_CLASSES || []).filter(c => c === formClass);
    } else {
      const linkedClasses = user.linked_classes || [];
      allClasses = (window.SCHOOL_CLASSES || []).filter(c =>
        linkedClasses.some(lc => lc.trim().toLowerCase() === c.trim().toLowerCase())
      );
    }
  } else {
    // Subject teacher only — no access to discipline
    allClasses = [];
  }

  // We keep this as a mutable array (let, not const-locked-down) because
  // logging a new incident needs to ADD to it - unlike Students/Teachers/
  // Classes pages, which only ever read existing sample data.
  let allIncidents = window.SAMPLE_DISCIPLINE || [];

  let currentClass = null;
  let currentSeverityFilter = 'all';
  let nextIncidentId = allIncidents.length + 1;

  /* --------------------------------------------
     ELEMENT REFERENCES
     -------------------------------------------- */
  const classPickerView   = document.getElementById('classPickerView');
  const classDetailView   = document.getElementById('classDetailView');
  const classCardsWrap     = document.getElementById('disciplineClassCards');
  const totalIncidentsPill = document.getElementById('totalIncidentsPill');

  const classDetailTitle   = document.getElementById('classDetailTitle');
  const classDetailCount   = document.getElementById('classDetailCount');
  const severityFilter     = document.getElementById('severityFilter');
  const tableBody           = document.getElementById('incidentTableBody');
  const noResultsMsg        = document.getElementById('noIncidentResults');
  const backToClassesBtn    = document.getElementById('backToClasses');
  const topbarTitle         = document.getElementById('topbarTitle');

  const logIncidentBtn      = document.getElementById('logIncidentBtn');
  /* Modal is built dynamically and appended to body (same pattern as students.js) */
  function _incidentModal()  { return document.getElementById('incidentModalOverlay'); }
  function _incidentForm()   { return document.getElementById('incidentForm'); }

  /* --------------------------------------------
     HELPERS
     -------------------------------------------- */
  function getInitials(fullName) {
    return fullName.split(' ').map(p => p.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  function formatDate(isoDateString) {
    const date = new Date(isoDateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /* --------------------------------------------
     STEP 1: CLASS PICKER CARDS
     -------------------------------------------- 
     Each card's border color reflects the WORST severity present
     in that class: gray (none), amber (minor/moderate only), or
     red (at least one major incident) - giving an at-a-glance
     signal of which classes need closer attention.
  */
  function renderClassCards() {
    // Show access message if no classes
    if (allClasses.length === 0) {
      classCardsWrap.innerHTML = `
        <div style="text-align:center;padding:48px 24px;color:#6b7280">
          <div style="font-size:3rem;margin-bottom:16px">🔒</div>
          <h3 style="color:#374151;margin-bottom:8px">Access Restricted</h3>
          <p>You can only view and log discipline records for your assigned class.<br>
          Contact the ICT Administrator if you believe this is an error.</p>
        </div>`;
      return;
    }

    totalIncidentsPill.textContent = isFullAccess
      ? `${allIncidents.length} incidents total`
      : `${allIncidents.filter(i => allClasses.includes(i.class_name)).length} incidents in your class`;

    classCardsWrap.innerHTML = allClasses.map(className => {
      const classIncidents = allIncidents.filter(i => i.class_name === className);
      const minorCount = classIncidents.filter(i => i.severity === 'minor').length;
      const moderateCount = classIncidents.filter(i => i.severity === 'moderate').length;
      const majorCount = classIncidents.filter(i => i.severity === 'major').length;

      let level = 'none';
      if (majorCount > 0) level = 'high';
      else if (minorCount > 0 || moderateCount > 0) level = 'low';

      return `
        <div class="card discipline-card level-${level}" data-class="${className}">
          <div class="discipline-card-name">${className}</div>
          <div class="discipline-card-count">${classIncidents.length} incident${classIncidents.length === 1 ? '' : 's'}</div>
          <div class="discipline-card-breakdown">
            ${minorCount > 0 ? `<span class="severity-chip minor">${minorCount} minor</span>` : ''}
            ${moderateCount > 0 ? `<span class="severity-chip moderate">${moderateCount} moderate</span>` : ''}
            ${majorCount > 0 ? `<span class="severity-chip major">${majorCount} major</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    classCardsWrap.querySelectorAll('.discipline-card').forEach(card => {
      card.addEventListener('click', () => openClassDetail(card.getAttribute('data-class')));
    });
  }

  /* --------------------------------------------
     STEP 2: OPEN CLASS DETAIL (incident log)
     -------------------------------------------- */
  function openClassDetail(className) {
    currentClass = className;
    currentSeverityFilter = 'all';

    classPickerView.style.display = 'none';
    classDetailView.style.display = 'block';

    classDetailTitle.textContent = className;
    topbarTitle.textContent = `Discipline — ${className}`;

    // Reset the severity filter buttons to "All" whenever we open a class
    severityFilter.querySelectorAll('.severity-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-severity') === 'all');
    });

    renderIncidentTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeClassDetail() {
    currentClass = null;
    classDetailView.style.display = 'none';
    classPickerView.style.display = 'block';
    topbarTitle.textContent = 'Discipline Records';
    renderClassCards(); // refresh counts in case a new incident was just logged
  }

  backToClassesBtn.addEventListener('click', closeClassDetail);

  /* --------------------------------------------
     SEVERITY FILTER BUTTONS
     -------------------------------------------- */
  severityFilter.addEventListener('click', (event) => {
    const btn = event.target.closest('.severity-filter-btn');
    if (!btn) return;

    currentSeverityFilter = btn.getAttribute('data-severity');

    severityFilter.querySelectorAll('.severity-filter-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
    });

    renderIncidentTable();
  });

  /* --------------------------------------------
     RENDER THE INCIDENT TABLE for currentClass
     -------------------------------------------- */
  function renderIncidentTable() {
    if (!currentClass) return;

    let incidents = allIncidents.filter(i => i.class_name === currentClass);

    if (currentSeverityFilter !== 'all') {
      incidents = incidents.filter(i => i.severity === currentSeverityFilter);
    }

    // Already sorted newest-first from sample-discipline.js, but if a
    // NEW incident was just logged via the form, we re-sort to make
    // sure it appears in the right chronological position, not just
    // tacked onto the end.
    incidents = [...incidents].sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalForClass = allIncidents.filter(i => i.class_name === currentClass).length;
    classDetailCount.textContent = currentSeverityFilter === 'all'
      ? `${totalForClass} incident${totalForClass === 1 ? '' : 's'}`
      : `${incidents.length} of ${totalForClass} incidents shown`;

    if (incidents.length === 0) {
      tableBody.innerHTML = '';
      noResultsMsg.style.display = 'block';
      return;
    }
    noResultsMsg.style.display = 'none';

    tableBody.innerHTML = incidents.map(incident => `
      <tr>
        <td class="col-avatar"><div class="row-avatar">${getInitials(incident.student_name)}</div></td>
        <td>${incident.student_name}</td>
        <td>${formatDate(incident.date)}</td>
        <td><span class="severity-badge ${incident.severity}">${capitalize(incident.severity)}</span></td>
        <td>${incident.description}</td>
        <td>${incident.action_taken}</td>
        <td>${incident.parent_notified
          ? '<span class="notified-yes">&#10003; Yes</span>'
          : '<span class="notified-no">Not yet</span>'}</td>
      </tr>
    `).join('');
  }

  function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  /* --------------------------------------------
     LOG INCIDENT — dynamic body-append modal (same pattern as students.js)
     -------------------------------------------- */
  function openIncidentModal() {
    document.getElementById('incidentModalOverlay')?.remove();

    const studentsInClass = allStudents.filter(s =>
      s.class_name === currentClass &&
      s.status !== 'archived' && s.status !== 'inactive' && s.status !== 'removed'
    );

    const pupilOptions = studentsInClass.length === 0
      ? '<option value="">-- No pupils registered in this class yet --</option>'
      : '<option value="">-- Select pupil --</option>' +
        studentsInClass.map(s => `<option value="${s.admission_no}">${s.full_name}</option>`).join('');

    const today = toDateInputValue(new Date());
    const fs = 'width:100%;padding:10px 13px;border:1.5px solid #d1d5db;border-radius:8px;font-size:0.88rem;background:#fff;color:#111';
    const lbl = 'display:block;font-size:0.78rem;font-weight:600;color:#374151;margin-bottom:5px';

    const overlay = document.createElement('div');
    overlay.id = 'incidentModalOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:48px 16px 40px;overflow-y:auto';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:560px;box-shadow:0 8px 40px rgba(0,0,0,0.22);position:relative;overflow:hidden">
        <div style="padding:18px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
          <span style="font-family:var(--font-heading);font-weight:700;font-size:1rem;color:#111827">Log Discipline Incident</span>
          <button id="incidentCloseBtn" style="background:#f3f4f6;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:1.1rem;line-height:1">&times;</button>
        </div>
        <div style="padding:22px 24px">
          <form id="incidentForm" novalidate>
            <div style="margin-bottom:16px">
              <label style="${lbl}">Pupil <span style="color:#dc2626">*</span></label>
              <select id="incident_student" style="${fs}" required>${pupilOptions}</select>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
              <div>
                <label style="${lbl}">Date <span style="color:#dc2626">*</span></label>
                <input type="date" id="incident_date" value="${today}" style="${fs}" required>
              </div>
              <div>
                <label style="${lbl}">Severity <span style="color:#dc2626">*</span></label>
                <select id="incident_severity" style="${fs}" required>
                  <option value="">-- Select --</option>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="major">Major</option>
                </select>
              </div>
            </div>

            <div style="margin-bottom:16px">
              <label style="${lbl}">Description <span style="color:#dc2626">*</span></label>
              <textarea id="incident_description" rows="3" style="${fs};resize:vertical" placeholder="What happened?" required></textarea>
            </div>

            <div style="margin-bottom:16px">
              <label style="${lbl}">Action Taken <span style="color:#dc2626">*</span></label>
              <textarea id="incident_action" rows="3" style="${fs};resize:vertical" placeholder="e.g. Verbal warning given, parent informed..." required></textarea>
            </div>

            <div style="margin-bottom:20px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.85rem;color:#374151">
                <input type="checkbox" id="incident_parent_notified" style="width:16px;height:16px">
                Parent/Guardian has been notified
              </label>
            </div>

            <div id="incidentError" style="display:none;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;border-radius:8px;padding:10px 13px;font-size:0.82rem;margin-bottom:14px"></div>

            <button type="submit" style="width:100%;padding:11px;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-size:0.9rem;font-weight:700;cursor:pointer">Save Incident</button>
          </form>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('incidentCloseBtn').addEventListener('click', () => overlay.remove());

    document.getElementById('incidentForm').addEventListener('submit', e => {
      e.preventDefault();
      const admNo    = document.getElementById('incident_student').value;
      const date     = document.getElementById('incident_date').value;
      const severity = document.getElementById('incident_severity').value;
      const desc     = document.getElementById('incident_description').value.trim();
      const action   = document.getElementById('incident_action').value.trim();
      const notified = document.getElementById('incident_parent_notified').checked;
      const errEl    = document.getElementById('incidentError');

      if (!admNo || !date || !severity || !desc || !action) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';

      const student = allStudents.find(s => s.admission_no === admNo);
      allIncidents.push({
        id: nextIncidentId++,
        student_admission_no: admNo,
        student_name: student?.full_name || admNo,
        class_name: currentClass,
        date, severity, description: desc,
        action_taken: action,
        reported_by: 'You (current session)',
        parent_notified: notified
      });

      if (window.logActivity) window.logActivity('create', `Discipline incident logged: ${student?.full_name || admNo} (${currentClass}) — ${capitalize(severity)}`, 'discipline');
      overlay.remove();
      renderIncidentTable();
      renderClassCards();
    });
  }

  logIncidentBtn.addEventListener('click', () => {
    if (!isFullAccess && !allClasses.includes(currentClass)) {
      alert('You can only log discipline incidents for your assigned class.');
      return;
    }
    openIncidentModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.getElementById('incidentModalOverlay')?.remove();
  });

  /* --------------------------------------------
     INITIALIZE
     -------------------------------------------- */
  renderClassCards();

});
