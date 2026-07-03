/* ============================================
   SCORE ENTRY — score-entry.js
   ============================================
   Depends on window.SAMPLE_STUDENTS, window.SCHOOL_CLASSES,
   window.SCHOOL_SUBJECTS, window.CA_COMPONENT_MAX, window.EXAM_MAX,
   window.computeFinalScore, and window.SAMPLE_RESULTS
   (see script order in score-entry.html).

   CORE IDEA: pick a class + subject, see every pupil's scores in
   an editable grid. Typing in any score field immediately
   recalculates that row's CA Total, Final Score, and Grade -
   no "calculate" button needed, since computeFinalScore() is cheap
   to re-run on every keystroke for a class-sized list (~40 rows).

   This page WRITES into the same SAMPLE_RESULTS object that
   sample-results.js generated, using the exact same computeFinalScore()
   function from subjects-and-grading.js - so a score entered here
   and a score from the generator are computed identically, and
   the Report Card page (built next) can read from this same object.
*/

document.addEventListener('DOMContentLoaded', () => {

  const allStudents = window.SAMPLE_STUDENTS || [];
  const allClasses  = window.SCHOOL_CLASSES || [];
  const allSubjects = window.SCHOOL_SUBJECTS || [];
  const caMax        = window.CA_COMPONENT_MAX || { test: 10, assessment: 10, project: 10, midterm: 10 };
  const examMax       = window.EXAM_MAX || 60;
  const computeFinalScore = window.computeFinalScore;
  const results        = window.SAMPLE_RESULTS || {};

  let hasUnsavedChanges = false;

  /* --------------------------------------------
     ELEMENT REFERENCES
     -------------------------------------------- */
  const classSelect    = document.getElementById('classSelect');
  const subjectSelect  = document.getElementById('subjectSelect');
  const termSelect      = document.getElementById('termSelect');
  const summaryContainer = document.getElementById('scoreSummary');
  const searchInput      = document.getElementById('scoreSearch');
  const tableBody         = document.getElementById('scoreTableBody');
  const noResultsMsg      = document.getElementById('noScoreResults');
  const saveStatus        = document.getElementById('saveStatus');
  const saveBtn            = document.getElementById('saveScoresBtn');
  const approvalBanner      = document.getElementById('approvalBanner');
  const submitForReviewBtn   = document.getElementById('submitForReviewBtn');

  function getInitials(fullName) {
    return fullName.split(' ').map(p => p.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  /* --------------------------------------------
     POPULATE DROPDOWNS
     -------------------------------------------- */
  /* --------------------------------------------
     RBAC-FILTERED DROPDOWNS
     -------------------------------------------- 
     Subject Teachers and Form Teachers only see the classes
     and subjects they are personally assigned to.
     Head Teacher and ICT Admin see everything (but Head Teacher
     cannot edit scores unless also assigned as a teacher).
     Accountants have no access to score entry.
  */
  function getPermittedClasses() {
    const user = window.CURRENT_USER;
    if (!user) return allClasses;
    const userRoles = user.roles || [user.role];
    // Full access roles see all classes
    if (userRoles.includes('ict_admin') || userRoles.includes('head_teacher')) return allClasses;
    // Teachers see only their assigned classes
    const linked = user.linked_classes || [];
    if (linked.length === 0) return allClasses;
    // Case-insensitive matching
    return allClasses.filter(cls =>
      linked.some(lc => lc.trim().toLowerCase() === cls.trim().toLowerCase())
    );
  }

  function getPermittedSubjects() {
    const user = window.CURRENT_USER;
    if (!user) return allSubjects;
    const userRoles = user.roles || [user.role];

    // Full access roles see all subjects
    if (userRoles.includes('ict_admin') || userRoles.includes('head_teacher') || userRoles.includes('proprietor')) {
      return allSubjects;
    }

    const linked = user.linked_subjects || [];

    // Empty or ALL means all subjects (form teachers)
    if (linked.length === 0) return allSubjects;

    // linked_subjects now stores subject IDs (eng, mth, ict etc.)
    // Filter allSubjects to only those whose ID is in linked_subjects
    return allSubjects.filter(s => linked.includes(s.id));
  }

  /* Can this user EDIT scores? (read-only for Head Teacher unless assigned as teacher) */
  function canEditScores() {
    const user = window.CURRENT_USER;
    if (!user) return false;
    const userRoles = user.roles || [user.role];
    // ICT Admin and Head Teacher have full edit access per spec update
    if (userRoles.includes('ict_admin'))    return true;
    if (userRoles.includes('head_teacher')) return true;
    if (userRoles.includes('subject_teacher') || userRoles.includes('class_teacher')) return true;
    return false;
  }

  function populateDropdowns() {
    const permittedClasses  = getPermittedClasses();
    const permittedSubjects = getPermittedSubjects();

    classSelect.innerHTML = permittedClasses.length > 0
      ? permittedClasses.map(c => `<option value="${c}">${c}</option>`).join('')
      : '<option value="">No classes assigned</option>';

    subjectSelect.innerHTML = permittedSubjects.length > 0
      ? permittedSubjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
      : '<option value="">No subjects assigned</option>';

    // Head Teacher and ICT Admin both have full edit access
    const user = window.CURRENT_USER;
    const userRoles = user ? (user.roles || [user.role]) : [];
    // No view-only restriction for head_teacher anymore
  }

  /* --------------------------------------------
     GET a pupil's result record for the current subject,
     creating a blank one if it doesn't exist yet
     -------------------------------------------- */
  function getResultRecord(admissionNo, subjectId) {
    if (!results[admissionNo]) results[admissionNo] = {};
    if (!results[admissionNo][subjectId]) {
      const blank = { test: 0, assessment: 0, project: 0, midterm: 0, exam: 0 };
      results[admissionNo][subjectId] = { ...blank, ...computeFinalScore(blank) };
    }
    return results[admissionNo][subjectId];
  }

  /* --------------------------------------------
     CORE RENDER
     -------------------------------------------- */
  function renderTable() {
    const className = classSelect.value;
    const subjectId = subjectSelect.value;
    if (!className || !subjectId) return;

    // RBAC guard: verify the selected class AND subject are both permitted
    // for this user. This prevents manipulation of the dropdown HTML.
    const permitted = getPermittedClasses();
    const permittedSubs = getPermittedSubjects();
    if (!permitted.includes(className)) {
      tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--color-danger);padding:2rem">&#128683; You are not assigned to this class.</td></tr>';
      return;
    }
    if (!permittedSubs.find(s => s.id === subjectId)) {
      tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--color-danger);padding:2rem">&#128683; You are not assigned to this subject.</td></tr>';
      return;
    }

    let students = allStudents.filter(s => s.class_name === className);

    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm) {
      students = students.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm) ||
        s.admission_no.toLowerCase().includes(searchTerm)
      );
    }

    // Alphabetical order is the natural order for a marking sheet
    students = [...students].sort((a, b) => a.full_name.localeCompare(b.full_name));

    renderSummary(className, subjectId);

    if (students.length === 0) {
      tableBody.innerHTML = '';
      noResultsMsg.style.display = 'block';
      return;
    }
    noResultsMsg.style.display = 'none';

    tableBody.innerHTML = students.map(student => {
      const r = getResultRecord(student.admission_no, subjectId);
      return `
        <tr data-admission="${student.admission_no}">
          <td class="col-avatar" data-label=""><div class="row-avatar">${getInitials(student.full_name)}</div></td>
          <td class="pupil-name-cell" data-label="">${student.full_name}</td>
          <td data-label="Test /${caMax.test}"><input type="number" class="score-input ca-input" data-component="test" min="0" max="${caMax.test}" value="${r.test}"></td>
          <td data-label="Assessment /${caMax.assessment}"><input type="number" class="score-input ca-input" data-component="assessment" min="0" max="${caMax.assessment}" value="${r.assessment}"></td>
          <td data-label="Project /${caMax.project}"><input type="number" class="score-input ca-input" data-component="project" min="0" max="${caMax.project}" value="${r.project}"></td>
          <td data-label="Mid-term /${caMax.midterm}"><input type="number" class="score-input ca-input" data-component="midterm" min="0" max="${caMax.midterm}" value="${r.midterm}"></td>
          <td class="ca-total-col" data-label="CA Total /40"><span class="computed-value ca-total-display">${r.caTotal}</span></td>
          <td data-label="Exam /${examMax}"><input type="number" class="score-input exam-input ca-input" data-component="exam" min="0" max="${examMax}" value="${r.exam}"></td>
          <td class="final-col" data-label="Final /100"><span class="computed-value final-score-display ${r.finalScore >= 40 ? 'above-pass' : 'below-pass'}">${r.finalScore}</span></td>
          <td data-label="Grade"><span class="grade-pill ${r.grade} grade-display">${r.grade}</span></td>
        </tr>
      `;
    }).join('');

    wireUpInputs(subjectId);
  }

  /* --------------------------------------------
     WIRE UP LIVE RECALCULATION
     -------------------------------------------- 
     Every score input gets an 'input' listener (fires on every
     keystroke, not just on blur). On each change we:
     1. Clamp/validate the typed value against that component's max
     2. Update the in-memory results object
     3. Recompute caTotal/finalScore/grade via computeFinalScore()
     4. Update just THIS row's computed cells (not a full re-render -
        re-rendering the whole table on every keystroke would steal
        focus from the input the person is actively typing in)
  */
  function lockTableIfNeeded() {
    /* Lock all inputs if:
       1. Approval status is submitted/reviewed/approved/published (score submitted)
       2. OR current user cannot edit (Head Teacher without teacher assignment)
    */
    const className = classSelect.value;
    const term = termSelect.value;
    const approval = window.getApprovalRecord ? window.getApprovalRecord(className, term) : { status: 'draft' };
    // ICT Admin and Head Teacher can always edit regardless of approval status
    const user = window.CURRENT_USER;
    const ur   = user ? (user.roles || [user.role]) : [];
    const isSuperUser = ur.includes('ict_admin') || ur.includes('head_teacher');
    const locked = !canEditScores() || (!isSuperUser && ['submitted','reviewed','approved','published'].includes(approval.status));

    tableBody.querySelectorAll('.score-input').forEach(inp => {
      inp.disabled = locked;
      inp.style.background = locked ? '#f8fafc' : '';
      inp.style.color      = locked ? '#94a3b8' : '';
      inp.style.cursor     = locked ? 'not-allowed' : '';
    });

    if (saveBtn) saveBtn.disabled = locked;
    if (submitForReviewBtn) {
      const canSubmit = canEditScores() && approval.status === 'draft' || approval.status === 'returned';
      submitForReviewBtn.disabled = !canSubmit || locked && approval.status !== 'draft';
    }

    if (locked && canEditScores()) {
      // Scores are locked because submitted — show in banner (handled by renderApprovalBanner)
    }
  }

  function wireUpInputs(subjectId) {
    lockTableIfNeeded(); // apply locks before wiring
    tableBody.querySelectorAll('.ca-input').forEach(input => {
      input.addEventListener('input', () => {
        const row = input.closest('tr');
        const admissionNo = row.getAttribute('data-admission');
        const component = input.getAttribute('data-component');
        const max = parseInt(input.getAttribute('max'), 10);

        let value = parseInt(input.value, 10);
        if (isNaN(value)) value = 0;

        // Visual feedback for an out-of-range value, but we still
        // CLAMP the value used in the math - a teacher mistyping
        // "15" in a /10 field shouldn't silently break the final score
        const isInvalid = value > max || value < 0;
        input.classList.toggle('invalid', isInvalid);
        const clampedValue = Math.max(0, Math.min(max, value));

        const record = getResultRecord(admissionNo, subjectId);
        record[component] = clampedValue;

        const computed = computeFinalScore(record);
        Object.assign(record, computed);

        // Update just this row's read-only cells - not the whole table
        row.querySelector('.ca-total-display').textContent = record.caTotal;

        const finalDisplay = row.querySelector('.final-score-display');
        finalDisplay.textContent = record.finalScore;
        finalDisplay.classList.toggle('above-pass', record.finalScore >= 40);
        finalDisplay.classList.toggle('below-pass', record.finalScore < 40);

        const gradeDisplay = row.querySelector('.grade-display');
        gradeDisplay.textContent = record.grade;
        gradeDisplay.className = `grade-pill ${record.grade} grade-display`;

        markUnsaved();
        renderSummary(classSelect.value, subjectId);
      });
    });
  }

  /* --------------------------------------------
     SUMMARY CARDS: class average, pass rate, grade spread
     -------------------------------------------- */
  function renderSummary(className, subjectId) {
    const studentsInClass = allStudents.filter(s => s.class_name === className);
    if (studentsInClass.length === 0) {
      summaryContainer.innerHTML = '';
      return;
    }

    const records = studentsInClass.map(s => getResultRecord(s.admission_no, subjectId));
    const average = records.reduce((sum, r) => sum + r.finalScore, 0) / records.length;
    const passCount = records.filter(r => r.finalScore >= 40).length;
    const passRate = Math.round((passCount / records.length) * 100);
    const topScore = Math.max(...records.map(r => r.finalScore));
    const gradeACounts = records.filter(r => r.grade === 'A').length;

    summaryContainer.innerHTML = `
      <div class="card">
        <span class="num">${average.toFixed(1)}</span>
        <span class="label">Class Average</span>
      </div>
      <div class="card">
        <span class="num">${passRate}%</span>
        <span class="label">Pass Rate (≥40)</span>
      </div>
      <div class="card">
        <span class="num">${topScore}</span>
        <span class="label">Top Score</span>
      </div>
      <div class="card">
        <span class="num grade-a">${gradeACounts}</span>
        <span class="label">Grade A Pupils</span>
      </div>
    `;
  }

  /* --------------------------------------------
     SAVE STATUS INDICATOR
     -------------------------------------------- */
  function markUnsaved() {
    hasUnsavedChanges = true;
    saveStatus.textContent = 'Unsaved changes';
    saveStatus.className = 'save-status unsaved';
  }

  function markSaved() {
    hasUnsavedChanges = false;
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    saveStatus.textContent = `Saved at ${timeString}`;
    saveStatus.className = 'save-status saved';
  }

  saveBtn.addEventListener('click', async () => {
    markSaved();
    if (window.RCA) window.RCA.save('results');

    // Phase 4: save scores to real database
    if (window.RCA_API) {
      const className   = classSelect.value;
      const subjectCode = subjectSelect.value;
      const term        = termSelect.value;

      // Get all score rows and send each to API
      const rows = document.querySelectorAll('.score-row');
      for (const row of rows) {
        const studentId = row.dataset.admissionNo;
        if (!studentId) continue;
        const inputs = row.querySelectorAll('input[type="number"]');
        if (!inputs.length) continue;
        const scores = {
          test:       parseInt(inputs[0]?.value) || 0,
          assessment: parseInt(inputs[1]?.value) || 0,
          project:    parseInt(inputs[2]?.value) || 0,
          midterm:    parseInt(inputs[3]?.value) || 0,
          exam:       parseInt(inputs[4]?.value) || 0
        };
        // Fire and forget — don't wait for each one
        window.RCA_API.saveScore(studentId, subjectCode, term, scores)
          .catch(e => console.warn('Score save failed for', studentId, e.message));
      }
    }
  });

  /* --------------------------------------------
     APPROVAL WORKFLOW: status banner + submit button
     -------------------------------------------- 
     Reads/writes window.RESULT_APPROVALS via the shared
     getApprovalRecord() helper from result-approvals.js, so this
     page, the Class Teacher review page, the Head Teacher approval
     page, and the ICT publish page all see the SAME status for a
     given class+term - one shared workflow state, not separate
     copies that could disagree with each other.
  */
  function renderApprovalBanner() {
    if (!window.getApprovalRecord) return; // safety check if script didn't load

    const className = classSelect.value;
    const term = termSelect.value;
    const record = window.getApprovalRecord(className, term);
    const statusInfo = window.APPROVAL_STATUS_INFO[record.status];

    let message = '';
    let canSubmit = true;

    switch (record.status) {
      case 'draft':
        message = 'This class/term has not been submitted for review yet.';
        break;
      case 'submitted':
        message = 'Submitted and awaiting the class teacher\'s review.';
        canSubmit = false;
        break;
      case 'reviewed':
        message = 'Reviewed by the class teacher, awaiting head teacher approval.';
        canSubmit = false;
        break;
      case 'approved':
        message = 'Approved by the head teacher, awaiting publication.';
        canSubmit = false;
        break;
      case 'published':
        message = 'Published — visible to parents and students. Editing now will not change what they see until republished.';
        canSubmit = false;
        break;
      case 'returned':
        message = `Sent back for correction${record.return_reason ? ': ' + record.return_reason : ''}. Please review and resubmit.`;
        canSubmit = true;
        break;
    }

    approvalBanner.className = `approval-banner tone-${statusInfo.tone}`;
    approvalBanner.innerHTML = `<strong>Status: ${statusInfo.label}.</strong> ${message}`;

    submitForReviewBtn.disabled = !canSubmit;
    submitForReviewBtn.textContent = record.status === 'returned' ? 'Resubmit for Review' : 'Submit for Review';
  }

  submitForReviewBtn.addEventListener('click', () => {
    const className = classSelect.value;
    const term = termSelect.value;
    const record = window.getApprovalRecord(className, term);

    record.status = 'submitted';
    record.submitted_by = window.CURRENT_USER ? window.CURRENT_USER.full_name : 'Subject Teacher';
    record.submitted_at = new Date().toISOString();
    record.return_reason = null;

    markSaved();
    if (window.RCA) window.RCA.save('results');
    if (window.logActivity) window.logActivity('create', `Scores submitted for review: ${className} — ${subjectSelect.options[subjectSelect.selectedIndex]?.text || subjectSelect.value} (${term})`, 'scores');
    renderApprovalBanner();
    lockTableIfNeeded();
    if (window.RCA) { window.RCA.save('results'); window.RCA.save('approvals'); }

    // Phase 4: submit to real database
    if (window.RCA_API) {
      window.RCA_API.submitScores(className, subjectSelect.value, term)
        .catch(e => console.warn('Score submit API failed:', e.message));
    }
  });

  /* --------------------------------------------
     EVENT LISTENERS
     -------------------------------------------- */
  classSelect.addEventListener('change', () => {
    searchInput.value = '';
    renderTable();
    renderApprovalBanner();
  });
  subjectSelect.addEventListener('change', renderTable);
  termSelect.addEventListener('change', () => {
    renderTable();
    renderApprovalBanner();
  });
  searchInput.addEventListener('input', renderTable);

  window.addEventListener('beforeunload', (event) => {
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  /* --------------------------------------------
     INITIALIZE
     -------------------------------------------- */
  populateDropdowns();
  const permittedCls  = getPermittedClasses();
  const permittedSubs = getPermittedSubjects();

  /* ---- Role access notice ---- */
  const noticeEl = document.getElementById('roleAccessNotice');
  if (noticeEl && window.CURRENT_USER) {
    const u = window.CURRENT_USER;
    const ur = u.roles || [u.role];
    let noticeHTML = '';
    if (ur.includes('ict_admin') || ur.includes('head_teacher')) {
      noticeHTML = `<div style="background:#dbeafe;border:1px solid #93c5fd;color:#1e40af;border-radius:8px;padding:10px 16px;margin-bottom:12px;font-size:0.82rem">
        <strong>Full Access:</strong> As ${ur.includes('ict_admin') ? 'ICT Administrator' : 'Head Teacher'}, you can enter and edit scores for any class and subject.
      </div>`;
    } else if (ur.includes('subject_teacher') && !ur.includes('class_teacher')) {
      noticeHTML = `<div style="background:#fef9c3;border:1px solid #fde68a;color:#713f12;border-radius:8px;padding:10px 16px;margin-bottom:12px;font-size:0.82rem">
        <strong>⚠ Subject Teacher Access:</strong> You can only enter scores for: <strong>${(u.linked_subjects||[]).join(', ') || 'your assigned subjects'}</strong>
        in <strong>${(u.linked_classes||[]).join(', ') || 'your assigned classes'}</strong>.
        You cannot approve results, print report cards, or review classes.<br>
        <em>Once submitted, scores are locked. Contact the Head Teacher for corrections.</em>
        ${u.note ? `<br><span style="color:#b91c1c">Note: ${u.note}</span>` : ''}
      </div>`;
    } else if (ur.includes('class_teacher')) {
      const formCls = u.form_class || (u.linked_classes||[])[0] || 'your class';
      const canSubjects = (u.linked_subjects||[]).length > 0
        ? `<strong>${(u.linked_subjects||[]).join(', ')}</strong>` : 'all subjects for your class';
      noticeHTML = `<div style="background:#d1fae5;border:1px solid #6ee7b7;color:#064e3b;border-radius:8px;padding:10px 16px;margin-bottom:12px;font-size:0.82rem">
        <strong>Form Teacher Access:</strong> You can enter scores for ${canSubjects}
        in <strong>${(u.linked_classes||[]).join(', ')}</strong>.
        You can also rate behaviour and add comments for <strong>${formCls}</strong> in Class Review.
      </div>`;
    }
    noticeEl.innerHTML = noticeHTML;
  }
  const defaultClass  = permittedCls.find(c => c.startsWith('Basic')) || permittedCls[0] || '';
  classSelect.value   = defaultClass;
  subjectSelect.value = permittedSubs.length > 0 ? permittedSubs[0].id : '';
  renderTable();
  renderApprovalBanner();
  markSaved(); // starts in a "saved" state since nothing's been edited yet

});
