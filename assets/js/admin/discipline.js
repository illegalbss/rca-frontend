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
  const linkedClasses = user?.linked_classes || [];

  // All classes (show all for full access, otherwise filter to assigned class only)
  let allClasses;
  if (isFullAccess) {
    allClasses = window.SCHOOL_CLASSES || [];
  } else if (linkedClasses.length > 0) {
    // Form teacher — only their assigned class
    allClasses = (window.SCHOOL_CLASSES || []).filter(c =>
      linkedClasses.some(lc => lc.trim().toLowerCase() === c.trim().toLowerCase())
    );
  } else {
    // Subject teacher or no assignment — no access to discipline
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
  const modalOverlay        = document.getElementById('incidentModalOverlay');
  const modalCloseBtn       = document.getElementById('modalCloseBtn');
  const incidentForm        = document.getElementById('incidentForm');
  const incidentStudentSelect = document.getElementById('incident_student');

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
     LOG INCIDENT MODAL
     -------------------------------------------- */
  function openIncidentModal() {
    // Populate the pupil dropdown with only this class's students
    // Only show active students in this class
    const studentsInClass = allStudents.filter(s =>
      s.class_name === currentClass &&
      s.status !== 'archived' &&
      s.status !== 'inactive' &&
      s.status !== 'removed'
    );

    if (studentsInClass.length === 0) {
      incidentStudentSelect.innerHTML = '<option value="">-- No pupils registered in this class yet --</option>';
    } else {
      incidentStudentSelect.innerHTML = '<option value="">-- Select pupil --</option>';
    }

    if (studentsInClass.length > 0)
    incidentStudentSelect.innerHTML = '<option value="">-- Select pupil --</option>' +
      studentsInClass.map(s => `<option value="${s.admission_no}">${s.full_name}</option>`).join('');

    // Default the date field to today
    document.getElementById('incident_date').value = toDateInputValue(new Date());

    incidentForm.reset();
    document.getElementById('incident_date').value = toDateInputValue(new Date()); // reset() clears this too, so set again after
    modalOverlay.classList.add('open');
  }

  function closeIncidentModal() {
    modalOverlay.classList.remove('open');
  }

  logIncidentBtn.addEventListener('click', () => {
    // Verify access before opening modal
    if (!isFullAccess && !linkedClasses.some(lc => lc.trim().toLowerCase() === currentClass?.trim().toLowerCase())) {
      alert('You can only log discipline incidents for your assigned class.');
      return;
    }
    openIncidentModal();
  });
  modalCloseBtn.addEventListener('click', closeIncidentModal);
  modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) closeIncidentModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalOverlay.classList.contains('open')) closeIncidentModal();
  });

  /* --------------------------------------------
     HANDLE FORM SUBMIT: add a new incident
     -------------------------------------------- 
     Concept: this is the first page where we ADD a brand new
     record to an in-memory array (allIncidents.push(...)), rather
     than just editing existing sample data in place. The shape of
     the object we build here matches sample-discipline.js exactly -
     this consistency matters because the SAME rendering functions
     (renderClassCards, renderIncidentTable) need to work whether
     a record came from our generator or was just typed in by hand.
  */
  incidentForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!incidentForm.checkValidity()) {
      incidentForm.reportValidity();
      return;
    }

    const admissionNo = document.getElementById('incident_student').value;
    const student = allStudents.find(s => s.admission_no === admissionNo);

    const newIncident = {
      id: nextIncidentId++,
      student_admission_no: admissionNo,
      student_name: student.full_name,
      class_name: currentClass,
      date: document.getElementById('incident_date').value,
      severity: document.getElementById('incident_severity').value,
      description: document.getElementById('incident_description').value.trim(),
      action_taken: document.getElementById('incident_action').value.trim(),
      reported_by: 'You (current session)',
      parent_notified: document.getElementById('incident_parent_notified').checked
    };

    allIncidents.push(newIncident);

    closeIncidentModal();
    renderIncidentTable();
  });

  /* --------------------------------------------
     INITIALIZE
     -------------------------------------------- */
  renderClassCards();

});
