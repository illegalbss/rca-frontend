/* ============================================
   CLASS REVIEW — class-review.js
   ============================================
   Used by the Class Teacher after Subject Teachers have submitted
   scores. Three jobs per pupil:
   1. Show a read-only academic summary (from the real scores table,
      via RCA_API.getStudentResults())
   2. Let the teacher rate each of the 13 behaviour traits 1-5
   3. Let the teacher write a free-text comment
   Both save straight to the real behavior_ratings/class_comments
   tables via RCA_API.saveClassReview(). The real result_approvals
   table only tracks draft/submitted/approved/returned — there's no
   separate "reviewed" stage, so this page doesn't advance approval
   status; that happens on the Approvals page once a Head Teacher
   approves a class that's been submitted.
*/

document.addEventListener('DOMContentLoaded', async () => {

  let allStudents    = await window.RCA_API.getStudents();
  const allClasses  = window.SCHOOL_CLASSES   || [];
  const traits         = window.BEHAVIOR_TRAITS || [];
  const ratingScale     = window.RATING_SCALE || [];
  const scoreToGrade      = window.scoreToGrade;
  const isNurseryClass    = window.isNurseryClass || (c => !!c && c.includes('Nursery'));

  const NURSERY_FIELDS = [
    ['breakfast_lunch', 'Breakfast/Lunch'],
    ['dressing', 'Dressing'],
    ['siesta', 'Siesta'],
    ['learning_ability', 'Learning Ability'],
    ['positive_traits', 'Positive Personality Traits'],
    ['negative_traits', 'Negative Traits']
  ];

  // Cache of admission_no -> results for the current term, populated
  // on demand so the pupil list and the open pupil panel don't refetch.
  let reviewCache = {};
  async function getReview(admissionNo, term) {
    const key = `${admissionNo}|${term}`;
    if (!reviewCache[key]) {
      reviewCache[key] = await window.RCA_API.getStudentResults(admissionNo, term);
    }
    return reviewCache[key];
  }

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
  // - class_teacher: ONLY their own form class — linked_classes[0], the same
  //   convention used everywhere else (Students roster, Attendance). There is
  //   no separate form_class column in the real schema, and a class_teacher's
  //   linked_classes can also include classes they merely subject-teach —
  //   those must NOT grant class-review rights, only the form class does.
  // - subject_teacher only: BLOCKED (page guard already redirected them)
  function getReviewableClasses() {
    const user = window.CURRENT_USER;
    if (!user) return allClasses;
    const roles = user.roles || [user.role];

    if (roles.includes('ict_admin') || roles.includes('head_teacher')) {
      return allClasses; // full access
    }

    if (roles.includes('class_teacher')) {
      const formClass = (user.linked_classes || [])[0];
      return formClass && allClasses.includes(formClass) ? [formClass] : [];
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

  /* ---- Approval banner (read-only status — approval itself happens
     on the Approvals page once a Head Teacher reviews a submitted class) ---- */
  async function renderApprovalBanner() {
    if (!window.loadApprovals || !window.getApprovalRecord) return;
    await window.loadApprovals(termSelect.value);
    const record = window.getApprovalRecord(classSelect.value, termSelect.value);
    const info = window.APPROVAL_STATUS_INFO[record.status];
    approvalBanner.className = `approval-banner tone-${info.tone}`;
    const messages = {
      draft:     'No scores submitted by subject teachers yet — nothing to review.',
      submitted: 'Subject teachers have submitted scores. Please review each pupil below; a Head Teacher will approve on the Approvals page.',
      approved:  'Head teacher has approved these results — visible to parents and students.',
      returned:  'Head teacher returned this for corrections. Please review and resubmit scores on the Score Entry page.'
    };
    approvalBanner.innerHTML = `<strong>Status: ${info.label}.</strong> ${messages[record.status] || ''}`;
    if (submitToHTBtn) submitToHTBtn.style.display = 'none';
  }

  /* ---- Pupil list ---- */
  async function renderPupilList() {
    const className = classSelect.value;
    const term = termSelect.value;
    const studentsInClass = allStudents
      .filter(s => s.class_name === className)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    const flags = await Promise.all(studentsInClass.map(async s => {
      const data = await getReview(s.admission_no, term);
      return { admissionNo: s.admission_no, hasComment: !!(data?.comment && data.comment.length > 0) };
    }));
    const reviewed = new Set(flags.filter(f => f.hasComment).map(f => f.admissionNo));

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
  async function openPupilReview(admissionNo) {
    currentPupilAdmNo = admissionNo;
    const term = termSelect.value;
    const student = allStudents.find(s => s.admission_no === admissionNo);
    const data = await getReview(admissionNo, term);
    const scores = data?.scores || [];
    const isNursery = isNurseryClass(student.class_name);
    const nurseryRecord = data?.nursery_record || {};

    const ratingsMap = {};
    (data?.behavior || []).forEach(b => { ratingsMap[b.trait_code] = b.rating; });
    const ratingRecord = { ratings: ratingsMap, comment: data?.comment || '' };

    /* --- Academic summary --- */
    const subjectRows = scores.map(r => `<tr>
        <td>${r.subject_name || r.subject_id}</td>
        <td>${Number(r.ca_total)}</td>
        <td>${Number(r.exam)}</td>
        <td><strong>${Number(r.final_score)}</strong></td>
        <td class="rc-grade-cell ${r.grade}">${r.grade}</td>
      </tr>`).join('');

    const avg = scores.length ? (scores.reduce((a, r) => a + Number(r.final_score || 0), 0) / scores.length) : 0;

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
          <span class="mini-num">${scores.length}</span>
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

      ${isNursery ? `
      <div class="traits-section">
        <h4>Cognitive &amp; Behavioural Records</h4>
        <p style="font-size:0.78rem;color:#6b7280;margin-bottom:12px">Nursery classes use this instead of the 1-5 trait ratings — matches the school's paper Nursery report card.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          ${NURSERY_FIELDS.map(([key, label]) => `
            <div class="form-group">
              <label class="form-label" style="font-size:0.8rem">${label}</label>
              <textarea class="form-control nursery-field-input" data-field="${key}" rows="2" style="font-size:0.85rem">${nurseryRecord[key] || ''}</textarea>
            </div>
          `).join('')}
          <div class="form-group">
            <label class="form-label" style="font-size:0.8rem">Number of Times School Opened</label>
            <input type="number" class="form-control nursery-field-input" data-field="times_school_opened" value="${nurseryRecord.times_school_opened ?? ''}">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:0.8rem">Number of Times Present</label>
            <input type="number" class="form-control nursery-field-input" data-field="times_present" value="${nurseryRecord.times_present ?? ''}">
          </div>
        </div>
      </div>
      ` : `
      <div class="traits-section">
        <h4>Behavioral &amp; Affective Ratings</h4>
        <div class="ratings-scale-legend">
          <span>1 — Poor</span><span>2 — Fair</span><span>3 — Good</span>
          <span>4 — Very Good</span><span>5 — Excellent</span>
        </div>
        <div class="traits-grid">${traitsHTML}</div>
      </div>
      `}

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

        ratingRecord.ratings[traitId] = val;
        saveStatus_set('Unsaved changes', 'unsaved');
      });
    });

    reviewPanel.querySelectorAll('.nursery-field-input').forEach(el => {
      el.addEventListener('input', () => saveStatus_set('Unsaved changes', 'unsaved'));
    });

    /* Save this pupil button */
    document.getElementById('savePupilBtn').addEventListener('click', async () => {
      const comment = document.getElementById('teacherComment').value.trim();
      const saveBtn = document.getElementById('savePupilBtn');
      saveBtn.disabled = true;

      let nurseryPayload;
      if (isNursery) {
        nurseryPayload = {};
        reviewPanel.querySelectorAll('.nursery-field-input').forEach(el => {
          const field = el.getAttribute('data-field');
          if (field === 'times_school_opened' || field === 'times_present') {
            nurseryPayload[field] = el.value === '' ? null : Number(el.value);
          } else {
            nurseryPayload[field] = el.value.trim();
          }
        });
      }

      try {
        await window.RCA_API.saveClassReview(admissionNo, term, ratingRecord.ratings, comment, nurseryPayload);
      } catch (e) {
        saveBtn.disabled = false;
        saveStatus_set('Save failed: ' + e.message, 'unsaved');
        return;
      }

      // Keep the cache in sync so the pupil list's "reviewed" tick
      // reflects this save without a refetch.
      const key = `${admissionNo}|${term}`;
      if (reviewCache[key]) reviewCache[key].comment = comment;

      saveBtn.disabled = false;
      const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      saveStatus_set(`Saved at ${now}`, 'saved');
      renderPupilList(); /* refresh tick marks */
    });

    /* Highlight active pupil in list */
    pupilList.querySelectorAll('.pupil-list-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-admission') === admissionNo);
    });
  }

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
