/* ============================================
   REAL TEACHER DATA — sample-teachers.js
   Royal Crystal Academy
   ============================================
   Based on the actual teaching allocation document provided:

   ADMINISTRATION:
     Ada Nwankwo        — Head Teacher
     Chukwuma Joseph    — Proprietor / Owner (ict_admin level)
     Chukwuma Izuchukwu — ICT Administrator + ICT subject teacher

   BASIC 1A & 1B — Form Teachers teach ALL subjects to their own class:
     Geraldine          — Basic 1A Form Teacher (all subjects)
     Amaka              — Basic 1B Form Teacher (all subjects)

   BASIC 2 — Form Teacher teaches ALL subjects:
     Victoria           — Basic 2 Form Teacher (all subjects)

   PRE-NURSERY 1, PRE-NURSERY 2, NURSERY 1, NURSERY 2, NURSERY 3:
     One dedicated Form Teacher per class (all subjects)

   BASIC 3–6 SUBJECT TEACHERS (teach their subjects across all 4 classes):
     Nkechinyere        — Social Studies, Civic Education, CRK
     Emmanuella         — Agric Science, Home Economics, Creative Arts (also Basic 3 Form Teacher)
     Chiamaka           — English Language, Phonics, Asusu Igbo (also Basic 4 Form Teacher)
     Maths Uncle        — Mathematics, Quantitative Reasoning (also Basic 5 Form Teacher)
     Chidimma           — History, Verbal Reasoning (also Basic 6 Form Teacher)
     Celestina          — Basic Science, Health Education
     (ICT by Izuchukwu across all classes)

   RESULT ACCESS RULES:
     - Subject Teachers: can ONLY enter scores for their own assigned subjects + classes
     - Form Teachers: can enter scores for their own class, rate behaviour, add comments
     - Head Teacher: can view all, approve/reject, add HT comment
     - ICT Admin: full access — unlock, publish, manage
     - Accountant: no access to results
     - Parents: view published results only (after payment)

   CANNOT MAKE CHANGES:
     - Nkechinyere (subject teacher only — no form teacher role)
     - Maths Uncle (subject teacher only — no form teacher role for B3-6)
     - Celestina (subject teacher only)
     - Accountant
     - Parents
*/

(function () {

  const ALL_CLASSES = window.SCHOOL_CLASSES || [
    'Pre-Nursery 1','Pre-Nursery 2','Nursery 1','Nursery 2','Nursery 3',
    'Basic 1A','Basic 1B','Basic 2','Basic 3','Basic 4','Basic 5','Basic 6'
  ];

  // Convenience groupings
  const NURSERY_CLASSES = ALL_CLASSES.filter(c =>
    c.startsWith('Pre-Nursery') || c.startsWith('Nursery'));
  const BASIC1_CLASSES  = ALL_CLASSES.filter(c => c === 'Basic 1A' || c === 'Basic 1B');
  const BASIC36_CLASSES = ALL_CLASSES.filter(c =>
    ['Basic 3','Basic 4','Basic 5','Basic 6'].includes(c));
  const ALL_BASIC_CLASSES = ALL_CLASSES.filter(c => c.startsWith('Basic'));

  // ALL subjects (19)
  const ALL_SUBJECTS = [
    'English Language','Comprehension','Phonics','Spelling/Dictation',
    'Asusu Igbo','Mathematics','Basic Science','Home Economics',
    'Social Studies','C.R.K','Agric Science','Health Education',
    'Verbal Reasoning','Quantitative Reasoning','Writing','Creative Arts',
    'Civic Education','Computer','History'
  ];

  let idCounter = 0;

  function staff(fullName, roles, assignedClasses, subjects, extras = {}) {
    idCounter++;
    const ROLE_PRIORITY = ['ict_admin','head_teacher','accountant','class_teacher','subject_teacher'];
    const primary_role  = ROLE_PRIORITY.find(r => roles.includes(r)) || roles[0];
    const isFormAndSubject = roles.includes('class_teacher') && roles.includes('subject_teacher');
    const legacyLabel = roles.includes('ict_admin')       ? 'ICT Administrator'
                      : roles.includes('head_teacher')    ? 'Head Teacher'
                      : roles.includes('accountant')      ? 'Accountant'
                      : isFormAndSubject                  ? 'Form & Subject Teacher'
                      : roles.includes('class_teacher')   ? 'Form Teacher'
                      : 'Subject Teacher';
    const nameParts = fullName.toLowerCase().split(' ');
    return {
      id: idCounter,
      staff_id: `RCA-STF-${String(idCounter).padStart(3,'0')}`,
      full_name: fullName,
      roles,
      primary_role,
      legacy_role: legacyLabel,
      assigned_classes: assignedClasses,
      subjects,
      email: extras.email || `${nameParts[0]}.${nameParts[nameParts.length-1]}@royalcrystalacademy.edu.ng`,
      phone: `080${Math.floor(10000000 + Math.random()*89999999)}`,
      date_joined: '2022-09-01',
      status: 'active',
      ...extras
    };
  }

  const teachers = [

    /* ============================================
       ADMINISTRATION
       ============================================ */

    staff('Ada Nwankwo', ['head_teacher'], [], [],
      { job_title: 'Head Teacher',
        email: 'headteacher@royalcrystalacademy.edu.ng' }),

    staff('Chukwuma Joseph', ['ict_admin'], [], [],
      { job_title: 'Proprietor',
        email: 'proprietor@royalcrystalacademy.edu.ng' }),

    staff('Chukwuma Izuchukwu', ['ict_admin','subject_teacher'],
      [...ALL_BASIC_CLASSES, ...NURSERY_CLASSES],
      ['Computer'],
      { job_title: 'ICT Administrator',
        email: 'ictadmin@royalcrystalacademy.edu.ng' }),

    staff('Miss Finance', ['accountant'], [], [],
      { job_title: 'Accountant',
        email: 'accountant@royalcrystalacademy.edu.ng' }),

    /* ============================================
       BASIC 1A — Geraldine (Form Teacher, all subjects)
       ============================================ */
    staff('Geraldine Okafor', ['class_teacher'], ['Basic 1A'], ALL_SUBJECTS,
      { job_title: 'Form Teacher — Basic 1A', email: 'geraldine.okafor@royalcrystalacademy.edu.ng' }),

    /* ============================================
       BASIC 1B — Amaka (Form Teacher, all subjects)
       ============================================ */
    staff('Amaka Chukwu', ['class_teacher'], ['Basic 1B'], ALL_SUBJECTS,
      { job_title: 'Form Teacher — Basic 1B', email: 'amaka.chukwu@royalcrystalacademy.edu.ng' }),

    /* ============================================
       BASIC 2 — Victoria (Form Teacher, all subjects)
       ============================================ */
    staff('Victoria Eze', ['class_teacher'], ['Basic 2'], ALL_SUBJECTS,
      { job_title: 'Form Teacher — Basic 2', email: 'victoria.eze@royalcrystalacademy.edu.ng' }),

    /* ============================================
       NURSERY / PRE-NURSERY — one Form Teacher per class
       Each teaches all subjects to their own class only
       ============================================ */
    staff('Sister Blessing Adeyemi', ['class_teacher'], ['Nursery 1'], ALL_SUBJECTS,
      { job_title: 'Form Teacher — Nursery 1', email: 'blessing.adeyemi@royalcrystalacademy.edu.ng' }),

    staff('Sister Grace Bello', ['class_teacher'], ['Nursery 2'], ALL_SUBJECTS,
      { job_title: 'Form Teacher — Nursery 2', email: 'grace.bello@royalcrystalacademy.edu.ng' }),

    staff('Sister Patience Nwosu', ['class_teacher'], ['Nursery 3'], ALL_SUBJECTS,
      { job_title: 'Form Teacher — Nursery 3', email: 'patience.nwosu@royalcrystalacademy.edu.ng' }),

    staff('Sister Joy Ibrahim', ['class_teacher'], ['Pre-Nursery 1'], ALL_SUBJECTS,
      { job_title: 'Form Teacher — Pre-Nursery 1', email: 'joy.ibrahim@royalcrystalacademy.edu.ng' }),

    staff('Sister Esther Lawal', ['class_teacher'], ['Pre-Nursery 2'], ALL_SUBJECTS,
      { job_title: 'Form Teacher — Pre-Nursery 2', email: 'esther.lawal@royalcrystalacademy.edu.ng' }),

    /* ============================================
       BASIC 3–6 SUBJECT TEACHERS
       ============================================
       Each teaches their subjects across Basic 3, 4, 5, 6.
       Some are also Form Teachers for one of those classes.

       FORM TEACHER ASSIGNMENTS (Basic 3–6):
         Basic 3 → Emmanuella
         Basic 4 → Chiamaka
         Basic 5 → Maths Uncle (Chinedu)
         Basic 6 → Chidimma
       ============================================ */

    // Nkechinyere — Social Studies, Civic Education, CRK
    // Subject teacher ONLY — cannot review results, cannot edit comments
    staff('Nkechinyere Onuoha', ['subject_teacher'],
      BASIC36_CLASSES,
      ['Social Studies','Civic Education','C.R.K'],
      { job_title: 'Subject Teacher (Social Studies, Civic Ed, CRK)',
        note: 'Subject teacher only — no form teacher privileges' }),

    // Emmanuella — Agric, Home Economics, Creative Arts + Basic 3 Form Teacher
    staff('Emmanuella Obiora', ['class_teacher','subject_teacher'],
      BASIC36_CLASSES,
      ['Agric Science','Home Economics','Creative Arts'],
      { job_title: 'Form Teacher (Basic 3) / Subject Teacher',
        form_class: 'Basic 3' }),

    // Chiamaka — English, Phonics, Igbo + Basic 4 Form Teacher
    staff('Chiamaka Nnaji', ['class_teacher','subject_teacher'],
      BASIC36_CLASSES,
      ['English Language','Phonics','Asusu Igbo'],
      { job_title: 'Form Teacher (Basic 4) / Subject Teacher',
        form_class: 'Basic 4' }),

    // Maths Uncle — Mathematics, Quantitative Reasoning + Basic 5 Form Teacher
    staff('Chinedu Okonkwo', ['class_teacher','subject_teacher'],
      BASIC36_CLASSES,
      ['Mathematics','Quantitative Reasoning'],
      { job_title: 'Form Teacher (Basic 5) / Subject Teacher',
        form_class: 'Basic 5',
        display_name: 'Maths Uncle (Chinedu)' }),

    // Chidimma — History, Verbal Reasoning + Basic 6 Form Teacher
    staff('Chidimma Eze', ['class_teacher','subject_teacher'],
      BASIC36_CLASSES,
      ['History','Verbal Reasoning'],
      { job_title: 'Form Teacher (Basic 6) / Subject Teacher',
        form_class: 'Basic 6' }),

    // Celestina — Basic Science, Health Education (PHE)
    // Subject teacher ONLY — no form teacher role for Basic 3–6
    staff('Celestina Ugwu', ['subject_teacher'],
      BASIC36_CLASSES,
      ['Basic Science','Health Education'],
      { job_title: 'Subject Teacher (Basic Science & PHE)',
        note: 'Subject teacher only — no form teacher privileges' }),

  ];

  window.SAMPLE_TEACHERS = teachers;

})();
