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

  // The session the results are actually stored under (the server's
  // current academic session), shown in the card title — not a
  // hardcoded year that goes stale every September.
  let sessionLabel = window.RCA_CONFIG?.SESSION || '';
  try {
    const fs = await window.RCA_API.call('/payments/fee-schedule');
    sessionLabel = fs.terms?.[0]?.session_label || sessionLabel;
  } catch (e) { /* keep the config fallback */ }
  /* "Next Term Begins" comes from the School Calendar automatically.
     Among calendar entries that mark the school resuming / reopening / a
     term beginning (within the coming months):
       1. one that names the next term ("Second Term Begins", "Resumption
          for Third Term"…) wins;
       2. otherwise the earliest one in the months a new term starts
          (First Term report → Jan–Feb, Second → Apr–May, Third → Sept–Oct).
     Mid-term resumptions (e.g. 9 November) fall outside those months or
     after the term's start, so they aren't picked. Falls back to
     "See School Calendar" when nothing has been entered. */
  let calendarEvents = [];
  try { calendarEvents = (await window.RCA_API.getCalendarEvents()) || []; } catch (e) { calendarEvents = []; }
  const RESUME_RE = /resum|re-?open|begin|start|commence|first day/i;
  const NEXT_TERM = {
    term1: { name: /second\s*term|2nd\s*term/i, months: [0, 1] },
    term2: { name: /third\s*term|3rd\s*term/i,  months: [3, 4] },
    term3: { name: /first\s*term|1st\s*term/i,  months: [8, 9] }
  };
  function nextTermBegins(term) {
    const next = NEXT_TERM[term];
    if (!next) return null;
    const day = d => String(d || '').slice(0, 10);
    const earliest = new Date(); earliest.setDate(earliest.getDate() - 150);
    const latest   = new Date(); latest.setDate(latest.getDate() + 300);
    const found = calendarEvents
      .filter(e => RESUME_RE.test(e.title || ''))
      .map(e => ({ e, d: new Date(day(e.event_date || e.date) + 'T00:00:00') }))
      .filter(x => !isNaN(x.d) && x.d >= earliest && x.d <= latest)
      .sort((a, b) => a.d - b.d);
    const hit = found.find(x => next.name.test(x.e.title)) || found.find(x => next.months.includes(x.d.getMonth()));
    return hit ? hit.d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : null;
  }

  const allClasses      = window.SCHOOL_CLASSES   || [];
  const traits           = window.BEHAVIOR_TRAITS  || [];
  const scoreToGrade    = window.scoreToGrade;
  const gradeToLabel    = window.gradeToLabel;
  const ratingValueToLabel = window.ratingValueToLabel;
  const isNurseryClass  = window.isNurseryClass || (c => !!c && c.includes('Nursery'));
  // Pre-Nursery report cards are kept positive (Head Teacher's policy): no
  // class position, no "Negative Traits" line, and only encouraging
  // automatic remarks. A remark the teacher writes is shown as written.
  const isPreNursery    = c => /^pre-?\s*nursery/i.test(c || '');
  const PRE_NURSERY_GRADE_WORDS = { A: 'Excellent', B: 'Very Good', C: 'Good', D: 'Fair', E: 'Developing', F: 'Still Growing' };
  const gradeWord = (g, preNursery) => (preNursery && PRE_NURSERY_GRADE_WORDS[g]) || gradeToLabel(g);

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

  function summarize(data) {
    const scores = data?.scores || [];
    const totalScore = scores.reduce((sum, r) => sum + Number(r.final_score || 0), 0);
    const average = scores.length ? totalScore / scores.length : 0;
    return {
      scores,
      behavior: data?.behavior || [],
      comment: data?.comment || null,
      ht_comment: data?.ht_comment || null,
      nursery_record: data?.nursery_record || null,
      attendance: data?.attendance || null,   // from the attendance register
      average,
      totalScore,
      overallGrade: scoreToGrade(average),
      subjectsCount: scores.length
    };
  }

  async function getResults(admissionNo, term) {
    const key = `${admissionNo}|${term}`;
    if (!resultsCache[key]) {
      resultsCache[key] = summarize(await window.RCA_API.getStudentResults(admissionNo, term));
    }
    return resultsCache[key];
  }

  // Refreshes the whole class in ONE request (GET /students/class-results)
  // each time a card is opened — so it always shows what was last saved
  // in Class Review, and class position doesn't need one request per
  // classmate. Falls back to per-pupil loading if it fails.
  async function prefetchClass(className, term) {
    try {
      const data = await window.RCA_API.getClassResults(className, term);
      Object.entries(data.results || {}).forEach(([adm, r]) => { resultsCache[`${adm}|${term}`] = summarize(r); });
    } catch (e) {
      console.warn('Class results load failed, loading pupils individually:', e.message);
    }
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
  // Encouraging wording for Pre-Nursery, whatever the scores.
  const PRE_NURSERY_REMARKS = {
    A: 'A wonderful term! A bright, happy learner who is doing very well.',
    B: 'A lovely term. Growing in confidence and learning well every day.',
    C: 'A good term. Enjoying school and making steady progress.',
    D: 'Settling in well and learning new things every day. Keep it up!',
    E: 'A cheerful little learner who is growing and trying hard.',
    F: 'A cheerful little learner who is growing and trying hard.'
  };
  const PRE_NURSERY_HT = {
    A: 'An excellent start. We are very proud of this little one!',
    B: 'A very good term. Well done, and keep shining!',
    C: 'Good progress this term. We look forward to more next term.',
    D: 'A happy term of learning and play. Well done!',
    E: 'Growing well in confidence. We are proud of every step.',
    F: 'Growing well in confidence. We are proud of every step.'
  };

  function generateRemark(average, preNursery) {
    // Derive the remark from the SAME grade boundaries used everywhere
    // else (via scoreToGrade), rather than a second hardcoded threshold
    // list that could quietly drift out of sync with the real scale.
    const grade = scoreToGrade(average);
    if (preNursery) return PRE_NURSERY_REMARKS[grade] || PRE_NURSERY_REMARKS.C;

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

  function generateHtComment(average, preNursery) {
    const grade = scoreToGrade(average);
    if (preNursery) return PRE_NURSERY_HT[grade] || PRE_NURSERY_HT.C;
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
    ].filter(([key]) => !(key === 'negative_traits' && isPreNursery(className)));

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

  /* Attendance on the report card, filled in automatically:
       Times School Opened — a number typed by the teacher, else the school
         days counted from the School Calendar (term start → end, minus
         holidays and breaks), else the days the class register was taken;
       Times Present — a typed number, else the attendance register
         (present or late).
     "Edit attendance" (form teacher / Head Teacher / ICT Admin) types or
     clears the numbers; Times School Opened can be set for the whole class. */
  function attendanceValues(summary) {
    const nr = summary.nursery_record || {};
    const att = summary.attendance || {};
    const opened = nr.times_school_opened ?? att.calendar_opened ?? (att.opened ? att.opened : null);
    const openedFrom = nr.times_school_opened != null ? 'typed' : att.calendar_opened != null ? 'calendar' : att.opened ? 'register' : null;
    const present = nr.times_present ?? (att.opened ? att.present : null);
    const presentFrom = nr.times_present != null ? 'typed' : att.opened ? 'register' : null;
    return { opened, openedFrom, present, presentFrom };
  }

  function renderAttendanceSection(summary, classSize, className) {
    const v = attendanceValues(summary);
    const FROM = { typed: 'typed in', calendar: 'from the School Calendar', register: 'from the attendance register' };
    const cells = [
      ['Number in Class', classSize, null],
      ['Times School Opened', v.opened ?? '—', v.openedFrom],
      ['Times Present', v.present ?? '—', v.presentFrom]
    ];
    return `
      <div class="rc-section" id="rcAttendanceBlock">
        <div class="rc-section-title">Attendance</div>
        <div class="rc-attendance-grid">
          ${cells.map(([label, value, from]) => `
            <div class="rc-attendance-cell">
              <span class="rc-attendance-label">${label}</span>
              <span class="rc-attendance-value">${value}</span>
              ${from ? `<span class="no-print" style="font-size:0.62rem;color:#9ca3af">${FROM[from]}</span>` : ''}
            </div>
          `).join('')}
        </div>
        ${className && canEditNurseryRecord(className) ? `<button id="editAttendanceBtn" class="no-print" style="margin-top:8px;padding:2px 10px;font-size:0.72rem;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer">✏️ Edit attendance</button>` : ''}
      </div>
    `;
  }

  function wireAttendanceEdit(admissionNo, term, summary, className) {
    document.getElementById('editAttendanceBtn')?.addEventListener('click', () => {
      const nr = summary.nursery_record || {};
      const v = attendanceValues(summary);
      const block = document.getElementById('rcAttendanceBlock');
      const input = (id, val, hint) => `<input type="number" min="0" id="${id}" value="${val ?? ''}" placeholder="${hint}" style="width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem;box-sizing:border-box">`;
      block.innerHTML = `
        <div class="rc-section-title">Attendance</div>
        <div class="no-print" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <label style="font-size:0.75rem">Times School Opened
            ${input('af_opened', nr.times_school_opened, v.openedFrom && v.openedFrom !== 'typed' ? `Auto: ${v.opened}` : 'Leave empty for auto')}</label>
          <label style="font-size:0.75rem">Times Present
            ${input('af_present', nr.times_present, v.presentFrom && v.presentFrom !== 'typed' ? `Auto: ${v.present}` : 'Leave empty for auto')}</label>
        </div>
        <p class="no-print" style="font-size:0.7rem;color:#6b7280;margin:6px 0 0">Leave a box empty to use the automatic number (School Calendar / attendance register).</p>
        <div class="no-print" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          <button id="afSave" style="padding:5px 14px;font-size:0.75rem;background:var(--color-primary);color:#fff;border:none;border-radius:6px;cursor:pointer">Save for this pupil</button>
          <button id="afClass" style="padding:5px 14px;font-size:0.75rem;background:#fff;border:1px solid var(--color-primary);color:var(--color-primary);border-radius:6px;cursor:pointer">Use this "Times School Opened" for the whole class</button>
          <button id="afCancel" style="padding:5px 14px;font-size:0.75rem;background:#fff;border:1px solid #d1d5db;border-radius:6px;cursor:pointer">Cancel</button>
        </div>`;
      const val = id => document.getElementById(id).value.trim();
      document.getElementById('afCancel').onclick = () => renderReportCard();
      document.getElementById('afSave').onclick = async e => {
        e.target.disabled = true; e.target.textContent = 'Saving…';
        try {
          await window.RCA_API.call(`/students/${encodeURIComponent(admissionNo)}/review`, {
            method: 'PUT', body: { term, nursery_record: { times_school_opened: val('af_opened'), times_present: val('af_present') } }
          });
        } catch (err) { alert('Could not save attendance: ' + err.message); e.target.disabled = false; e.target.textContent = 'Save for this pupil'; return; }
        delete resultsCache[`${admissionNo}|${term}`];
        renderReportCard();
      };
      document.getElementById('afClass').onclick = async e => {
        const n = val('af_opened');
        if (!confirm(n === '' ? `Clear the typed "Times School Opened" for everyone in ${className}? Their report cards will use the School Calendar instead.`
                              : `Set "Times School Opened" to ${n} for every pupil in ${className}?`)) return;
        e.target.disabled = true; e.target.textContent = 'Saving…';
        try {
          const r = await window.RCA_API.call('/students/class-attendance', { method: 'POST', body: { class_name: className, term, times_school_opened: n } });
          alert(r.message);
        } catch (err) { alert('Could not save: ' + err.message); e.target.disabled = false; e.target.textContent = 'Use this "Times School Opened" for the whole class'; return; }
        Object.keys(resultsCache).forEach(k => { if (k.endsWith('|' + term)) delete resultsCache[k]; });
        renderReportCard();
      };
    });
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
      ].filter(([key]) => !(key === 'negative_traits' && isPreNursery(className)));
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
  // Any error while building the card is shown in place of it, instead
  // of leaving the card stuck on "Loading…" (which is what a missing
  // helper once did to every pupil who had behaviour ratings).
  async function renderReportCard() {
    try {
      await renderReportCardInner();
    } catch (e) {
      console.error('Report card failed to render:', e);
      reportCardEl.innerHTML = `<p style="text-align:center;color:#dc2626;padding:2rem;">This report card couldn't be displayed: ${e.message}<br>Please send this message to the ICT Administrator.</p>`;
    }
  }

  async function renderReportCardInner() {
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
    let summary, position, classSize;
    try {
      await prefetchClass(className, term);
      summary = await getResults(admissionNo, term);
      ({ position, classSize } = await computeClassPosition(admissionNo, className, term));
    } catch (e) {
      reportCardEl.innerHTML = `<p style="text-align:center;color:#dc2626;padding:2rem;">Could not load this report card: ${e.message}<br>Nothing has been lost — please wait a moment and select the pupil again.</p>`;
      return;
    }
    const isNursery = isNurseryClass(className);

    const behaviorMap = {};
    (summary.behavior || []).forEach(b => { behaviorMap[b.trait_code] = Number(b.rating); });

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

    const preNursery = isPreNursery(className);
    const infoItems = [
      ['Pupil Name', student.full_name],
      ['Admission No', student.admission_no],
      ['Class', className],
      ['Gender', student.gender === 'male' ? 'Male' : 'Female'],
      ...(preNursery ? [] : [['Position in Class', `${ordinal(position)} of ${classSize}`]]),
      ['Overall Grade', `<span class="grade-${summary.overallGrade}">${summary.overallGrade}</span> — ${gradeWord(summary.overallGrade, preNursery)}`]
    ];

    reportCardEl.innerHTML = `
      <div class="rc-header">
        <img src="../assets/images/logo.png" alt="Royal Crystal Academy badge">
        <div class="rc-school-name">Royal Crystal Academy</div>
        <div class="rc-school-meta">20/21 Amaigbo Lane, Uwani, Enugu State</div>
        <div class="rc-school-meta">Tel: 08036721390 / 09080061094</div>
        <div class="rc-title">${termLabel} Report Card &bull; ${sessionLabel} Session</div>
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

      <div class="rc-summary-grid"${preNursery ? ' style="grid-template-columns:repeat(3,1fr)"' : ''}>
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
        ${preNursery ? '' : `
        <div class="rc-summary-box">
          <span class="rc-summary-num">${ordinal(position)}</span>
          <span class="rc-summary-label">Class Position (of ${classSize})</span>
        </div>`}
      </div>

      <div class="rc-remarks-grid">
        <div class="rc-remark-box">
          <span class="rc-remarks-label">Class Teacher's Remark:</span>
          <span class="rc-remark-text">${summary.comment ? `"${summary.comment}"` : generateRemark(summary.average, preNursery)}</span>
        </div>
        <div class="rc-remark-box" id="htCommentBlock">
          <span class="rc-remarks-label">Head Teacher's Comment:</span>
          <span class="rc-remark-text" id="htCommentText">${summary.ht_comment ? `"${summary.ht_comment}"` : generateHtComment(summary.average, preNursery)}</span>
          ${canEditHtComment ? `<button id="editHtCommentBtn" class="no-print" style="margin-top:6px;padding:2px 10px;font-size:0.72rem;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer">✏️ Edit</button>` : ''}
        </div>
      </div>

      ${isNursery ? renderNurseryRecordsSection(summary, className) : renderBehaviourSection(behaviorMap)}

      ${renderAttendanceSection(summary, classSize, className)}

      <div class="rc-footer">
        <div class="rc-grade-legend">
          <span class="rc-legend-title">Grading Key:</span>
          ${buildGradeLegend(preNursery)}
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
            <div class="rc-signature-line rc-signature-date">${nextTermBegins(term) || 'See School Calendar'}</div>
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
    wireAttendanceEdit(admissionNo, term, summary, className);
  }

  /* --------------------------------------------
     BUILD THE GRADE LEGEND
     -------------------------------------------- 
     Reads directly from window.GRADE_BOUNDARIES rather than
     hardcoding the score ranges a second time - if the school's
     grading policy ever changes again, this legend updates itself
     automatically with zero edits needed here.
  */
  function buildGradeLegend(preNursery) {
    const boundaries = window.GRADE_BOUNDARIES || [];

    return boundaries.map((band, index) => {
      // The upper end of THIS band is one less than the band above it
      // (or 100 for the very top band, since there's no band above A)
      const upperBound = index === 0 ? 100 : boundaries[index - 1].min - 1;
      const rangeLabel = band.min === upperBound ? `${band.min}` : `${band.min}-${upperBound}`;
      return `<span class="legend-item"><strong class="grade-${band.grade}">${band.grade}</strong> = ${rangeLabel} ${preNursery ? gradeWord(band.grade, true) : band.label}</span>`;
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
