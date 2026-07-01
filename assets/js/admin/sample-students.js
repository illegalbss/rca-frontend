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

    /* ===== NURSERY 3 ===== */
    { id:'RCA/2026/0022', admission_no:'RCA/2026/0022', first_name:'HENRY',       last_name:'DOMINION CHINWAUBA',            full_name:'HENRY DOMINION CHINWAUBA',            gender:'male',   class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0024', admission_no:'RCA/2026/0024', first_name:'NWEDE',       last_name:'TOCHUKWU SHEDRACK',             full_name:'NWEDE TOCHUKWU SHEDRACK',             gender:'male',   class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0025', admission_no:'RCA/2026/0025', first_name:'OSSAI',       last_name:'EZENWA DAVID',                  full_name:'OSSAI EZENWA DAVID',                  gender:'male',   class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0026', admission_no:'RCA/2026/0026', first_name:'AGUEMEKA',    last_name:'AMBLESSED',                     full_name:'AGUEMEKA AMBLESSED',                  gender:'male',   class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0027', admission_no:'RCA/2026/0027', first_name:'EZE',         last_name:'CHIDIEBUBE MARTINS',            full_name:'EZE CHIDIEBUBE MARTINS',              gender:'male',   class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0028', admission_no:'RCA/2026/0028', first_name:'ENEH',        last_name:'NNAEMEKA MIRACLE',              full_name:'ENEH NNAEMEKA MIRACLE',               gender:'male',   class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0029', admission_no:'RCA/2026/0029', first_name:'IZUCHUKWU',   last_name:'KOSARACHI RECHAEL',             full_name:'IZUCHUKWU KOSARACHI RECHAEL',         gender:'female', class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0030', admission_no:'RCA/2026/0030', first_name:'ONYIA',       last_name:'DECLAN CHINAGOROM OSITA',       full_name:'ONYIA DECLAN CHINAGOROM OSITA',       gender:'male',   class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0031', admission_no:'RCA/2026/0031', first_name:'EZEAKU',      last_name:'MICHELLE CHIKWESIRI',           full_name:'EZEAKU MICHELLE CHIKWESIRI',          gender:'female', class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0032', admission_no:'RCA/2026/0032', first_name:'IKE',         last_name:'SOMMACHUKWU DEBORAH FAVOUR',    full_name:'IKE SOMMACHUKWU DEBORAH FAVOUR',      gender:'female', class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0033', admission_no:'RCA/2026/0033', first_name:'ILOH',        last_name:'REINA',                         full_name:'ILOH REINA',                          gender:'female', class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0034', admission_no:'RCA/2026/0034', first_name:'CHINAKWAEZE', last_name:'JENNIFER CHINENYENWA',          full_name:'CHINAKWAEZE JENNIFER CHINENYENWA',    gender:'female', class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0035', admission_no:'RCA/2026/0035', first_name:'IBEH',        last_name:'CHIDERA DEBORAH',               full_name:'IBEH CHIDERA DEBORAH',                gender:'female', class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0036', admission_no:'RCA/2026/0036', first_name:'ENEAGU',      last_name:'MIRABEL CHIBUSOMMA',            full_name:'ENEAGU MIRABEL CHIBUSOMMA',           gender:'female', class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0037', admission_no:'RCA/2026/0037', first_name:'NNAJI',       last_name:'CHIMDIUTO ANNABEL',             full_name:'NNAJI CHIMDIUTO ANNABEL',             gender:'female', class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0038', admission_no:'RCA/2026/0038', first_name:'UGODU',       last_name:'MUNACHIMSO GRATA',              full_name:'UGODU MUNACHIMSO GRATA',              gender:'female', class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0039', admission_no:'RCA/2026/0039', first_name:'IKEMEFUNA',   last_name:'CHISIMDI ESTHER',               full_name:'IKEMEFUNA CHISIMDI ESTHER',           gender:'female', class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0040', admission_no:'RCA/2026/0040', first_name:'AKOH',        last_name:'CHIBUEZE JOSHUA',               full_name:'AKOH CHIBUEZE JOSHUA',                gender:'male',   class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0041', admission_no:'RCA/2026/0041', first_name:'ODOH',        last_name:'CHIBUGO RAFAELLA',              full_name:'ODOH CHIBUGO RAFAELLA',               gender:'female', class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0042', admission_no:'RCA/2026/0042', first_name:'NWAGWU',      last_name:'BLESSING CHISIMDI',             full_name:'NWAGWU BLESSING CHISIMDI',            gender:'female', class_name:'Nursery 3', date_of_birth:null, parent_phone:null, status:'active' },

    /* ===== NURSERY 2 ===== */
    { id:'RCA/2026/0001', admission_no:'RCA/2026/0001', first_name:'CHINEDU',    last_name:'IFEAYINWA LIGHT',               full_name:'CHINEDU IFEAYINWA LIGHT',               gender:'male',   class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0002', admission_no:'RCA/2026/0002', first_name:'EZEAKU',     last_name:'UGOMSINACHI KIMBERELY',         full_name:'EZEAKU UGOMSINACHI KIMBERELY',          gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0003', admission_no:'RCA/2026/0003', first_name:'OFFOR',      last_name:'ADAEZE CHRISTABEL',             full_name:'OFFOR ADAEZE CHRISTABEL',               gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0004', admission_no:'RCA/2026/0004', first_name:'OKONKWO',    last_name:'IFECHUKWU FAVOUR',              full_name:'OKONKWO IFECHUKWU FAVOUR',              gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0005', admission_no:'RCA/2026/0005', first_name:'ARUA',       last_name:'CHINWEMERI VICTORIA',           full_name:'ARUA CHINWEMERI VICTORIA',              gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0006', admission_no:'RCA/2026/0006', first_name:'NWAFOR',     last_name:'CHIKEZIE',                      full_name:'NWAFOR CHIKEZIE',                       gender:'male',   class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0007', admission_no:'RCA/2026/0007', first_name:'OLLUAH',     last_name:'CHIMAMANDA VICTORIA',           full_name:'OLLUAH CHIMAMANDA VICTORIA',            gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0008', admission_no:'RCA/2026/0008', first_name:'EMMANUEL',   last_name:'UGOMSINACHI DANIELLA',          full_name:'EMMANUEL UGOMSINACHI DANIELLA',         gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0009', admission_no:'RCA/2026/0009', first_name:'IZUNWANNE',  last_name:'ZINACHIMDI ELDAD',              full_name:'IZUNWANNE ZINACHIMDI ELDAD',            gender:'male',   class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0010', admission_no:'RCA/2026/0010', first_name:'ONYEMA',     last_name:'DARLINGTON IKEMDINACHI',        full_name:'ONYEMA DARLINGTON IKEMDINACHI',         gender:'male',   class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0011', admission_no:'RCA/2026/0011', first_name:'ARUM',       last_name:'CHIDIMMA DIVINE-FAVOUR',        full_name:'ARUM CHIDIMMA DIVINE-FAVOUR',           gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0012', admission_no:'RCA/2026/0012', first_name:'ONYIA',      last_name:'IFECHUKWU LIGHT',               full_name:'ONYIA IFECHUKWU LIGHT',                 gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0013', admission_no:'RCA/2026/0013', first_name:'OBIEFUNA',   last_name:'CHIDEZIRI GABRIEL',             full_name:'OBIEFUNA CHIDEZIRI GABRIEL',            gender:'male',   class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0014', admission_no:'RCA/2026/0014', first_name:'NWACHUKWU',  last_name:'CHIDALU DERECA',                full_name:'NWACHUKWU CHIDALU DERECA',              gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0015', admission_no:'RCA/2026/0015', first_name:'ONUORAH',    last_name:'UGOMSINACHI DIVINE-TREASURE',   full_name:'ONUORAH UGOMSINACHI DIVINE-TREASURE',   gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0016', admission_no:'RCA/2026/0016', first_name:'AGU',        last_name:'MMASICHUKWU JOSEPHINE',         full_name:'AGU MMASICHUKWU JOSEPHINE',             gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0017', admission_no:'RCA/2026/0017', first_name:'AMOS',       last_name:'PROSPER CHIMEREZE',             full_name:'AMOS PROSPER CHIMEREZE',                gender:'male',   class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0018', admission_no:'RCA/2026/0018', first_name:'NKWOAGU',    last_name:'CHISIMDIRI TRACY',              full_name:'NKWOAGU CHISIMDIRI TRACY',              gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0019', admission_no:'RCA/2026/0019', first_name:'NWOKORO',    last_name:'CHIBUENYIM JOSEPH',             full_name:'NWOKORO CHIBUENYIM JOSEPH',             gender:'male',   class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0020', admission_no:'RCA/2026/0020', first_name:'MBAH',       last_name:'CHIBUSOMMA EMMANUELLA',         full_name:'MBAH CHIBUSOMMA EMMANUELLA',            gender:'female', class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0021', admission_no:'RCA/2026/0021', first_name:'CHUKWUMA',   last_name:'GIDEON CHUKWUEBUKA',            full_name:'CHUKWUMA GIDEON CHUKWUEBUKA',           gender:'male',   class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0023', admission_no:'RCA/2026/0023', first_name:'ONYIA',      last_name:'DARLINGTON CHISIMDI JIDENNA',   full_name:'ONYIA DARLINGTON CHISIMDI JIDENNA',     gender:'male',   class_name:'Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },

    /* ===== NURSERY 1 ===== */
    { id:'RCA/2026/0043', admission_no:'RCA/2026/0043', first_name:'AGUEMEKA',   last_name:'SOVERNTY',                       full_name:'AGUEMEKA SOVERNTY',                       gender:'male',   class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0044', admission_no:'RCA/2026/0044', first_name:'EZEBUILO',   last_name:'CHIMAOBI TESTIMONY',             full_name:'EZEBUILO CHIMAOBI TESTIMONY',             gender:'male',   class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0045', admission_no:'RCA/2026/0045', first_name:'ISAIAH',     last_name:'DOMINION CHIMEREMEZE',           full_name:'ISAIAH DOMINION CHIMEREMEZE',             gender:'male',   class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0046', admission_no:'RCA/2026/0046', first_name:'IDIMA',      last_name:'CHIEMERIE GIDEON',               full_name:'IDIMA CHIEMERIE GIDEON',                  gender:'male',   class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0047', admission_no:'RCA/2026/0047', first_name:'NWAOKOLO',   last_name:'CHINONSO POSSIBLE',              full_name:'NWAOKOLO CHINONSO POSSIBLE',              gender:'male',   class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0048', admission_no:'RCA/2026/0048', first_name:'OCHIK',      last_name:'AKACHUKWU CLINTON',              full_name:'OCHIK AKACHUKWU CLINTON',                 gender:'male',   class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0049', admission_no:'RCA/2026/0049', first_name:'OMEGU',      last_name:'EXCEL CHIDUBEM',                 full_name:'OMEGU EXCEL CHIDUBEM',                    gender:'male',   class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0050', admission_no:'RCA/2026/0050', first_name:'OFFOR',      last_name:'OLAEDO VICTORIA',                full_name:'OFFOR OLAEDO VICTORIA',                   gender:'female', class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0051', admission_no:'RCA/2026/0051', first_name:'EKOH',       last_name:'MUNACHI GIDEON',                 full_name:'EKOH MUNACHI GIDEON',                     gender:'male',   class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0052', admission_no:'RCA/2026/0052', first_name:'ENEH',       last_name:'MUNACHI JOANAH',                 full_name:'ENEH MUNACHI JOANAH',                     gender:'female', class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0053', admission_no:'RCA/2026/0053', first_name:'NWAKA',      last_name:'SANDRA NNEOMA',                  full_name:'NWAKA SANDRA NNEOMA',                     gender:'female', class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0054', admission_no:'RCA/2026/0054', first_name:'UKWUANI',    last_name:'CHINAEMEREM ANABEL',             full_name:'UKWUANI CHINAEMEREM ANABEL',              gender:'female', class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0055', admission_no:'RCA/2026/0055', first_name:'PATRICK',    last_name:'EZINNE CHIGOZIRIM ISABELLA',     full_name:'PATRICK EZINNE CHIGOZIRIM ISABELLA',      gender:'female', class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0056', admission_no:'RCA/2026/0056', first_name:'IBEH',       last_name:'OKECHUKWU WILLIAMS',             full_name:'IBEH OKECHUKWU WILLIAMS',                 gender:'male',   class_name:'Nursery 1', date_of_birth:null, parent_phone:null, status:'active' },

    /* ===== PRE-NURSERY 2 ===== */
    { id:'RCA/2026/0057', admission_no:'RCA/2026/0057', first_name:'EDEH',     last_name:'GODSENT CHIDALU',            full_name:'EDEH GODSENT CHIDALU',            gender:'male',   class_name:'Pre-Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0058', admission_no:'RCA/2026/0058', first_name:'JOSEPH',   last_name:'GEORGE KAMSIYOCHUKWU',       full_name:'JOSEPH GEORGE KAMSIYOCHUKWU',     gender:'male',   class_name:'Pre-Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0059', admission_no:'RCA/2026/0059', first_name:'IKE',      last_name:'MUNACHIMSO STEPHANNIE',      full_name:'IKE MUNACHIMSO STEPHANNIE',        gender:'female', class_name:'Pre-Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0060', admission_no:'RCA/2026/0060', first_name:'UGWU',     last_name:'CHIZARAM-EKPERE FAVOUR',     full_name:'UGWU CHIZARAM-EKPERE FAVOUR',      gender:'female', class_name:'Pre-Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0061', admission_no:'RCA/2026/0061', first_name:'ILOKA',    last_name:'CHIMKAMARA AUGUSTINA',       full_name:'ILOKA CHIMKAMARA AUGUSTINA',       gender:'female', class_name:'Pre-Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0062', admission_no:'RCA/2026/0062', first_name:'EMEIHE',   last_name:'EXCEL CHIDIERE',             full_name:'EMEIHE EXCEL CHIDIERE',            gender:'male',   class_name:'Pre-Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0063', admission_no:'RCA/2026/0063', first_name:'AMAECHI',  last_name:'DESTINY SOMNAETOCHUKWU',     full_name:'AMAECHI DESTINY SOMNAETOCHUKWU',   gender:'male',   class_name:'Pre-Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },
    { id:'RCA/2026/0064', admission_no:'RCA/2026/0064', first_name:'OBUTE',    last_name:'FRANKLIN OLUEBUBECHUKWU',    full_name:'OBUTE FRANKLIN OLUEBUBECHUKWU',    gender:'male',   class_name:'Pre-Nursery 2', date_of_birth:null, parent_phone:null, status:'active' },

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
