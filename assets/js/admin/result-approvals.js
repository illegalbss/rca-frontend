/* ============================================
   RESULT APPROVALS — result-approvals.js
   Royal Crystal Academy
   ============================================
   Phase 4: Real approval records stored in PostgreSQL.
   This file provides the approval helpers and
   starts with empty/draft states.
   localstorage.js restores any saved approvals.
*/

(function () {

  // Approval workflow statuses — includes tone for CSS class binding
  window.APPROVAL_STATUSES = {
    draft:     { label: 'Draft',     color: '#9ca3af', bg: '#f3f4f6', tone: 'gray'    },
    submitted: { label: 'Submitted', color: '#92400e', bg: '#fef3c7', tone: 'amber'   },
    reviewed:  { label: 'Reviewed',  color: '#1e40af', bg: '#dbeafe', tone: 'blue'    },
    approved:  { label: 'Approved',  color: '#065f46', bg: '#d1fae5', tone: 'teal'    },
    published: { label: 'Published', color: '#065f46', bg: '#d1fae5', tone: 'success' },
    returned:  { label: 'Returned',  color: '#991b1b', bg: '#fee2e2', tone: 'red'     }
  };
  // Alias so both names work
  window.APPROVAL_STATUS_INFO = window.APPROVAL_STATUSES;

  // Empty approvals — real data comes from API/localStorage
  if (!window.RESULT_APPROVALS) {
    window.RESULT_APPROVALS = {};
  }

  /* ---- Helper: get or create approval record ---- */
  window.getApprovalRecord = function(className, term) {
    const key = `${className}|${term}`;
    if (!window.RESULT_APPROVALS[key]) {
      window.RESULT_APPROVALS[key] = {
        class_name:   className,
        term,
        status:       'draft',
        submitted_by: null,
        submitted_at: null,
        reviewed_by:  null,
        reviewed_at:  null,
        approved_by:  null,
        approved_at:  null,
        published_by: null,
        published_at: null,
        return_reason: null
      };
    }
    return window.RESULT_APPROVALS[key];
  };

})();
