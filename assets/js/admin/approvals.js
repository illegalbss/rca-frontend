/* ============================================
   APPROVALS — approvals.js
   ============================================
   Used by Head Teacher (approve/return) and reads real data from the
   backend via GET /api/approvals?term=. The real result_approvals table
   only tracks draft -> submitted -> approved -> returned — there's no
   separate "reviewed" stage and no ICT Admin "publish" step (once
   approved, results are considered final).
*/

document.addEventListener('DOMContentLoaded', () => {

  const statusInfo  = window.APPROVAL_STATUS_INFO || {};

  const termSelect = document.getElementById('termSelect');
  const statsEl    = document.getElementById('approvalStats');
  const listEl     = document.getElementById('approvalList');

  const returnOverlay = document.getElementById('returnModalOverlay');
  const returnClose    = document.getElementById('returnModalClose');
  const returnCancel   = document.getElementById('returnCancelBtn');
  const returnConfirm  = document.getElementById('returnConfirmBtn');
  const returnReason   = document.getElementById('returnReason');

  let pendingReturnId = null;
  let records = [];

  const currentRole = sessionStorage.getItem('rca_demo_role') || '';
  const userRoles = (window.CURRENT_USER && window.CURRENT_USER.roles) || [currentRole];
  const currentUser = window.CURRENT_USER || {};

  /* ---- Load + render ---- */
  async function render() {
    const term = termSelect.value;
    listEl.innerHTML = '<p style="color:#9ca3af">Loading…</p>';

    records = (await window.RCA_API.getApprovals(term)) || [];

    const counts = { draft: 0, submitted: 0, approved: 0, returned: 0 };
    records.forEach(r => counts[r.status] = (counts[r.status] || 0) + 1);

    statsEl.innerHTML = [
      { label: 'Pending Approval', key: 'submitted', tone: 'blue' },
      { label: 'Approved',         key: 'approved',  tone: 'teal' },
      { label: 'Returned',         key: 'returned',  tone: 'red'  },
      { label: 'Not Yet Submitted', key: 'draft',    tone: 'gray' }
    ].map(s => `
      <div class="card approval-stat-card tone-${s.tone}">
        <span class="approval-stat-num">${counts[s.key]}</span>
        <span class="approval-stat-label">${s.label}</span>
      </div>
    `).join('');

    listEl.innerHTML = '';
    records.forEach(record => {
      const info = statusInfo[record.status] || { label: record.status, tone: 'gray' };

      const canApprove = userRoles.includes('head_teacher') && record.status === 'submitted';
      const canReturn   = userRoles.includes('head_teacher') && record.status === 'submitted';

      const card = document.createElement('div');
      card.className = 'card approval-card';
      card.innerHTML = `
        <div class="approval-card-header">
          <div>
            <h3>${record.class_name}</h3>
            <p class="approval-card-meta">${record.pupil_count} pupils &middot; ${termLabel(term)}</p>
          </div>
          <span class="badge-status tone-${info.tone}">${info.label}</span>
        </div>
        <div class="approval-timeline">
          ${timelineItem('Submitted', record.submitted_by_name, record.submitted_at)}
          ${timelineItem('Approved', record.approved_by_name, record.approved_at)}
        </div>
        <div class="approval-card-actions">
          ${canReturn  ? `<button class="btn btn-outline return-btn" data-id="${record.id}">Return for Correction</button>` : ''}
          ${canApprove ? `<button class="btn btn-primary approve-btn" data-id="${record.id}">Approve Results</button>` : ''}
          ${!canApprove && !canReturn ? `<span class="no-action-label">No action required</span>` : ''}
        </div>
      `;
      listEl.appendChild(card);
    });

    listEl.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await window.RCA_API.updateApproval(btn.dataset.id, 'approve');
        } catch (e) {
          alert('Could not approve: ' + e.message);
          btn.disabled = false;
          return;
        }
        const record = records.find(r => String(r.id) === btn.dataset.id);
        if (window.logActivity) window.logActivity('approve', `Results approved: ${record?.class_name} — ${term}`, 'approvals');
        render();
      });
    });

    listEl.querySelectorAll('.return-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingReturnId = btn.dataset.id;
        returnReason.value = '';
        returnOverlay.classList.add('open');
      });
    });
  }

  /* ---- Return modal ---- */
  function closeReturnModal() {
    returnOverlay.classList.remove('open');
    pendingReturnId = null;
  }

  returnClose.addEventListener('click', closeReturnModal);
  returnCancel.addEventListener('click', closeReturnModal);
  returnOverlay.addEventListener('click', e => { if (e.target === returnOverlay) closeReturnModal(); });

  returnConfirm.addEventListener('click', async () => {
    if (!pendingReturnId) return;
    const reason = returnReason.value.trim() || 'Please review and resubmit.';
    const id = pendingReturnId;

    try {
      await window.RCA_API.updateApproval(id, 'return', reason);
    } catch (e) {
      alert('Could not return: ' + e.message);
      return;
    }

    const record = records.find(r => String(r.id) === id);
    if (window.logActivity) window.logActivity('update', `Results returned for correction: ${record?.class_name} — ${termSelect.value}`, 'approvals');
    closeReturnModal();
    render();
  });

  /* ---- Helpers ---- */
  function timelineItem(label, by, at) {
    if (!by) return `<div class="timeline-step pending"><span class="step-dot"></span><span class="step-label">${label}: pending</span></div>`;
    const date = at ? new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
    return `<div class="timeline-step done"><span class="step-dot filled"></span><span class="step-label">${label}: ${by} ${date ? '— ' + date : ''}</span></div>`;
  }

  function termLabel(val) {
    return { term1: 'First Term', term2: 'Second Term', term3: 'Third Term' }[val] || val;
  }

  termSelect.addEventListener('change', render);
  render();

});
