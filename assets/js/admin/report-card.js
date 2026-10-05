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
  let allStaff          = [];
  try { allStaff = await window.RCA_API.getStaffDirectory(); } catch (e) { allStaff = []; }
  const allClasses      = window.SCHOOL_CLASSES   || [];
  const traits           = window.BEHAVIOR_TRAITS  || [];
  const scoreToGrade    = window.scoreToGrade;
  const gradeToLabel    = window.gradeToLabel;
  const ratingValueToLabel = window.ratingValueToLabel;
  const isNurseryClass  = window.isNurseryClass || (c => !!c && c.includes('Nursery'));

  const cu = window.CURRENT_USER;
  const canEditHtComment = cu && (cu.roles || [cu.role]).some(r => ['ict_admin', 'head_teacher'].includes(r));

  // A class_teacher may only edit records for their own form class
  // (linked_classes[0]) — mirrors the server-side rule in
  // PUT /students/:admissionNo/review so the Edit button only appears
  // where a save would actually be allowed to go through.
  function canEditNurseryRecord(className) {
    if (!cu) return false;
    const roles = cu.roles || [cu.role];
    if (roles.includes('ict_admin') || roles.includes('head_teacher')) return true;
    if (roles.includes('class_teacher')) return (cu.linked_classes || [])[0] === className;
    return false;
  }

  function findClassTeacherName(className) {
    const t = (allStaff || []).find(u => u.primary_role === 'class_teacher' && (u.linked_classes || [])[0] === className);
    return t ? t.full_name : '';
  }

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
        nursery_record: data?.nursery_record || null,
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
      E: 'A weak result. This pupil needs close support and much more effort next term.',
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
     COGNITIVE & BEHAVIOURAL RECORDS — Nursery section only
     --------------------------------------------
     Replaces the generic Behavioural & Affective Assessment section
     (which is a 1-5 dot rating scale meant for Basic 1-6) with the
     school's actual Nursery report card fields: free-text daily-care
     observations plus a few counts, editable inline the same way the
     Head Teacher's comment is.
  */
  // Number in Class / Times School Opened / Times Present now live in
  // the shared Attendance section (renderAttendanceSection), so they're
  // not repeated here — the Edit form below still edits the two counts.
  function renderNurseryRecordsSection(summary, className) {
    const nr = summary.nursery_record || {};
    const teacherName = findClassTeacherName(className);
    const canEdit = canEditNurseryRecord(className);

    const textFields = [
      ['breakfast_lunch', 'Breakfast/Lunch'],
      ['dressing', 'Dressing'],
      ['siesta', 'Siesta'],
      ['learning_ability', 'Learning Ability'],
      ['positive_traits', 'Positive Personality Traits'],
      ['negative_traits', 'Negative Traits']
    ];

    return `
      <div class="rc-section" id="nurseryRecordsBlock">
        <div class="rc-section-title">Cognitive &amp; Behavioural Records</div>
        <div class="rc-trait-grid">
          ${textFields.map(([key, label]) => `
            <div class="rc-trait-row">
              <span class="rc-trait-label">${label}</span>
              <span class="rc-trait-box">${nr[key] || '—'}</span>
            </div>
          `).join('')}
          <div class="rc-trait-row">
            <span class="rc-trait-label">Name of Teacher</span>
            <span class="rc-trait-box">${teacherName || '—'}</span>
          </div>
        </div>
        ${canEdit ? `<button id="editNurseryBtn" class="no-print" style="margin-top:10px;padding:2px 10px;font-size:0.72rem;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer">✏️ Edit Records</button>` : ''}
      </div>
    `;
  }

  /* --------------------------------------------
     AFFECTIVE & BEHAVIOURAL — Basic 1-6
     --------------------------------------------
     The seven traits on the school's paper report card come first;
     any other trait in BEHAVIOR_TRAITS that has been rated follows, so
     no rating entered in Class Review is silently dropped. Dressing and
     Learning Ability aren't in BEHAVIOR_TRAITS yet, so they print as
     empty boxes for the teacher to fill by hand unless a rating exists.
  */
  const CARD_TRAITS = [
    ['punctuality', 'Punctuality'],
    ['neatness', 'Neatness'],
    ['politeness', 'Politeness'],
    ['honesty', 'Honesty'],
    ['cooperation', 'Cooperation'],
    ['dressing', 'Dressing'],
    ['learning_ability', 'Learning Ability']
  ];

  function renderBehaviourSection(behaviorMap) {
    const cardIds = CARD_TRAITS.map(([id]) => id);
    const extra = traits
      .filter(t => !cardIds.includes(t.id) && behaviorMap[t.id])
      .map(t => [t.id, t.label]);

    const rows = [...CARD_TRAITS, ...extra].map(([id, label]) => {
      const val = behaviorMap[id] || 0;
      return `
        <div class="rc-trait-row">
          <span class="rc-trait-label">${label}</span>
          <span class="rc-trait-box">${val ? ratingValueToLabel(val) : ''}</span>
        </div>`;
    }).join('');

    return `
      <div class="rc-section">
        <div class="rc-section-title">Affective &amp; Behavioural Assessment</div>
        <div class="rc-trait-grid">${rows}</div>
      </div>
    `;
  }

  function renderAttendanceSection(summary, classSize) {
    const nr = summary.nursery_record || {};
    const cells = [
      ['Number in Class', classSize],
      ['Times School Opened', nr.times_school_opened ?? '—'],
      ['Times Present', nr.times_present ?? '—']
    ];
    return `
      <div class="rc-section">
        <div class="rc-section-title">Attendance</div>
        <div class="rc-attendance-grid">
          ${cells.map(([label, value]) => `
            <div class="rc-attendance-cell">
              <span class="rc-attendance-label">${label}</span>
              <span class="rc-attendance-value">${value}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function wireNurseryEditButton(admissionNo, term, summary, className, classSize) {
    document.getElementById('editNurseryBtn')?.addEventListener('click', () => {
      const nr = summary.nursery_record || {};
      const block = document.getElementById('nurseryRecordsBlock');
      const textFields = [
        ['breakfast_lunch', 'Breakfast/Lunch'],
        ['dressing', 'Dressing'],
        ['siesta', 'Siesta'],
        ['learning_ability', 'Learning Ability'],
        ['positive_traits', 'Positive Personality Traits'],
        ['negative_traits', 'Negative Traits']
      ];
      block.innerHTML = `
        <div class="rc-section-title">Cognitive &amp; Behavioural Records</div>
        <div class="rc-nursery-grid no-print">
          ${textFields.map(([key, label]) => `
            <div class="rc-nursery-row" style="flex-direction:column;align-items:flex-start;gap:4px">
              <span class="rc-nursery-label">${label}</span>
              <input type="text" id="nf_${key}" value="${nr[key] || ''}" style="width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem;font-family:inherit;box-sizing:border-box">
            </div>
          `).join('')}
          <div class="rc-nursery-row" style="flex-direction:column;align-items:flex-start;gap:4px">
            <span class="rc-nursery-label">Number of Times School Opened</span>
            <input type="number" id="nf_times_school_opened" value="${nr.times_school_opened ?? ''}" style="width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem;font-family:inherit;box-sizing:border-box">
          </div>
          <div class="rc-nursery-row" style="flex-direction:column;align-items:flex-start;gap:4px">
            <span class="rc-nursery-label">Number of Times Present</span>
            <input type="number" id="nf_times_present" value="${nr.times_present ?? ''}" style="width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem;font-family:inherit;box-sizing:border-box">
          </div>
        </div>
        <div class="no-print" style="margin-top:10px;display:flex;gap:8px">
          <button id="saveNurseryBtn" style="padding:5px 14px;font-size:0.75rem;background:var(--color-primary);color:#fff;border:none;border-radius:6px;cursor:pointer">Save</button>
          <button id="cancelNurseryBtn" style="padding:5px 14px;font-size:0.75rem;background:#fff;border:1px solid #d1d5db;border-radius:6px;cursor:pointer">Cancel</button>
        </div>
      `;
      document.getElementById('cancelNurseryBtn').addEventListener('click', () => renderReportCard());
      document.getElementById('saveNurseryBtn').addEventListener('click', async () => {
        const saveBtn = document.getElementById('saveNurseryBtn');
        saveBtn.disabled = true;
        const nursery_record = {};
        textFields.forEach(([key]) => { nursery_record[key] = document.getElementById(`nf_${key}`).value.trim(); });
        const schoolOpened = document.getElementById('nf_times_school_opened').value;
        const timesPresent = document.getElementById('nf_times_present').value;
        nursery_record.times_school_opened = schoolOpened === '' ? null : Number(schoolOpened);
        nursery_record.times_present = timesPresent === '' ? null : Number(timesPresent);

        try {
          await window.RCA_API.call(`/students/${encodeURIComponent(admissionNo)}/review`, {
            method: 'PUT',
            body: { term, nursery_record }
          });
        } catch (e) {
          alert('Could not save records: ' + e.message);
          saveBtn.disabled = false;
          return;
        }
        delete resultsCache[`${admissionNo}|${term}`];
        renderReportCard();
      });
    });
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
    const isNursery = isNurseryClass(className);

    const behaviorMap = {};
    (summary.behavior || []).forEach(b => { behaviorMap[b.trait_code] = b.rating; });

    // The school's paper card shows CA as two tests. Our CA is four
    // 10-mark components (test/assessment/project/midterm — see
    // CA_COMPONENT_MAX), so they're paired into two 20-mark halves:
    // 1st Test = test + assessment, 2nd Test = project + midterm.
    // 1st + 2nd + Exam always equals the stored final_score.
    const fmt = n => Number((Number(n) || 0).toFixed(1));
    const subjectRows = summary.scores.length
      ? summary.scores.map(r => `
        <tr>
          <td class="rc-subject-cell">${r.subject_name || r.subject_id}</td>
          <td>${fmt(Number(r.test || 0) + Number(r.assessment || 0))}</td>
          <td>${fmt(Number(r.project || 0) + Number(r.midterm || 0))}</td>
          <td>${fmt(r.exam)}</td>
          <td class="rc-total-cell">${fmt(r.final_score)}</td>
          <td class="rc-grade-cell grade-${r.grade}">${r.grade}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="6" class="rc-empty-cell">No scores recorded for this term.</td></tr>`;

    const infoItems = [
      ['Pupil Name', student.full_name],
      ['Admission No', student.admission_no],
      ['Class', className],
      ['Gender', student.gender === 'male' ? 'Male' : 'Female'],
      ['Position in Class', `${ordinal(position)} of ${classSize}`],
      ['Overall Grade', `<span class="grade-${summary.overallGrade}">${summary.overallGrade}</span> — ${gradeToLabel(summary.overallGrade)}`]
    ];

    reportCardEl.innerHTML = `
      <div class="rc-header">
        <img src="../assets/images/logo.png" alt="Royal Crystal Academy badge">
        <div class="rc-school-name">Royal Crystal Academy</div>
        <div class="rc-school-meta">20/21 Amaigbo Lane, Uwani, Enugu State</div>
        <div class="rc-school-meta">Tel: 08036721390 / 09080061094</div>
        <div class="rc-title">${termLabel} Report Card &bull; 2025/2026 Session</div>
      </div>

      <div class="rc-info-grid">
        ${infoItems.map(([label, value]) => `
          <div class="rc-info-item">
            <span class="rc-info-label">${label}:</span>
            <span class="rc-info-value">${value}</span>
          </div>
        `).join('')}
      </div>

      <div class="rc-section rc-scores-section">
        <div class="rc-section-title">Academic Performance</div>
        <table class="rc-table">
          <thead>
            <tr>
              <th class="rc-subject-col">Subject</th>
              <th>1st Test<span class="rc-th-max">(20)</span></th>
              <th>2nd Test<span class="rc-th-max">(20)</span></th>
              <th>Exam<span class="rc-th-max">(60)</span></th>
              <th>Total<span class="rc-th-max">(100)</span></th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRows}
          </tbody>
        </table>
      </div>

      <div class="rc-summary-grid">
        <div class="rc-summary-box">
          <span class="rc-summary-num">${summary.subjectsCount}</span>
          <span class="rc-summary-label">Subjects Taken</span>
        </div>
        <div class="rc-summary-box">
          <span class="rc-summary-num">${fmt(summary.totalScore)}</span>
          <span class="rc-summary-label">Total Score</span>
        </div>
        <div class="rc-summary-box">
          <span class="rc-summary-num">${summary.average.toFixed(1)}%</span>
          <span class="rc-summary-label">Average Score</span>
        </div>
        <div class="rc-summary-box">
          <span class="rc-summary-num">${ordinal(position)}</span>
          <span class="rc-summary-label">Class Position (of ${classSize})</span>
        </div>
      </div>

      <div class="rc-remarks-grid">
        <div class="rc-remark-box">
          <span class="rc-remarks-label">Class Teacher's Remark:</span>
          <span class="rc-remark-text">${summary.comment ? `"${summary.comment}"` : generateRemark(summary.average)}</span>
        </div>
        <div class="rc-remark-box" id="htCommentBlock">
          <span class="rc-remarks-label">Head Teacher's Comment:</span>
          <span class="rc-remark-text" id="htCommentText">${summary.ht_comment ? `"${summary.ht_comment}"` : generateHtComment(summary.average)}</span>
          ${canEditHtComment ? `<button id="editHtCommentBtn" class="no-print" style="margin-top:6px;padding:2px 10px;font-size:0.72rem;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer">✏️ Edit</button>` : ''}
        </div>
      </div>

      ${isNursery ? renderNurseryRecordsSection(summary, className) : renderBehaviourSection(behaviorMap)}

      ${renderAttendanceSection(summary, classSize)}

      <div class="rc-footer">
        <div class="rc-grade-legend">
          <span class="rc-legend-title">Grading Key:</span>
          ${buildGradeLegend()}
        </div>

        <div class="rc-signatures">
          <div class="rc-signature">
            <div class="rc-signature-line"></div>
            <span class="rc-signature-label">Class Teacher's Signature</span>
          </div>
          <div class="rc-signature">
            <div class="rc-signature-line"></div>
            <span class="rc-signature-label">Head Teacher's Signature</span>
            <span class="rc-signature-name">Mrs. Ada Nwankwo</span>
          </div>
          <div class="rc-signature">
            <div class="rc-signature-line rc-signature-date">See School Calendar</div>
            <span class="rc-signature-label">Next Term Begins</span>
          </div>
          <div class="rc-stamp">School<br>Stamp</div>
        </div>
      </div>
    `;

    document.getElementById('editHtCommentBtn')?.addEventListener('click', () => {
      const block = document.getElementById('htCommentBlock');
      const current = summary.ht_comment || '';
      block.innerHTML = `
        <span class="rc-remarks-label">Head Teacher's Comment:</span>
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

    if (isNursery) wireNurseryEditButton(admissionNo, term, summary, className, classSize);
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
      return `<span class="legend-item"><strong class="grade-${band.grade}">${band.grade}</strong> = ${rangeLabel} ${band.label}</span>`;
    }).join('');
  }

  /* --------------------------------------------
     PRINT
     --------------------------------------------
     window.print() opens the browser's native print dialog. Our
     @media print CSS rules (in report-card.css) handle hiding the
     sidebar/toolbar, compressing the layout, and — via min-height on
     .report-card — filling the page even when content is short (e.g.
     a Pre-Nursery pupil with one subject). On 'beforeprint' we measure
     the actual rendered height as a safety net on top of that CSS
     floor and go one of two ways:
       - too tall  -> shrink the whole card down (CSS zoom), and stretch
                      its min-height so the zoomed card still fills the page
       - too short -> force an explicit inline min-height (in case the
                      CSS min-height ever fails to take effect — this
                      bit it once already, silently, after an unrelated
                      change, leaving a large blank gap at the bottom)
  */
  // Measures the card in its PRINT layout (.rc-printing: printed width
  // and spacing — see report-card.css), at its natural height (min-height
  // released), then zooms it to fit exactly one A4 page. A full card —
  // every subject, every trait, long comments — typically lands around
  // 0.7–0.8; the 0.5 floor only guards against absurd content.
  function fitReportCardToOnePage() {
    const el = document.getElementById('reportCard');
    if (!el) return;

    const A4_PRINTABLE_HEIGHT_PX = 1073; // 297mm minus 5mm top/bottom @page margins, minus a 3mm safety margin, at 96dpi
    const root = document.documentElement;

    root.style.setProperty('--rc-print-scale', '1');
    el.classList.add('rc-printing');
    el.style.minHeight = '0px';
    const contentHeight = el.getBoundingClientRect().height;

    const scale = contentHeight > A4_PRINTABLE_HEIGHT_PX
      ? Math.max(0.5, Math.floor((A4_PRINTABLE_HEIGHT_PX / contentHeight) * 1000) / 1000)
      : 1;
    root.style.setProperty('--rc-print-scale', String(scale));
    // min-height is in the card's own (zoomed) px, so divide by the scale
    // to make the shrunken card still reach the bottom of the page.
    el.style.minHeight = Math.floor(A4_PRINTABLE_HEIGHT_PX / scale) + 'px';
  }

  function resetAfterPrint() {
    const el = document.getElementById('reportCard');
    if (!el) return;
    el.classList.remove('rc-printing');
    el.style.minHeight = '';
    document.documentElement.style.setProperty('--rc-print-scale', '1');
  }

  window.addEventListener('beforeprint', fitReportCardToOnePage);
  window.addEventListener('afterprint', resetAfterPrint);

  printBtn.addEventListener('click', () => {
    // Fit first (also runs on 'beforeprint', e.g. for Ctrl+P) so the
    // layout is settled before the browser builds the print preview.
    fitReportCardToOnePage();
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
