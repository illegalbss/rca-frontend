/* ============================================
   USER MANAGEMENT — user-management.js
   Royal Crystal Academy
   ============================================
   ICT Admin full account management:
   CREATE  — new staff account with role, classes, subjects, temp password
   VIEW    — full account details modal
   EDIT    — change name, role, classes, subjects, job title
   RESET   — generate new temporary password
   DEACTIVATE / REACTIVATE — toggle account status (never delete)

   IMPORTANT: New accounts created here live in window.SAMPLE_USERS
   for the session only (Phase 1). In Phase 4, POST /api/users saves
   to the database. The shapes are designed to be identical so Phase 4
   is a straight swap.
*/

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Data ---- */
  const allUsers    = window.SAMPLE_USERS    || [];
  const allClasses  = window.SCHOOL_CLASSES  || [];
  const allSubjects = window.SCHOOL_SUBJECTS || [];
  const roleLabels  = window.RBAC_ROLE_LABELS || {
    ict_admin:'ICT Administrator', head_teacher:'Head Teacher',
    class_teacher:'Form Teacher', subject_teacher:'Subject Teacher',
    accountant:'Accountant', parent:'Parent'
  };

  /* ---- Activity log ---- */
  if (!window.ACTIVITY_LOG) window.ACTIVITY_LOG = [];
  function log(action, target) {
    window.ACTIVITY_LOG.unshift({
      user: window.CURRENT_USER?.full_name || 'ICT Admin',
      role: window.CURRENT_USER?.primary_role || 'ict_admin',
      action, target,
      timestamp: new Date().toISOString()
    });
  }

  /* ---- DOM refs ---- */
  const umSearch      = document.getElementById('umSearch');
  const umRoleFilter  = document.getElementById('umRoleFilter');
  const umStatusFilter= document.getElementById('umStatusFilter');
  const umTotalPill   = document.getElementById('umTotalPill');
  const umTableBody   = document.getElementById('umTableBody');
  const umNoResults   = document.getElementById('umNoResults');
  const createUserBtn = document.getElementById('createUserBtn');

  /* ============================================
     STAT CARDS
     ============================================ */
  function renderStats() {
    const staffUsers = allUsers.filter(u => !u.roles.includes('parent'));
    const parents    = allUsers.filter(u =>  u.roles.includes('parent'));
    const teachers   = allUsers.filter(u =>
      u.roles.includes('class_teacher') || u.roles.includes('subject_teacher'));
    const admins     = allUsers.filter(u => u.roles.includes('ict_admin'));

    document.getElementById('umStats').innerHTML = `
      <div class="um-stat s-total">
        <span class="um-stat-num">${allUsers.length}</span>
        <div class="um-stat-label">Total Accounts</div>
      </div>
      <div class="um-stat s-ict">
        <span class="um-stat-num">${admins.length}</span>
        <div class="um-stat-label">Administrators</div>
      </div>
      <div class="um-stat s-teacher">
        <span class="um-stat-num">${teachers.length}</span>
        <div class="um-stat-label">Teachers</div>
      </div>
      <div class="um-stat s-parent">
        <span class="um-stat-num">${parents.length}</span>
        <div class="um-stat-label">Parents</div>
      </div>
      <div class="um-stat s-head">
        <span class="um-stat-num">${allUsers.filter(u=>u.status==='active').length}</span>
        <div class="um-stat-label">Active Accounts</div>
      </div>
    `;
  }

  /* ============================================
     MAIN TABLE
     ============================================ */
  function render() {
    const search     = umSearch.value.trim().toLowerCase();
    const roleF      = umRoleFilter.value;
    const statusF    = umStatusFilter.value;

    const filtered = allUsers.filter(u => {
      const matchSearch = !search ||
        u.full_name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        (u.staff_id || '').toLowerCase().includes(search);
      const matchRole = roleF === 'all' ||
        (u.roles ? u.roles.includes(roleF) : u.role === roleF);
      const matchStatus = statusF === 'all' || u.status === statusF;
      return matchSearch && matchRole && matchStatus;
    });

    umTotalPill.textContent = `${filtered.length} of ${allUsers.length} accounts`;

    if (filtered.length === 0) {
      umTableBody.innerHTML = '';
      umNoResults.style.display = 'block';
      return;
    }
    umNoResults.style.display = 'none';

    umTableBody.innerHTML = filtered.map(user => {
      const initials = user.full_name.split(' ').map(p=>p[0]).join('').substring(0,2).toUpperCase();
      const isParent = user.roles.includes('parent');
      const primaryRole = user.primary_role || user.role;

      // Role label — show dual role if applicable
      let roleLabel = roleLabels[primaryRole] || primaryRole;
      if (user.roles.includes('class_teacher') && user.roles.includes('subject_teacher')) {
        roleLabel = 'Form & Subject Teacher';
      } else if (user.roles.includes('ict_admin') && user.roles.includes('subject_teacher')) {
        roleLabel = 'ICT Admin + Teacher';
      }

      const loginTime = user.last_login
        ? new Date(user.last_login).toLocaleString('en-NG', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
        : 'Never';

      return `
        <tr>
          <td>
            <div class="um-user-cell">
              <div class="um-avatar">${initials}</div>
              <div>
                <div class="um-user-name">${user.full_name}</div>
                <div class="um-user-email">${user.email}</div>
              </div>
            </div>
          </td>
          <td><span class="um-role-badge role-${primaryRole}">${roleLabel}</span></td>
          <td style="font-size:0.75rem;color:#6b7280">${user.staff_id || '—'}</td>
          <td style="font-size:0.75rem;color:#6b7280">${loginTime}</td>
          <td><span class="um-status ${user.status}">${user.status}</span></td>
          <td>
            <div class="um-actions">
              <button class="um-action-btn um-btn-view" data-id="${user.id}" data-action="view">View</button>
              ${!isParent ? `<button class="um-action-btn um-btn-edit" data-id="${user.id}" data-action="edit">Edit</button>` : ''}
              ${!isParent ? `<button class="um-action-btn um-btn-reset" data-id="${user.id}" data-action="reset">Reset Pwd</button>` : ''}
              ${!isParent
                ? user.status === 'active'
                  ? `<button class="um-action-btn um-btn-deact" data-id="${user.id}" data-action="deactivate">Deactivate</button>`
                  : `<button class="um-action-btn um-btn-react" data-id="${user.id}" data-action="reactivate">Reactivate</button>`
                : '<span style="font-size:0.72rem;color:#9ca3af">Read-only</span>'
              }
            </div>
          </td>
        </tr>`;
    }).join('');

    // Wire action buttons
    umTableBody.querySelectorAll('.um-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = allUsers.find(u => u.id === btn.dataset.id);
        if (!user) return;
        const action = btn.dataset.action;
        if (action === 'view')       openViewModal(user);
        if (action === 'edit')       openEditModal(user);
        if (action === 'reset')      openResetModal(user);
        if (action === 'deactivate') openDeactModal(user, false);
        if (action === 'reactivate') openDeactModal(user, true);
      });
    });
  }

  /* ============================================
     VIEW MODAL
     ============================================ */
  let viewingUser = null;

  function openViewModal(user) {
    viewingUser = user;
    const body = document.getElementById('viewModalBody');

    const classes  = (user.linked_classes  || []).join(', ') || '—';
    const subjects = (user.linked_subjects || []).join(', ') || '—';
    let roleLabel  = roleLabels[user.primary_role || user.role] || user.primary_role;
    if (user.roles.includes('class_teacher') && user.roles.includes('subject_teacher')) {
      roleLabel = 'Form & Subject Teacher';
    }

    const initials = user.full_name.split(' ').map(p=>p[0]).join('').substring(0,2).toUpperCase();

    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f3f4f6">
        <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#1d4ed8,#6366f1);color:#fff;font-weight:700;font-size:1.1rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">${initials}</div>
        <div>
          <div style="font-family:var(--font-heading);font-size:1.05rem;font-weight:700;color:#111827">${user.full_name}</div>
          <div style="font-size:0.78rem;color:#6b7280">${user.job_title || roleLabel}</div>
          <span class="um-status ${user.status}" style="margin-top:4px;display:inline-flex">${user.status}</span>
        </div>
      </div>
      <div class="um-detail-grid">
        <div class="um-detail-item">
          <div class="um-detail-label">Staff ID</div>
          <div class="um-detail-value">${user.staff_id || '—'}</div>
        </div>
        <div class="um-detail-item">
          <div class="um-detail-label">Role</div>
          <div class="um-detail-value"><span class="um-role-badge role-${user.primary_role || user.role}">${roleLabel}</span></div>
        </div>
        <div class="um-detail-item um-full" style="grid-column:1/-1">
          <div class="um-detail-label">Login Email</div>
          <div class="um-detail-value email">${user.email}</div>
        </div>
        <div class="um-detail-item" style="grid-column:1/-1">
          <div class="um-detail-label">Assigned Classes</div>
          <div class="um-detail-value" style="font-weight:400;font-size:0.82rem;color:#374151">${classes}</div>
        </div>
        <div class="um-detail-item" style="grid-column:1/-1">
          <div class="um-detail-label">Assigned Subjects</div>
          <div class="um-detail-value" style="font-weight:400;font-size:0.82rem;color:#374151">${subjects}</div>
        </div>
        ${user.form_class ? `<div class="um-detail-item" style="grid-column:1/-1">
          <div class="um-detail-label">Form Class (reviews)</div>
          <div class="um-detail-value">${user.form_class}</div>
        </div>` : ''}
        <div class="um-detail-item">
          <div class="um-detail-label">Last Login</div>
          <div class="um-detail-value" style="font-weight:400;font-size:0.82rem">${user.last_login ? new Date(user.last_login).toLocaleString('en-NG') : 'Never'}</div>
        </div>
        <div class="um-detail-item">
          <div class="um-detail-label">Account Created</div>
          <div class="um-detail-value" style="font-weight:400;font-size:0.82rem">${user.date_joined || '—'}</div>
        </div>
      </div>
    `;

    document.getElementById('viewModal').classList.add('open');
  }

  document.getElementById('viewModalClose').addEventListener('click', () => {
    document.getElementById('viewModal').classList.remove('open');
  });
  document.getElementById('viewModalCloseBtn').addEventListener('click', () => {
    document.getElementById('viewModal').classList.remove('open');
  });
  document.getElementById('viewModalEditBtn').addEventListener('click', () => {
    document.getElementById('viewModal').classList.remove('open');
    if (viewingUser) openEditModal(viewingUser);
  });

  /* ============================================
     CREATE / EDIT MODAL
     ============================================ */
  let editingUser = null; // null = create mode

  // Build class + subject checkboxes
  function buildCheckboxes() {
    const classBox = document.getElementById('fClassesCheckboxes');
    const subBox   = document.getElementById('fSubjectsCheckboxes');
    const formSel  = document.getElementById('fFormClass');

    classBox.innerHTML = allClasses.map(c => `
      <label class="um-checkbox-row" style="padding:5px 8px;font-size:0.78rem">
        <input type="checkbox" name="fClass" value="${c}"> ${c}
      </label>`).join('');

    subBox.innerHTML = allSubjects.map(s => `
      <label class="um-checkbox-row" style="padding:5px 8px;font-size:0.78rem">
        <input type="checkbox" name="fSubject" value="${s.name}"> ${s.name}
      </label>`).join('');

    // Form class dropdown
    formSel.innerHTML = '<option value="">— Select —</option>' +
      allClasses.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  function getChecked(name) {
    return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
  }

  function setChecked(name, values) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(i => {
      i.checked = values.includes(i.value);
    });
  }

  // Auto-generate email from name
  document.getElementById('fFullName').addEventListener('input', e => {
    if (editingUser) return; // don't override in edit mode
    const parts = e.target.value.trim().toLowerCase().split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0].replace(/[^a-z]/g,'');
      const last  = parts[parts.length-1].replace(/[^a-z]/g,'');
      document.getElementById('fEmail').value = `${first}.${last}@royalcrystalacademy.edu.ng`;
    }
  });

  // Show/hide fields based on role
  document.getElementById('fPrimaryRole').addEventListener('change', e => {
    const role = e.target.value;
    const isTeacher = ['class_teacher','subject_teacher'].includes(role);
    document.getElementById('alsoFormTeacherGroup').style.display =
      role === 'subject_teacher' ? 'block' : 'none';
    document.getElementById('fClassesGroup').style.display  = isTeacher ? 'block' : 'none';
    document.getElementById('fSubjectsGroup').style.display = isTeacher ? 'block' : 'none';
    updateFormClassVisibility();
  });

  document.getElementById('fAlsoFormTeacher').addEventListener('change', updateFormClassVisibility);

  function updateFormClassVisibility() {
    const role  = document.getElementById('fPrimaryRole').value;
    const also  = document.getElementById('fAlsoFormTeacher').checked;
    const show  = role === 'class_teacher' || (role === 'subject_teacher' && also);
    document.getElementById('fFormClassGroup').style.display = show ? 'block' : 'none';
  }

  // Password generator
  document.getElementById('generatePwdBtn').addEventListener('click', () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    document.getElementById('fPassword').value = pwd;
  });

  function openCreateModal() {
    editingUser = null;
    document.getElementById('modalTitle').textContent = 'Create New Account';
    document.getElementById('modalSaveBtn').textContent = 'Create Account';
    document.getElementById('modalAlert').style.display = 'none';
    document.getElementById('fPasswordGroup').style.display = 'block';

    // Clear all fields
    ['fFullName','fEmail','fJobTitle','fPassword'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('fPrimaryRole').value = '';
    document.getElementById('fAlsoFormTeacher').checked = false;
    document.getElementById('fFormClass').value = '';

    // Hide conditional sections
    ['alsoFormTeacherGroup','fClassesGroup','fSubjectsGroup','fFormClassGroup'].forEach(id => {
      document.getElementById(id).style.display = 'none';
    });

    // Uncheck all boxes
    document.querySelectorAll('input[name="fClass"], input[name="fSubject"]').forEach(i => i.checked = false);

    document.getElementById('createEditModal').classList.add('open');
  }

  function openEditModal(user) {
    editingUser = user;
    document.getElementById('modalTitle').textContent = 'Edit Account — ' + user.full_name;
    document.getElementById('modalSaveBtn').textContent = 'Save Changes';
    document.getElementById('modalAlert').style.display = 'none';
    document.getElementById('fPasswordGroup').style.display = 'none';

    // Fill fields
    document.getElementById('fFullName').value  = user.full_name;
    document.getElementById('fEmail').value     = user.email;
    document.getElementById('fJobTitle').value  = user.job_title || '';

    const primaryRole = user.primary_role || user.role;
    document.getElementById('fPrimaryRole').value = primaryRole;

    const isSubjectOnly = user.roles.includes('subject_teacher') && !user.roles.includes('class_teacher');
    const isFormAlso    = user.roles.includes('subject_teacher') && user.roles.includes('class_teacher');

    document.getElementById('alsoFormTeacherGroup').style.display =
      primaryRole === 'subject_teacher' ? 'block' : 'none';
    document.getElementById('fAlsoFormTeacher').checked = isFormAlso;

    const isTeacher = ['class_teacher','subject_teacher'].includes(primaryRole);
    document.getElementById('fClassesGroup').style.display  = isTeacher ? 'block' : 'none';
    document.getElementById('fSubjectsGroup').style.display = isTeacher ? 'block' : 'none';

    setChecked('fClass',   user.linked_classes  || []);
    setChecked('fSubject', user.linked_subjects || []);

    const showForm = primaryRole === 'class_teacher' || isFormAlso;
    document.getElementById('fFormClassGroup').style.display = showForm ? 'block' : 'none';
    document.getElementById('fFormClass').value = user.form_class || '';

    document.getElementById('createEditModal').classList.add('open');
  }

  // Save (create or edit)
  document.getElementById('modalSaveBtn').addEventListener('click', () => {
    const alertEl = document.getElementById('modalAlert');
    alertEl.style.display = 'none';

    const fullName    = document.getElementById('fFullName').value.trim();
    const email       = document.getElementById('fEmail').value.trim().toLowerCase();
    const jobTitle    = document.getElementById('fJobTitle').value.trim();
    const primaryRole = document.getElementById('fPrimaryRole').value;
    const alsoForm    = document.getElementById('fAlsoFormTeacher').checked;
    const formClass   = document.getElementById('fFormClass').value;
    const classes     = getChecked('fClass');
    const subjects    = getChecked('fSubject');
    const password    = document.getElementById('fPassword').value.trim();

    // Validate
    if (!fullName) { showModalAlert('Please enter the full name.', 'error'); return; }
    if (!email || !email.includes('@')) { showModalAlert('Please enter a valid email address.', 'error'); return; }
    if (!primaryRole) { showModalAlert('Please select a role.', 'error'); return; }
    if (!editingUser && !password) { showModalAlert('Please set a temporary password.', 'error'); return; }

    // Check email uniqueness
    const emailTaken = allUsers.find(u =>
      u.email.toLowerCase() === email && (!editingUser || u.id !== editingUser.id));
    if (emailTaken) { showModalAlert('That email is already used by another account.', 'error'); return; }

    // Build roles array
    let roles = [primaryRole];
    if (primaryRole === 'subject_teacher' && alsoForm) roles = ['class_teacher','subject_teacher'];
    if (primaryRole === 'class_teacher') roles = ['class_teacher'];

    if (editingUser) {
      // UPDATE existing
      editingUser.full_name      = fullName;
      editingUser.email          = email;
      editingUser.job_title      = jobTitle || null;
      editingUser.roles          = roles;
      editingUser.primary_role   = primaryRole;
      editingUser.role           = primaryRole;
      editingUser.linked_classes = classes;
      editingUser.linked_subjects= subjects;
      editingUser.form_class     = formClass || null;

      log('Account updated', fullName);
    if (window.RCA) window.RCA.save('users');
      showModalAlert('Account updated successfully.', 'success');
      setTimeout(() => {
        document.getElementById('createEditModal').classList.remove('open');
        render();
        renderStats();
        refreshCredentials();
      }, 1200);

    } else {
      // CREATE new
      const nameParts = fullName.toLowerCase().split(/\s+/);
      const newUser = {
        id:              `staff-${Date.now()}`,
        full_name:       fullName,
        email,
        password_hash:   password,  // Phase 1 plain; Phase 4 hashed server-side
        roles,
        primary_role:    primaryRole,
        role:            primaryRole,
        staff_id:        `RCA-STF-${String(allUsers.filter(u=>!u.roles.includes('parent')).length+1).padStart(3,'0')}`,
        job_title:       jobTitle || roleLabels[primaryRole],
        status:          'active',
        last_login:      null,
        linked_classes:  classes,
        linked_subjects: subjects,
        form_class:      formClass || null,
        date_joined:     new Date().toISOString().split('T')[0],
        note:            null
      };

      allUsers.push(newUser);
      if (window.RCA) window.RCA.save('users');
      log('Account created', fullName);

      // Show success with the login details
      showModalAlert(
        `✅ Account created for <strong>${fullName}</strong><br>
         Email: <code>${email}</code><br>
         Temp password: <code>${password}</code><br>
         <em>Share these login details with the teacher.</em>`,
        'success'
      );

      setTimeout(() => {
        document.getElementById('createEditModal').classList.remove('open');
        render();
        renderStats();
        refreshCredentials();
      }, 2500);
    }
  });

  function showModalAlert(msg, type) {
    const el = document.getElementById('modalAlert');
    el.className = `um-alert ${type}`;
    el.innerHTML = msg;
    el.style.display = 'flex';
  }

  /* ============================================
     RESET PASSWORD MODAL
     ============================================ */
  let resetTargetUser = null;

  function openResetModal(user) {
    resetTargetUser = user;
    document.getElementById('resetModalBody').innerHTML = `
      <p style="font-size:0.875rem;color:#374151;margin-bottom:16px">
        Generate a new temporary password for <strong>${user.full_name}</strong>.<br>
        Their current password will be replaced immediately.
      </p>
      <div style="background:#f8fafc;border-radius:8px;padding:12px 14px;font-size:0.8rem;color:#6b7280">
        Login email: <strong style="color:#1d4ed8">${user.email}</strong>
      </div>
    `;
    document.getElementById('resetModal').classList.add('open');
  }

  document.getElementById('resetModalClose').addEventListener('click', () => {
    document.getElementById('resetModal').classList.remove('open');
  });
  document.getElementById('resetModalCancelBtn').addEventListener('click', () => {
    document.getElementById('resetModal').classList.remove('open');
  });

  document.getElementById('resetConfirmBtn').addEventListener('click', () => {
    if (!resetTargetUser) return;

    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
    let newPwd = '';
    for (let i = 0; i < 10; i++) newPwd += chars[Math.floor(Math.random() * chars.length)];
    resetTargetUser.password_hash = newPwd;
    if (window.RCA) window.RCA.save('users');

    log('Password reset', resetTargetUser.full_name);

    document.getElementById('resetModalBody').innerHTML = `
      <p style="font-size:0.875rem;color:#065f46;margin-bottom:12px">✅ Password reset successfully.</p>
      <div class="um-new-password">
        <div class="um-new-password-label">New Temporary Password</div>
        <div class="um-new-password-val">${newPwd}</div>
        <div style="font-size:0.72rem;color:#6b7280">Share this with <strong>${resetTargetUser.full_name}</strong> privately. They should change it after first login.</div>
      </div>
      <div style="margin-top:12px;font-size:0.78rem;color:#6b7280">Login email: <strong style="color:#1d4ed8">${resetTargetUser.email}</strong></div>
    `;
    document.getElementById('resetConfirmBtn').style.display = 'none';
    document.getElementById('resetModalCancelBtn').textContent = 'Close';
  });

  /* ============================================
     DEACTIVATE / REACTIVATE MODAL
     ============================================ */
  let deactTargetUser = null;
  let deactIsReactivate = false;

  function openDeactModal(user, isReactivate) {
    deactTargetUser = user;
    deactIsReactivate = isReactivate;

    const title = isReactivate ? 'Reactivate Account' : 'Deactivate Account';
    const msg = isReactivate
      ? `Reactivate <strong>${user.full_name}</strong>'s account? They will be able to log in again immediately.`
      : `Deactivate <strong>${user.full_name}</strong>'s account?<br><br>
         <small style="color:#6b7280">Their data and history are preserved. You can reactivate this account at any time. They will not be able to log in while deactivated.</small>`;

    document.getElementById('deactModalTitle').textContent = title;
    document.getElementById('deactModalBody').innerHTML = `<p style="font-size:0.875rem;color:#374151;line-height:1.6">${msg}</p>`;
    document.getElementById('deactConfirmBtn').textContent = isReactivate ? 'Yes, Reactivate' : 'Yes, Deactivate';
    document.getElementById('deactConfirmBtn').className = `btn ${isReactivate ? 'btn-primary' : 'btn-danger'}`;
    document.getElementById('deactModal').classList.add('open');
  }

  document.getElementById('deactModalClose').addEventListener('click', () => {
    document.getElementById('deactModal').classList.remove('open');
  });
  document.getElementById('deactCancelBtn').addEventListener('click', () => {
    document.getElementById('deactModal').classList.remove('open');
  });

  document.getElementById('deactConfirmBtn').addEventListener('click', () => {
    if (!deactTargetUser) return;
    deactTargetUser.status = deactIsReactivate ? 'active' : 'deactivated';
    log(deactIsReactivate ? 'Account reactivated' : 'Account deactivated', deactTargetUser.full_name);
    document.getElementById('deactModal').classList.remove('open');
    render();
    renderStats();
    refreshCredentials();
  });

  /* ---- Close modals on overlay click ---- */
  ['createEditModal','viewModal','resetModal','deactModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target.id === id) document.getElementById(id).classList.remove('open');
    });
  });

  // Close buttons
  document.getElementById('modalClose').addEventListener('click', () =>
    document.getElementById('createEditModal').classList.remove('open'));
  document.getElementById('modalCancelBtn').addEventListener('click', () =>
    document.getElementById('createEditModal').classList.remove('open'));

  /* ============================================
     CREDENTIALS TABLE (ICT Admin only)
     ============================================ */
  function refreshCredentials() {
    const credSection = document.getElementById('credentialsSection');
    const credBody    = document.getElementById('credentialsBody');
    if (!credSection || !credBody) return;

    const curUser  = window.CURRENT_USER;
    const curRoles = curUser ? (curUser.roles || [curUser.role]) : [];
    if (!curRoles.includes('ict_admin')) return;

    credSection.style.display = 'block';

    const staffUsers = allUsers
      .filter(u => !u.roles.includes('parent'))
      .sort((a,b) => {
        const P = ['ict_admin','head_teacher','accountant','class_teacher','subject_teacher'];
        const pa = P.indexOf(a.primary_role || a.role);
        const pb = P.indexOf(b.primary_role || b.role);
        return pa !== pb ? pa - pb : a.full_name.localeCompare(b.full_name);
      });

    const STATUS_COLORS = {
      active:      'color:#065f46;background:#d1fae5',
      deactivated: 'color:#991b1b;background:#fee2e2',
      suspended:   'color:#92400e;background:#fef3c7'
    };

    credBody.innerHTML = staffUsers.map(u => {
      let roleLabel = roleLabels[u.primary_role || u.role] || u.primary_role;
      if (u.roles.includes('class_teacher') && u.roles.includes('subject_teacher')) roleLabel = 'Form & Subject Teacher';
      if (u.roles.includes('ict_admin') && u.roles.includes('subject_teacher')) roleLabel = 'ICT Admin + Teacher';
      return `<tr>
        <td style="font-size:0.72rem;color:#6b7280">${u.staff_id||'—'}</td>
        <td style="font-weight:600">${u.full_name}</td>
        <td style="font-size:0.75rem;color:#6b7280">${u.job_title || roleLabel}</td>
        <td><code style="background:#f3f4f6;padding:2px 7px;border-radius:4px;font-size:0.78rem;color:#1d4ed8">${u.email}</code></td>
        <td><span style="padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:700;${STATUS_COLORS[u.status]||''}">${u.status}</span></td>
      </tr>`;
    }).join('');
  }

  /* ============================================
     INITIALIZE
     ============================================ */
  buildCheckboxes();
  renderStats();
  render();
  refreshCredentials();

  createUserBtn.addEventListener('click', openCreateModal);
  umSearch.addEventListener('input', render);
  umRoleFilter.addEventListener('change', render);
  umStatusFilter.addEventListener('change', render);

  // Phase 4: load real users from API
  if (window.RCA_API) {
    window.RCA_API.getUsers().then(apiUsers => {
      if (apiUsers && apiUsers.length > 0) {
        // Merge API users with localStorage users
        // API users take priority — update matching records
        apiUsers.forEach(apiUser => {
          const idx = allUsers.findIndex(u => u.email === apiUser.email);
          if (idx >= 0) {
            allUsers[idx] = { ...allUsers[idx], ...apiUser };
          } else {
            allUsers.push(apiUser);
          }
        });
        renderStats();
        render();
        refreshCredentials();
      }
    }).catch(e => console.warn('Could not load users from API:', e.message));
  }

});
