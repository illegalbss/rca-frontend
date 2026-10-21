/* ============================================
   CLASS MANAGEMENT — classes.js
   ============================================
   Students come from RCA_API.getStudents(); staff come from
   RCA_API.getStaffDirectory() (a lightweight, any-staff-readable
   endpoint). This page has no data of its own — it DERIVES
   everything by joining students + staff on class_name, exactly like
   a real database JOIN.
*/

document.addEventListener('DOMContentLoaded', async () => {

  const allStudents = await window.RCA_API.getStudents();
  const rawStaff     = await window.RCA_API.getStaffDirectory();
  const allSubjects  = window.ALL_SUBJECTS_COMBINED || window.SCHOOL_SUBJECTS || [];
  function subjectLabels(codes) {
    return (codes || []).map(function (code) {
      var s = allSubjects.find(function (x) { return x.id === code; });
      return s ? s.name : code;
    });
  }
  // Normalize to the field names the rest of this file already uses.
  const allTeachers = (rawStaff || []).map(function (u) {
    return {
      id: u.id,
      staff_id: u.staff_id,
      full_name: u.full_name,
      phone: u.phone || '—',
      legacy_role: u.job_title || u.primary_role,
      primary_role: u.primary_role,
      roles: [u.primary_role],
      assigned_classes: u.linked_classes || [],
      subject_codes: u.linked_subjects || [],
      subjects: subjectLabels(u.linked_subjects)
    };
  });
  const allClasses  = window.SCHOOL_CLASSES  || [];

  // RBAC: determine visible classes for this user
  const _cu      = window.CURRENT_USER;
  const _roles   = _cu ? (_cu.roles || [_cu.role]) : [];
  const isAdmin  = _roles.includes('ict_admin') || _roles.includes('head_teacher') || _roles.includes('proprietor');

  function getVisibleClasses() {
    if (isAdmin) return allClasses;
    // class_teacher: only their own form class (linked_classes[0]) — the
    // rest of linked_classes may just be classes they subject-teach.
    if (_roles.includes('class_teacher')) {
      const formClass = (_cu?.linked_classes || [])[0];
      return formClass ? allClasses.filter(c => c === formClass) : [];
    }
    // subject_teacher (no class_teacher role): every class they teach
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

    // A class_teacher's FIRST linked class is their form class — the rest
    // of assigned_classes may just be classes they subject-teach, which
    // must not make them show up as "the" class teacher of those too.
    const classTeacher = allTeachers.find(t =>
      t.primary_role === 'class_teacher' && t.assigned_classes[0] === className
    );

    // Specialist staff who teach THIS class but aren't ITS class teacher
    // (e.g. the ICT Administrator might teach Basic 1 AND four other classes)
    const otherStaff = allTeachers.filter(t =>
      t.primary_role !== 'class_teacher' && t.assigned_classes.includes(className)
    );

    const maleCount = studentsInClass.filter(s => (s.gender || '').toLowerCase() === 'male').length;
    const femaleCount = studentsInClass.filter(s => (s.gender || '').toLowerCase() === 'female').length;

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
    const t = data.classTeacher;
    classTeacherInfo.innerHTML = t ? `
      <div class="teacher-info-block">
        <div class="teacher-info-avatar">${getInitials(t.full_name)}</div>
        <div>
          <div class="teacher-info-name">${t.full_name}</div>
          ${t.staff_id ? `<div class="teacher-info-meta">${t.staff_id}</div>` : ''}
          <div class="teacher-info-meta">${t.phone}</div>
        </div>
      </div>
    ` :`<p class="empty-state-text">No class teacher has been assigned to this class yet.</p>`;

    if (isAdmin) classTeacherInfo.appendChild(buildFormTeacherPicker(data));
  }

  /* --------------------------------------------
     Change form teacher (head teacher / ICT admin / proprietor)
     --------------------------------------------
     Any class or subject teacher can be picked. A teacher who is already
     form teacher of another class moves here, and that class is left
     without one until someone else is assigned.
  */
  function buildFormTeacherPicker(data) {
    const wrap = document.createElement('div');
    wrap.className = 'form-teacher-picker';
    const candidates = allTeachers
      .filter(t => t.id && (t.primary_role === 'class_teacher' || t.primary_role === 'subject_teacher'))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
    const current = data.classTeacher ? data.classTeacher.id : '';

    wrap.innerHTML = `
      <label for="formTeacherSelect">${data.classTeacher ? 'Change form teacher' : 'Assign a form teacher'}</label>
      <div class="form-teacher-row">
        <select id="formTeacherSelect" class="form-control">
          <option value="">— No form teacher —</option>
          ${candidates.map(t => {
            const formOf = t.primary_role === 'class_teacher' ? t.assigned_classes[0] : '';
            const note = formOf && formOf !== data.className ? ` (now form teacher of ${formOf})` : '';
            return `<option value="${t.id}"${t.id === current ? ' selected' : ''}>${t.full_name}${note}</option>`;
          }).join('')}
        </select>
        <button type="button" class="btn btn-primary btn-sm">Save</button>
      </div>
      <p class="form-teacher-msg"></p>
    `;

    const select = wrap.querySelector('select');
    const btn = wrap.querySelector('button');
    const msg = wrap.querySelector('.form-teacher-msg');

    btn.addEventListener('click', async () => {
      const userId = select.value || null;
      if (String(userId || '') === String(current || '')) { msg.textContent = 'No change.'; return; }
      const picked = allTeachers.find(t => String(t.id) === String(userId));
      const formOf = picked && picked.primary_role === 'class_teacher' ? picked.assigned_classes[0] : '';
      const question = !picked
        ? `Remove the form teacher from ${data.className}?`
        : `Make ${picked.full_name} the form teacher of ${data.className}?` +
          (formOf && formOf !== data.className ? `\n\n${formOf} will then have no form teacher until you assign one.` : '');
      if (!confirm(question)) return;

      btn.disabled = true;
      msg.textContent = 'Saving…';
      try {
        await window.RCA_API.call('/users/form-teacher', {
          method: 'POST', body: { class_name: data.className, user_id: userId }
        });
        applyFormTeacherLocally(data.className, picked);
        rebuildClassGrid();
        openClassDetail(data.className);
      } catch (e) {
        btn.disabled = false;
        msg.textContent = 'Could not save: ' + e.message;
      }
    });

    return wrap;
  }

  // Mirror what POST /users/form-teacher did on the server, so the page
  // updates without a reload.
  function applyFormTeacherLocally(className, picked) {
    allTeachers.forEach(t => {
      if (t.primary_role === 'class_teacher' && t.assigned_classes[0] === className && t !== picked) {
        t.assigned_classes = t.assigned_classes.filter(c => c !== className);
        if (t.assigned_classes.length) { t.primary_role = 'subject_teacher'; t.roles = ['subject_teacher']; }
      }
    });
    if (picked) {
      const rest = (picked.primary_role === 'class_teacher' ? picked.assigned_classes.slice(1) : picked.assigned_classes)
        .filter(c => c !== className);
      picked.assigned_classes = [className, ...rest];
      picked.primary_role = 'class_teacher';
      picked.roles = ['class_teacher'];
    }
  }

  function rebuildClassGrid() {
    nurseryGrid.innerHTML = '';
    primaryGrid.innerHTML = '';
    renderClassGrid();
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
     The class's curriculum — the same list Score Entry and the report
     card use (nursery or primary, from subjects-and-grading.js). Where a
     staff member other than the form teacher is linked to a subject in
     this class, their name is shown on the chip.
  */
  function renderSubjects(data) {
    const curriculum = window.getSubjectsForClass ? window.getSubjectsForClass(data.className) : [];

    if (!curriculum.length) {
      classSubjectsList.innerHTML = `<p class="empty-state-text">No subjects recorded for this class yet.</p>`;
      return;
    }

    classSubjectsList.innerHTML = curriculum.map(subject => {
      const teachers = data.otherStaff
        .filter(t => t.subject_codes.includes(subject.id))
        .map(t => t.full_name);
      return `<span class="subject-chip">${subject.name}` +
        (teachers.length ? ` <small class="subject-chip-teacher">&middot; ${teachers.join(', ')}</small>` : '') +
        `</span>`;
    }).join('');
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

  // classes.html?class=Nursery%201A opens that class straight away (linked
  // from the Students page's "Form teacher · Change").
  const requestedClass = new URLSearchParams(window.location.search).get('class');
  if (requestedClass && visibleClasses.includes(requestedClass)) openClassDetail(requestedClass);

});
