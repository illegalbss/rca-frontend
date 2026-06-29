/* ============================================
   CLASS REVIEW — class-review.js
   ============================================
   Used by the Class Teacher after Subject Teachers have submitted
   scores. Three jobs per pupil:
   1. Show a read-only academic summary (from SAMPLE_RESULTS)
   2. Let the teacher rate each of the 13 behaviour traits 1-5
   3. Let the teacher write a free-text comment
   Once every pupil is reviewed, submit the whole class to the
   Head Teacher (advances workflow status from 'submitted' -> 'reviewed').
*/

document.addEventListener('DOMContentLoaded', () => {

  const allStudents = window.SAMPLE_STUDENTS  || [];
  const allClasses  = window.SCHOOL_CLASSES   || [];
  const allSubjects = window.SCHOOL_SUBJECTS  || [];
  const results       = window.SAMPLE_RESULTS || {};
  const traits         = window.BEHAVIOR_TRAITS || [];
  const ratingScale     = window.RATING_SCALE || [];
  const behaviorRatings  = window.BEHAVIOR_RATINGS || {};
  const scoreToGrade      = window.scoreToGrade;

  const classSelect  = document.getElementById('classSelect');
  const termSelect    = document.getElementById('termSelect');
  const pupilList      = document.getElementById('pupilList');
  const reviewPanel     = document.getElementById('reviewPanel');
  const saveStatus       = document.getElementById('saveStatus');
  const reviewProgress    = document.getElementById('reviewProgress');
  const submitToHTBtn      = document.getElementById('submitToHeadTeacherBtn');
  const approvalBanner      = document.getElementById('approvalBanner');

  let currentPupilAdmNo = null;

  /* ---- Dropdowns — RBAC filtered ---- */
  // Determine which classes this user can review:
  // - ict_admin / head_teacher: all classes
  // - class_teacher with form_class: ONLY their form_class (the class they are form teacher for)
  // - class_teacher without form_class (Basic 1A/1B/2 form teachers): their linked_classes
  // - subject_teacher only: BLOCKED (page guard already redirected them)
  function getReviewableClasses() {
    const user = window.CURRENT_USER;
    if (!user) return allClasses;
    const roles = user.roles || [user.role];

    if (roles.includes('ict_admin') || roles.includes('head_teacher')) {
      return allClasses; // full access
    }

    if (roles.includes('class_teacher')) {
      // For Basic 3-6 form+subject teachers, form_class is the single class they review
      if (user.form_class) {
        return [user.form_class];
      }
      // For Basic 1A, 1B, Basic 2 form teachers — they review their own class
      return (user.linked_classes || []).filter(c => allClasses.includes(c));
    }

    return []; // no access
  }

  const reviewableClasses = getReviewableClasses();

  if (reviewableClasses.length === 0) {
    // Should not happen (page guard handles it), but just in case
    classSelect.innerHTML = '<option>No classes assigned</option>';
  } else {
    reviewableClasses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      classSelect.appendChild(opt);
    });
  }

  // Show a "view only" notice for head teacher / ict admin
  const curUser = window.CURRENT_USER;
  const curRoles = curUser ? (curUser.roles || [curUser.role]) : [];
  if ((curRoles.includes('head_teacher') || curRoles.includes('ict_admin')) && !curRoles.includes('class_teacher')) {
    const notice = document.createElement('div');
    notice.style.cssText = 'background:#dbeafe;border:1px solid #93c5fd;color:#1e40af;border-radius:8px;padding:10px 16px;margin-bottom:12px;font-size:0.82rem';
    notice.textContent = '👁 Viewing as ' + (curRoles.includes('ict_admin') ? 'ICT Administrator' : 'Head Teacher') + ' — you can view all class reviews. Only Form Teachers can enter behaviour ratings and comments.';
    document.querySelector('.admin-main').insertBefore(notice, document.querySelector('.approval-banner'));
  }

  function saveStatus_set(msg, cls) {
    saveStatus.textContent = msg;
    saveStatus.className = 'save-status ' + (cls || '');
  }

  /* ---- Approval banner ---- */
  function renderApprovalBanner() {
    if (!window.getApprovalRecord) return;
    const record = window.getApprovalRecord(classSelect.value, termSelect.value);
    const info = window.APPROVAL_STATUS_INFO[record.status];
    approvalBanner.className = `approval-banner tone-${info.tone}`;
    const messages = {
      draft:     'No scores submitted by subject teachers yet — nothing to review.',
      submitted: 'Subject teachers have submitted scores. Please review each pupil below.',
      reviewed:  'You have already submitted this class for head teacher approval.',
      approved:  'Head teacher has approved these results.',
      published: 'Results are published and visible to parents and students.',
      returned:  'Head teacher returned this for corrections. Please review and resubmit.'
    };
    approvalBanner.innerHTML = `<strong>Status: ${info.label}.</strong> ${messages[record.status] || ''}`;
    const canReview = ['submitted', 'returned'].includes(record.status);
    submitToHTBtn.disabled = !canReview;
  }

  /* ---- Pupil list ---- */
  function renderPupilList() {
    const className = classSelect.value;
    const studentsInClass = allStudents
      .filter(s => s.class_name === className)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    const reviewed = new Set(
      studentsInClass
        .filter(s => (behaviorRatings[s.admission_no]?.comment || '').length > 0)
        .map(s => s.admission_no)
    );

    const total = studentsInClass.length;
    const doneCount = reviewed.size;
    reviewProgress.textContent = `${doneCount} / ${total} pupils reviewed`;

    pupilList.innerHTML = studentsInClass.map(s => `
      <div class="pupil-list-item ${s.admission_no === currentPupilAdmNo ? 'active' : ''} ${reviewed.has(s.admission_no) ? 'reviewed' : ''}"
           data-admission="${s.admission_no}">
        <div class="pupil-list-avatar">${s.full_name.split(' ').map(p=>p[0]).join('').substring(0,2).toUpperCase()}</div>
        <div class="pupil-list-info">
          <div class="pupil-list-name">${s.full_name}</div>
          <div class="pupil-list-meta">${s.admission_no}</div>
        </div>
        ${reviewed.has(s.admission_no) ? '<span class="reviewed-tick">&#10003;</span>' : ''}
      </div>
    `).join('');

    pupilList.querySelectorAll('.pupil-list-item').forEach(item => {
      item.addEventListener('click', () => openPupilReview(item.getAttribute('data-admission')));
    });
  }

  /* ---- Open one pupil's review ---- */
  function openPupilReview(admissionNo) {
    currentPupilAdmNo = admissionNo;
    const student = allStudents.find(s => s.admission_no === admissionNo);
    const pupilResults = results[admissionNo] || {};
    const ratingRecord = behaviorRatings[admissionNo] || { ratings: {}, comment: '' };

    /* --- Academic summary --- */
    const subjectRows = allSubjects.map(subject => {
      const r = pupilResults[subject.id];
      if (!r) return '';
      return `<tr>
        <td>${subject.name}</td>
        <td>${r.caTotal}</td>
        <td>${r.examScore}</td>
        <td><strong>${r.finalScore}</strong></td>
        <td class="rc-grade-cell ${r.grade}">${r.grade}</td>
      </tr>`;
    }).join('');

    const allScores = allSubjects.map(s => (pupilResults[s.id] || {}).finalScore || 0);
    const avg = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

    /* --- Behaviour traits grid --- */
    const traitsHTML = traits.map(trait => {
      const current = ratingRecord.ratings[trait.id] || 0;
      const circles = [1, 2, 3, 4, 5].map(val => `
        <button class="rating-circle ${current === val ? 'active' : ''}"
                data-trait="${trait.id}" data-val="${val}"
                aria-label="${val} — ${ratingScale.find(r=>r.value===val)?.label || ''}">
          ${val}
        </button>
      `).join('');
      return `
        <div class="trait-row">
          <span class="trait-label">${trait.label}</span>
          <div class="trait-circles">${circles}</div>
          <span class="trait-value-label" id="traitLabel-${trait.id}">${current ? ratingScale.find(r=>r.value===current)?.label || '' : '—'}</span>
        </div>
      `;
    }).join('');

    reviewPanel.innerHTML = `
      <div class="review-panel-header">
        <div class="review-pupil-avatar">${student.full_name.split(' ').map(p=>p[0]).join('').substring(0,2).toUpperCase()}</div>
        <div>
          <h3>${student.full_name}</h3>
          <p class="review-pupil-meta">${student.class_name} &middot; ${student.admission_no}</p>
        </div>
      </div>

      <div class="academic-mini-summary">
        <div class="mini-summary-stat">
          <span class="mini-num">${avg.toFixed(1)}</span>
          <span class="mini-label">Average</span>
        </div>
        <div class="mini-summary-stat">
          <span class="mini-num">${scoreToGrade ? scoreToGrade(avg) : '—'}</span>
          <span class="mini-label">Overall Grade</span>
        </div>
        <div class="mini-summary-stat">
          <span class="mini-num">${allSubjects.length}</span>
          <span class="mini-label">Subjects</span>
        </div>
      </div>

      <details class="subject-details">
        <summary>View full subject breakdown</summary>
        <table class="mini-subject-table">
          <thead><tr><th>Subject</th><th>CA</th><th>Exam</th><th>Total</th><th>Grade</th></tr></thead>
          <tbody>${subjectRows}</tbody>
        </table>
      </details>

      <div class="traits-section">
        <h4>Behavioral &amp; Affective Ratings</h4>
        <div class="ratings-scale-legend">
          <span>1 — Poor</span><span>2 — Fair</span><span>3 — Good</span>
          <span>4 — Very Good</span><span>5 — Excellent</span>
        </div>
        <div class="traits-grid">${traitsHTML}</div>
      </div>

      <div class="comment-section">
        <h4>Class Teacher's Comment</h4>
        <textarea id="teacherComment" class="form-control comment-textarea"
          placeholder="Write a remark about this pupil's overall performance and character this term...">${ratingRecord.comment || ''}</textarea>
      </div>

      <button class="btn btn-primary save-pupil-btn" id="savePupilBtn">Save This Pupil</button>
    `;

    /* Wire up rating circles */
    reviewPanel.querySelectorAll('.rating-circle').forEach(btn => {
      btn.addEventListener('click', () => {
        const traitId = btn.getAttribute('data-trait');
        const val = parseInt(btn.getAttribute('data-val'));

        /* Clear active state for this trait */
        reviewPanel.querySelectorAll(`[data-trait="${traitId}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const labelEl = document.getElementById(`traitLabel-${traitId}`);
        if (labelEl) labelEl.textContent = ratingScale.find(r => r.value === val)?.label || '';

        if (!behaviorRatings[admissionNo]) behaviorRatings[admissionNo] = { ratings: {}, comment: '' };
        behaviorRatings[admissionNo].ratings[traitId] = val;
        saveStatus_set('Unsaved changes', 'unsaved');
      });
    });

    /* Save this pupil button */
    document.getElementById('savePupilBtn').addEventListener('click', () => {
      const comment = document.getElementById('teacherComment').value.trim();
      if (!behaviorRatings[admissionNo]) behaviorRatings[admissionNo] = { ratings: {}, comment: '' };
      behaviorRatings[admissionNo].comment = comment;

      const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      saveStatus_set(`Saved at ${now}`, 'saved');
      renderPupilList(); /* refresh tick marks */
    });

    /* Highlight active pupil in list */
    pupilList.querySelectorAll('.pupil-list-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-admission') === admissionNo);
    });
  }

  /* ---- Submit class to Head Teacher ---- */
  submitToHTBtn.addEventListener('click', () => {
    const record = window.getApprovalRecord(classSelect.value, termSelect.value);
    record.status = 'reviewed';
    record.reviewed_by = window.CURRENT_USER?.full_name || 'Class Teacher';
    if (window.RCA) { window.RCA.save('behavior'); window.RCA.save('approvals'); }
    record.reviewed_at = new Date().toISOString();
    renderApprovalBanner();
    saveStatus_set('Submitted to Head Teacher', 'saved');
  });

  /* ---- Event listeners ---- */
  classSelect.addEventListener('change', () => {
    currentPupilAdmNo = null;
    reviewPanel.innerHTML = '<p class="review-empty-state">Select a pupil from the list to begin their review.</p>';
    renderPupilList();
    renderApprovalBanner();
  });

  termSelect.addEventListener('change', () => {
    renderApprovalBanner();
    renderPupilList();
  });

  /* ---- Init ---- */
  renderApprovalBanner();
  renderPupilList();
});
