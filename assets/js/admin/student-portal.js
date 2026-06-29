/* ============================================
   STUDENT PORTAL — student-portal.js
   ============================================
   Even simpler than the parent portal: one student, one record.
   Results only shown if the class approval status is 'published'.
*/

document.addEventListener('DOMContentLoaded', () => {

  const currentRole = sessionStorage.getItem('rca_demo_role');

  if (!currentRole) { window.location.href = 'login.html'; return; }
  if (currentRole !== 'student') { window.location.href = 'dashboard.html'; return; }

  const allUsers  = window.SAMPLE_USERS   || [];
  const allStudents = window.SAMPLE_STUDENTS || [];
  const allSubjects  = window.SCHOOL_SUBJECTS || [];
  const results       = window.SAMPLE_RESULTS || {};
  const behaviorRatings = window.BEHAVIOR_RATINGS || {};
  const traits           = window.BEHAVIOR_TRAITS  || [];
  const scoreToGrade      = window.scoreToGrade;
  const ratingValueToLabel = window.ratingValueToLabel;

  const currentUserId = sessionStorage.getItem('rca_user_id');
  const user = allUsers.find(u => u.id === currentUserId);

  document.getElementById('portalLogoutBtn').addEventListener('click', () => sessionStorage.clear());

  if (!user || !user.admission_no) {
    document.getElementById('portalContent').innerHTML = '<p class="portal-empty">Account not linked to a student record. Please contact the school.</p>';
    return;
  }

  const student = allStudents.find(s => s.admission_no === user.admission_no);
  if (!student) {
    document.getElementById('portalContent').innerHTML = '<p class="portal-empty">Student record not found.</p>';
    return;
  }

  document.getElementById('studentName').textContent = student.full_name;

  const approvalRecord = window.getApprovalRecord
    ? window.getApprovalRecord(student.class_name, 'term2')
    : { status: 'published' };
  const isPublished = approvalRecord.status === 'published';
  const pupilResults = results[student.admission_no] || {};
  const ratings = behaviorRatings[student.admission_no] || { ratings: {}, comment: '' };

  const avg = allSubjects.length
    ? allSubjects.reduce((sum, s) => sum + ((pupilResults[s.id] || {}).finalScore || 0), 0) / allSubjects.length
    : 0;

  const initials = student.full_name.split(' ').map(p=>p[0]).join('').substring(0,2).toUpperCase();

  if (!isPublished) {
    document.getElementById('portalContent').innerHTML = `
      <div class="portal-card">
        <div class="portal-student-header">
          <div class="portal-avatar">${initials}</div>
          <div>
            <h2>${student.full_name}</h2>
            <p class="portal-meta">${student.class_name} &middot; ${student.admission_no}</p>
          </div>
        </div>
        <div class="portal-not-published">
          <p>&#128274; Your results for this term are not yet available. The school will publish them when the Head Teacher has approved and the ICT Administrator has released them.</p>
        </div>
      </div>`;
    return;
  }

  const subjectRows = allSubjects.map(subject => {
    const r = pupilResults[subject.id];
    if (!r) return '';
    const gradeColors = { A:'#0f6e56', B:'#185fa5', C:'#ba7517', D:'#ba7517', E:'#993c1d', F:'#a32d2d' };
    return `<tr>
      <td>${subject.name}</td>
      <td>${r.caTotal}</td>
      <td>${r.examScore}</td>
      <td><strong>${r.finalScore}</strong></td>
      <td style="font-weight:700;color:${gradeColors[r.grade] || 'inherit'}">${r.grade}</td>
    </tr>`;
  }).join('');

  const ratingsHTML = traits.map(trait => {
    const val = ratings.ratings[trait.id] || 0;
    const dots = [1,2,3,4,5].map(n =>
      `<span class="rating-dot ${n <= val ? 'filled' : ''}"></span>`
    ).join('');
    return `<div class="portal-trait-row">
      <span class="portal-trait-label">${trait.label}</span>
      <div class="portal-trait-dots">${dots}</div>
      <span class="portal-trait-text">${val ? ratingValueToLabel(val) : '—'}</span>
    </div>`;
  }).join('');

  document.getElementById('portalContent').innerHTML = `
    <div class="portal-card">
      <div class="portal-student-header">
        <div class="portal-avatar">${initials}</div>
        <div>
          <h2>${student.full_name}</h2>
          <p class="portal-meta">${student.class_name} &middot; ${student.admission_no} &middot; Second Term 2025/2026</p>
        </div>
        <div class="portal-avg-badge">
          <span>${avg.toFixed(1)}%</span>
          <small>${scoreToGrade ? scoreToGrade(avg) : ''} — ${scoreToGrade ? gradeLabel(scoreToGrade(avg)) : ''}</small>
        </div>
      </div>

      <h3 class="portal-section-title">My Results</h3>
      <div class="table-scroll">
        <table class="portal-result-table">
          <thead><tr><th>Subject</th><th>CA (/40)</th><th>Exam (/60)</th><th>Total</th><th>Grade</th></tr></thead>
          <tbody>${subjectRows}</tbody>
        </table>
      </div>

      <h3 class="portal-section-title">Teacher's Assessment of My Conduct</h3>
      <div class="portal-traits">${ratingsHTML}</div>

      ${ratings.comment ? `
        <h3 class="portal-section-title">Class Teacher's Comment</h3>
        <div class="portal-comment">"${ratings.comment}"</div>
      ` : ''}

      <div class="portal-print-btn-wrap">
        <button onclick="window.print()" class="btn btn-outline">Print My Report Card</button>
      </div>
    </div>
  `;

  function gradeLabel(grade) {
    return { A:'Excellent', B:'Very Good', C:'Good', D:'Pass', E:'Weak Pass', F:'Fail' }[grade] || '';
  }
});
