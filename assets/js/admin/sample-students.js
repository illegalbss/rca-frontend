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

  // Seed students — used as initial data on any fresh browser load.
  // localstorage.js will prefer saved localStorage data if it exists.
  window.SAMPLE_STUDENTS_SEED = [

    /* ===== BASIC 4 ===== */
    { id:'RCA/2026/0093', admission_no:'RCA/2026/0093', first_name:'AGU',          last_name:'WISDOM MAKUOCHUKWU',        full_name:'AGU WISDOM MAKUOCHUKWU',          gender:'male',   class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0094', admission_no:'RCA/2026/0094', first_name:'ANYACHOKIE',   last_name:'NELSON CHIDIOMIMI',         full_name:'ANYACHOKIE NELSON CHIDIOMIMI',     gender:'male',   class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0095', admission_no:'RCA/2026/0095', first_name:'CHUKWUEMEKA',  last_name:'KEN-DESTINY CHUKWUEMERIE',  full_name:'CHUKWUEMEKA KEN-DESTINY CHUKWUEMERIE', gender:'male', class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0096', admission_no:'RCA/2026/0096', first_name:'NNAJI',        last_name:'CHISIMDI JESSE',            full_name:'NNAJI CHISIMDI JESSE',             gender:'male',   class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0097', admission_no:'RCA/2026/0097', first_name:'OKECHUKWU',    last_name:'ONYEDIKACHI NOEL',          full_name:'OKECHUKWU ONYEDIKACHI NOEL',       gender:'male',   class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0098', admission_no:'RCA/2026/0098', first_name:'OKPLALA',      last_name:'BETHEL CHINEDU',            full_name:'OKPLALA BETHEL CHINEDU',           gender:'male',   class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0104', admission_no:'RCA/2026/0104', first_name:'CHUKWUEMEKA',  last_name:'IFECHUKWU ELVIS',           full_name:'CHUKWUEMEKA IFECHUKWU ELVIS',      gender:'male',   class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0105', admission_no:'RCA/2026/0105', first_name:'NWAIJE',       last_name:'DOMINION CHIDIEBUBE',       full_name:'NWAIJE DOMINION CHIDIEBUBE',       gender:'male',   class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0107', admission_no:'RCA/2026/0107', first_name:'NWACHUKWU',    last_name:'MMESOMA CASILDA',           full_name:'NWACHUKWU MMESOMA CASILDA',        gender:'male',   class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0109', admission_no:'RCA/2026/0109', first_name:'OBI',          last_name:'JOSHUA CHIMDINDU',          full_name:'OBI JOSHUA CHIMDINDU',             gender:'male',   class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0099', admission_no:'RCA/2026/0099', first_name:'AMAEFULA',     last_name:'SUCCESS CHIMUANYA',         full_name:'AMAEFULA SUCCESS CHIMUANYA',       gender:'female', class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0100', admission_no:'RCA/2026/0100', first_name:'OLLUAH',       last_name:'OZIOMA AGATHA',             full_name:'OLLUAH OZIOMA AGATHA',             gender:'female', class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0101', admission_no:'RCA/2026/0101', first_name:'ONWUZURIKE',   last_name:'CHIDIOMIMI',                full_name:'ONWUZURIKE CHIDIOMIMI',            gender:'female', class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0102', admission_no:'RCA/2026/0102', first_name:'UGODU',        last_name:'ROSEMARY CHINECHEREM',      full_name:'UGODU ROSEMARY CHINECHEREM',       gender:'female', class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0103', admission_no:'RCA/2026/0103', first_name:'UMEH',         last_name:'BLESSING OLUEBUBE',         full_name:'UMEH BLESSING OLUEBUBE',           gender:'female', class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0106', admission_no:'RCA/2026/0106', first_name:'CHINEKWEZE',   last_name:'MARY-FAVOUR OSINACHI',      full_name:'CHINEKWEZE MARY-FAVOUR OSINACHI',  gender:'female', class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0108', admission_no:'RCA/2026/0108', first_name:'PETERS',       last_name:'PEACE CHIDIOMIMI',          full_name:'PETERS PEACE CHIDIOMIMI',          gender:'female', class_name:'Basic 4', date_of_birth:null, parent_phone:null, status:'active' },

  ];

  if (!window.SAMPLE_STUDENTS) {
    window.SAMPLE_STUDENTS = [];
  }

})();
