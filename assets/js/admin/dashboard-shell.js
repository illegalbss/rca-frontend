/* ============================================
   EARLY CURRENT_USER — set synchronously so other scripts
   (score-entry.js, attendance.js etc.) can read it on load
   ============================================ */
(function setCurrentUserEarly() {
  try {
    const stored = sessionStorage.getItem('rca_user_data');
    if (stored) {
      const u = JSON.parse(stored);
      if (!u.roles) u.roles = [u.role || u.primary_role];
      if (!u.primary_role) u.primary_role = u.role;
      window.CURRENT_USER = u;
    }
  } catch(e) {}
})();

/* ============================================
   DASHBOARD SHELL — dashboard-shell.js
   ============================================
   Runs on EVERY admin page. Five jobs:
   1. Require a logged-in session - redirect to login if missing
   2. Toggle the mobile sidebar open/closed
   3. Hide sidebar links the logged-in role shouldn't see
   4. Hide section labels with no visible links underneath
   5. Display the logged-in user's name, role badge, and avatar

   This file is shared identically across every admin page - exactly
   like main.js is shared across every public page. Depends on
   window.SAMPLE_USERS (from sample-users.js) being loaded first,
   since we look up the FULL user record (not just the role) so
   pages like Score Entry can filter by linked_classes/linked_subjects.
*/

document.addEventListener('DOMContentLoaded', () => {

  /* --------------------------------------------
     1. REQUIRE LOGIN (DEMO ROUTE GUARD)
     -------------------------------------------- 
     If nobody is logged in (no role saved in sessionStorage),
     send them to the login page instead of showing a broken
     dashboard with no data. This is the SAME idea a real backend
     route guard implements server-side in Phase 4 - here it's
     just a client-side redirect, which is NOT real security (a
     person could still open dev tools and fake the sessionStorage
     value), but it gives every page correct DEMO behaviour.
  */
  const currentRole = sessionStorage.getItem('rca_demo_role');

  if (!currentRole) {
    window.location.href = 'login.html';
    return; // stop running the rest of this script
  }

  // Prefer window.CURRENT_USER as already set by the early IIFE above from
  // sessionStorage's rca_user_data (the real login payload — e.g. a parent
  // account's linked_children). A real account won't exist in the hardcoded
  // SAMPLE_USERS demo fixture, so falling straight to that lookup would
  // silently replace the real record with an incomplete one.
  const currentUserId = sessionStorage.getItem('rca_user_id');
  const allUsers = window.SAMPLE_USERS || [];
  const currentUser = window.CURRENT_USER || allUsers.find(u => u.id === currentUserId) || {
    roles: [currentRole],
    primary_role: currentRole,
    role: currentRole,
    full_name: sessionStorage.getItem('rca_demo_name') || 'User',
    email: sessionStorage.getItem('rca_demo_email') || ''
  };

  // Normalise: always ensure roles array exists (handles old sessionStorage shape)
  if (!currentUser.roles) {
    currentUser.roles = [currentUser.role || currentRole];
  }
  if (!currentUser.primary_role) {
    currentUser.primary_role = currentUser.role || currentRole;
  }

  // Expose the current user globally so OTHER scripts on this page
  // (e.g. score-entry.js) can read window.CURRENT_USER without each
  // one re-implementing this sessionStorage lookup themselves.
  window.CURRENT_USER = currentUser;

  // Auto-log login once per session (flag set by login.js before redirect)
  if (sessionStorage.getItem('rca_log_login') === '1') {
    sessionStorage.removeItem('rca_log_login');
    if (window.logActivity) {
      window.logActivity('login', 'Admin portal', 'login');
    }
  }

  /* --------------------------------------------
     2. MOBILE SIDEBAR TOGGLE
     -------------------------------------------- */
  const sidebar = document.getElementById('adminSidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  /* --------------------------------------------
     3. ROLE-BASED SIDEBAR VISIBILITY
     -------------------------------------------- 
     Each sidebar link has a data-roles attribute, e.g.
     data-roles="ict_admin,head_teacher" or data-roles="all".
     The SIX RBAC roles from the spec: ict_admin, head_teacher,
     class_teacher, subject_teacher, parent, student - plus
     accountant, kept for the Finance module.
  */
  const roleLabels = window.RBAC_ROLE_LABELS || {
    ict_admin: 'ICT Administrator',
    head_teacher: 'Head Teacher',
    class_teacher: 'Form Teacher',
    subject_teacher: 'Subject Teacher',
    accountant: 'Accountant',
    parent: 'Parent'
  };

  // userRoles: the array of roles this user has (e.g. ['class_teacher','subject_teacher'])
  const userRoles = currentUser.roles || [currentRole];

  document.querySelectorAll('.sidebar-link[data-roles]').forEach(link => {
    const allowedRoles = link.getAttribute('data-roles').split(',');
    if (allowedRoles.includes('all')) return;
    // Link is visible if ANY of the user's roles is in the allowed list
    const hasAccess = userRoles.some(r => allowedRoles.includes(r));
    if (!hasAccess) {
      link.classList.add('role-hidden');
    }
  });

  /* --------------------------------------------
     3b. "MY CHILD" LINK FOR STAFF WHO ARE ALSO PARENTS
     --------------------------------------------
     A teacher (or any staff member) with a child at the school gets
     their child linked directly to this SAME account (via User
     Management's "+ Link Child", any role) rather than a second
     account sharing their email — which the login page couldn't tell
     apart from their staff account anyway. This link is how they
     actually reach that child's info from their normal staff login.
     Inserted dynamically (not static per-page HTML) since it only
     applies to the subset of accounts with linked_children set.
  */
  if ((currentUser.linked_children || []).length > 0 && !window.location.pathname.endsWith('parent-portal.html')) {
    const nav = document.querySelector('.sidebar-nav');
    const dashboardLink = nav?.querySelector('.sidebar-link');
    if (dashboardLink) {
      dashboardLink.insertAdjacentHTML('afterend',
        '<a href="parent-portal.html" class="sidebar-link"><i class="icon">👨‍👩‍👧</i> My Child\'s Portal</a>'
      );
    }
  }

  /* --------------------------------------------
     4. HIDE SECTION LABELS WITH NO VISIBLE LINKS
     -------------------------------------------- */
  const sectionLabels = document.querySelectorAll('.sidebar-section-label');

  sectionLabels.forEach(label => {
    let sibling = label.nextElementSibling;
    let hasVisibleLink = false;

    while (sibling && !sibling.classList.contains('sidebar-section-label')) {
      if (sibling.classList.contains('sidebar-link') && !sibling.classList.contains('role-hidden')) {
        hasVisibleLink = true;
      }
      sibling = sibling.nextElementSibling;
    }

    label.style.display = hasVisibleLink ? '' : 'none';
  });

  /* --------------------------------------------
     5. DISPLAY USER NAME + ROLE BADGE + AVATAR
     -------------------------------------------- */
  const roleBadge  = document.getElementById('userRoleBadge');
  const avatar      = document.getElementById('userAvatar');
  const welcomeMsg  = document.getElementById('welcomeMessage');

  let roleLabel;
  if (userRoles.includes('class_teacher') && userRoles.includes('subject_teacher')) {
    roleLabel = 'Form & Subject Teacher';
  } else {
    roleLabel = roleLabels[currentUser.primary_role || currentRole] || currentRole;
  }

  const initials = currentUser.full_name
    .split(' ').map(p => p.charAt(0)).join('').substring(0, 2).toUpperCase();

  if (roleBadge) roleBadge.textContent = roleLabel;

  if (avatar) {
    // Show school badge logo instead of initials
    avatar.innerHTML = '<img src="../assets/images/logo.png" alt="RCA" style="width:40px;height:40px;object-fit:contain;border-radius:6px;background:#fff;padding:2px;">';
    avatar.title = currentUser.full_name;
    avatar.style.background = 'transparent';
    avatar.style.padding = '0';
  }

  if (welcomeMsg) {
    welcomeMsg.textContent = `Welcome back, ${currentUser.full_name}!`;
  }

  // Populate sidebar profile block
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const sidebarName   = document.getElementById('sidebarName');
  const sidebarRole   = document.getElementById('sidebarRole');

  if (sidebarAvatar) {
    // Sidebar shows initials in color circle
    sidebarAvatar.textContent = initials;
  }
  if (sidebarName)   sidebarName.textContent   = currentUser.full_name;
  if (sidebarRole)   sidebarRole.textContent   = roleLabel;

  /* --------------------------------------------
     6. ICT ENROLLMENT PENDING-APPLICATIONS BADGE
     --------------------------------------------
     In-app notification for new "Enroll Now" submissions from the
     public ICT Department page — no email/SMS provider is configured,
     so a badge next to the sidebar link (visible on every admin page)
     plus the Activity Logs entry (see ictEnrollments.js) are it.
  */
  if (window.RCA_API && (userRoles.includes('ict_admin') || userRoles.includes('head_teacher'))) {
    window.RCA_API.call('/ict-enrollments')
      .then(data => {
        const badge = document.getElementById('ictEnrollBadge');
        if (!badge) return;
        const count = data.pending_count || 0;
        if (count > 0) { badge.textContent = count; badge.style.display = ''; }
        else badge.style.display = 'none';
      })
      .catch(() => {});

    window.RCA_API.call('/applications')
      .then(data => {
        const badge = document.getElementById('applicationsBadge');
        if (!badge) return;
        const count = data.pending_count || 0;
        if (count > 0) { badge.textContent = count; badge.style.display = ''; }
        else badge.style.display = 'none';
      })
      .catch(() => {});

    window.RCA_API.call('/contact')
      .then(data => {
        const badge = document.getElementById('contactBadge');
        if (!badge) return;
        const count = data.unread_count || 0;
        if (count > 0) { badge.textContent = count; badge.style.display = ''; }
        else badge.style.display = 'none';
      })
      .catch(() => {});
  }

  /* --------------------------------------------
     6b. TOPBAR NOTIFICATIONS BELL
     --------------------------------------------
     Every admin page has a static bell icon (.topbar-bell) with a
     hardcoded "4" badge and no click behaviour — wire it to the real
     /notifications endpoint here since this file is the one thing
     shared identically across all 27 admin pages. The dropdown panel
     is built and positioned via JS (fixed, anchored to the bell's own
     bounding rect) rather than relying on page-specific topbar markup.
  */
  (function setupNotificationBell() {
    const bellBtn = document.querySelector('.topbar-bell');
    if (!bellBtn || !window.RCA_API) return;

    let badge = bellBtn.querySelector('.topbar-bell-badge');
    let panel = null;
    let items = [];

    function timeAgo(dateStr) {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    }

    function setBadge(count) {
      if (!badge) return;
      if (count > 0) { badge.textContent = count > 9 ? '9+' : count; badge.style.display = 'flex'; }
      else badge.style.display = 'none';
    }

    function renderPanel() {
      if (!panel) return;
      const list = panel.querySelector('#notifBellList');
      list.innerHTML = items.length
        ? items.map(n => `
            <div class="notif-bell-item${n.is_read ? '' : ' unread'}" data-id="${n.id}" data-link="${n.link || ''}" style="padding:10px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;${n.is_read ? '' : 'background:#eff6ff;'}">
              <div style="font-size:0.82rem;font-weight:700;color:#111">${n.title}</div>
              ${n.message ? `<div style="font-size:0.78rem;color:#4b5563;margin-top:2px">${n.message}</div>` : ''}
              <div style="font-size:0.7rem;color:#9ca3af;margin-top:4px">${timeAgo(n.created_at)}</div>
            </div>`).join('')
        : '<p style="padding:20px;text-align:center;color:#9ca3af;font-size:0.82rem">No notifications yet.</p>';
    }

    function openPanel() {
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'notifBellPanel';
        panel.style.cssText = 'position:fixed;width:320px;max-width:90vw;max-height:420px;overflow-y:auto;background:#fff;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,0.18);z-index:3500;border:1px solid #e5e7eb';
        panel.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #f1f5f9">
            <strong style="font-size:0.85rem;color:#111">Notifications</strong>
            <button id="notifBellMarkAll" style="background:none;border:none;color:#1d4ed8;font-size:0.75rem;font-weight:600;cursor:pointer">Mark all read</button>
          </div>
          <div id="notifBellList"></div>`;
        document.body.appendChild(panel);

        panel.querySelector('#notifBellMarkAll').addEventListener('click', async () => {
          try {
            await window.RCA_API.markAllNotificationsRead();
            items = items.map(n => ({ ...n, is_read: true }));
            renderPanel();
            setBadge(0);
          } catch (e) {}
        });

        panel.addEventListener('click', async (e) => {
          const item = e.target.closest('.notif-bell-item');
          if (!item) return;
          const id = item.getAttribute('data-id');
          const link = item.getAttribute('data-link');
          const notifItem = items.find(n => String(n.id) === id);
          if (notifItem && !notifItem.is_read) {
            try {
              await window.RCA_API.markNotificationRead(id);
              notifItem.is_read = true;
              renderPanel();
              setBadge(items.filter(n => !n.is_read).length);
            } catch (e) {}
          }
          if (link) window.location.href = link;
        });

        document.addEventListener('click', (e) => {
          if (panel && panel.style.display !== 'none' && !panel.contains(e.target) && e.target !== bellBtn && !bellBtn.contains(e.target)) {
            panel.style.display = 'none';
          }
        });
      }

      const rect = bellBtn.getBoundingClientRect();
      panel.style.top = `${rect.bottom + 8}px`;
      let left = rect.right - 320;
      if (left < 8) left = 8;
      panel.style.left = `${left}px`;
      panel.style.display = panel.style.display === 'none' || !panel.style.display ? 'block' : 'none';
      if (panel.style.display === 'block') renderPanel();
    }

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPanel();
    });

    window.RCA_API.getNotifications()
      .then(data => {
        items = data.notifications || [];
        setBadge(data.unread_count || 0);
      })
      .catch(() => setBadge(0));
  })();

  /* --------------------------------------------
     LOGOUT
     -------------------------------------------- */
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('rca_user_id');
      sessionStorage.removeItem('rca_demo_role');
      sessionStorage.removeItem('rca_demo_email');
      sessionStorage.removeItem('rca_demo_name');
      sessionStorage.removeItem('rca_user_data');
      sessionStorage.removeItem('rca_token');
      // Call logout API if token exists
      const token = sessionStorage.getItem('rca_token');
      if (token && window.RCA_CONFIG) {
        fetch(window.RCA_CONFIG.API_URL + '/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
        }).catch(() => {});
      }
    });
  }

  /* --------------------------------------------
     7. CHANGE PASSWORD
     --------------------------------------------
     Every account is created (or reset) with the same shared
     password, RCA@2026! — this gives every logged-in user a way
     to set their own, from any admin page, without needing the
     ICT admin to do it for them. Injected as a sidebar link (right
     before Log out) plus a self-contained modal, since there's no
     shared page/partial to add a real settings page to without
     editing all 27 admin HTML files individually.
  */
  if (logoutBtn && !document.getElementById('changePasswordBtn')) {
    logoutBtn.insertAdjacentHTML('beforebegin',
      '<a href="#" class="sidebar-link" id="changePasswordBtn"><i class="icon">🔑</i> Change Password</a>'
    );

    const modalHtml = `
      <div id="changePasswordModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:none;align-items:center;justify-content:center;padding:20px">
        <div style="background:#fff;border-radius:16px;width:100%;max-width:380px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
          <h3 style="margin:0 0 14px;color:var(--color-primary,#1e3a5f);font-size:1rem">Change Password</h3>
          <div id="cpwAlert" style="display:none;background:#fef2f2;color:#dc2626;padding:8px 12px;border-radius:8px;font-size:0.8rem;margin-bottom:12px"></div>
          <label style="display:block;font-size:0.78rem;font-weight:600;color:#374151;margin-bottom:4px">Current Password</label>
          <input type="password" id="cpwCurrent" class="form-control" style="margin-bottom:12px;width:100%;box-sizing:border-box">
          <label style="display:block;font-size:0.78rem;font-weight:600;color:#374151;margin-bottom:4px">New Password</label>
          <input type="password" id="cpwNew" class="form-control" style="margin-bottom:4px;width:100%;box-sizing:border-box">
          <p style="font-size:0.72rem;color:#9ca3af;margin:0 0 12px">At least 8 characters.</p>
          <label style="display:block;font-size:0.78rem;font-weight:600;color:#374151;margin-bottom:4px">Confirm New Password</label>
          <input type="password" id="cpwConfirm" class="form-control" style="margin-bottom:16px;width:100%;box-sizing:border-box">
          <div style="display:flex;gap:10px">
            <button id="cpwCancelBtn" class="btn btn-outline" style="flex:1">Cancel</button>
            <button id="cpwSaveBtn" class="btn btn-primary" style="flex:1">Save</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const cpwModal   = document.getElementById('changePasswordModal');
    const cpwAlert   = document.getElementById('cpwAlert');
    const cpwSaveBtn = document.getElementById('cpwSaveBtn');

    function closeCpwModal() {
      cpwModal.style.display = 'none';
      cpwAlert.style.display = 'none';
      document.getElementById('cpwCurrent').value = '';
      document.getElementById('cpwNew').value = '';
      document.getElementById('cpwConfirm').value = '';
    }

    document.getElementById('changePasswordBtn').addEventListener('click', (e) => {
      e.preventDefault();
      cpwModal.style.display = 'flex';
    });
    document.getElementById('cpwCancelBtn').addEventListener('click', closeCpwModal);
    cpwModal.addEventListener('click', (e) => { if (e.target === cpwModal) closeCpwModal(); });

    cpwSaveBtn.addEventListener('click', async () => {
      const current = document.getElementById('cpwCurrent').value;
      const next    = document.getElementById('cpwNew').value;
      const confirm = document.getElementById('cpwConfirm').value;

      if (!current || !next || !confirm) {
        cpwAlert.textContent = 'Please fill in all fields.';
        cpwAlert.style.display = 'block';
        return;
      }
      if (next.length < 8) {
        cpwAlert.textContent = 'New password must be at least 8 characters.';
        cpwAlert.style.display = 'block';
        return;
      }
      if (next !== confirm) {
        cpwAlert.textContent = 'New password and confirmation do not match.';
        cpwAlert.style.display = 'block';
        return;
      }

      cpwSaveBtn.disabled = true;
      cpwSaveBtn.textContent = 'Saving…';
      try {
        await window.RCA_API.changePassword(current, next);
        closeCpwModal();
        alert('Password changed successfully. Use it next time you log in.');
      } catch (e) {
        cpwAlert.textContent = e.message || 'Could not change password.';
        cpwAlert.style.display = 'block';
      } finally {
        cpwSaveBtn.disabled = false;
        cpwSaveBtn.textContent = 'Save';
      }
    });
  }

});
