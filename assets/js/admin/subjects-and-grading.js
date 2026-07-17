/* ============================================
   SUBJECTS + GRADING LOGIC — subjects-and-grading.js
   ============================================
   This file is the "rulebook" for Result Management. It defines:
   1. The fixed list of subjects every class takes (same subjects
      for all 11 classes, per the school's current curriculum)
   2. The CA component weights (Test + Assessment + Project +
      Mid-term Test = 40%, Exam = 60% — the standard Nigerian
      primary school breakdown)
   3. The school's 6-band grading scale boundaries (A-F)

   WHY A SEPARATE FILE: both score-entry.html (where teachers type
   scores in) and report-card.html (where we DISPLAY computed
   results) need the EXACT SAME grading rule. If we wrote the grade
   boundaries twice in two files, they could quietly drift out of
   sync after an edit to one but not the other. One shared file,
   loaded by both pages, means there is only ever ONE place where
   "what counts as a B" is defined.
*/

(function () {

  // Full 19-subject curriculum, same list for every class,
  // Pre-Nursery through Basic 6 - matches the school's actual
  // subject offering including mother-tongue (Asusu Igbo) and
  // religious/moral instruction (C.R.K).
  window.SCHOOL_SUBJECTS = [
    { id: 'eng', name: 'English Language' },
    { id: 'comp', name: 'Comprehension' },
    { id: 'phon', name: 'Phonics' },
    { id: 'spell', name: 'Spelling/Dictation' },
    { id: 'igbo', name: 'Asusu Igbo' },
    { id: 'mth', name: 'Mathematics' },
    { id: 'sci', name: 'Basic Science' },
    { id: 'hec', name: 'Home Economics' },
    { id: 'soc', name: 'Social Studies' },
    { id: 'crk', name: 'C.R.K' },
    { id: 'agric', name: 'Agric Science' },
    { id: 'phe', name: 'Health Education' },
    { id: 'vr', name: 'Verbal Reasoning' },
    { id: 'qr', name: 'Quantitative Reasoning' },
    { id: 'writ', name: 'Writing' },
    { id: 'cre', name: 'Creative Arts' },
    { id: 'civ', name: 'Civic Education' },
    { id: 'ict', name: 'Computer' },
    { id: 'hist', name: 'History' }
  ];

  // Nursery section (Pre-Nursery 1/2, Nursery 1-3) runs a different
  // curriculum from Basic 1-6 — matches the school's actual Nursery exam
  // timetable. Where a subject is genuinely the same thing taught at both
  // levels (Mathematics, Quantitative/Verbal Reasoning, Phonics, Writing,
  // Spelling, Asusu Igbo) it reuses the SAME id as SCHOOL_SUBJECTS so
  // scores/report cards resolve to one shared subjects-table row; subjects
  // unique to Nursery (Nursery Science, Rhymes and Moral Instruction, Bible
  // Knowledge, Social Habit, English Studies, Fine Art, Reading Skills) get
  // their own ids so they don't collide with the Basic-only equivalents
  // (e.g. 'nsci' vs Basic Science's 'sci').
  window.NURSERY_SUBJECTS = [
    { id: 'engst', name: 'English Studies' },
    { id: 'phon', name: 'Phonics' },
    { id: 'read', name: 'Reading Skills' },
    { id: 'spell', name: 'Spelling' },
    { id: 'writ', name: 'Writing' },
    { id: 'mth', name: 'Mathematics' },
    { id: 'qr', name: 'Quantitative Reasoning' },
    { id: 'vr', name: 'Verbal Reasoning' },
    { id: 'nsci', name: 'Nursery Science' },
    { id: 'rhyme', name: 'Rhymes and Moral Instruction' },
    { id: 'bible', name: 'Bible Knowledge' },
    { id: 'schab', name: 'Social Habit' },
    { id: 'finart', name: 'Fine Art' },
    { id: 'igbo', name: 'Asusu Igbo' }
  ];

  // "Nursery" substring catches Pre-Nursery 1/2 too — same heuristic
  // already used elsewhere in the codebase (e.g. classes.js).
  window.isNurseryClass = function (className) {
    return !!className && className.includes('Nursery');
  };

  // className is optional — pass none to get the combined, deduplicated
  // list (used where no specific class is selected yet, e.g. assigning a
  // teacher's linked_subjects before they've picked a class).
  window.getSubjectsForClass = function (className) {
    if (!className) return window.ALL_SUBJECTS_COMBINED;
    return window.isNurseryClass(className) ? window.NURSERY_SUBJECTS : window.SCHOOL_SUBJECTS;
  };

  window.ALL_SUBJECTS_COMBINED = (function () {
    const seen = new Set();
    const combined = [];
    [...window.SCHOOL_SUBJECTS, ...window.NURSERY_SUBJECTS].forEach(s => {
      if (!seen.has(s.id)) { seen.add(s.id); combined.push(s); }
    });
    return combined;
  })();

  // CA component max scores - these four ALWAYS sum to 40.
  // Exposed as one object so score-entry.html's form inputs can
  // set their own "max" attribute directly from these values,
  // guaranteeing the form and the math never disagree.
  window.CA_COMPONENT_MAX = {
    test: 10,
    assessment: 10,
    project: 10,
    midterm: 10
  };
  // test(10) + assessment(10) + project(10) + midterm(10) = 40
  window.CA_TOTAL_MAX = 40;
  window.EXAM_MAX = 60;

  /* --------------------------------------------
     computeFinalScore(scores)
     -------------------------------------------- 
     Takes an object like:
     { test: 8, assessment: 9, project: 7, midterm: 8, exam: 52 }
     Returns: { caTotal, examScore, finalScore, grade }

     This is THE function every other part of Result Management
     calls to turn raw scores into a final mark and letter grade -
     never duplicate this math anywhere else.
  */
  function computeFinalScore(scores) {
    const caTotal =
      (scores.test || 0) +
      (scores.assessment || 0) +
      (scores.project || 0) +
      (scores.midterm || 0);

    const examScore = scores.exam || 0;
    const finalScore = caTotal + examScore; // out of 100

    return {
      caTotal,
      examScore,
      finalScore,
      grade: scoreToGrade(finalScore)
    };
  }

  /* --------------------------------------------
     scoreToGrade(finalScore)
     -------------------------------------------- 
     A 6-band scale out of 100, matching the school's actual
     grading policy. Defined as an ordered array (not a chain
     of if/else) so the boundaries are easy to read and easy to
     adjust in ONE place if the school changes its grading policy
     later. Each band also carries a descriptive label (e.g. "Very
     Good") used on the report card alongside the bare letter.
  */
  const GRADE_BOUNDARIES = [
    { min: 70, grade: 'A', label: 'Excellent' },
    { min: 60, grade: 'B', label: 'Very Good' },
    { min: 50, grade: 'C', label: 'Good' },
    { min: 45, grade: 'D', label: 'Pass' },
    { min: 40, grade: 'E', label: 'Weak Pass' },
    { min: 0,  grade: 'F', label: 'Fail' }
  ];

  function scoreToGrade(finalScore) {
    // .find() returns the FIRST entry whose min the score qualifies
    // for, since the array is sorted highest-to-lowest
    const match = GRADE_BOUNDARIES.find(g => finalScore >= g.min);
    return match ? match.grade : 'F';
  }

  // Looks up the descriptive label (e.g. "Very Good") for a given
  // letter grade - used on the report card next to the bare letter.
  function gradeToLabel(grade) {
    const match = GRADE_BOUNDARIES.find(g => g.grade === grade);
    return match ? match.label : '';
  }

  // Expose all functions so other scripts can call them directly
  window.computeFinalScore = computeFinalScore;
  window.scoreToGrade = scoreToGrade;
  window.gradeToLabel = gradeToLabel;
  window.GRADE_BOUNDARIES = GRADE_BOUNDARIES;

})();
