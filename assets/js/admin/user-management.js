/* ============================================
   USER MANAGEMENT — user-management.js
   Royal Crystal Academy
   ============================================
   Single source of truth for both the main staff/parent account table
   (create/edit/reset-password/deactivate — all via the real users API)
   and the parent-account-linking section below it.
*/

document.addEventListener('DOMContentLoaded', async () => {

  const allClasses  = window.SCHOOL_CLASSES  || [];
  // Combined + deduplicated so a teacher assigned to both a Basic and a
  // Nursery class can be given subjects from either curriculum here.
  const allSubjects = window.ALL_SUBJECTS_COMBINED || window.SCHOOL_SUBJECTS || [];

  const cu       = window.CURRENT_USER;
  const cuRoles  = cu ? (cu.roles || [cu.role || cu.primary_role || '']) : [];
  const isIctAdmin = cuRoles.includes('ict_admin');
  // Head Teacher can add new staff accounts and deactivate/reactivate
  // ("remove") them, matching POST/DELETE /api/users on the backend —
  // but editing details or resetting a password stays ICT Admin-only.
  const canManageAccounts = isIctAdmin || cuRoles.includes('head_teacher');

  const ROLE_LABELS = {
    ict_admin: 'ICT Administrator', head_teacher: 'Head Teacher',
    class_teacher: 'Form Teacher', subject_teacher: 'Subject Teacher',
    accountant: 'Accountant', parent: 'Parent'
  };

  let allUsers        = [];
  let allRealStudents  = [];
  let allRealParents   = [];
  let editingUserId    = null; // null while creating
  let addParentSelected = new Set(); // child admission_nos checked in the Add Parent modal, kept alive across search filtering
  let linkChildSelected = new Set(); // same, for the Link Child modal

  /* ============================================================
     MAIN USER TABLE (staff + parents)
     ============================================================ */
  async function loadUsers() {
    allUsers = (await window.RCA_API.getUsers({ status: 'all' })) || [];
  }

  function getFilteredUsers() {
    const term   = (document.getElementById('umSearch')?.value || '').trim().toLowerCase();
    const role   = document.getElementById('umRoleFilter')?.value || 'all';
    const status = document.getElementById('umStatusFilter')?.value || 'all';
    return allUsers.filter(u => {
      if (role !== 'all' && u.primary_role !== role) return false;
      if (status !== 'all' && u.status !== status) return false;
      if (term) {
        const hay = `${u.full_name} ${u.email} ${u.staff_id || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }

  function renderStats() {
    const el = document.getElementById('umStats');
    if (!el) return;
    const counts = { ict: 0, head: 0, teacher: 0, parent: 0, total: allUsers.length };
    allUsers.forEach(u => {
      if (u.primary_role === 'ict_admin') counts.ict++;
      else if (u.primary_role === 'head_teacher') counts.head++;
      else if (u.primary_role === 'class_teacher' || u.primary_role === 'subject_teacher') counts.teacher++;
      else if (u.primary_role === 'parent') counts.parent++;
    });
    el.innerHTML = `
      <div class="um-stat s-ict"><span class="um-stat-num">${counts.ict}</span><span class="um-stat-label">ICT Admins</span></div>
      <div class="um-stat s-head"><span class="um-stat-num">${counts.head}</span><span class="um-stat-label">Head Teachers</span></div>
      <div class="um-stat s-teacher"><span class="um-stat-num">${counts.teacher}</span><span class="um-stat-label">Teachers</span></div>
      <div class="um-stat s-parent"><span class="um-stat-num">${counts.parent}</span><span class="um-stat-label">Parents</span></div>
      <div class="um-stat s-total"><span class="um-stat-num">${counts.total}</span><span class="um-stat-label">Total Accounts</span></div>
    `;
  }

  function renderUserTable() {
    const tbody     = document.getElementById('umTableBody');
    const noResults = document.getElementById('umNoResults');
    const pill      = document.getElementById('umTotalPill');
    if (!tbody) return;

    const filtered = getFilteredUsers();
    if (pill) pill.textContent = `${filtered.length} account${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (noResults) noResults.style.display = 'block';
      return;
    }
    if (noResults) noResults.style.display = 'none';

    tbody.innerHTML = filtered.map(u => `
      <tr>
        <td><strong>${u.full_name}</strong><div style="font-size:0.75rem;color:#6b7280">${u.email}</div></td>
        <td>${ROLE_LABELS[u.primary_role] || u.primary_role}</td>
        <td>${u.staff_id || '—'}</td>
        <td>—</td>
        <td><span class="um-status ${u.status}">${u.status}</span></td>
        <td><div class="um-actions">
          <button class="um-action-btn um-btn-view" onclick="UM.view(${u.id})">View</button>
          ${isIctAdmin ? `<button class="um-action-btn um-btn-edit" onclick="UM.edit(${u.id})">Edit</button>` : ''}
          ${isIctAdmin && u.primary_role !== 'parent' ? `<button class="um-action-btn um-btn-reset" onclick="UM.resetPassword(${u.id})">Reset PW</button>` : ''}
          ${isIctAdmin ? `<button class="um-action-btn" onclick="linkChildModal(${u.id})" title="Link one of their children — e.g. a teacher who is also a parent, viewable from their own login">+ Link Child</button>` : ''}
          ${canManageAccounts ? `<button class="um-action-btn ${u.status === 'active' ? 'um-btn-deact' : 'um-btn-react'}" onclick="UM.toggleStatus(${u.id})">${u.status === 'active' ? 'Deactivate' : 'Activate'}</button>` : ''}
        </div></td>
      </tr>
    `).join('');
  }

  function renderCredentials() {
    const body = document.getElementById('credentialsBody');
    if (!body) return;
    const staff = allUsers.filter(u => u.primary_role !== 'parent');
    body.innerHTML = staff.map(u => `
      <tr>
        <td>${u.staff_id || '—'}</td>
        <td>${u.full_name}</td>
        <td>${u.job_title || ROLE_LABELS[u.primary_role] || ''}</td>
        <td>${u.email}</td>
        <td>${u.status}</td>
      </tr>
    `).join('');
  }

  function renderParentCredentials() {
    const body = document.getElementById('parentCredentialsBody');
    if (!body) return;
    body.innerHTML = allRealParents.map(p => {
      const children = p.children || [];
      const childrenText = children.length
        ? children.map(c => `${c.full_name} (${c.class_name})`).join(', ')
        : '—';
      return `
        <tr>
          <td>${p.full_name}</td>
          <td>${p.email}</td>
          <td>${p.phone || '—'}</td>
          <td>${childrenText}</td>
          <td>${p.status}</td>
        </tr>`;
    }).join('');
  }

  async function refreshAll() {
    await loadUsers();
    renderStats();
    renderUserTable();
    renderCredentials();
  }

  ['umSearch', 'umRoleFilter', 'umStatusFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(id === 'umSearch' ? 'input' : 'change', renderUserTable);
  });

  const credToggle = document.getElementById('umCredentialsToggleBtn');
  if (credToggle) {
    credToggle.addEventListener('click', () => {
      const section = document.getElementById('credentialsSection');
      if (section) section.style.display = section.style.display === 'none' ? 'block' : 'none';
    });
  }

  const parentCredToggle = document.getElementById('umParentCredentialsToggleBtn');
  if (parentCredToggle) {
    parentCredToggle.addEventListener('click', () => {
      const section = document.getElementById('parentCredentialsSection');
      if (section) section.style.display = section.style.display === 'none' ? 'block' : 'none';
    });
  }

  // Printing whichever .um-cred-section happened to be toggled open was
  // fragile — if both the staff and parent sections were ever open at
  // once (or neither), the print output wouldn't reliably match what was
  // clicked. This forces exactly the requested section visible and every
  // other .um-cred-section hidden for the print, then restores whatever
  // was on screen before once the print dialog closes.
  window.printCredSection = function (sectionId) {
    document.querySelectorAll('.um-cred-section').forEach(el => {
      el.dataset.prevDisplay = el.style.display;
      el.style.display = (el.id === sectionId) ? 'block' : 'none';
    });
    const restore = () => {
      document.querySelectorAll('.um-cred-section').forEach(el => {
        el.style.display = el.dataset.prevDisplay || 'none';
      });
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  /* ============================================================
     CREATE / EDIT MODAL
     ============================================================ */
  function randomPassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  }

  function populateClassCheckboxes(containerId, checked) {
    const box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = allClasses.map(c => `
      <label style="display:flex;align-items:center;gap:6px;font-size:0.8rem;cursor:pointer">
        <input type="checkbox" value="${c}" ${checked.includes(c) ? 'checked' : ''}> ${c}
      </label>`).join('');
  }

  function populateSubjectCheckboxes(containerId, checked) {
    const box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = allSubjects.map(s => `
      <label style="display:flex;align-items:center;gap:6px;font-size:0.8rem;cursor:pointer">
        <input type="checkbox" value="${s.id}" ${checked.includes(s.id) ? 'checked' : ''}> ${s.name}
      </label>`).join('');
  }

  function populateFormClassSelect(selected) {
    const sel = document.getElementById('fFormClass');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select form class —</option>' +
      allClasses.map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
  }

  function updateRoleFieldVisibility(role, alsoFormTeacher) {
    const classesGroup   = document.getElementById('fClassesGroup');
    const subjectsGroup  = document.getElementById('fSubjectsGroup');
    const formClassGroup = document.getElementById('fFormClassGroup');
    const alsoFTGroup    = document.getElementById('alsoFormTeacherGroup');

    const isClassTeacher   = role === 'class_teacher';
    const isSubjectTeacher = role === 'subject_teacher';

    if (classesGroup)  classesGroup.style.display  = isSubjectTeacher ? 'block' : 'none';
    if (subjectsGroup) subjectsGroup.style.display = (isClassTeacher || isSubjectTeacher) ? 'block' : 'none';
    if (alsoFTGroup)   alsoFTGroup.style.display    = isSubjectTeacher ? 'block' : 'none';
    if (formClassGroup) formClassGroup.style.display =
      (isClassTeacher || (isSubjectTeacher && alsoFormTeacher)) ? 'block' : 'none';
  }

  function autoGenerateEmail(fullName) {
    const parts = fullName.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    const first = parts[0].replace(/[^a-z]/g, '');
    const last  = parts[parts.length - 1].replace(/[^a-z]/g, '');
    return `${first}.${last}@royalcrystalacademy.edu.ng`;
  }

  function openCreateModal() {
    editingUserId = null;
    document.getElementById('modalTitle').textContent = 'Create New Account';
    document.getElementById('modalSaveBtn').textContent = 'Create Account';
    document.getElementById('modalAlert').style.display = 'none';

    document.getElementById('fFullName').value  = '';
    document.getElementById('fPrimaryRole').value = '';
    document.getElementById('fEmail').value     = '';
    document.getElementById('fEmail').dataset.dirty = '';
    document.getElementById('fJobTitle').value  = '';
    document.getElementById('fPhone').value     = '';
    document.getElementById('fAlsoFormTeacher').checked = false;
    // Default to the same shared default every parent account gets
    // (RCA@2026!) rather than a random string — a random password that
    // isn't reliably written down/relayed leaves the account stuck with
    // a password nobody actually knows. Admins can still hit "Generate"
    // for a random one if they specifically want that instead.
    document.getElementById('fPassword').value  = 'RCA@2026!';
    document.getElementById('fPasswordGroup').style.display = 'block';

    populateClassCheckboxes('fClassesCheckboxes', []);
    populateSubjectCheckboxes('fSubjectsCheckboxes', []);
    populateFormClassSelect('');
    updateRoleFieldVisibility('', false);

    document.getElementById('createEditModal').classList.add('open');
  }

  function openEditModal(userId) {
    const u = allUsers.find(x => x.id === userId);
    if (!u) return;
    editingUserId = userId;

    document.getElementById('modalTitle').textContent = 'Edit Account';
    document.getElementById('modalSaveBtn').textContent = 'Save Changes';
    document.getElementById('modalAlert').style.display = 'none';

    document.getElementById('fFullName').value    = u.full_name || '';
    document.getElementById('fPrimaryRole').value = u.primary_role || '';
    document.getElementById('fEmail').value       = u.email || '';
    document.getElementById('fEmail').dataset.dirty = '1';
    document.getElementById('fJobTitle').value    = u.job_title || '';
    document.getElementById('fPhone').value       = u.phone || '';
    document.getElementById('fPasswordGroup').style.display = 'none'; // reset via its own flow

    const linkedClasses  = u.linked_classes  || [];
    const linkedSubjects = u.linked_subjects || [];
    const formClass = linkedClasses[0] || '';
    const alsoFT = u.primary_role === 'subject_teacher' && !!formClass;
    document.getElementById('fAlsoFormTeacher').checked = alsoFT;

    populateClassCheckboxes('fClassesCheckboxes', linkedClasses);
    populateSubjectCheckboxes('fSubjectsCheckboxes', linkedSubjects);
    populateFormClassSelect(formClass);
    updateRoleFieldVisibility(u.primary_role, alsoFT);

    document.getElementById('createEditModal').classList.add('open');
  }

  document.getElementById('fPrimaryRole')?.addEventListener('change', e => {
    updateRoleFieldVisibility(e.target.value, document.getElementById('fAlsoFormTeacher').checked);
  });
  document.getElementById('fAlsoFormTeacher')?.addEventListener('change', e => {
    updateRoleFieldVisibility(document.getElementById('fPrimaryRole').value, e.target.checked);
  });
  document.getElementById('fFullName')?.addEventListener('input', e => {
    const emailEl = document.getElementById('fEmail');
    if (emailEl && !emailEl.dataset.dirty) emailEl.value = autoGenerateEmail(e.target.value);
  });
  document.getElementById('fEmail')?.addEventListener('input', e => { e.target.dataset.dirty = '1'; });
  document.getElementById('generatePwdBtn')?.addEventListener('click', () => {
    document.getElementById('fPassword').value = randomPassword();
  });

  function closeCreateEditModal() {
    document.getElementById('createEditModal').classList.remove('open');
  }
  document.getElementById('modalClose')?.addEventListener('click', closeCreateEditModal);
  document.getElementById('modalCancelBtn')?.addEventListener('click', closeCreateEditModal);
  document.getElementById('createEditModal')?.addEventListener('click', e => {
    if (e.target.id === 'createEditModal') closeCreateEditModal();
  });

  document.getElementById('modalSaveBtn')?.addEventListener('click', async () => {
    const fullName = document.getElementById('fFullName').value.trim();
    const role     = document.getElementById('fPrimaryRole').value;
    const email    = document.getElementById('fEmail').value.trim();
    const jobTitle = document.getElementById('fJobTitle').value.trim();
    const phone    = document.getElementById('fPhone').value.trim();
    const password = document.getElementById('fPassword').value.trim();
    const alertEl  = document.getElementById('modalAlert');

    if (!fullName || !role || !email || (!editingUserId && !password)) {
      alertEl.textContent = 'Please fill in full name, role, email' + (!editingUserId ? ' and password' : '') + '.';
      alertEl.style.cssText = 'display:block;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:0.82rem';
      return;
    }

    let linkedClasses = [];
    let linkedSubjects = [];
    if (role === 'class_teacher') {
      const formClass = document.getElementById('fFormClass').value;
      if (formClass) linkedClasses = [formClass];
      linkedSubjects = [...document.querySelectorAll('#fSubjectsCheckboxes input:checked')].map(i => i.value);
    } else if (role === 'subject_teacher') {
      linkedClasses  = [...document.querySelectorAll('#fClassesCheckboxes input:checked')].map(i => i.value);
      linkedSubjects = [...document.querySelectorAll('#fSubjectsCheckboxes input:checked')].map(i => i.value);
      if (document.getElementById('fAlsoFormTeacher').checked) {
        const formClass = document.getElementById('fFormClass').value;
        if (formClass) linkedClasses = [formClass, ...linkedClasses.filter(c => c !== formClass)];
      }
    }

    const saveBtn = document.getElementById('modalSaveBtn');
    saveBtn.disabled = true;

    try {
      if (editingUserId) {
        await window.RCA_API.updateUser(editingUserId, {
          full_name: fullName, email, job_title: jobTitle, phone, primary_role: role,
          linked_classes: linkedClasses, linked_subjects: linkedSubjects
        });
      } else {
        await window.RCA_API.createUser({
          full_name: fullName, email, job_title: jobTitle, phone, primary_role: role, password,
          linked_classes: linkedClasses, linked_subjects: linkedSubjects
        });
      }
    } catch (e) {
      saveBtn.disabled = false;
      alertEl.textContent = 'Could not save: ' + e.message;
      alertEl.style.cssText = 'display:block;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:0.82rem';
      return;
    }

    saveBtn.disabled = false;
    const wasCreating = !editingUserId;
    closeCreateEditModal();
    await refreshAll();

    // Surface the login credentials on creation (same as the Add Parent
    // flow) so the password actually gets relayed instead of silently
    // vanishing once the modal closes — this is exactly what left several
    // teacher accounts unreachable (a random password shown once, never
    // written down, with no confirmation to catch it).
    if (wasCreating) {
      const toast = document.createElement('div');
      toast.textContent = `✅ Account created for ${fullName}. Login: ${email} / ${password}`;
      toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#059669;color:#fff;padding:14px 20px;border-radius:10px;z-index:9999;font-size:0.85rem;font-weight:600;max-width:400px;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 8000);
    }
  });

  document.getElementById('createUserBtn')?.addEventListener('click', openCreateModal);

  /* ============================================================
     VIEW MODAL
     ============================================================ */
  function openViewModal(userId) {
    const u = allUsers.find(x => x.id === userId);
    if (!u) return;
    const body = document.getElementById('viewModalBody');
    const rows = [
      ['Full Name', u.full_name], ['Email', u.email], ['Phone', u.phone || '—'],
      ['Role', ROLE_LABELS[u.primary_role] || u.primary_role], ['Job Title', u.job_title || '—'],
      ['Staff ID', u.staff_id || '—'], ['Status', u.status],
      ['Assigned Classes', (u.linked_classes || []).join(', ') || '—'],
      ['Assigned Subjects', (u.linked_subjects || []).join(', ') || '—'],
    ];
    body.innerHTML = `<div style="display:flex;flex-direction:column;gap:2px">${rows.map(([l, v]) =>
      `<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:0.85rem">
         <span style="color:#6b7280">${l}</span><span style="color:#111827;font-weight:600;text-align:right">${v}</span>
       </div>`
    ).join('')}</div>`;

    document.getElementById('viewModalEditBtn').style.display = isIctAdmin ? 'inline-flex' : 'none';
    document.getElementById('viewModalEditBtn').onclick = () => {
      closeViewModal();
      openEditModal(userId);
    };
    document.getElementById('viewModal').classList.add('open');
  }
  function closeViewModal() { document.getElementById('viewModal').classList.remove('open'); }
  document.getElementById('viewModalClose')?.addEventListener('click', closeViewModal);
  document.getElementById('viewModalCloseBtn')?.addEventListener('click', closeViewModal);
  document.getElementById('viewModal')?.addEventListener('click', e => {
    if (e.target.id === 'viewModal') closeViewModal();
  });

  /* ============================================================
     RESET PASSWORD MODAL
     ============================================================ */
  let resetUserId = null;
  function openResetModal(userId) {
    resetUserId = userId;
    const u = allUsers.find(x => x.id === userId);
    document.getElementById('resetModalBody').innerHTML =
      `<p style="font-size:0.85rem;color:#374151">Generate a new temporary password for <strong>${u?.full_name || ''}</strong>? They will need it to log in next.</p>`;
    document.getElementById('resetModal').classList.add('open');
  }
  function closeResetModal() { document.getElementById('resetModal').classList.remove('open'); }
  document.getElementById('resetModalClose')?.addEventListener('click', closeResetModal);
  document.getElementById('resetModalCancelBtn')?.addEventListener('click', closeResetModal);

  document.getElementById('resetConfirmBtn')?.addEventListener('click', async () => {
    if (!resetUserId) return;
    const btn = document.getElementById('resetConfirmBtn');
    btn.disabled = true;
    try {
      const result = await window.RCA_API.resetPassword(resetUserId);
      document.getElementById('resetModalBody').innerHTML =
        `<p style="font-size:0.85rem;color:#065f46;background:#d1fae5;border:1px solid #6ee7b7;border-radius:8px;padding:12px">
           ✅ New password: <strong>${result.temp_password}</strong><br>
           <span style="font-size:0.78rem">Share this with ${result.email} securely.</span>
         </p>`;
      btn.style.display = 'none';
    } catch (e) {
      document.getElementById('resetModalBody').innerHTML = `<p style="color:#dc2626;font-size:0.85rem">Could not reset password: ${e.message}</p>`;
    }
    btn.disabled = false;
  });
  document.getElementById('resetModal')?.addEventListener('click', e => {
    if (e.target.id === 'resetModal') { closeResetModal(); document.getElementById('resetConfirmBtn').style.display = 'inline-flex'; }
  });

  /* ============================================================
     DEACTIVATE / ACTIVATE MODAL
     ============================================================ */
  let deactUserId = null;
  function openDeactModal(userId) {
    deactUserId = userId;
    const u = allUsers.find(x => x.id === userId);
    if (!u) return;
    const activating = u.status !== 'active';
    document.getElementById('deactModalTitle').textContent = activating ? 'Activate Account' : 'Deactivate Account';
    document.getElementById('deactModalBody').innerHTML =
      `<p style="font-size:0.85rem;color:#374151">${activating ? 'Reactivate' : 'Deactivate'} <strong>${u.full_name}</strong>'s account? ${activating ? 'They will be able to log in again.' : 'They will not be able to log in until reactivated.'}</p>`;
    document.getElementById('deactConfirmBtn').textContent = activating ? 'Activate' : 'Deactivate';
    document.getElementById('deactModal').classList.add('open');
  }
  function closeDeactModal() { document.getElementById('deactModal').classList.remove('open'); }
  document.getElementById('deactModalClose')?.addEventListener('click', closeDeactModal);
  document.getElementById('deactCancelBtn')?.addEventListener('click', closeDeactModal);
  document.getElementById('deactModal')?.addEventListener('click', e => {
    if (e.target.id === 'deactModal') closeDeactModal();
  });

  document.getElementById('deactConfirmBtn')?.addEventListener('click', async () => {
    if (!deactUserId) return;
    const u = allUsers.find(x => x.id === deactUserId);
    if (!u) return;
    const newStatus = u.status === 'active' ? 'deactivated' : 'active';
    const btn = document.getElementById('deactConfirmBtn');
    btn.disabled = true;
    try {
      await window.RCA_API.updateUser(deactUserId, { status: newStatus });
    } catch (e) {
      alert('Could not update status: ' + e.message);
      btn.disabled = false;
      return;
    }
    btn.disabled = false;
    closeDeactModal();
    await refreshAll();
  });

  /* Exposed for row-button onclick handlers */
  window.UM = {
    view: openViewModal,
    edit: openEditModal,
    resetPassword: openResetModal,
    toggleStatus: openDeactModal
  };

  /* ============================================================
     PARENT ACCOUNTS SECTION
     ============================================================ */
  async function renderParents() {
    const list = document.getElementById('parentsList');
    if (!list || !window.RCA_API) return;

    list.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;text-align:center;padding:20px">Loading…</p>';

    try {
      const data = await window.RCA_API.call('/users/parents');
      allRealParents = data.parents || [];
    } catch (e) {
      list.innerHTML = `<p style="color:#dc2626;font-size:0.85rem;text-align:center;padding:20px">Could not load parents: ${e.message}</p>`;
      return;
    }

    renderParentCredentials();

    if (allRealParents.length === 0) {
      list.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;text-align:center;padding:20px">No parent accounts yet. Click + Add Parent Account to create one.</p>';
      return;
    }

    list.innerHTML = allRealParents.map(p => {
      const children = p.children || [];
      return `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <strong style="font-size:0.9rem;color:#111">${p.full_name}</strong>
          <span style="display:block;font-size:0.78rem;color:#6b7280">${p.email} • ${p.phone || 'No phone'}</span>
          <span style="display:block;font-size:0.75rem;color:#1d4ed8;margin-top:4px">
            ${children.length > 0 ? '👦 ' + children.map(c => c.full_name + ' (' + c.class_name + ')').join(', ') : '⚠ No children linked yet'}
          </span>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="UM.edit(${p.id})" style="padding:6px 12px;background:#f3f4f6;color:#374151;border:none;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer">Edit</button>
          <button onclick="linkChildModal(${p.id})" style="padding:6px 12px;background:#dbeafe;color:#1d4ed8;border:none;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer">+ Link Child</button>
          <button onclick="deleteParent(${p.id})" style="padding:6px 12px;background:#fef2f2;color:#dc2626;border:none;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer">Delete</button>
        </div>
      </div>`;
    }).join('');
  }

  async function loadRealStudents() {
    if (!window.RCA_API) return [];
    try {
      const data = await window.RCA_API.call('/students');
      return data.students || [];
    } catch (e) {
      console.warn('Could not load students:', e.message);
      return [];
    }
  }

  // checkedAdmNos is a Set, kept alive across re-renders (e.g. as the
  // search box filters the list) so a selection made while searching
  // "Chidi" isn't lost the moment the box is cleared and "Amaka" is
  // typed instead — a parent can pay for/be linked to children who
  // don't share their surname or search visibility.
  function renderStudentCheckboxes(containerId, students, checkedAdmNos) {
    const active = students.filter(s => s.status !== 'archived' && s.status !== 'inactive');
    const box = document.getElementById(containerId);
    box.innerHTML = active.length
      ? active.map(s => `
          <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;font-size:0.82rem">
            <input type="checkbox" value="${s.admission_no}" ${checkedAdmNos.has(s.admission_no) ? 'checked' : ''} style="width:16px;height:16px">
            ${s.full_name} — ${s.class_name}
          </label>`).join('')
      : '<p style="color:#9ca3af;font-size:0.82rem;padding:4px">No matching students</p>';
  }

  window.showAddParentModal = async function() {
    const modal = document.getElementById('addParentModal');
    modal.classList.add('open');
    ['par_name', 'par_email', 'par_phone'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('par_password').value = 'RCA@2026!';
    document.getElementById('parentModalAlert').style.display = 'none';

    allRealStudents = await loadRealStudents();
    addParentSelected = new Set();
    renderStudentCheckboxes('studentCheckboxes', allRealStudents, addParentSelected);

    const checkboxBox = document.getElementById('studentCheckboxes');
    checkboxBox.onchange = (e) => {
      if (!e.target.matches('input[type="checkbox"]')) return;
      if (e.target.checked) addParentSelected.add(e.target.value);
      else addParentSelected.delete(e.target.value);
    };

    const searchBox = document.getElementById('parentStudentSearch');
    if (searchBox) {
      searchBox.value = '';
      searchBox.oninput = () => {
        const q = searchBox.value.trim().toLowerCase();
        const filtered = allRealStudents.filter(s => s.full_name.toLowerCase().includes(q));
        renderStudentCheckboxes('studentCheckboxes', filtered, addParentSelected);
      };
    }
  };

  window.closeParentModal = function() {
    document.getElementById('addParentModal').classList.remove('open');
  };

  window.submitAddParent = async function() {
    const name  = document.getElementById('par_name').value.trim();
    const email = document.getElementById('par_email').value.trim();
    const phone = document.getElementById('par_phone').value.trim();
    const pass  = document.getElementById('par_password').value.trim();
    const alertEl = document.getElementById('parentModalAlert');

    if (!name || !email || !phone) {
      alertEl.textContent = 'Please fill in name, email and phone.';
      alertEl.style.display = 'block';
      return;
    }

    const checked = [...addParentSelected];

    try {
      await window.RCA_API.call('/users', {
        method: 'POST',
        body: { full_name: name, email, phone, password: pass, primary_role: 'parent', linked_children: checked }
      });
    } catch (e) {
      alertEl.textContent = 'Could not create account: ' + e.message;
      alertEl.style.display = 'block';
      return;
    }

    window.closeParentModal();
    renderParents();
    await refreshAll();

    const toast = document.createElement('div');
    toast.textContent = `✅ Parent account created for ${name}. Login: ${email} / ${pass}`;
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#059669;color:#fff;padding:14px 20px;border-radius:10px;z-index:9999;font-size:0.85rem;font-weight:600;max-width:400px;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  };

  window.linkChildModal = async function(parentId) {
    if (allRealStudents.length === 0) allRealStudents = await loadRealStudents();
    // Works for any account, not just parent-role ones — a teacher who
    // is also a parent gets their child linked to their EXISTING staff
    // login (one account, both roles) rather than a second account
    // sharing the same email, which login can't reliably tell apart.
    const p = allRealParents.find(p => p.id === parentId) || allUsers.find(u => u.id === parentId);
    const linkedAdmNos = (p?.children || p?.linked_children || []).map(c => c.admission_no || c);

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:400px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="margin-bottom:12px;color:var(--color-primary);font-size:1rem">Link Child to ${p?.full_name}</h3>
        <input type="text" id="linkChildSearch" class="form-control" placeholder="Search by name…" style="margin-bottom:10px">
        <div id="linkChildCheckboxes" style="max-height:250px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:16px"></div>
        <div style="display:flex;gap:10px">
          <button onclick="this.closest('[style*=fixed]').remove()" class="btn btn-outline" style="flex:1">Cancel</button>
          <button onclick="saveLinkedChildren(${parentId}, this)" class="btn btn-primary" style="flex:1">Save</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    linkChildSelected = new Set(linkedAdmNos);
    renderStudentCheckboxes('linkChildCheckboxes', allRealStudents, linkChildSelected);

    const checkboxBox = modal.querySelector('#linkChildCheckboxes');
    checkboxBox.onchange = (e) => {
      if (!e.target.matches('input[type="checkbox"]')) return;
      if (e.target.checked) linkChildSelected.add(e.target.value);
      else linkChildSelected.delete(e.target.value);
    };

    const searchBox = modal.querySelector('#linkChildSearch');
    searchBox.oninput = () => {
      const q = searchBox.value.trim().toLowerCase();
      const filtered = allRealStudents.filter(s => s.full_name.toLowerCase().includes(q));
      renderStudentCheckboxes('linkChildCheckboxes', filtered, linkChildSelected);
    };
  };

  window.saveLinkedChildren = async function(parentId, btn) {
    const modal = btn.closest('[style*="fixed"]');
    const checked = [...linkChildSelected];

    try {
      await window.RCA_API.call(`/users/${parentId}`, { method: 'PUT', body: { linked_children: checked } });
    } catch (e) {
      alert('Could not save: ' + e.message);
      return;
    }

    modal.remove();
    renderParents();
    await refreshAll();
  };

  window.deleteParent = async function(parentId) {
    if (!confirm('Delete this parent account?')) return;
    try {
      await window.RCA_API.call(`/users/${parentId}`, { method: 'DELETE' });
    } catch (e) {
      alert('Could not delete: ' + e.message);
      return;
    }
    renderParents();
    await refreshAll();
  };

  document.getElementById('addParentModal')?.addEventListener('click', function(e) {
    if (e.target === this) window.closeParentModal();
  });

  /* ============================================================
     INIT
     ============================================================ */
  if (!canManageAccounts) {
    const createBtn = document.getElementById('createUserBtn');
    if (createBtn) createBtn.style.display = 'none';
    const addParentBtn = document.querySelector('[onclick="showAddParentModal()"]');
    if (addParentBtn) addParentBtn.style.display = 'none';
  }

  await refreshAll();
  renderParents();
});
