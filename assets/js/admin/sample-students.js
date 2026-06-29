/* ============================================
   STUDENTS DATA — sample-students.js
   Royal Crystal Academy
   ============================================
   Phase 4: Real students are stored in the PostgreSQL
   database and loaded via the API (api.js).

   This file now provides:
   - SCHOOL_CLASSES list (always needed for dropdowns)
   - Empty SAMPLE_STUDENTS array (real data comes from API/localStorage)

   The localstorage.js file will populate window.SAMPLE_STUDENTS
   from localStorage if data exists there, or keep it empty
   for a fresh start.
*/

(function () {

  window.SCHOOL_CLASSES = [
    'Pre-Nursery 1',
    'Pre-Nursery 2',
    'Nursery 1',
    'Nursery 2',
    'Nursery 3',
    'Basic 1A',
    'Basic 1B',
    'Basic 2',
    'Basic 3',
    'Basic 4',
    'Basic 5',
    'Basic 6'
  ];

  // Start empty — real students come from database via API
  // localstorage.js will restore any students already saved locally
  if (!window.SAMPLE_STUDENTS) {
    window.SAMPLE_STUDENTS = [];
  }

})();
