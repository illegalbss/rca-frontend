/* ============================================
   REPORT CARDS — report-card.js
   ============================================
   Roster comes from RCA_API.getStudents(); a pupil's scores/behaviour
   ratings/class comment come from RCA_API.getStudentResults(admissionNo,
   term), which reads the real scores/behavior_ratings/class_comments
   tables (see students.js's GET /:admissionNo/results route).

   The class_comments table stores both the class teacher's remark
   (comment) and the Head Teacher's own remark (ht_comment), editable
   by ict_admin/head_teacher via the same PUT /:admissionNo/review
   endpoint Class Review uses. Falls back to an auto-generated remark
   based on the pupil's average until a real one is written.

   CORE IDEA: pick a class, then a pupil within that class, and
   we build a complete report card document - every subject's
   CA/Exam/Final/Grade, an overall average, an overall grade, a
   simple position-in-class calculation, and a remarks line
   generated from the average. Clicking Print uses the browser's
   native print dialog along with our @media print CSS rules.
*/

document.addEventListener('DOMContentLoaded', async () => {

  let allStudents       = await window.RCA_API.getStudents();
  const allClasses      = window.SCHOOL_CLASSES   || [];
  const traits           = window.BEHAVIOR_TRAITS  || [];
  const scoreToGrade    = window.scoreToGrade;
  const gradeToLabel    = window.gradeToLabel;
  const ratingValueToLabel = window.ratingValueToLabel;

  const cu = window.CURRENT_USER;
  const canEditHtComment = cu && (cu.roles || [cu.role]).some(r => ['ict_admin', 'head_teacher'].includes(r));

  // Cache of admission_no -> { average, scores, behavior, comment } for
  // the currently selected term, so class-position ranking doesn't
  // refetch a classmate's results more than once.
  let resultsCache = {};

  async function getResults(admissionNo, term) {
    const key = `${admissionNo}|${term}`;
    if (!resultsCache[key]) {
      const data = await window.RCA_API.getStudentResults(admissionNo, term);
      const scores = data?.scores || [];
      const totalScore = scores.reduce((sum, r) => sum + Number(r.final_score || 0), 0);
      const average = scores.length ? totalScore / scores.length : 0;
      resultsCache[key] = {
        scores,
        behavior: data?.behavior || [],
        comment: data?.comment || null,
        ht_comment: data?.ht_comment || null,
        average,
        totalScore,
        overallGrade: scoreToGrade(average),
        subjectsCount: scores.length
      };
    }
    return resultsCache[key];
  }

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
     COMPUTE A PUPIL'S POSITION WITHIN THEIR CLASS
     --------------------------------------------
     Ranks every pupil in the class by their average score
     (highest first), then finds where this pupil lands.
     Ties share the same position (standard competition ranking) -
     e.g. two pupils tied for 2nd both show "2nd", and the next
     pupil down shows "4th", not "3rd".
  */
  async function computeClassPosition(admissionNo, className, term) {
    const studentsInClass = allStudents.filter(s => s.class_name === className);

    const rankedAverages = (await Promise.all(
      studentsInClass.map(async s => ({
        admissionNo: s.admission_no,
        average: (await getResults(s.admission_no, term)).average
      }))
    )).sort((a, b) => b.average - a.average);

    const thisStudentAverage = rankedAverages.find(r => r.admissionNo === admissionNo)?.average || 0;

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
  async function renderReportCard() {
    const admissionNo = pupilSelect.value;
    const className = classSelect.value;
    const term = termSelect.value;
    const termLabel = TERM_LABELS[term];

    if (!admissionNo) {
      reportCardEl.innerHTML = '<p style="text-align:center;color:#777;padding:2rem;">No pupils found in this class.</p>';
      return;
    }

    reportCardEl.innerHTML = '<p style="text-align:center;color:#777;padding:2rem;">Loading…</p>';

    const student = allStudents.find(s => s.admission_no === admissionNo);
    const summary = await getResults(admissionNo, term);
    const { position, classSize } = await computeClassPosition(admissionNo, className, term);

    const behaviorMap = {};
    (summary.behavior || []).forEach(b => { behaviorMap[b.trait_code] = b.rating; });

    const subjectRows = summary.scores.map(r => `
      <tr>
        <td class="rc-subject-cell">${r.subject_name || r.subject_id}</td>
        <td>${Number(r.ca_total)}</td>
        <td>${Number(r.exam)}</td>
        <td><strong>${Number(r.final_score)}</strong></td>
        <td class="rc-grade-cell ${r.grade}">${r.grade}</td>
      </tr>
    `).join('');

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
        ${summary.comment
          ? `"${summary.comment}"`
          : generateRemark(summary.average)
        }
      </div>

      <div class="rc-remarks rc-ht-remarks" id="htCommentBlock">
        <span class="rc-remarks-label">Head Teacher's Comment</span>
        <span id="htCommentText">${summary.ht_comment ? `"${summary.ht_comment}"` : generateHtComment(summary.average)}</span>
        ${canEditHtComment ? `<button id="editHtCommentBtn" class="no-print" style="margin-left:10px;padding:2px 10px;font-size:0.72rem;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer">✏️ Edit</button>` : ''}
      </div>

      <div class="rc-behavior-section">
        <div class="rc-behavior-title">Behavioural &amp; Affective Assessment</div>
        <div class="rc-behavior-grid">
          ${traits.map(trait => {
            const val = behaviorMap[trait.id] || 0;
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

    document.getElementById('editHtCommentBtn')?.addEventListener('click', () => {
      const block = document.getElementById('htCommentBlock');
      const current = summary.ht_comment || '';
      block.innerHTML = `
        <span class="rc-remarks-label">Head Teacher's Comment</span>
        <textarea id="htCommentInput" class="no-print" rows="2" style="width:100%;margin-top:6px;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.85rem;font-family:inherit">${current}</textarea>
        <div class="no-print" style="margin-top:6px;display:flex;gap:8px">
          <button id="saveHtCommentBtn" style="padding:5px 14px;font-size:0.75rem;background:var(--color-primary);color:#fff;border:none;border-radius:6px;cursor:pointer">Save</button>
          <button id="cancelHtCommentBtn" style="padding:5px 14px;font-size:0.75rem;background:#fff;border:1px solid #d1d5db;border-radius:6px;cursor:pointer">Cancel</button>
        </div>
      `;
      document.getElementById('cancelHtCommentBtn').addEventListener('click', () => renderReportCard());
      document.getElementById('saveHtCommentBtn').addEventListener('click', async () => {
        const newComment = document.getElementById('htCommentInput').value.trim();
        const saveBtn = document.getElementById('saveHtCommentBtn');
        saveBtn.disabled = true;
        try {
          await window.RCA_API.call(`/students/${encodeURIComponent(admissionNo)}/review`, {
            method: 'PUT',
            body: { term, ht_comment: newComment }
          });
        } catch (e) {
          alert('Could not save comment: ' + e.message);
          saveBtn.disabled = false;
          return;
        }
        delete resultsCache[`${admissionNo}|${term}`];
        renderReportCard();
      });
    });
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
