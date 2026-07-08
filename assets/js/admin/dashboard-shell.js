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
  }

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

});
