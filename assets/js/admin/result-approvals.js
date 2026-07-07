/* ============================================
   RESULT APPROVALS — result-approvals.js
   Royal Crystal Academy
   ============================================
   Approval records are stored in the real `result_approvals` table
   (via GET/PATCH /api/approvals). This file keeps a small in-memory
   cache so score-entry.js and approvals.js can read a record
   synchronously after loadApprovals(term) has populated it.
*/

(function () {

  // The real result_approvals table only tracks these four stages —
  // there's no separate "reviewed" stage and no published_by/at columns.
  window.APPROVAL_STATUSES = {
    draft:     { label: 'Draft',     color: '#9ca3af', bg: '#f3f4f6', tone: 'gray'  },
    submitted: { label: 'Submitted', color: '#92400e', bg: '#fef3c7', tone: 'amber' },
    approved:  { label: 'Approved',  color: '#065f46', bg: '#d1fae5', tone: 'teal'  },
    returned:  { label: 'Returned',  color: '#991b1b', bg: '#fee2e2', tone: 'red'   }
  };
  window.APPROVAL_STATUS_INFO = window.APPROVAL_STATUSES;

  window.RESULT_APPROVALS = {};

  /* ---- Fetch every class's approval record for a term from the real API ---- */
  window.loadApprovals = async function (term) {
    if (!window.RCA_API) return [];
    const list = await window.RCA_API.getApprovals(term);
    if (list) {
      list.forEach(r => { window.RESULT_APPROVALS[`${r.class_name}|${term}`] = r; });
    }
    return list || [];
  };

  /* ---- Sync read from the cache — call loadApprovals(term) first ---- */
  window.getApprovalRecord = function (className, term) {
    const key = `${className}|${term}`;
    if (!window.RESULT_APPROVALS[key]) {
      window.RESULT_APPROVALS[key] = {
        class_name: className,
        term,
        status: 'draft',
        submitted_by: null,
        submitted_at: null,
        approved_by: null,
        approved_at: null
      };
    }
    return window.RESULT_APPROVALS[key];
  };

})();
