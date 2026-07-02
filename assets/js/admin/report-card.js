/* ============================================
   REPORT CARDS — report-card.js
   ============================================
   Depends on window.SAMPLE_STUDENTS, window.SCHOOL_CLASSES,
   window.SCHOOL_SUBJECTS, window.SAMPLE_RESULTS, and
   window.scoreToGrade (see script order in report-card.html).

   CORE IDEA: pick a class, then a pupil within that class, and
   we build a complete report card document - every subject's
   CA/Exam/Final/Grade, an overall average, an overall grade, a
   simple position-in-class calculation, and a remarks line
   generated from the average. Clicking Print uses the browser's
   native print dialog along with our @media print CSS rules.

   IMPORTANT: this page reads from the EXACT SAME window.SAMPLE_RESULTS
   object that score-entry.js writes into. If you edit a pupil's
   scores on the Score Entry page and then come to THIS page within
   the same browser tab session (without a full page reload), you'd
   see the updated numbers - because both pages share one in-memory
   object. A full page reload resets it back to freshly-generated
   sample data, since neither page persists to storage yet.
*/

document.addEventListener('DOMContentLoaded', () => {

  const allStudents    = window.SAMPLE_STUDENTS  || [];
  const allClasses     = window.SCHOOL_CLASSES   || [];
  const allSubjects    = window.SCHOOL_SUBJECTS  || [];
  const results        = window.SAMPLE_RESULTS   || {};
  const behaviorRatings = window.BEHAVIOR_RATINGS || {};
  const traits          = window.BEHAVIOR_TRAITS  || [];
  const scoreToGrade    = window.scoreToGrade;
  const gradeToLabel    = window.gradeToLabel;
  const ratingValueToLabel = window.ratingValueToLabel;

  /* --------------------------------------------
     ELEMENT REFERENCES
     -------------------------------------------- */
  const classSelect   = document.getElementById('classSelect');
  const pupilSelect    = document.getElementById('pupilSelect');
  const termSelect      = document.getElementById('termSelect');
  const printBtn         = document.getElementById('printBtn');
  const reportCardEl     = document.getElementById('reportCard');

  const TERM_LABELS = {
    term1: 'First Term',
    term2: 'Second Term',
    term3: 'Third Term'
  };

  function getInitials(fullName) {
    return fullName.split(' ').map(p => p.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  /* --------------------------------------------
     POPULATE CLASS DROPDOWN
     -------------------------------------------- */
  function populateClassDropdown() {
    classSelect.innerHTML = allClasses
      .map(c => `<option value="${c}">${c}</option>`)
      .join('');
  }

  /* --------------------------------------------
     POPULATE PUPIL DROPDOWN (scoped to the selected class)
     -------------------------------------------- */
  function populatePupilDropdown() {
    const className = classSelect.value;
    const studentsInClass = allStudents
      .filter(s => s.class_name === className)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    pupilSelect.innerHTML = studentsInClass
      .map(s => `<option value="${s.admission_no}">${s.full_name}</option>`)
      .join('');
  }

  /* --------------------------------------------
     COMPUTE A PUPIL'S OVERALL SUMMARY ACROSS ALL SUBJECTS
     -------------------------------------------- */
  function computeOverallSummary(admissionNo) {
    const pupilResults = results[admissionNo] || {};
    const subjectScores = allSubjects.map(subject => pupilResults[subject.id]).filter(Boolean);

    if (subjectScores.length === 0) {
      return { average: 0, overallGrade: 'F', totalScore: 0, subjectsCount: 0 };
    }

    const totalScore = subjectScores.reduce((sum, r) => sum + r.finalScore, 0);
    const average = totalScore / subjectScores.length;

    return {
      average,
      overallGrade: scoreToGrade(average),
      totalScore,
      subjectsCount: subjectScores.length
    };
  }

  /* --------------------------------------------
     COMPUTE A PUPIL'S POSITION WITHIN THEIR CLASS
     -------------------------------------------- 
     Ranks every pupil in the class by their average score
     (highest first), then finds where this pupil lands.
     Ties share the same position (standard competition ranking) -
     e.g. two pupils tied for 2nd both show "2nd", and the next
     pupil down shows "4th", not "3rd".
  */
  function computeClassPosition(admissionNo, className) {
    const studentsInClass = allStudents.filter(s => s.class_name === className);

    const rankedAverages = studentsInClass
      .map(s => ({ admissionNo: s.admission_no, average: computeOverallSummary(s.admission_no).average }))
      .sort((a, b) => b.average - a.average);

    const thisStudentAverage = rankedAverages.find(r => r.admissionNo === admissionNo).average;

    // Position = 1 + count of pupils with a STRICTLY higher average
    const position = 1 + rankedAverages.filter(r => r.average > thisStudentAverage).length;

    return { position, classSize: studentsInClass.length };
  }

  /* --------------------------------------------
     GENERATE A REMARK SENTENCE BASED ON THE AVERAGE
     -------------------------------------------- */
  function generateRemark(average) {
    // Derive the remark from the SAME grade boundaries used everywhere
    // else (via scoreToGrade), rather than a second hardcoded threshold
    // list that could quietly drift out of sync with the real scale.
    const grade = scoreToGrade(average);

    const REMARKS_BY_GRADE = {
      A: 'An excellent result. Keep up the outstanding work!',
      B: 'A very good result this term. Well done.',
      C: 'A good result. There is room for improvement with more effort.',
      D: 'A pass, but performance needs to improve next term.',
      E: 'A weak pass. Needs considerably more effort and support next term.',
      F: 'This result needs serious improvement. Extra support is strongly recommended.'
    };

    return REMARKS_BY_GRADE[grade] || REMARKS_BY_GRADE.F;
  }

  function generateHtComment(average) {
    const grade = scoreToGrade(average);
    const HT_COMMENTS = {
      A: 'An outstanding performance. This pupil is a credit to the school. Keep it up!',
      B: 'A commendable result. I encourage this pupil to sustain the momentum.',
      C: 'A satisfactory result. With greater dedication, much more can be achieved.',
      D: 'There is potential here that has not yet been fully realised. More effort is needed.',
      F: 'I urge this pupil and their parents/guardians to take academics more seriously next term.'
    };
    return HT_COMMENTS[grade] || HT_COMMENTS.F;
  }

  function ordinal(n) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const lastTwo = n % 100;
    const suffix = suffixes[(lastTwo - 20) % 10] || suffixes[lastTwo] || suffixes[0];
    return `${n}${suffix}`;
  }

  /* --------------------------------------------
     BUILD THE FULL REPORT CARD HTML
     -------------------------------------------- */
  function renderReportCard() {
    const admissionNo = pupilSelect.value;
    const className = classSelect.value;
    const termLabel = TERM_LABELS[termSelect.value];

    if (!admissionNo) {
      reportCardEl.innerHTML = '<p style="text-align:center;color:#777;padding:2rem;">No pupils found in this class.</p>';
      return;
    }

    const student = allStudents.find(s => s.admission_no === admissionNo);
    const pupilResults = results[admissionNo] || {};
    const summary = computeOverallSummary(admissionNo);
    const { position, classSize } = computeClassPosition(admissionNo, className);
    const ratings = behaviorRatings[admissionNo] || { ratings: {}, comment: '' };

    const subjectRows = allSubjects.map(subject => {
      const r = pupilResults[subject.id];
      if (!r) return '';
      return `
        <tr>
          <td class="rc-subject-cell">${subject.name}</td>
          <td>${r.caTotal}</td>
          <td>${r.examScore}</td>
          <td><strong>${r.finalScore}</strong></td>
          <td class="rc-grade-cell ${r.grade}">${r.grade}</td>
        </tr>
      `;
    }).join('');

    reportCardEl.innerHTML = `
      <div class="rc-header">
        <img src="../assets/images/logo.png" alt="Royal Crystal Academy">
        <div class="rc-school-name">Royal Crystal Academy</div>
        <div class="rc-school-meta">20/22 Amaigbo Lane, Uwani, Enugu State</div>
        <div class="rc-school-meta">Tel: 08108419563, 09026324650</div>
        <span class="rc-title">${termLabel} Report Card — 2025/2026 Session</span>
      </div>

      <div class="rc-info-grid">
        <div class="rc-info-item">
          <span class="rc-info-label">Pupil Name</span>
          <span class="rc-info-value">${student.full_name}</span>
        </div>
        <div class="rc-info-item">
          <span class="rc-info-label">Admission No.</span>
          <span class="rc-info-value">${student.admission_no}</span>
        </div>
        <div class="rc-info-item">
          <span class="rc-info-label">Class</span>
          <span class="rc-info-value">${className}</span>
        </div>
        <div class="rc-info-item">
          <span class="rc-info-label">Gender</span>
          <span class="rc-info-value">${student.gender === 'male' ? 'Male' : 'Female'}</span>
        </div>
        <div class="rc-info-item">
          <span class="rc-info-label">Position in Class</span>
          <span class="rc-info-value">${ordinal(position)} of ${classSize}</span>
        </div>
        <div class="rc-info-item">
          <span class="rc-info-label">Overall Grade</span>
          <span class="rc-info-value">${summary.overallGrade} — ${gradeToLabel(summary.overallGrade)}</span>
        </div>
      </div>

      <table class="rc-table">
        <thead>
          <tr>
            <th class="rc-subject-col">Subject</th>
            <th>CA (/40)</th>
            <th>Exam (/60)</th>
            <th>Total (/100)</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${subjectRows}
        </tbody>
        <tfoot>
          <tr>
            <td>Average</td>
            <td colspan="2"></td>
            <td>${summary.average.toFixed(1)}</td>
            <td>${summary.overallGrade}</td>
          </tr>
        </tfoot>
      </table>

      <div class="rc-summary-grid">
        <div class="rc-summary-box">
          <span class="rc-summary-num">${summary.subjectsCount}</span>
          <span class="rc-summary-label">Subjects Taken</span>
        </div>
        <div class="rc-summary-box">
          <span class="rc-summary-num">${summary.totalScore}</span>
          <span class="rc-summary-label">Total Score</span>
        </div>
        <div class="rc-summary-box">
          <span class="rc-summary-num">${summary.average.toFixed(1)}%</span>
          <span class="rc-summary-label">Average Score</span>
        </div>
        <div class="rc-summary-box">
          <span class="rc-summary-num">${ordinal(position)}</span>
          <span class="rc-summary-label">Class Position</span>
        </div>
      </div>

      <div class="rc-remarks">
        <span class="rc-remarks-label">Class Teacher's Remark</span>
        ${ratings.comment
          ? `"${ratings.comment}"`
          : generateRemark(summary.average)
        }
      </div>

      <div class="rc-remarks rc-ht-remarks">
        <span class="rc-remarks-label">Head Teacher's Comment</span>
        ${ratings.ht_comment
          ? `"${ratings.ht_comment}"`
          : generateHtComment(summary.average)
        }
      </div>

      <div class="rc-behavior-section">
        <div class="rc-behavior-title">Behavioural &amp; Affective Assessment</div>
        <div class="rc-behavior-grid">
          ${traits.map(trait => {
            const val = ratings.ratings[trait.id] || 0;
            const dots = [1,2,3,4,5].map(n =>
              `<span class="rc-dot ${n <= val ? 'filled' : ''}"></span>`
            ).join('');
            return `<div class="rc-behavior-row">
              <span class="rc-behavior-label">${trait.label}</span>
              <span class="rc-behavior-dots">${dots}</span>
              <span class="rc-behavior-text">${val ? ratingValueToLabel(val) : '—'}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="rc-grade-legend">
        <span class="rc-remarks-label">Grading Key</span>
        ${buildGradeLegend()}
      </div>

      <div class="rc-signatures">
        <div class="rc-signature-line">Class Teacher's Signature</div>
        <div class="rc-signature-line">Head Teacher's Signature<br><span style="font-size:0.68rem;color:#555;font-style:italic">Mrs. Ada Nwankwo</span></div>
        <div class="rc-signature-line">Next Term Begins<br><span style="font-size:0.68rem;color:#555;font-style:italic">See School Calendar</span></div>
      </div>
    `;
  }

  /* --------------------------------------------
     BUILD THE GRADE LEGEND
     -------------------------------------------- 
     Reads directly from window.GRADE_BOUNDARIES rather than
     hardcoding the score ranges a second time - if the school's
     grading policy ever changes again, this legend updates itself
     automatically with zero edits needed here.
  */
  function buildGradeLegend() {
    const boundaries = window.GRADE_BOUNDARIES || [];

    return boundaries.map((band, index) => {
      // The upper end of THIS band is one less than the band above it
      // (or 100 for the very top band, since there's no band above A)
      const upperBound = index === 0 ? 100 : boundaries[index - 1].min - 1;
      const rangeLabel = band.min === upperBound ? `${band.min}` : `${band.min}-${upperBound}`;
      return `<span class="legend-item"><strong>${band.grade}</strong> = ${rangeLabel} (${band.label})</span>`;
    }).join('');
  }

  /* --------------------------------------------
     PRINT
     -------------------------------------------- 
     window.print() opens the browser's native print dialog.
     Our @media print CSS rules (in report-card.css) handle
     hiding the sidebar/toolbar and cleaning up the layout -
     we don't need any special JS logic beyond this one call.
  */
  printBtn.addEventListener('click', () => {
    window.print();
  });

  /* --------------------------------------------
     EVENT LISTENERS
     -------------------------------------------- */
  classSelect.addEventListener('change', () => {
    populatePupilDropdown();
    renderReportCard();
  });
  pupilSelect.addEventListener('change', renderReportCard);
  termSelect.addEventListener('change', renderReportCard);

  /* --------------------------------------------
     INITIALIZE
     -------------------------------------------- */
  populateClassDropdown();
  const defaultClass = allClasses.find(c => c.startsWith('Basic')) || allClasses[0];
  classSelect.value = defaultClass;
  populatePupilDropdown();
  renderReportCard();

});
