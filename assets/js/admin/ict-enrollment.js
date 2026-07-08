/* ============================================
   ICT ENROLLMENT APPLICATIONS — ict-enrollment.js
   Royal Crystal Academy
   ============================================
   Reviews applications submitted through the public ICT Department
   page's "Enroll Now" form (POST /api/ict-enrollments, no auth needed
   there). This page: list + filter + approve/reject + payment status,
   plus an editable Programme Fee card (ict_admin only) backed by
   payment_settings.ict_practical_fee.
*/

document.addEventListener('DOMContentLoaded', async () => {

  const cu = window.CURRENT_USER;
  const isIctAdmin = cu && (cu.roles || [cu.role]).includes('ict_admin');
  const fmt = window.formatNaira || (n => '₦' + Number(n || 0).toLocaleString());

  const ENROLL_COLORS = {
    pending_approval: { bg: '#fef3c7', color: '#92400e', label: 'Pending Approval' },
    approved:         { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
    rejected:         { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' }
  };
  const PAY_COLORS = {
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    paid:    { bg: '#d1fae5', color: '#065f46', label: 'Paid' }
  };

  let applications = [];
  let filterStatus = '';
  let fee = 0;

  async function loadAll() {
    const [appsData, feeData] = await Promise.all([
      window.RCA_API.call('/ict-enrollments' + (filterStatus ? `?enrollment_status=${filterStatus}` : '')),
      window.RCA_API.call('/settings/payment')
    ]);
    applications = appsData.applications || [];
    fee = feeData.ict_practical_fee || 0;
    updateBadge(appsData.pending_count || 0);
  }

  function updateBadge(count) {
    const badge = document.getElementById('ictEnrollBadge');
    if (!badge) return;
    if (count > 0) { badge.textContent = count; badge.style.display = ''; }
    else badge.style.display = 'none';
  }

  function render() {
    const pendingCount  = applications.filter(a => a.enrollment_status === 'pending_approval').length;
    const approvedCount = applications.filter(a => a.enrollment_status === 'approved').length;
    const paidCount     = applications.filter(a => a.payment_status === 'paid').length;

    const main = document.getElementById('ictEnrollMain');
    main.innerHTML = `
      <div style="overflow-x:auto;margin-bottom:20px;-webkit-overflow-scrolling:touch">
        <div style="display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:14px;min-width:600px">
          ${[
            { num: applications.length, label: 'Total Applications', color: '#1d4ed8', icon: '📋' },
            { num: pendingCount, label: 'Pending Approval', color: '#d97706', icon: '⏳' },
            { num: approvedCount, label: 'Approved', color: '#059669', icon: '✅' },
            { num: paidCount, label: 'Fee Paid', color: '#7c3aed', icon: '💳' }
          ].map(s => `
            <div style="background:#fff;border-radius:12px;padding:16px 18px;box-shadow:0 1px 4px rgba(0,0,0,0.07);border-left:4px solid ${s.color}">
              <div style="font-size:1.3rem;margin-bottom:6px">${s.icon}</div>
              <div style="font-family:var(--font-heading);font-size:1.6rem;font-weight:700;color:#111827">${s.num}</div>
              <div style="font-size:0.75rem;color:#6b7280">${s.label}</div>
            </div>`).join('')}
        </div>
      </div>

      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div>
          <div style="font-size:0.75rem;color:#6b7280">ICT Practical Programme Fee</div>
          <div style="font-family:var(--font-heading);font-size:1.3rem;font-weight:700;color:#111827" id="ictFeeDisplay">${fmt(fee)}</div>
        </div>
        ${isIctAdmin ? `
          <div style="display:flex;gap:8px;align-items:center;margin-left:auto">
            <input type="number" id="ictFeeInput" class="form-control" style="width:140px" value="${fee}" min="0" step="500">
            <button class="btn btn-primary btn-sm" id="ictFeeSaveBtn">Save Fee</button>
          </div>` : ''}
      </div>

      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <span style="font-family:var(--font-heading);font-weight:700;font-size:0.9rem;color:#111827">Applications</span>
          <div style="display:flex;gap:6px" id="ictFilterTabs">
            ${['', 'pending_approval', 'approved', 'rejected'].map(s => `
              <button data-status="${s}" class="btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline'}" style="font-size:0.72rem">
                ${s === '' ? 'All' : ENROLL_COLORS[s].label}
              </button>`).join('')}
          </div>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table" style="width:100%;min-width:820px">
            <thead>
              <tr>
                <th>Pupil</th><th>Class</th><th>Parent/Guardian</th><th>Phone</th><th>Email</th>
                <th>Submitted</th><th>Enrollment Status</th><th>Payment</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${applications.length ? applications.map(a => {
                const ec = ENROLL_COLORS[a.enrollment_status] || ENROLL_COLORS.pending_approval;
                const pc = PAY_COLORS[a.payment_status] || PAY_COLORS.pending;
                return `
                  <tr>
                    <td>${a.pupil_full_name}</td>
                    <td>${a.class_name}</td>
                    <td>${a.parent_name}</td>
                    <td>${a.parent_phone}</td>
                    <td>${a.parent_email || '—'}</td>
                    <td>${new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td><span style="background:${ec.bg};color:${ec.color};padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700">${ec.label}</span></td>
                    <td><span style="background:${pc.bg};color:${pc.color};padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700">${pc.label}</span></td>
                    <td>
                      <div style="display:flex;gap:6px;flex-wrap:wrap">
                        ${a.enrollment_status === 'pending_approval' ? `
                          <button class="btn btn-sm btn-primary" style="font-size:0.7rem" onclick="window._ictEnrollUpdate(${a.id},{enrollment_status:'approved'})">Approve</button>
                          <button class="btn btn-sm btn-outline" style="font-size:0.7rem;color:#dc2626" onclick="window._ictEnrollUpdate(${a.id},{enrollment_status:'rejected'})">Reject</button>
                        ` : ''}
                        ${a.enrollment_status === 'approved' && a.payment_status !== 'paid' ? `
                          <button class="btn btn-sm btn-outline" style="font-size:0.7rem" onclick="window._ictEnrollUpdate(${a.id},{payment_status:'paid'})">Mark Paid</button>
                        ` : ''}
                        ${a.payment_status === 'paid' ? `
                          <button class="btn btn-sm btn-outline" style="font-size:0.7rem" onclick="window._ictEnrollUpdate(${a.id},{payment_status:'pending'})">Mark Unpaid</button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>`;
              }).join('') : '<tr><td colspan="9" style="text-align:center;color:#9ca3af;padding:24px">No applications yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.querySelectorAll('#ictFilterTabs [data-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        filterStatus = btn.dataset.status;
        await loadAll();
        render();
      });
    });

    document.getElementById('ictFeeSaveBtn')?.addEventListener('click', async () => {
      const input = document.getElementById('ictFeeInput');
      const newFee = Number(input.value);
      try {
        await window.RCA_API.call('/settings/payment', { method: 'PUT', body: { ict_practical_fee: newFee } });
        fee = newFee;
        document.getElementById('ictFeeDisplay').textContent = fmt(fee);
      } catch (e) {
        alert('Could not save fee: ' + e.message);
      }
    });
  }

  window._ictEnrollUpdate = async function(id, patch) {
    try {
      await window.RCA_API.call(`/ict-enrollments/${id}`, { method: 'PUT', body: patch });
    } catch (e) {
      alert('Could not update application: ' + e.message);
      return;
    }
    await loadAll();
    render();
  };

  try {
    await loadAll();
  } catch (e) {
    console.warn('Could not load ICT enrollment applications:', e.message);
  }
  render();
});
