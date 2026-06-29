/* ============================================
   PROMOTION RECORDS — promotion.js
   ============================================
   Depends on window.SAMPLE_STUDENTS, window.SCHOOL_CLASSES,
   window.SAMPLE_PROMOTION_SCORES, and window.PROMOTION_PASS_THRESHOLD
   (see script order in promotion.html).

   CORE IDEA: every pupil gets a SUGGESTED decision computed from
   their average score vs the pass threshold. Staff can OVERRIDE
   any individual suggestion via a dropdown. We track overrides
   SEPARATELY from suggestions, so "Apply Suggested to All" can
   reset everyone back to the computed default at any time without
   losing the distinction between "the rule decided this" and
   "a human decided this differently".

   Basic 6 is a special case: there's no "next class" to promote
   into - pupils who pass GRADUATE (leave the school) instead.
*/

document.addEventListener('DOMContentLoaded', () => {

  const allStudents = window.SAMPLE_STUDENTS || [];
  const allClasses  = window.SCHOOL_CLASSES || [];
  const scores       = window.SAMPLE_PROMOTION_SCORES || {};
  const PASS_THRESHOLD = window.PROMOTION_PASS_THRESHOLD || 40;

  // Tracks manual overrides PER CLASS so switching classes and coming
  // back doesn't lose anyone's overrides during this page visit.
  // Shape: { "Basic 5": { "RCA/2024/0012": "repeat", ... }, ... }
  const overridesByClass = {};

  let currentClass = null;
  let promotionsApplied = false;

  /* --------------------------------------------
     ELEMENT REFERENCES
     -------------------------------------------- */
  const sourceClassSelect  = document.getElementById('sourceClassSelect');
  const promotionArrowText = document.getElementById('promotionArrowText');
  const summaryContainer    = document.getElementById('promotionSummary');
  const searchInput         = document.getElementById('promotionSearch');
  const applyThresholdBtn   = document.getElementById('applyThresholdBtn');
  const tableBody            = document.getElementById('promotionTableBody');
  const noResultsMsg         = document.getElementById('noPromotionResults');
  const confirmBarStatus     = document.getElementById('confirmBarStatus');
  const applyPromotionsBtn   = document.getElementById('applyPromotionsBtn');

  const modalOverlay   = document.getElementById('confirmModalOverlay');
  const modalCloseBtn  = document.getElementById('modalCloseBtn');
  const modalBody       = document.getElementById('confirmModalBody');
  const cancelApplyBtn  = document.getElementById('cancelApplyBtn');
  const confirmApplyBtn = document.getElementById('confirmApplyBtn');

  /* --------------------------------------------
     HELPERS
     -------------------------------------------- */
  function getInitials(fullName) {
    return fullName.split(' ').map(p => p.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  // Given a class name, what's the NEXT class pupils promote into?
  // Returns null for Basic 6, since there is no next class - those
  // pupils graduate (leave the school) instead of moving up.
  function getNextClass(className) {
    const index = allClasses.indexOf(className);
    if (index === -1 || index === allClasses.length - 1) return null;
    return allClasses[index + 1];
  }

  // The auto-SUGGESTED decision, based purely on the score threshold.
  // This NEVER reflects manual overrides - it's always "what the rule says".
  function getSuggestedDecision(className, score) {
    const isLastClass = getNextClass(className) === null;
    if (score >= PASS_THRESHOLD) {
      return isLastClass ? 'graduate' : 'promote';
    }
    return 'repeat';
  }

  // The ACTUAL decision for a pupil: their override if one exists,
  // otherwise falls back to the suggested decision.
  function getActualDecision(className, admissionNo, score) {
    const classOverrides = overridesByClass[className] || {};
    return classOverrides[admissionNo] || getSuggestedDecision(className, score);
  }

  function decisionLabel(decision) {
    return decision.charAt(0).toUpperCase() + decision.slice(1);
  }

  /* --------------------------------------------
     POPULATE THE CLASS DROPDOWN
     -------------------------------------------- */
  function populateClassDropdown() {
    sourceClassSelect.innerHTML = allClasses
      .map(className => `<option value="${className}">${className}</option>`)
      .join('');
  }

  /* --------------------------------------------
     UPDATE THE "promotes into..." TEXT
     -------------------------------------------- */
  function updateArrowText(className) {
    const nextClass = getNextClass(className);
    promotionArrowText.textContent = nextClass
      ? `\u2192 promotes into ${nextClass}`
      : `\u2192 final year — passing pupils graduate`;
  }

  /* --------------------------------------------
     CORE RENDER
     -------------------------------------------- */
  function renderTable() {
    const className = sourceClassSelect.value;
    if (!className) return;

    let students = allStudents.filter(s => s.class_name === className);

    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm) {
      students = students.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm) ||
        s.admission_no.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by score descending - highest performers first, which is
    // a natural reading order for a review-and-approve task like this
    students = [...students].sort((a, b) => scores[b.admission_no] - scores[a.admission_no]);

    if (students.length === 0) {
      tableBody.innerHTML = '';
      noResultsMsg.style.display = 'block';
      renderSummary(className);
      return;
    }
    noResultsMsg.style.display = 'none';

    tableBody.innerHTML = students.map(student => {
      const score = scores[student.admission_no];
      const suggested = getSuggestedDecision(className, score);
      const actual = getActualDecision(className, student.admission_no, score);
      const isOverridden = actual !== suggested;
      const isLastClass = getNextClass(className) === null;

      // The options available depend on whether this is Basic 6
      // (Graduate instead of Promote) or any earlier class
      const promoteOptionLabel = isLastClass ? 'Graduate' : 'Promote';
      const promoteOptionValue = isLastClass ? 'graduate' : 'promote';

      return `
        <tr>
          <td class="col-avatar"><div class="row-avatar">${getInitials(student.full_name)}</div></td>
          <td>${student.full_name}</td>
          <td>
            <span class="score-value ${score >= PASS_THRESHOLD ? 'above-threshold' : 'below-threshold'}">${score}%</span>
          </td>
          <td><span class="decision-badge ${suggested}">${decisionLabel(suggested)}</span></td>
          <td>
            <select class="form-control decision-select ${isOverridden ? 'overridden' : ''}" data-admission="${student.admission_no}">
              <option value="${promoteOptionValue}" ${actual === promoteOptionValue ? 'selected' : ''}>${promoteOptionLabel}</option>
              <option value="repeat" ${actual === 'repeat' ? 'selected' : ''}>Repeat</option>
            </select>
          </td>
        </tr>
      `;
    }).join('');

    // Wire up override dropdowns
    tableBody.querySelectorAll('.decision-select').forEach(select => {
      select.addEventListener('change', () => {
        const admissionNo = select.getAttribute('data-admission');
        const student = allStudents.find(s => s.admission_no === admissionNo);
        const suggested = getSuggestedDecision(className, scores[admissionNo]);

        if (!overridesByClass[className]) overridesByClass[className] = {};

        if (select.value === suggested) {
          // Selecting back to the suggested value clears the override,
          // rather than storing a redundant "override" that matches
          // the default anyway
          delete overridesByClass[className][admissionNo];
        } else {
          overridesByClass[className][admissionNo] = select.value;
        }

        select.classList.toggle('overridden', select.value !== suggested);
        renderSummary(className);
        markNotYetApplied();
      });
    });

    renderSummary(className);
  }

  /* --------------------------------------------
     RENDER SUMMARY CARDS
     -------------------------------------------- */
  function renderSummary(className) {
    const studentsInClass = allStudents.filter(s => s.class_name === className);
    const isLastClass = getNextClass(className) === null;

    const counts = { promote: 0, repeat: 0, graduate: 0 };
    studentsInClass.forEach(s => {
      const decision = getActualDecision(className, s.admission_no, scores[s.admission_no]);
      counts[decision]++;
    });

    if (isLastClass) {
      summaryContainer.innerHTML = `
        <div class="card summary-card-promo graduate">
          <span class="num">${counts.graduate}</span>
          <span class="label">Graduate</span>
        </div>
        <div class="card summary-card-promo repeat">
          <span class="num">${counts.repeat}</span>
          <span class="label">Repeat Basic 6</span>
        </div>
        <div class="card summary-card-promo">
          <span class="num">${studentsInClass.length}</span>
          <span class="label">Total Pupils</span>
        </div>
      `;
    } else {
      summaryContainer.innerHTML = `
        <div class="card summary-card-promo promote">
          <span class="num">${counts.promote}</span>
          <span class="label">Promote to ${getNextClass(className)}</span>
        </div>
        <div class="card summary-card-promo repeat">
          <span class="num">${counts.repeat}</span>
          <span class="label">Repeat ${className}</span>
        </div>
        <div class="card summary-card-promo">
          <span class="num">${studentsInClass.length}</span>
          <span class="label">Total Pupils</span>
        </div>
      `;
    }
  }

  /* --------------------------------------------
     "APPLY SUGGESTED TO ALL" — clears every override for this class
     -------------------------------------------- */
  applyThresholdBtn.addEventListener('click', () => {
    const className = sourceClassSelect.value;
    overridesByClass[className] = {};
    renderTable();
    markNotYetApplied();
  });

  /* --------------------------------------------
     CONFIRM & APPLY MODAL
     -------------------------------------------- 
     PHASE 1 LIMITATION: "applying" promotions here doesn't actually
     move pupils to a new class_name in SAMPLE_STUDENTS - that would
     require real data mutation across the whole app (Students,
     Classes, Attendance would all need to reflect the change). For
     Phase 1, this confirms the DECISION-MAKING workflow end to end;
     real promotion execution (actually updating each pupil's class)
     is exactly the kind of operation Phase 2/4's real data layer
     will handle.
  */
  function markNotYetApplied() {
    promotionsApplied = false;
    confirmBarStatus.textContent = 'Review decisions, then apply when ready.';
    confirmBarStatus.classList.remove('applied');
  }

  applyPromotionsBtn.addEventListener('click', () => {
    const className = sourceClassSelect.value;
    const studentsInClass = allStudents.filter(s => s.class_name === className);
    const isLastClass = getNextClass(className) === null;

    const counts = { promote: 0, repeat: 0, graduate: 0 };
    studentsInClass.forEach(s => {
      const decision = getActualDecision(className, s.admission_no, scores[s.admission_no]);
      counts[decision]++;
    });

    const promoteLine = isLastClass
      ? `<li><strong>${counts.graduate}</strong> pupils will graduate and leave Royal Crystal Academy</li>`
      : `<li><strong>${counts.promote}</strong> pupils will be promoted to ${getNextClass(className)}</li>`;

    modalBody.innerHTML = `
      <p>You're about to apply promotion decisions for <strong>${className}</strong> (2025/2026 session):</p>
      <ul>
        ${promoteLine}
        <li><strong>${counts.repeat}</strong> pupils will repeat ${className}</li>
      </ul>
      <p style="margin-top:12px;">This action cannot be undone once real data storage is added in a later phase.</p>
    `;

    modalOverlay.classList.add('open');
  });

  function closeModal() {
    modalOverlay.classList.remove('open');
  }

  modalCloseBtn.addEventListener('click', closeModal);
  cancelApplyBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
  });

  confirmApplyBtn.addEventListener('click', () => {
    promotionsApplied = true;
    confirmBarStatus.textContent = 'Promotion decisions applied for this session (Phase 1 demo).';
    confirmBarStatus.classList.add('applied');
    closeModal();
  });

  /* --------------------------------------------
     EVENT LISTENERS
     -------------------------------------------- */
  sourceClassSelect.addEventListener('change', () => {
    currentClass = sourceClassSelect.value;
    updateArrowText(currentClass);
    searchInput.value = '';
    markNotYetApplied();
    renderTable();
  });

  searchInput.addEventListener('input', renderTable);

  /* --------------------------------------------
     INITIALIZE
     -------------------------------------------- 
     Default to the first PRIMARY class (Basic 1), since promotion
     conceptually applies most clearly there - though every class
     in the dropdown works the same way.
  */
  populateClassDropdown();
  const defaultClass = allClasses.find(c => c.startsWith('Basic')) || allClasses[0];
  sourceClassSelect.value = defaultClass;
  currentClass = defaultClass;
  updateArrowText(defaultClass);
  renderTable();

});
