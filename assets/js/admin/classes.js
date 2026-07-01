/* ============================================
   CLASS MANAGEMENT — classes.js
   ============================================
   Depends on window.SCHOOL_CLASSES, window.SAMPLE_STUDENTS
   (both from sample-students.js) and window.SAMPLE_TEACHERS
   (from sample-teachers.js). See script order in classes.html.

   KEY CONCEPT: this page has NO data generator of its own.
   It DERIVES everything by combining the existing students
   and teachers data, joined together by class_name. This is
   exactly how a real database query works once we reach
   Phase 3/4: instead of three separate disconnected lists,
   you write a JOIN that combines rows from multiple tables
   based on a shared column (here, the class name).
*/

document.addEventListener('DOMContentLoaded', () => {

  const allStudents = window.SAMPLE_STUDENTS || [];
  const allTeachers = window.SAMPLE_TEACHERS || [];
  const allUsers    = window.SAMPLE_USERS    || [];
  const allClasses  = window.SCHOOL_CLASSES  || [];

  // RBAC: determine visible classes for this user
  const _cu      = window.CURRENT_USER;
  const _roles   = _cu ? (_cu.roles || [_cu.role]) : [];
  const isAdmin  = _roles.includes('ict_admin') || _roles.includes('head_teacher') || _roles.includes('proprietor');

  function getVisibleClasses() {
    if (isAdmin) return allClasses;
    const formClass = _cu?.form_class;
    if (formClass) return allClasses.filter(c => c === formClass);
    const linked = _cu?.linked_classes || [];
    return allClasses.filter(c => linked.includes(c));
  }
  const visibleClasses = getVisibleClasses();

  let currentClass = null;

  /* --------------------------------------------
     ELEMENT REFERENCES
     -------------------------------------------- */
  const classGridView      = document.getElementById('classGridView');
  const classDetailView    = document.getElementById('classDetailView');
  const nurseryGrid        = document.getElementById('nurseryClassGrid');
  const primaryGrid        = document.getElementById('primaryClassGrid');
  const totalClassesPill   = document.getElementById('totalClassesPill');

  const classDetailTitle    = document.getElementById('classDetailTitle');
  const classDetailSubtitle = document.getElementById('classDetailSubtitle');
  const classTeacherInfo    = document.getElementById('classTeacherInfo');
  const classStatsList      = document.getElementById('classStatsList');
  const classSubjectsList   = document.getElementById('classSubjectsList');
  const otherStaffList      = document.getElementById('otherStaffList');
  const backToClassGridBtn  = document.getElementById('backToClassGrid');
  const topbarTitle         = document.getElementById('topbarTitle');

  /* --------------------------------------------
     HELPER: initials for avatar circles
     -------------------------------------------- */
  function getInitials(fullName) {
    return fullName
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  /* --------------------------------------------
     THE "JOIN": find a class's data by combining
     students + teachers that reference this class_name
     -------------------------------------------- 
     This single function is the heart of the page. Given
     a class name like "Basic 1", it gathers:
     - every student in that class
     - the ONE class teacher assigned to it (role: "Class Teacher"
       whose assigned_classes array includes this class)
     - any OTHER staff (specialists) who also teach this class
  */
  function getClassData(className) {
    const studentsInClass = allStudents.filter(s => s.class_name === className);

    // Find the form teacher from SAMPLE_USERS (real names) first;
    // fall back to SAMPLE_TEACHERS for extra detail fields (phone, subjects).
    const userTeacher = allUsers.find(u => {
      const roles = u.roles || [u.role];
      if (!roles.includes('class_teacher')) return false;
      if (u.form_class) return u.form_class === className;
      return (u.linked_classes || []).includes(className);
    });

    const classTeacher = userTeacher
      ? { ...(allTeachers.find(t => t.email === userTeacher.email) || {}), ...userTeacher,
          full_name: userTeacher.full_name, staff_id: userTeacher.id }
      : allTeachers.find(t =>
          (t.roles ? t.roles.includes('class_teacher') : t.legacy_role === 'Class Teacher') &&
          t.assigned_classes && t.assigned_classes.includes(className)
        );

    // Specialist staff who teach THIS class but aren't ITS class teacher
    // (e.g. the ICT Administrator might teach Basic 1 AND four other classes)
    const otherStaff = allTeachers.filter(t =>
      (t.roles ? !t.roles.includes('class_teacher') || t.roles.includes('subject_teacher') : t.legacy_role !== 'Class Teacher') && t.assigned_classes.includes(className)
    );

    const maleCount = studentsInClass.filter(s => s.gender === 'male').length;
    const femaleCount = studentsInClass.filter(s => s.gender === 'female').length;

    return {
      className,
      students: studentsInClass,
      pupilCount: studentsInClass.length,
      maleCount,
      femaleCount,
      classTeacher,
      otherStaff
    };
  }

  /* --------------------------------------------
     STEP 1: BUILD THE CLASS GRID
     -------------------------------------------- */
  function renderClassGrid() {
    totalClassesPill.textContent = `${visibleClasses.length} ${visibleClasses.length === 1 ? 'class' : 'classes'}`;

    visibleClasses.forEach(className => {
      const data = getClassData(className);

      const card = document.createElement('div');
      card.className = 'card class-mgmt-card';

      const teacherRowHtml = data.classTeacher
        ? `<div class="class-mgmt-card-teacher">
             <div class="mini-avatar">${getInitials(data.classTeacher.full_name)}</div>
             <span>${data.classTeacher.full_name}</span>
           </div>`
        : `<div class="class-mgmt-card-teacher">
             <span class="no-teacher-text">No teacher assigned</span>
           </div>`;

      card.innerHTML = `
        <span class="class-mgmt-card-name">${className}</span>
        <span class="class-mgmt-card-count">${data.pupilCount} pupils &middot; ${data.maleCount}M / ${data.femaleCount}F</span>
        ${teacherRowHtml}
      `;

      card.addEventListener('click', () => openClassDetail(className));

      const isNurseryGroup = className.includes('Nursery');
      (isNurseryGroup ? nurseryGrid : primaryGrid).appendChild(card);
    });
  }

  /* --------------------------------------------
     STEP 2: OPEN CLASS DETAIL VIEW
     -------------------------------------------- */
  function openClassDetail(className) {
    currentClass = className;
    const data = getClassData(className);

    classGridView.style.display = 'none';
    classDetailView.style.display = 'block';

    classDetailTitle.textContent = className;
    classDetailSubtitle.textContent = `${data.pupilCount} pupils enrolled`;
    topbarTitle.textContent = `Classes — ${className}`;

    // Build the "View Pupils" link so it deep-links directly into
    // THIS class on the Students page, instead of always pointing
    // to the generic class picker. encodeURIComponent() makes sure
    // spaces and special characters in the class name survive being
    // placed inside a URL (e.g. "Basic 1" becomes "Basic%201").
    const viewPupilsBtn = document.getElementById('viewPupilsBtn');
    viewPupilsBtn.href = `students.html?class=${encodeURIComponent(className)}`;

    renderClassTeacherCard(data);
    renderClassStats(data);
    renderSubjects(data);
    renderOtherStaff(data);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeClassDetail() {
    currentClass = null;
    classDetailView.style.display = 'none';
    classGridView.style.display = 'block';
    topbarTitle.textContent = 'Classes';
  }

  backToClassGridBtn.addEventListener('click', closeClassDetail);

  /* --------------------------------------------
     RENDER: Class Teacher card
     -------------------------------------------- */
  function renderClassTeacherCard(data) {
    if (!data.classTeacher) {
      classTeacherInfo.innerHTML = `<p class="empty-state-text">No class teacher has been assigned to this class yet.</p>`;
      return;
    }

    const t = data.classTeacher;
    classTeacherInfo.innerHTML = `
      <div class="teacher-info-block">
        <div class="teacher-info-avatar">${getInitials(t.full_name)}</div>
        <div>
          <div class="teacher-info-name">${t.full_name}</div>
          <div class="teacher-info-meta">${t.staff_id}</div>
          <div class="teacher-info-meta">${t.phone}</div>
        </div>
      </div>
    `;
  }

  /* --------------------------------------------
     RENDER: Class Statistics
     -------------------------------------------- */
  function renderClassStats(data) {
    classStatsList.innerHTML = `
      <div class="class-stat-row">
        <span class="stat-label">Total pupils</span>
        <span class="stat-value">${data.pupilCount}</span>
      </div>
      <div class="class-stat-row">
        <span class="stat-label">Male pupils</span>
        <span class="stat-value">${data.maleCount}</span>
      </div>
      <div class="class-stat-row">
        <span class="stat-label">Female pupils</span>
        <span class="stat-value">${data.femaleCount}</span>
      </div>
      <div class="class-stat-row">
        <span class="stat-label">Staff teaching this class</span>
        <span class="stat-value">${(data.classTeacher ? 1 : 0) + data.otherStaff.length}</span>
      </div>
    `;
  }

  /* --------------------------------------------
     RENDER: Subjects offered
     -------------------------------------------- 
     We gather subjects from BOTH the class teacher AND every
     specialist teaching this class, then de-duplicate using a
     Set (a JS structure that automatically discards repeats).
  */
  function renderSubjects(data) {
    const allSubjects = new Set();

    if (data.classTeacher) {
      data.classTeacher.subjects.forEach(s => allSubjects.add(s));
    }
    data.otherStaff.forEach(t => t.subjects.forEach(s => allSubjects.add(s)));

    if (allSubjects.size === 0) {
      classSubjectsList.innerHTML = `<p class="empty-state-text">No subjects recorded for this class yet.</p>`;
      return;
    }

    // Convert the Set back into an Array so we can use .map() on it
    classSubjectsList.innerHTML = [...allSubjects]
      .map(subject => `<span class="subject-chip">${subject}</span>`)
      .join('');
  }

  /* --------------------------------------------
     RENDER: Other staff teaching this class
     -------------------------------------------- */
  function renderOtherStaff(data) {
    if (data.otherStaff.length === 0) {
      otherStaffList.innerHTML = `<p class="empty-state-text">No additional specialist staff are assigned to this class.</p>`;
      return;
    }

    otherStaffList.innerHTML = data.otherStaff.map(t => `
      <div class="other-staff-row">
        <div class="mini-avatar">${getInitials(t.full_name)}</div>
        <div>
          <div class="other-staff-name">${t.full_name} &middot; ${t.legacy_role || t.role || ''}</div>
          <div class="other-staff-subject">${t.subjects.join(', ') || 'General'}</div>
        </div>
      </div>
    `).join('');
  }

  /* --------------------------------------------
     INITIALIZE
     -------------------------------------------- */
  renderClassGrid();

});
