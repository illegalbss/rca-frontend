/* ============================================
   ATTENDANCE MANAGEMENT — attendance.js
   ============================================
   Depends on window.SAMPLE_STUDENTS + window.SCHOOL_CLASSES
   (from sample-students.js - see script order in attendance.html).

   The attendance register for the currently open class+date is
   held in memory as `register`, an object shaped like:
     { "RCA/2026/001": "present", "RCA/2026/002": "absent", ... }
   Clicking a P/A/L/E pill updates this object directly, and the
   Save button below sends it to the real backend.
*/

document.addEventListener('DOMContentLoaded', () => {

  const allStudents = window.SAMPLE_STUDENTS || [];
  const allClasses  = window.SCHOOL_CLASSES || [];

  /* --------------------------------------------
     IN-MEMORY ATTENDANCE STORE
     -------------------------------------------- 
     Shape: { "Basic 1|2026-06-19": { "RCA/2024/0001": "present", "RCA/2024/0002": "absent", ... } }
     The outer key combines class + date so each day's register
     for each class is stored separately. The inner object maps
     each pupil's admission number to their status string.
  */
  // Load persisted attendance from localStorage
  let attendanceStore = {};
  try {
    const saved = localStorage.getItem('rca_v1_attendance');
    if (saved) attendanceStore = JSON.parse(saved);
  } catch(e) { attendanceStore = {}; }

  // Tracks whether the CURRENTLY OPEN register has unsaved edits
  let hasUnsavedChanges = false;

  /* --------------------------------------------
     ELEMENT REFERENCES
     -------------------------------------------- */
  const classSelect      = document.getElementById('classSelect');
  const dateSelect        = document.getElementById('dateSelect');
  const prevDayBtn        = document.getElementById('prevDayBtn');
  const nextDayBtn        = document.getElementById('nextDayBtn');
  const todayBtn          = document.getElementById('todayBtn');
  const weekendNotice     = document.getElementById('weekendNotice');
  const summaryContainer  = document.getElementById('attendanceSummary');
  const registerSearch    = document.getElementById('registerSearch');
  const markAllPresentBtn = document.getElementById('markAllPresentBtn');
  const tableBody         = document.getElementById('registerTableBody');
  const noResultsMsg      = document.getElementById('noRegisterResults');
  const saveStatus        = document.getElementById('saveStatus');
  const saveBtn            = document.getElementById('saveAttendanceBtn');

  /* --------------------------------------------
     HELPER: format a Date object as "YYYY-MM-DD"
     -------------------------------------------- 
     <input type="date"> always works with this exact string
     format, regardless of how dates are displayed elsewhere.
  */
  function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getInitials(fullName) {
    return fullName.split(' ').map(p => p.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  // Sunday = 0, Saturday = 6 in JavaScript's Date.getDay()
  function isWeekend(dateString) {
    const day = new Date(dateString + 'T00:00:00').getDay();
    return day === 0 || day === 6;
  }

  /* --------------------------------------------
     POPULATE THE CLASS DROPDOWN
     Attendance is a form-teacher-only responsibility — matches the
     backend's own check on POST /attendance/mark:
     - Head Teacher / ICT Admin → all classes
     - Class (form) Teacher → only their own form class
     - Subject Teacher / anyone else → no classes at all, even if
       they teach in that class for a subject
     -------------------------------------------- */
  function populateClassDropdown() {
    const user = window.CURRENT_USER;
    const roles = user ? (user.roles || [user.role, user.primary_role]) : [];
    const isFullAccess = roles.includes('ict_admin') || roles.includes('head_teacher');
    const isFormTeacher = user && user.primary_role === 'class_teacher';
    const myFormClass = isFormTeacher ? (user.form_class || (user.linked_classes || [])[0]) : null;

    let permittedClasses;
    if (isFullAccess || !user) {
      permittedClasses = allClasses;
    } else if (myFormClass) {
      permittedClasses = allClasses.filter(c => c.trim().toLowerCase() === myFormClass.trim().toLowerCase());
    } else {
      permittedClasses = [];
    }

    if (permittedClasses.length === 0) {
      classSelect.innerHTML = '<option value="">No class assigned to you</option>';
      classSelect.disabled = true;
      if (!document.getElementById('attendanceAccessNotice')) {
        const notice = document.createElement('div');
        notice.id = 'attendanceAccessNotice';
        notice.style.cssText = 'background:#fef3c7;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:10px 16px;margin:12px 0;font-size:0.82rem';
        notice.textContent = '🔒 Only a class\'s form teacher (or the ICT Administrator / Head Teacher) can mark attendance. Contact the ICT Administrator if you believe this is an error.';
        document.querySelector('.attendance-toolbar')?.insertAdjacentElement('afterend', notice);
      }
      return;
    }

    classSelect.disabled = false;
    classSelect.innerHTML = permittedClasses
      .map(className => `<option value="${className}">${className}</option>`)
      .join('');

    // If teacher only has one class, disable the dropdown (no need to change)
    if (permittedClasses.length === 1 && !isFullAccess) {
      classSelect.style.pointerEvents = 'none';
      classSelect.style.opacity = '0.75';
      classSelect.title = 'You are assigned to ' + permittedClasses[0];
    }
  }

  /* --------------------------------------------
     GET / INITIALIZE the register for the current class+date
     -------------------------------------------- 
     The key combines class and date into one string so each
     class/day pair gets its own independent record. If this
     combination has never been opened before, we default every
     pupil to "present" - this matches how most schools' paper
     registers work (mark exceptions, not everyone individually).
  */
  function getRegisterKey(className, dateString) {
    return `${className}|${dateString}`;
  }

  function getOrCreateRegister(className, dateString) {
    const key = getRegisterKey(className, dateString);

    if (!attendanceStore[key]) {
      const studentsInClass = allStudents.filter(s => s.class_name === className);
      const register = {};
      studentsInClass.forEach(s => {
        register[s.admission_no] = 'present'; // sensible default
      });
      attendanceStore[key] = register;
    }

    return attendanceStore[key];
  }

  /* --------------------------------------------
     CORE RENDER FUNCTION
     -------------------------------------------- 
     Re-runs whenever class, date, or the search box changes.
  */
  function renderRegister() {
    const className = classSelect.value;
    const dateString = dateSelect.value;

    if (!className || !dateString) return;

    // Show/hide the weekend notice
    weekendNotice.style.display = isWeekend(dateString) ? 'block' : 'none';

    const register = getOrCreateRegister(className, dateString);
    let studentsInClass = allStudents.filter(s => s.class_name === className);

    // Apply search filter
    const searchTerm = registerSearch.value.trim().toLowerCase();
    if (searchTerm) {
      studentsInClass = studentsInClass.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm) ||
        s.admission_no.toLowerCase().includes(searchTerm)
      );
    }

    renderSummary(register, allStudents.filter(s => s.class_name === className));

    if (studentsInClass.length === 0) {
      tableBody.innerHTML = '';
      noResultsMsg.style.display = 'block';
      return;
    }
    noResultsMsg.style.display = 'none';

    tableBody.innerHTML = studentsInClass.map(student => {
      const status = register[student.admission_no] || 'present';
      return `
        <tr>
          <td class="col-avatar"><div class="row-avatar">${getInitials(student.full_name)}</div></td>
          <td>${student.full_name}</td>
          <td>${student.admission_no}</td>
          <td class="col-status">
            <div class="status-pills" data-admission="${student.admission_no}">
              <button class="status-pill ${status === 'present' ? 'active-present' : ''}" data-status="present" title="Present">P</button>
              <button class="status-pill ${status === 'absent' ? 'active-absent' : ''}" data-status="absent" title="Absent">A</button>
              <button class="status-pill ${status === 'late' ? 'active-late' : ''}" data-status="late" title="Late">L</button>
              <button class="status-pill ${status === 'excused' ? 'active-excused' : ''}" data-status="excused" title="Excused">E</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Wire up every status pill button. Each click updates the
    // in-memory register AND immediately re-renders just the summary
    // counts + that row's pill styling (we re-render the whole table
    // for simplicity here - with only ~40 rows max per class, this
    // is fast enough not to need more complex partial-update logic).
    tableBody.querySelectorAll('.status-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const admissionNo = btn.closest('.status-pills').getAttribute('data-admission');
        const newStatus = btn.getAttribute('data-status');

        register[admissionNo] = newStatus;
        markUnsaved();
        renderRegister(); // re-render to reflect the change
      });
    });
  }

  /* --------------------------------------------
     RENDER: summary cards (Present/Absent/Late/Excused counts)
     -------------------------------------------- */
  function renderSummary(register, allStudentsInClass) {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };

    allStudentsInClass.forEach(s => {
      const status = register[s.admission_no] || 'present';
      counts[status]++;
    });

    summaryContainer.innerHTML = `
      <div class="card summary-card summary-present">
        <span class="summary-card-num">${counts.present}</span>
        <span class="summary-card-label">Present</span>
      </div>
      <div class="card summary-card summary-absent">
        <span class="summary-card-num">${counts.absent}</span>
        <span class="summary-card-label">Absent</span>
      </div>
      <div class="card summary-card summary-late">
        <span class="summary-card-num">${counts.late}</span>
        <span class="summary-card-label">Late</span>
      </div>
      <div class="card summary-card summary-excused">
        <span class="summary-card-num">${counts.excused}</span>
        <span class="summary-card-label">Excused</span>
      </div>
    `;
  }

  /* --------------------------------------------
     UNSAVED CHANGES INDICATOR
     -------------------------------------------- 
     This is a small but important UX habit: whenever the person
     changes something, make it visually obvious that it hasn't
     been "saved" yet.
  */
  function markUnsaved() {
    hasUnsavedChanges = true;
    saveStatus.textContent = 'Unsaved changes';
    saveStatus.className = 'save-status unsaved';
  }

  function markSaved() {
    hasUnsavedChanges = false;
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    saveStatus.textContent = `Saved at ${timeString}`;
    saveStatus.className = 'save-status saved';
  }

  saveBtn.addEventListener('click', () => {
    const className  = classSelect.value;
    const dateString = dateSelect.value;
    const register   = getOrCreateRegister(className, dateString);

    markSaved();

    // Save attendance to the real database.
    // `register` is the in-memory { admissionNo: status } map for this
    // class+date, kept up to date by the pill-click handlers above —
    // we just need to convert it into the array shape the API expects.
    if (window.RCA_API) {
      const records = Object.entries(register).map(([admissionNo, status]) => ({
        student_id: admissionNo,
        status
      }));
      if (records.length > 0) {
        window.RCA_API.markAttendance(className, dateString, records)
          .catch(e => console.warn('Attendance API failed:', e.message));
      }
    }

    // Also persist to localStorage as an offline fallback
    try {
      localStorage.setItem('rca_v1_attendance', JSON.stringify(attendanceStore));
    } catch(e) { console.warn('Attendance localStorage save failed:', e); }
  });

  /* --------------------------------------------
     MARK ALL PRESENT (bulk action)
     -------------------------------------------- */
  markAllPresentBtn.addEventListener('click', () => {
    const className = classSelect.value;
    const dateString = dateSelect.value;
    const register = getOrCreateRegister(className, dateString);

    allStudents
      .filter(s => s.class_name === className)
      .forEach(s => { register[s.admission_no] = 'present'; });

    markUnsaved();
    renderRegister();
  });

  /* --------------------------------------------
     DATE NAVIGATION (prev day / next day / today)
     -------------------------------------------- */
  function shiftDate(days) {
    const current = new Date(dateSelect.value + 'T00:00:00');
    current.setDate(current.getDate() + days);
    dateSelect.value = toDateInputValue(current);
    renderRegister();
  }

  prevDayBtn.addEventListener('click', () => shiftDate(-1));
  nextDayBtn.addEventListener('click', () => shiftDate(1));

  todayBtn.addEventListener('click', () => {
    dateSelect.value = toDateInputValue(new Date());
    renderRegister();
  });

  /* --------------------------------------------
     EVENT LISTENERS for class/date/search changes
     -------------------------------------------- */
  classSelect.addEventListener('change', renderRegister);
  dateSelect.addEventListener('change', renderRegister);
  registerSearch.addEventListener('input', renderRegister);

  /* --------------------------------------------
     WARN BEFORE LEAVING WITH UNSAVED CHANGES
     -------------------------------------------- 
     beforeunload fires when the person tries to close the tab,
     refresh, or navigate away. We only want this if there ARE
     unsaved changes - otherwise it would be annoying.
  */
  window.addEventListener('beforeunload', (event) => {
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = ''; // required for the dialog to show in most browsers
    }
  });

  /* --------------------------------------------
     INITIALIZE
     -------------------------------------------- 
     Default to today's date and the first class in the list.
  */
  populateClassDropdown();
  dateSelect.value = toDateInputValue(new Date());
  if (classSelect.options.length > 0) {
    classSelect.value = classSelect.options[0].value;
  }
  renderRegister();

});
