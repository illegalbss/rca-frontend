/* ============================================
   TEACHER MANAGEMENT — teachers.js
   ============================================
   Depends on window.SAMPLE_TEACHERS (from sample-teachers.js,
   which itself depends on sample-students.js for the class list -
   see the script order comment in teachers.html).

   Simpler than students.js because staff count is small (~19-22) -
   no need for class-grouping or drill-down views. Instead:
   1. A filterable, searchable card grid (all staff visible at once)
   2. Clicking any card opens a MODAL with full details
*/

document.addEventListener('DOMContentLoaded', () => {

  const allTeachers = window.SAMPLE_TEACHERS || [];

  /* --------------------------------------------
     ELEMENT REFERENCES
     -------------------------------------------- */
  const cardsContainer   = document.getElementById('teacherCardsContainer');
  const searchInput      = document.getElementById('teacherSearch');
  const roleFilter        = document.getElementById('roleFilter');
  const totalPill         = document.getElementById('totalStaffPill');
  const noResultsMsg      = document.getElementById('noTeacherResults');

  const modalOverlay      = document.getElementById('teacherModalOverlay');
  const modalContent       = document.getElementById('teacherModalContent');
  const modalCloseBtn      = document.getElementById('modalCloseBtn');

  /* --------------------------------------------
     HELPER: initials for the avatar circle
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
     HELPER: format a list of classes as chips,
     truncating with a "+N more" chip if too many
     -------------------------------------------- 
     A specialist teacher might be assigned to 8 classes -
     showing all 8 chips would make the card huge. We show
     the first 3, then a "+5 more" chip for the rest.
  */
  function renderClassChips(classes, maxVisible = 3) {
    if (classes.length === 0) {
      return '<span class="class-chip">No classes assigned</span>';
    }

    const visible = classes.slice(0, maxVisible);
    const remaining = classes.length - visible.length;

    let html = visible.map(c => `<span class="class-chip">${c}</span>`).join('');

    if (remaining > 0) {
      html += `<span class="class-chip class-chip-more">+${remaining} more</span>`;
    }

    return html;
  }

  /* --------------------------------------------
     CORE RENDER FUNCTION
     -------------------------------------------- 
     Re-runs every time search text or the role filter changes.
     Always starts fresh from allTeachers and re-applies both
     filters together - this is important: search AND role filter
     must BOTH match, not just one or the other.
  */
  function renderTeacherCards() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedRole = roleFilter.value;

    let teachers = allTeachers.filter(t => {
      const matchesSearch = !searchTerm ||
        t.full_name.toLowerCase().includes(searchTerm) ||
        t.staff_id.toLowerCase().includes(searchTerm);

      const matchesRole = selectedRole === 'all' || (t.roles ? t.roles.includes(selectedRole) : t.legacy_role === selectedRole);

      // Both conditions must be true for this teacher to be included
      return matchesSearch && matchesRole;
    });

    totalPill.textContent = `${allTeachers.length} staff total`;

    if (teachers.length === 0) {
      cardsContainer.innerHTML = '';
      noResultsMsg.style.display = 'block';
      return;
    }
    noResultsMsg.style.display = 'none';

    cardsContainer.innerHTML = teachers.map(teacher => `
      <div class="card teacher-card" data-teacher-id="${teacher.id}">
        <div class="teacher-card-avatar">${getInitials(teacher.full_name)}</div>
        <div class="teacher-card-body">
          <div class="teacher-card-name">${teacher.full_name}</div>
          <div class="teacher-card-role">${teacher.legacy_role || teacher.primary_role || ''}</div>
          <div class="teacher-card-meta">${teacher.staff_id}</div>
          <div class="teacher-card-classes">
            ${renderClassChips(teacher.assigned_classes)}
          </div>
        </div>
      </div>
    `).join('');

    // Attach click listeners to every card we just created.
    // We re-attach every time because innerHTML rebuilds the
    // elements from scratch, removing any previous listeners.
    cardsContainer.querySelectorAll('.teacher-card').forEach(card => {
      card.addEventListener('click', () => {
        const teacherId = parseInt(card.getAttribute('data-teacher-id'));
        const teacher = allTeachers.find(t => t.id === teacherId);
        openTeacherModal(teacher);
      });
    });
  }

  /* --------------------------------------------
     MODAL: show full teacher details
     -------------------------------------------- */
  function openTeacherModal(teacher) {
    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-avatar">${getInitials(teacher.full_name)}</div>
        <div>
          <h3>${teacher.full_name}</h3>
          <span class="modal-role-badge">${teacher.legacy_role || teacher.primary_role || ''}</span>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-label">Staff ID</div>
        <div class="modal-section-value">${teacher.staff_id}</div>
      </div>

      <div class="modal-section">
        <div class="modal-section-label">Contact</div>
        <div class="modal-section-value">${teacher.phone}</div>
        <div class="modal-section-value">${teacher.email}</div>
      </div>

      <div class="modal-section">
        <div class="modal-section-label">Date Joined</div>
        <div class="modal-section-value">${formatDate(teacher.date_joined)}</div>
      </div>

      <div class="modal-section">
        <div class="modal-section-label">Subjects Taught</div>
        <div class="modal-chips">
          ${teacher.subjects.length > 0
            ? teacher.subjects.map(s => `<span class="modal-chip">${s}</span>`).join('')
            : '<span class="modal-chip">None assigned</span>'}
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-label">Assigned Classes</div>
        <div class="modal-chips">
          ${teacher.assigned_classes.length > 0
            ? teacher.assigned_classes.map(c => `<span class="modal-chip">${c}</span>`).join('')
            : '<span class="modal-chip">None assigned</span>'}
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-outline" onclick="window._editStaffProfile(this)" data-id="${teacher.staff_id}">Edit Profile</button>
        <button class="btn btn-primary" onclick="window.location.href='user-management.html'">Manage Accounts</button>
      </div>
    `;

    modalOverlay.classList.add('open');
  }

  function closeTeacherModal() {
    modalOverlay.classList.remove('open');
  }

  // Close modal via the X button, or by clicking the dark overlay
  // outside the card (but NOT when clicking inside the card itself -
  // that's why we check event.target === modalOverlay specifically)
  modalCloseBtn.addEventListener('click', closeTeacherModal);
  modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
      closeTeacherModal();
    }
  });

  // Allow closing the modal with the Escape key - good accessibility practice
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalOverlay.classList.contains('open')) {
      closeTeacherModal();
    }
  });

  /* --------------------------------------------
     HELPER: format "2024-03-15" as "March 15, 2024"
     -------------------------------------------- */
  function formatDate(isoDateString) {
    const date = new Date(isoDateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  /* --------------------------------------------
     EVENT LISTENERS for search + filter
     -------------------------------------------- */
  searchInput.addEventListener('input', renderTeacherCards);
  roleFilter.addEventListener('change', renderTeacherCards);

  /* --------------------------------------------
     ADD STAFF BUTTON (Phase 1 placeholder)
     -------------------------------------------- */
  document.getElementById('addTeacherBtn').addEventListener('click', () => {
    // Redirect to User Management to create new staff account
    window.location.href = 'user-management.html';
  });

  /* --------------------------------------------
     INITIALIZE
     -------------------------------------------- */
  renderTeacherCards();

});
