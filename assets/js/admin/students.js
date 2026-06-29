/* ============================================
   STUDENT MANAGEMENT — students.js
   ============================================
   This file depends on window.SAMPLE_STUDENTS and
   window.SCHOOL_CLASSES, both created by sample-students.js
   (which MUST be loaded first - see students.html script order).

   Two views on one page:
   1. #classPickerView - grid of 11 class cards with pupil counts
   2. #classDetailView - searchable/sortable table for ONE class

   JS shows/hides these by toggling their `display` style -
   we never reload the page or navigate to a new URL.
*/

document.addEventListener('DOMContentLoaded', () => {

  // Use window.SAMPLE_STUDENTS directly so delete/add updates persist
  if (!window.SAMPLE_STUDENTS) window.SAMPLE_STUDENTS = [];
  const allStudents = window.SAMPLE_STUDENTS;
  const allClasses = window.SCHOOL_CLASSES || [];

  // Track which class is currently being viewed in detail (null = none)
  let currentClass = null;

  /* --------------------------------------------
     ELEMENT REFERENCES
     -------------------------------------------- */
  const classPickerView   = document.getElementById('classPickerView');
  const classDetailView   = document.getElementById('classDetailView');
  const nurseryCardsWrap  = document.getElementById('nurseryClassCards');
  const primaryCardsWrap  = document.getElementById('primaryClassCards');
  const totalPupilsPill   = document.getElementById('totalPupilsPill');
  const globalSearchInput = document.getElementById('globalSearch');
  const searchResultsCard = document.getElementById('searchResultsCard');
  const searchResultsList = document.getElementById('searchResultsList');

  const classDetailTitle  = document.getElementById('classDetailTitle');
  const classDetailCount  = document.getElementById('classDetailCount');
  const classSearchInput  = document.getElementById('classSearch');
  const sortSelect        = document.getElementById('sortSelect');
  const tableBody          = document.getElementById('studentsTableBody');
  const noResultsMsg       = document.getElementById('noResultsMsg');
  const backToClassesBtn   = document.getElementById('backToClasses');
  const topbarTitle        = document.getElementById('topbarTitle');

  /* --------------------------------------------
     HELPER: get a 2-letter initials string from a name
     -------------------------------------------- 
     "Adaeze Okonkwo" -> "AO" - used for the little
     circular avatar in the table, same idea as the
     topbar user avatar in dashboard-shell.js
  */
  function getInitials(fullName) {
    return fullName
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  /* --------------------------------------------
     STEP 1: BUILD THE CLASS PICKER CARDS
     -------------------------------------------- 
     For each class name, we COUNT how many students in
     allStudents belong to it using .filter(), then build
     one card showing that count + a male/female breakdown.
  */
  function renderClassCards() {
    // Filter classes visible to this user
    const currentUser = window.CURRENT_USER;
    const currentRoles = currentUser ? (currentUser.roles || [currentUser.role]) : [];
    const isAdmin = currentRoles.includes('ict_admin') || currentRoles.includes('head_teacher') || currentRoles.includes('proprietor');
    const myClasses = currentUser?.linked_classes || [];
    const visibleClasses = isAdmin ? allClasses :
      allClasses.filter(cls => myClasses.some(mc => mc.trim().toLowerCase() === cls.trim().toLowerCase()));
    totalPupilsPill.textContent = `${allStudents.length} pupils total`;

    // Clear existing cards to prevent duplicates on re-render
    nurseryCardsWrap.innerHTML = '';
    primaryCardsWrap.innerHTML = '';

    allClasses.forEach(className => {
      // .filter() returns a NEW array containing only students
      // whose class_name matches this one
      const studentsInClass = allStudents.filter(s =>
        s.class_name === className &&
        s.status !== 'archived' &&
        s.status !== 'inactive' &&
        s.status !== 'removed'
      );
      const maleCount = studentsInClass.filter(s => s.gender === 'male').length;
      const femaleCount = studentsInClass.filter(s => s.gender === 'female').length;

      const card = document.createElement('div');
      card.className = 'card class-card';
      card.innerHTML = `
        <span class="class-card-name">${className}</span>
        <span class="class-card-count">${studentsInClass.length} pupils</span>
        <div class="class-card-genders">
          <span class="gender-pill male">${maleCount} M</span>
          <span class="gender-pill female">${femaleCount} F</span>
        </div>
      `;

      // Clicking a card opens that class in the detail view
      card.addEventListener('click', () => openClassDetail(className));

      // Decide which grid row this card belongs in
      const isNurseryGroup = className.includes('Nursery');
      (isNurseryGroup ? nurseryCardsWrap : primaryCardsWrap).appendChild(card);
    });
  }

  /* --------------------------------------------
     STEP 2: OPEN CLASS DETAIL VIEW
     -------------------------------------------- */
  function openClassDetail(className) {
    currentClass = className;

    classPickerView.style.display = 'none';
    classDetailView.style.display = 'block';

    classDetailTitle.textContent = className;
    topbarTitle.textContent = `Students — ${className}`;

    // Reset search/sort whenever we open a new class
    classSearchInput.value = '';
    sortSelect.value = 'name_asc';

    renderStudentTable();

    // Scroll to top so the user sees the class header, not where
    // they were scrolled to on the class picker grid
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeClassDetail() {
    currentClass = null;
    classDetailView.style.display = 'none';
    classPickerView.style.display = 'block';
    topbarTitle.textContent = 'Students';
  }

  backToClassesBtn.addEventListener('click', closeClassDetail);

  /* --------------------------------------------
     STEP 3: RENDER THE STUDENT TABLE FOR currentClass
     -------------------------------------------- 
     This function re-runs every time the user types in the
     class search box OR changes the sort dropdown - it always
     starts fresh from allStudents and re-applies filter + sort.
  */
  function renderStudentTable() {
    if (!currentClass) return;

    // 1. Get every student in this class
    // Only show active students — archived/inactive/removed are hidden
    let students = allStudents.filter(s =>
      s.class_name === currentClass &&
      s.status !== 'archived' &&
      s.status !== 'inactive' &&
      s.status !== 'removed'
    );

    // 2. Apply the search filter, if any text has been typed
    const searchTerm = classSearchInput.value.trim().toLowerCase();
    if (searchTerm) {
      students = students.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm) ||
        s.admission_no.toLowerCase().includes(searchTerm)
      );
    }

    // 3. Apply sorting based on the dropdown's current value
    const sortBy = sortSelect.value;
    students = sortStudents(students, sortBy);

    // 4. Update the "X pupils" count to reflect the FILTERED total
    classDetailCount.textContent = searchTerm
      ? `${students.length} of ${allStudents.filter(s => s.class_name === currentClass && s.status !== 'archived' && s.status !== 'inactive').length} pupils shown`
      : `${students.length} pupils`;

    // 5. Build the table rows
    if (students.length === 0) {
      tableBody.innerHTML = '';
      noResultsMsg.style.display = 'block';
      return;
    }
    noResultsMsg.style.display = 'none';

    // .map() transforms each student object into an HTML string,
    // then .join('') glues all those strings into one block of HTML
    tableBody.innerHTML = students.map(student => `
      <tr>
        <td class="col-avatar">
          <div class="row-avatar">${getInitials(student.full_name)}</div>
        </td>
        <td>${student.full_name}</td>
        <td>${student.admission_no}</td>
        <td>${student.gender === 'male' ? 'Male' : 'Female'}</td>
        <td>
          <span class="badge ${student.status === 'active' ? 'badge-success' : 'badge-danger'}">
            ${student.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td class="col-actions">
          <div class="row-actions">
            <button class="row-action-btn" onclick="window._viewStudent('${student.admission_no}')">View</button>
            <button class="row-action-btn" onclick="window._editStudent('${student.admission_no}')">Edit</button>
            <button class="row-action-btn" style="color:#dc2626;border-color:#fca5a5" onclick="window._deleteStudent('${student.admission_no}')">Remove</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /* --------------------------------------------
     SORTING HELPER
     -------------------------------------------- 
     .sort() takes a comparison function: it should return
     a negative number if `a` comes first, positive if `b`
     comes first, or 0 if they're equal. localeCompare() is
     the correct way to compare names alphabetically (it
     handles capitalization and special characters properly -
     better than just using < or >).
  */
  function sortStudents(students, sortBy) {
    const sorted = [...students]; // copy the array so we don't mutate the original

    switch (sortBy) {
      case 'name_asc':
        sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
        break;
      case 'name_desc':
        sorted.sort((a, b) => b.full_name.localeCompare(a.full_name));
        break;
      case 'admission_asc':
        sorted.sort((a, b) => a.admission_no.localeCompare(b.admission_no));
        break;
    }

    return sorted;
  }

  // Re-render the table whenever search text or sort option changes
  classSearchInput.addEventListener('input', renderStudentTable);
  sortSelect.addEventListener('change', renderStudentTable);

  /* --------------------------------------------
     GLOBAL SEARCH (searches ALL 400 pupils, any class)
     -------------------------------------------- 
     This is separate from the class-detail search above.
     It lives on the class PICKER view, letting staff find
     a pupil without first knowing which class they're in.
  */
  globalSearchInput.addEventListener('input', () => {
    const term = globalSearchInput.value.trim().toLowerCase();

    if (!term) {
      searchResultsCard.style.display = 'none';
      return;
    }

    const matches = allStudents.filter(s =>
      s.full_name.toLowerCase().includes(term) ||
      s.admission_no.toLowerCase().includes(term)
    );

    searchResultsCard.style.display = 'block';

    if (matches.length === 0) {
      searchResultsList.innerHTML = '<p class="no-results">No pupils found.</p>';
      return;
    }

    // Limit to the first 10 matches so the results don't overwhelm
    // the screen if someone searches a very common letter
    const limitedMatches = matches.slice(0, 10);

    searchResultsList.innerHTML = limitedMatches.map(student => `
      <div class="search-result-item">
        <div>
          <div class="search-result-name">${student.full_name}</div>
          <div class="search-result-meta">${student.class_name} &middot; ${student.admission_no}</div>
        </div>
        <button class="row-action-btn" data-jump-class="${student.class_name}">Go to class</button>
      </div>
    `).join('');

    // Wire up "Go to class" buttons to jump straight into that class's detail view
    searchResultsList.querySelectorAll('[data-jump-class]').forEach(btn => {
      btn.addEventListener('click', () => {
        globalSearchInput.value = '';
        searchResultsCard.style.display = 'none';
        openClassDetail(btn.getAttribute('data-jump-class'));
      });
    });

    if (matches.length > 10) {
      searchResultsList.innerHTML += `<p class="search-result-meta" style="margin-top:8px;">+ ${matches.length - 10} more results. Try a more specific search.</p>`;
    }
  });

  /* --------------------------------------------
     ADD PUPIL BUTTON (Phase 1 placeholder)
     -------------------------------------------- 
     We don't have a real "add to database" yet - that needs
     Phase 2 (localStorage) at minimum, or Phase 4 (real backend)
     for it to persist properly. For now, this confirms the
     button works and previews what's coming.
  */
  document.getElementById('addPupilBtn').addEventListener('click', () => {
    window._addStudent(currentClass);
  });

  /* --------------------------------------------
     INITIALIZE
     -------------------------------------------- 
     Concept: deep-linking via URL query parameters
     If this page was opened as "students.html?class=Basic%203"
     (e.g. from the "View Pupils" button on the Classes page),
     we skip straight to that class's detail view instead of
     showing the class picker first. URLSearchParams is the
     built-in browser tool for reading ?key=value pairs from
     the current URL.
  */
  /* ============================================
     STUDENT CRUD FUNCTIONS
     ============================================ */

  // Show modal
  function showStudentModal(title, student, onSave) {
    // Remove existing modal
    document.getElementById('studentModal')?.remove();

    const classes = window.SCHOOL_CLASSES || [];
    const modal = document.createElement('div');
    modal.id = 'studentModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';

    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:480px;box-shadow:0 8px 40px rgba(0,0,0,0.2);overflow:hidden">
        <div style="padding:18px 22px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between">
          <span style="font-family:var(--font-heading);font-weight:700;font-size:1rem;color:#111827">${title}</span>
          <button onclick="document.getElementById('studentModal').remove()" style="background:#f3f4f6;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:1rem">✕</button>
        </div>
        <div style="padding:20px 22px">
          <div id="studentModalAlert" style="display:none;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:0.82rem"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div>
              <label style="font-size:0.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">First Name *</label>
              <input id="sFirstName" type="text" value="${student?.first_name || ''}" class="form-control" placeholder="First name">
            </div>
            <div>
              <label style="font-size:0.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Last Name *</label>
              <input id="sLastName" type="text" value="${student?.last_name || ''}" class="form-control" placeholder="Last name">
            </div>
            <div>
              <label style="font-size:0.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Gender *</label>
              <select id="sGender" class="form-control">
                <option value="male"   ${student?.gender === 'male'   ? 'selected' : ''}>Male</option>
                <option value="female" ${student?.gender === 'female' ? 'selected' : ''}>Female</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Class *</label>
              <select id="sClass" class="form-control">
                ${classes.map(cls => `<option value="${cls}" ${(student?.class_name || currentClass) === cls ? 'selected' : ''}>${cls}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:0.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Date of Birth</label>
              <input id="sDob" type="date" value="${student?.date_of_birth || ''}" class="form-control">
            </div>
            <div>
              <label style="font-size:0.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Parent Phone</label>
              <input id="sPhone" type="text" value="${student?.parent_phone || ''}" class="form-control" placeholder="08012345678">
            </div>
          </div>
        </div>
        <div style="padding:16px 22px;border-top:1px solid #f3f4f6;display:flex;gap:10px;justify-content:flex-end">
          <button onclick="document.getElementById('studentModal').remove()" class="btn btn-outline">Cancel</button>
          <button id="studentSaveBtn" class="btn btn-primary">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on overlay click
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });

    // Save button
    document.getElementById('studentSaveBtn').addEventListener('click', () => {
      const firstName = document.getElementById('sFirstName').value.trim();
      const lastName  = document.getElementById('sLastName').value.trim();
      const gender    = document.getElementById('sGender').value;
      const className = document.getElementById('sClass').value;
      const dob       = document.getElementById('sDob').value;
      const phone     = document.getElementById('sPhone').value.trim();
      const alertEl   = document.getElementById('studentModalAlert');

      if (!firstName || !lastName) {
        alertEl.textContent = 'Please enter both first name and last name.';
        alertEl.style.display = 'block';
        return;
      }

      onSave({ firstName, lastName, gender, className, dob, phone });
    });
  }

  // VIEW student
  window._viewStudent = function(admNo) {
    const student = allStudents.find(s => s.admission_no === admNo);
    if (!student) return;
    alert(`
Name:         ${student.full_name}
Admission No: ${student.admission_no}
Class:        ${student.class_name}
Gender:       ${student.gender}
Parent Phone: ${student.parent_phone || '—'}
Status:       ${student.status}
    `.trim());
  };

  // ADD student
  window._addStudent = function(className) {
    showStudentModal('+ Add New Pupil', null, ({ firstName, lastName, gender, className: cls, dob, phone }) => {
      // Generate admission number
      const year  = new Date().getFullYear();
      const count = allStudents.length + 1;
      const admNo = `RCA/${year}/${String(count).padStart(4,'0')}`;

      const newStudent = {
        id:            admNo,
        admission_no:  admNo,
        first_name:    firstName,
        last_name:     lastName,
        full_name:     `${firstName} ${lastName}`,
        gender,
        class_name:    cls,
        date_of_birth: dob || null,
        parent_phone:  phone || null,
        status:        'active'
      };

      allStudents.push(newStudent);
      if (window.RCA) window.RCA.save('students');

      // Phase 4: save to real database
      if (window.RCA_API) {
        window.RCA_API.call('/students', {
          method: 'POST',
          body: {
            first_name:    firstName,
            last_name:     lastName,
            gender,
            class_name:    cls,
            date_of_birth: dob || null,
            parent_phone:  phone || null
          }
        }).then(saved => {
          // Update with real admission number from server
          if (saved?.admission_no) {
            newStudent.admission_no = saved.admission_no;
            newStudent.id           = saved.admission_no;
          }
        }).catch(e => console.warn('Student API save failed:', e.message));
      }

      document.getElementById('studentModal').remove();

      // Refresh view
      if (currentClass !== cls) openClassDetail(cls);
      else renderStudentTable();
    });
  };

  // EDIT student
  window._editStudent = function(admNo) {
    const student = allStudents.find(s => s.admission_no === admNo);
    if (!student) return;

    showStudentModal(`Edit — ${student.full_name}`, student, ({ firstName, lastName, gender, className: cls, dob, phone }) => {
      // Update in memory
      student.first_name    = firstName;
      student.last_name     = lastName;
      student.full_name     = `${firstName} ${lastName}`;
      student.gender        = gender;
      student.class_name    = cls;
      student.date_of_birth = dob || student.date_of_birth;
      student.parent_phone  = phone || student.parent_phone;

      if (window.RCA) window.RCA.save('students');

      // Phase 4: update in real database
      if (window.RCA_API) {
        window.RCA_API.call(`/students/${admNo}`, {
          method: 'PUT',
          body: { first_name: firstName, last_name: lastName, gender, class_name: cls, date_of_birth: dob, parent_phone: phone }
        }).catch(e => console.warn('Student update API failed:', e.message));
      }

      document.getElementById('studentModal').remove();
      renderStudentTable();
    });
  };

  // REMOVE student (soft delete — marks as archived)
  window._deleteStudent = function(admNo) {
    const student = allStudents.find(s => s.admission_no === admNo);
    if (!student) return;
    if (!confirm(`Remove ${student.full_name} from the system?

This will archive the record. You can restore it from User Management if needed.`)) return;

    student.status = 'archived';
    if (window.RCA) window.RCA.save('students');

    // Phase 4: update in real database
    if (window.RCA_API) {
      window.RCA_API.call(`/students/${admNo}`, {
        method: 'PUT',
        body: { status: 'archived' }
      }).catch(e => console.warn('Student archive API failed:', e.message));
    }

    renderStudentTable();
  };

  /* ============================================
     INIT
     ============================================ */

  renderClassCards();

  const urlParams = new URLSearchParams(window.location.search);
  const requestedClass = urlParams.get('class');

  if (requestedClass && allClasses.includes(requestedClass)) {
    openClassDetail(requestedClass);
  }

  // Phase 4: load real students from API
  if (window.RCA_API) {
    window.RCA_API.getStudents().then(apiStudents => {
      if (apiStudents && apiStudents.length > 0) {
        // Merge API students with localStorage
        apiStudents.forEach(s => {
          const idx = allStudents.findIndex(ls =>
            ls.admission_no === s.admission_no);
          if (idx >= 0) {
            allStudents[idx] = { ...allStudents[idx], ...s };
          } else {
            allStudents.push(s);
          }
        });
        renderClassCards();
        if (requestedClass) openClassDetail(requestedClass);
      }
    }).catch(e => console.warn('Could not load students from API:', e.message));
  }

});
