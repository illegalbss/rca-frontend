/* ============================================
   TEACHER MANAGEMENT — teachers.js
   ============================================
   Staff come from the real `users` table (primary_role != 'parent')
   via RCA_API.getUsers(). Edits save through PUT /api/users/:id —
   ict_admin only; head_teacher gets a read-only view plus a link to
   User Management for full account changes.

   Simpler than students.js because staff count is small (~19-22) -
   no need for class-grouping or drill-down views. Instead:
   1. A filterable, searchable card grid (all staff visible at once)
   2. Clicking any card opens a MODAL with full details
*/

document.addEventListener('DOMContentLoaded', async () => {

  const allSubjects = window.ALL_SUBJECTS_COMBINED || window.SCHOOL_SUBJECTS || [];
  function subjectLabel(code) {
    var s = allSubjects.find(function (x) { return x.id === code; });
    return s ? s.name : code;
  }

  var users = await window.RCA_API.getUsers({ status: 'all' });
  const allTeachers = (users || []).filter(function (u) { return u.primary_role !== 'parent'; }).map(function (u) {
    return {
      id: u.id,
      staff_id: u.staff_id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      primary_role: u.primary_role,
      legacy_role: u.job_title || u.primary_role,
      date_joined: u.created_at,
      assigned_classes: u.linked_classes || [],
      subjects: (u.linked_subjects || []).map(subjectLabel),
      roles: [u.primary_role]
    };
  });

  const cuRoles0 = (window.CURRENT_USER && (window.CURRENT_USER.roles || [window.CURRENT_USER.role])) || [];
  const canEditStaff = cuRoles0.includes('ict_admin');

  /* --------------------------------------------
     ELEMENT REFERENCES
     -------------------------------------------- */
  const cardsContainer   = document.getElementById('teacherCardsContainer');
  const searchInput      = document.getElementById('teacherSearch');
  const roleFilter        = document.getElementById('roleFilter');
  const totalPill         = document.getElementById('totalStaffPill');
  const noResultsMsg      = document.getElementById('noTeacherResults');

  /* Modal is created dynamically and appended to body (same approach as students.js) */
  function _teacherModalOverlay() { return document.getElementById('teacherModalOverlay'); }

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
     MODAL helpers — dynamic body-append (matches students.js pattern)
     so there are zero stacking-context issues with the admin shell.
     -------------------------------------------- */
  function _closeTeacherModal() {
    document.getElementById('teacherModalOverlay')?.remove();
  }

  function _buildTeacherModal(innerHtml) {
    document.getElementById('teacherModalOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'teacherModalOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:48px 16px 40px;overflow-y:auto';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:520px;box-shadow:0 8px 40px rgba(0,0,0,0.22);position:relative;padding:0;overflow:hidden">
        <button id="tmCloseBtn" style="position:absolute;top:14px;right:14px;background:#f3f4f6;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:1.1rem;line-height:1;z-index:1">&times;</button>
        <div style="padding:24px 26px" id="tmContent">${innerHtml}</div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) _closeTeacherModal(); });
    document.getElementById('tmCloseBtn').addEventListener('click', _closeTeacherModal);
  }

  function openTeacherModal(teacher) {
    _buildTeacherModal(`
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f1f5f9">
        <div style="width:58px;height:58px;border-radius:50%;background:#6b1220;color:#fff;font-weight:700;font-size:1.2rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">${getInitials(teacher.full_name)}</div>
        <div>
          <div style="font-family:var(--font-heading);font-size:1.05rem;font-weight:700;color:#111827">${teacher.full_name}</div>
          <span style="display:inline-block;background:rgba(107,18,32,0.1);color:#6b1220;font-size:0.75rem;font-weight:600;padding:2px 10px;border-radius:999px;margin-top:3px">${teacher.legacy_role || teacher.primary_role || ''}</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
        <div style="background:#f8fafc;border-radius:10px;padding:12px">
          <div style="font-size:0.7rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Staff ID</div>
          <div style="font-weight:600;color:#111827;font-size:0.88rem">${teacher.staff_id}</div>
        </div>
        <div style="background:#f8fafc;border-radius:10px;padding:12px">
          <div style="font-size:0.7rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Date Joined</div>
          <div style="font-weight:600;color:#111827;font-size:0.88rem">${formatDate(teacher.date_joined)}</div>
        </div>
        <div style="background:#f8fafc;border-radius:10px;padding:12px">
          <div style="font-size:0.7rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Phone</div>
          <div style="font-weight:600;color:#111827;font-size:0.88rem">${teacher.phone || '—'}</div>
        </div>
        <div style="background:#f8fafc;border-radius:10px;padding:12px">
          <div style="font-size:0.7rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Email</div>
          <div style="font-weight:600;color:#111827;font-size:0.82rem;word-break:break-all">${teacher.email || '—'}</div>
        </div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:0.72rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Subjects Taught</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${teacher.subjects.length > 0
            ? teacher.subjects.map(s => `<span style="background:#eff6ff;color:#1e40af;font-size:0.78rem;font-weight:600;padding:3px 10px;border-radius:999px">${s}</span>`).join('')
            : '<span style="color:#9ca3af;font-size:0.82rem">None assigned</span>'}
        </div>
      </div>

      <div style="margin-bottom:22px">
        <div style="font-size:0.72rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Assigned Classes</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${teacher.assigned_classes.length > 0
            ? teacher.assigned_classes.map(c => `<span style="background:#f0fdf4;color:#166534;font-size:0.78rem;font-weight:600;padding:3px 10px;border-radius:999px">${c}</span>`).join('')
            : '<span style="color:#9ca3af;font-size:0.82rem">None assigned</span>'}
        </div>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end">
        ${canEditStaff ? `<button onclick="window._editStaffProfile('${teacher.staff_id}')" style="padding:9px 20px;border:1.5px solid #d1d5db;border-radius:8px;background:#fff;color:#374151;font-size:0.85rem;font-weight:600;cursor:pointer">Edit Profile</button>` : ''}
        ${canEditStaff ? `<button onclick="window.location.href='user-management.html'" style="padding:9px 20px;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer">Manage Accounts</button>` : ''}
      </div>
    `);
  }

  /* EDIT PROFILE — renders an edit form in a fresh modal */
  window._editStaffProfile = function(staffId) {
    if (typeof staffId === 'object') staffId = staffId.getAttribute('data-id');
    const teacher = allTeachers.find(t => t.staff_id === staffId);
    if (!teacher) return;

    _buildTeacherModal(`
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f1f5f9">
        <div style="width:48px;height:48px;border-radius:50%;background:#6b1220;color:#fff;font-weight:700;font-size:1rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">${getInitials(teacher.full_name)}</div>
        <div>
          <div style="font-family:var(--font-heading);font-size:0.95rem;font-weight:700;color:#111827">Edit Profile</div>
          <div style="font-size:0.78rem;color:#9ca3af">${teacher.staff_id}</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:18px">
        ${[['ep_name','text','Full Name',teacher.full_name],['ep_phone','tel','Phone',teacher.phone||''],['ep_email','email','Email',teacher.email||'']].map(([id,type,label,val])=>`
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;color:#374151;margin-bottom:5px">${label}</label>
            <input id="${id}" type="${type}" value="${val}" style="width:100%;padding:10px 13px;border:1.5px solid #d1d5db;border-radius:8px;font-size:0.88rem;outline:none">
          </div>`).join('')}
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;color:#374151;margin-bottom:5px">Job Title</label>
          <input id="ep_role" type="text" value="${teacher.legacy_role || ''}" placeholder="e.g. Head Teacher" style="width:100%;padding:10px 13px;border:1.5px solid #d1d5db;border-radius:8px;font-size:0.88rem">
        </div>
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;color:#374151;margin-bottom:5px">Assigned Class(es)</label>
          <input id="ep_class" type="text" value="${teacher.assigned_classes.join(', ')}" placeholder="e.g. Basic 3A, Basic 4B" style="width:100%;padding:10px 13px;border:1.5px solid #d1d5db;border-radius:8px;font-size:0.88rem">
        </div>
      </div>

      <div id="ep_msg" style="display:none;padding:9px 13px;border-radius:8px;font-size:0.82rem;margin-bottom:14px"></div>

      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end">
        <button onclick="window._cancelEditProfile('${staffId}')" style="padding:9px 20px;border:1.5px solid #d1d5db;border-radius:8px;background:#fff;color:#374151;font-size:0.85rem;font-weight:600;cursor:pointer">Cancel</button>
        <button id="ep_save_btn" onclick="window._saveStaffProfile('${staffId}')" style="padding:9px 20px;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer">Save Changes</button>
      </div>
    `);
  };

  window._saveStaffProfile = async function(staffId) {
    const teacher = allTeachers.find(t => t.staff_id === staffId);
    if (!teacher) return;
    const name  = document.getElementById('ep_name').value.trim();
    const phone = document.getElementById('ep_phone').value.trim();
    const email = document.getElementById('ep_email').value.trim();
    const role  = document.getElementById('ep_role').value.trim();
    const cls   = document.getElementById('ep_class').value.split(',').map(s => s.trim()).filter(Boolean);
    const msgEl = document.getElementById('ep_msg');
    if (!name) {
      msgEl.textContent = 'Full name is required.';
      msgEl.style.cssText = 'display:block;padding:9px 13px;border-radius:8px;font-size:0.82rem;margin-bottom:14px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5';
      return;
    }
    const saveBtn = document.getElementById('ep_save_btn');
    if (saveBtn) saveBtn.disabled = true;

    try {
      await window.RCA_API.updateUser(teacher.id, {
        full_name: name, phone, email, job_title: role, linked_classes: cls
      });
    } catch (e) {
      if (saveBtn) saveBtn.disabled = false;
      msgEl.textContent = 'Could not save: ' + e.message;
      msgEl.style.cssText = 'display:block;padding:9px 13px;border-radius:8px;font-size:0.82rem;margin-bottom:14px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5';
      return;
    }

    teacher.full_name = name; teacher.phone = phone; teacher.email = email;
    teacher.legacy_role = role;
    teacher.assigned_classes = cls;
    msgEl.textContent = 'Profile updated successfully.';
    msgEl.style.cssText = 'display:block;padding:9px 13px;border-radius:8px;font-size:0.82rem;margin-bottom:14px;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7';
    setTimeout(() => { openTeacherModal(teacher); renderTeacherCards(); }, 900);
  };

  window._cancelEditProfile = function(staffId) {
    const teacher = allTeachers.find(t => t.staff_id === staffId);
    if (teacher) openTeacherModal(teacher);
  };

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') _closeTeacherModal();
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
