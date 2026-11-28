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
    { id: 'hec', name: 'Home Economics', until: '2026/2027|term1' },
    { id: 'prevoc', name: 'Prevocational Studies', from: '2026/2027|term2' },
    { id: 'soc', name: 'Social Studies', until: '2026/2027|term1' },
    { id: 'scs', name: 'Social and Citizenship Studies', from: '2026/2027|term2' },
    { id: 'crk', name: 'C.R.K' },
    { id: 'agric', name: 'Agric Science', until: '2026/2027|term1' },
    { id: 'phe', name: 'Health Education' },
    { id: 'vr', name: 'Verbal Reasoning' },
    { id: 'qr', name: 'Quantitative Reasoning' },
    { id: 'writ', name: 'Writing' },
    { id: 'cre', name: 'Creative Arts' },
    { id: 'civ', name: 'Civic Education', until: '2026/2027|term1' },
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
  // Each nursery class has its own list (the school's corrected lists,
  // November 2026), for every term. The same subject keeps one id across
  // classes so scores never move: e.g. 'engst' is shown as "English
  // Language" in Pre-Nursery and Nursery 2 and "English Studies" in
  // Nursery 1 and 3; 'writ' is "Handwriting" in Pre-Nursery. The server
  // uses the same lists (rca-backend src/utils/curriculum.js).
  const S = (id, name) => ({ id, name });
  window.NURSERY_CLASS_SUBJECTS = {
    pre: [ // Pre-Nursery 1 and 2 — 11 subjects
      S('engst', 'English Language'), S('phon', 'Phonics'), S('spell', 'Spelling'), S('writ', 'Handwriting'),
      S('rhyme', 'Rhymes'), S('igbo', 'Asusu Igbo'), S('nsci', 'Nursery Science'), S('hhab', 'Health Habit'),
      S('schab', 'Social Habit'), S('bible', 'Bible Knowledge'), S('finart', 'Fine Art')
    ],
    n1: [ // Nursery 1 (1A and 1B) — 14 subjects
      S('engst', 'English Studies'), S('mth', 'Mathematics'), S('phon', 'Phonics'), S('read', 'Reading Skill'),
      S('rhyme', 'Rhymes'), S('igbo', 'Asusu Igbo'), S('nsci', 'Nursery Science'), S('hhab', 'Health Habit'),
      S('schab', 'Social Habit'), S('bible', 'Bible Knowledge'), S('finart', 'Fine Art'),
      S('qr', 'Quantitative Reasoning'), S('vr', 'Verbal Reasoning'), S('spell', 'Spelling')
    ],
    n2: [ // Nursery 2 — 15 subjects
      S('engst', 'English Language'), S('mth', 'Mathematics'), S('phon', 'Phonics'), S('read', 'Reading Skill'),
      S('rhyme', 'Rhymes'), S('igbo', 'Asusu Igbo'), S('nsci', 'Nursery Science'), S('hhab', 'Health Habit'),
      S('schab', 'Social Habit'), S('bible', 'Bible Knowledge'), S('finart', 'Fine Art'),
      S('qr', 'Quantitative Reasoning'), S('vr', 'Verbal Reasoning'), S('spell', 'Spelling'), S('civ', 'Civic Education')
    ],
    n3: [ // Nursery 3 — 15 subjects
      S('engst', 'English Studies'), S('mth', 'Mathematics'), S('numth', 'Numeracy Thinking'), S('litth', 'Literacy Thinking'),
      S('read', 'Reading Skill'), S('igbo', 'Asusu Igbo'), S('nsci', 'Nursery Science'), S('hhab', 'Health Habit'),
      S('schab', 'Social Habit'), S('bible', 'Bible Knowledge'), S('finart', 'Fine Art'), S('moral', 'Moral Instruction'),
      S('civ', 'Civic Education'), S('phe', 'Physical and Health Education'), S('spell', 'Spelling')
    ]
  };
  window.nurseryLevel = function (className) {
    const c = String(className || '');
    if (/^pre-?\s*nursery/i.test(c)) return 'pre';
    const m = c.match(/nursery\s*(\d)/i);
    return m ? ({ 1: 'n1', 2: 'n2', 3: 'n3' })[m[1]] || null : null;
  };

  // Every nursery subject once (for teacher subject checkboxes etc.).
  window.NURSERY_SUBJECTS = (function () {
    const seen = new Set(), out = [];
    ['n1', 'n3', 'pre', 'n2'].forEach(k => window.NURSERY_CLASS_SUBJECTS[k].forEach(s => { if (!seen.has(s.id)) { seen.add(s.id); out.push(s); } }));
    return out;
  })();

  // "Nursery" substring catches Pre-Nursery 1/2 too — same heuristic
  // already used elsewhere in the codebase (e.g. classes.js).
  window.isNurseryClass = function (className) {
    return !!className && className.includes('Nursery');
  };

  // className is optional — pass none to get the combined, deduplicated
  // list (used where no specific class is selected yet, e.g. assigning a
  // teacher's linked_subjects before they've picked a class).
  // Subjects can start or stop at a given term ('from' / 'until', written
  // 'SESSION|term'). From Second Term 2026/2027, Basic 1-6 take Prevocational
  // Studies (replacing Agric Science + Home Economics) and Social and
  // Citizenship Studies (replacing Social Studies + Civic Education). Older
  // terms keep the old four exactly as recorded. Nursery is unchanged.
  // The server applies the same rule (rca-backend src/utils/curriculum.js).
  const TERM_NO = { term1: 1, term2: 2, term3: 3 };
  window.termKey = function (session, term) {
    const y = parseInt(String(session || (window.RCA_CONFIG && window.RCA_CONFIG.SESSION) || ''), 10) || 0;
    return y * 10 + (TERM_NO[term || (window.RCA_CONFIG && window.RCA_CONFIG.CURRENT_TERM)] || 1);
  };
  const keyOf = st => { const parts = String(st).split('|'); return window.termKey(parts[0], parts[1]); };
  window.isSubjectActive = function (subject, term, session) {
    const k = window.termKey(session, term);
    if (subject.from && k < keyOf(subject.from)) return false;
    if (subject.until && k > keyOf(subject.until)) return false;
    return true;
  };

  // term / session are optional (default: the current term and session).
  window.getSubjectsForClass = function (className, term, session) {
    if (!className) return window.ALL_SUBJECTS_COMBINED;
    if (window.isNurseryClass(className)) return window.NURSERY_CLASS_SUBJECTS[window.nurseryLevel(className)] || window.NURSERY_SUBJECTS;
    return window.SCHOOL_SUBJECTS.filter(s => window.isSubjectActive(s, term, session));
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
  // End of Year (annual) result table — used by the Third Term report card
  // and the parent portal. `a` is GET /students/:adm/annual.
  window.annualResultHtml = function (a, opts) {
    opts = opts || {};
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const n = v => (v === null || v === undefined) ? '—' : (Math.round(v * 10) / 10).toString();
    const ord = k => k + (k % 10 === 1 && k % 100 !== 11 ? 'st' : k % 10 === 2 && k % 100 !== 12 ? 'nd' : k % 10 === 3 && k % 100 !== 13 ? 'rd' : 'th');
    if (!a || !a.subjects || !a.subjects.length) return '<p style="font-size:0.8rem;color:#6b7280;margin:0">No scores recorded for this session yet.</p>';
    const notes = a.subjects.filter(s => s.note);
    const th = 'style="padding:5px 6px;border:1px solid #d1d5db;background:#6B0F1A;color:#fff;font-size:0.7rem;text-transform:uppercase"';
    const td = 'style="padding:5px 6px;border:1px solid #e5e7eb;text-align:center"';
    return `
      <table class="rc-table rc-annual-table" style="width:100%;border-collapse:collapse;font-size:0.8rem">
        <thead><tr><th ${th} style="text-align:left">Subject</th><th ${th}>1st Term</th><th ${th}>2nd Term</th><th ${th}>3rd Term</th><th ${th}>Annual Avg</th><th ${th}>Grade</th></tr></thead>
        <tbody>${a.subjects.map(s => `<tr>
          <td style="padding:5px 6px;border:1px solid #e5e7eb;text-align:left">${esc(s.name)}${s.note ? '<sup style="color:#b45309">*</sup>' : ''}</td>
          <td ${td}>${n(s.term1)}</td><td ${td}>${n(s.term2)}</td><td ${td}>${n(s.term3)}</td>
          <td ${td}><strong>${n(s.annual)}</strong></td><td ${td}>${window.scoreToGrade ? window.scoreToGrade(s.annual) : ''}</td></tr>`).join('')}
        </tbody>
      </table>
      ${notes.length ? `<p style="font-size:0.7rem;color:#92400e;margin:4px 0 0">* ${notes.map(s => `${esc(s.name)}: ${esc(s.note)}`).join('; ')}.</p>` : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:0.82rem">
        <span style="background:#f3f4f6;border-radius:8px;padding:6px 10px">Annual Total: <strong>${n(a.total)}</strong></span>
        <span style="background:#f3f4f6;border-radius:8px;padding:6px 10px">Annual Average: <strong>${n(a.average)}%</strong></span>
        ${opts.showPosition !== false && a.position ? `<span style="background:#f3f4f6;border-radius:8px;padding:6px 10px">Annual Position: <strong>${ord(a.position)}</strong> of ${a.class_size}</span>` : ''}
      </div>`;
  };

  window.computeFinalScore = computeFinalScore;
  window.scoreToGrade = scoreToGrade;
  window.gradeToLabel = gradeToLabel;
  window.GRADE_BOUNDARIES = GRADE_BOUNDARIES;

})();
