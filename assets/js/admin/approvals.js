/* ============================================
   APPROVALS — approvals.js
   ============================================
   Used by Head Teacher (approve/return) and ICT Admin (publish).
   Reads and mutates window.RESULT_APPROVALS via getApprovalRecord().
   Role-aware: Head Teacher sees Approve + Return buttons; ICT Admin
   sees Publish button for already-Approved records.
*/

document.addEventListener('DOMContentLoaded', () => {

  const approvals     = window.RESULT_APPROVALS || {};
  const statusInfo     = window.APPROVAL_STATUS_INFO || {};
  const allStudents     = window.SAMPLE_STUDENTS || [];
  const allClasses       = window.SCHOOL_CLASSES || [];

  const termSelect    = document.getElementById('termSelect');
  const statsEl        = document.getElementById('approvalStats');
  const listEl          = document.getElementById('approvalList');

  const returnOverlay   = document.getElementById('returnModalOverlay');
  const returnClose      = document.getElementById('returnModalClose');
  const returnCancel      = document.getElementById('returnCancelBtn');
  const returnConfirm      = document.getElementById('returnConfirmBtn');
  const returnReason        = document.getElementById('returnReason');

  let pendingReturnClass = null;

  const currentRole = sessionStorage.getItem('rca_demo_role') || '';
  // Use roles array from CURRENT_USER for multi-role support
  const userRoles = (window.CURRENT_USER && window.CURRENT_USER.roles) || [currentRole];
  const currentUser  = window.CURRENT_USER || {};

  /* ---- Render ---- */
  function render() {
    const term = termSelect.value;

    const records = allClasses.map(cls => window.getApprovalRecord(cls, term));
    const counts = { draft:0, submitted:0, reviewed:0, approved:0, published:0, returned:0 };
    records.forEach(r => counts[r.status] = (counts[r.status] || 0) + 1);

    statsEl.innerHTML = [
      { label: 'Pending Review', key: 'submitted', tone: 'blue' },
      { label: 'Awaiting Approval', key: 'reviewed', tone: 'amber' },
      { label: 'Approved', key: 'approved', tone: 'teal' },
      { label: 'Published', key: 'published', tone: 'success' }
    ].map(s => `
      <div class="card approval-stat-card tone-${s.tone}">
        <span class="approval-stat-num">${counts[s.key]}</span>
        <span class="approval-stat-label">${s.label}</span>
      </div>
    `).join('');

    listEl.innerHTML = '';
    records.forEach(record => {
      const pupilCount = allStudents.filter(s => s.class_name === record.class_name).length;
      const info = statusInfo[record.status] || { label: record.status, tone: 'gray' };

      const canApprove   = userRoles.includes('head_teacher') && record.status === 'reviewed';
      const canReturn     = userRoles.includes('head_teacher') && ['reviewed'].includes(record.status);
      const canPublish     = userRoles.includes('ict_admin') && record.status === 'approved';

      const card = document.createElement('div');
      card.className = `card approval-card`;
      card.innerHTML = `
        <div class="approval-card-header">
          <div>
            <h3>${record.class_name}</h3>
            <p class="approval-card-meta">${pupilCount} pupils &middot; ${termLabel(term)}</p>
          </div>
          <span class="badge-status tone-${info.tone}">${info.label}</span>
        </div>
        <div class="approval-timeline">
          ${timelineItem('Submitted', record.submitted_by, record.submitted_at)}
          ${timelineItem('Reviewed', record.reviewed_by, record.reviewed_at)}
          ${timelineItem('Approved', record.approved_by, record.approved_at)}
          ${timelineItem('Published', record.published_by, record.published_at)}
          ${record.return_reason ? `<div class="return-note">Returned: "${record.return_reason}"</div>` : ''}
        </div>
        <div class="approval-card-actions">
          ${canReturn  ? `<button class="btn btn-outline return-btn" data-class="${record.class_name}">Return for Correction</button>` : ''}
          ${canApprove ? `<button class="btn btn-primary approve-btn" data-class="${record.class_name}">Approve Results</button>` : ''}
          ${canPublish ? `<button class="btn btn-primary publish-btn" data-class="${record.class_name}">Publish to Portals</button>` : ''}
          ${!canApprove && !canReturn && !canPublish ? `<span class="no-action-label">No action required</span>` : ''}
        </div>
      `;
      listEl.appendChild(card);
    });

    /* Wire buttons */
    listEl.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const record = window.getApprovalRecord(btn.dataset.class, termSelect.value);
        record.status = 'approved';
    if (window.RCA) window.RCA.save('approvals');

    // Phase 4: update approval in real database
    if (window.RCA_API && record._api_id) {
      const actionMap = {
        'approved': 'approve',
        'published': 'publish',
        'returned': 'return'
      };
      const apiAction = actionMap[record.status];
      if (apiAction) {
        window.RCA_API.updateApproval(record._api_id, apiAction)
          .catch(e => console.warn('Approval API failed:', e.message));
      }
    }
        record.approved_by = currentUser.full_name || 'Head Teacher';
        record.approved_at = new Date().toISOString();
        if (window.logActivity) window.logActivity('approve', `Results approved: ${btn.dataset.class} — ${termSelect.value}`, 'approvals');
        render();
      });
    });

    listEl.querySelectorAll('.publish-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const record = window.getApprovalRecord(btn.dataset.class, termSelect.value);
        record.status = 'published';
    if (window.RCA) window.RCA.save('approvals');

    // Phase 4: update approval in real database
    if (window.RCA_API && record._api_id) {
      const actionMap = {
        'approved': 'approve',
        'published': 'publish',
        'returned': 'return'
      };
      const apiAction = actionMap[record.status];
      if (apiAction) {
        window.RCA_API.updateApproval(record._api_id, apiAction)
          .catch(e => console.warn('Approval API failed:', e.message));
      }
    }
        record.published_by = currentUser.full_name || 'ICT Administrator';
        record.published_at = new Date().toISOString();
        if (window.logActivity) window.logActivity('publish', `Report cards published: ${btn.dataset.class} — ${termSelect.value}`, 'results');
        render();
      });
    });

    listEl.querySelectorAll('.return-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingReturnClass = btn.dataset.class;
        returnReason.value = '';
        returnOverlay.classList.add('open');
      });
    });
  }

  /* ---- Return modal ---- */
  function closeReturnModal() {
    returnOverlay.classList.remove('open');
    pendingReturnClass = null;
  }

  returnClose.addEventListener('click', closeReturnModal);
  returnCancel.addEventListener('click', closeReturnModal);
  returnOverlay.addEventListener('click', e => { if (e.target === returnOverlay) closeReturnModal(); });

  returnConfirm.addEventListener('click', () => {
    if (!pendingReturnClass) return;
    const record = window.getApprovalRecord(pendingReturnClass, termSelect.value);
    record.status = 'returned';
    if (window.RCA) window.RCA.save('approvals');

    // Phase 4: update approval in real database
    if (window.RCA_API && record._api_id) {
      const actionMap = {
        'approved': 'approve',
        'published': 'publish',
        'returned': 'return'
      };
      const apiAction = actionMap[record.status];
      if (apiAction) {
        window.RCA_API.updateApproval(record._api_id, apiAction)
          .catch(e => console.warn('Approval API failed:', e.message));
      }
    }
    record.return_reason = returnReason.value.trim() || 'Please review and resubmit.';
    record.approved_by = null;
    record.approved_at = null;
    if (window.logActivity) window.logActivity('update', `Results returned for correction: ${pendingReturnClass} — ${termSelect.value}`, 'approvals');
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
