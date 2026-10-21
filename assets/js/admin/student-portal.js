/* ============================================
   STUDENT PORTAL — student-portal.js
   ============================================
   Retired. Pupils don't have their own accounts; parents see results,
   fees and report cards in the Parent Portal (real data from the school
   server). This page used to read sample data, so it now just sends
   anyone who opens it to the right place.
*/
(function () {
  const role = sessionStorage.getItem('rca_demo_role');
  window.location.replace(role === 'parent' ? 'parent-portal.html' : role ? 'dashboard.html' : '../parent-login.html');
})();
