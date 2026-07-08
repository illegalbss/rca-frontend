/* ============================================
   ICT ENROLLMENT APPLICATIONS — ict-enrollment.js
   Royal Crystal Academy
   ============================================
   Reviews applications submitted through the public ICT Department
   page's "Enroll Now" form (POST /api/ict-enrollments, no auth needed
   there) — plus lets staff add a pupil directly (e.g. a parent who
   asked in person rather than through the website).

   Each application renders as its own card (name/class/status header,
   parent contact line, action row) instead of one wide table, since a
   9-column table of mostly-short values read as visually noisy.
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

  function applicationCardHtml(a) {
    const ec = ENROLL_COLORS[a.enrollment_status] || ENROLL_COLORS.pending_approval;
    const pc = PAY_COLORS[a.payment_status] || PAY_COLORS.pending;
    const submitted = new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return `
      <div style="border:1px solid #eef0f3;border-radius:12px;padding:16px 18px;margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">
          <div>
            <div style="font-weight:700;font-size:0.92rem;color:#111827">${a.pupil_full_name}</div>
            <div style="font-size:0.75rem;color:#6b7280">${a.class_name} · Submitted ${submitted}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span style="background:${ec.bg};color:${ec.color};padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;white-space:nowrap">${ec.label}</span>
            <span style="background:${pc.bg};color:${pc.color};padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;white-space:nowrap">${pc.label}</span>
          </div>
        </div>

        <div style="font-size:0.8rem;color:#374151;margin-bottom:14px;line-height:1.6">
          <strong>${a.parent_name}</strong> · ${a.parent_phone}${a.parent_email ? ' · ' + a.parent_email : ''}
          ${a.notes ? `<div style="color:#9ca3af;font-size:0.75rem;margin-top:4px">"${a.notes}"</div>` : ''}
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid #f3f4f6;padding-top:12px">
          ${a.enrollment_status === 'pending_approval' ? `
            <button class="btn btn-sm btn-primary" style="font-size:0.72rem" onclick="window._ictEnrollUpdate(${a.id},{enrollment_status:'approved'})">Approve</button>
            <button class="btn btn-sm btn-outline" style="font-size:0.72rem;color:#dc2626" onclick="window._ictEnrollUpdate(${a.id},{enrollment_status:'rejected'})">Reject</button>
          ` : ''}
          ${a.enrollment_status === 'approved' && a.payment_status !== 'paid' ? `
            <button class="btn btn-sm btn-outline" style="font-size:0.72rem" onclick="window._ictEnrollUpdate(${a.id},{payment_status:'paid'})">Mark Paid</button>
          ` : ''}
          ${a.payment_status === 'paid' ? `
            <button class="btn btn-sm btn-outline" style="font-size:0.72rem" onclick="window._ictEnrollUpdate(${a.id},{payment_status:'pending'})">Mark Unpaid</button>
          ` : ''}
          <button class="btn btn-sm btn-outline" style="font-size:0.72rem;color:#dc2626;margin-left:auto" onclick="window._ictEnrollDelete(${a.id},'${a.pupil_full_name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </div>`;
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

      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:18px 20px;margin-bottom:20px">
        <div style="font-size:0.75rem;color:#6b7280;margin-bottom:4px">ICT Practical Programme Fee (per term)</div>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="font-family:var(--font-heading);font-size:1.4rem;font-weight:700;color:#111827" id="ictFeeDisplay">${fmt(fee)}</div>
          ${isIctAdmin ? `
            <div style="display:flex;gap:8px;align-items:center;margin-left:auto">
              <input type="number" id="ictFeeInput" class="form-control" style="width:140px" value="${fee}" min="0" step="500">
              <button class="btn btn-primary btn-sm" id="ictFeeSaveBtn">Save Fee</button>
            </div>` : ''}
        </div>
      </div>

      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:18px 20px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px">
          <span style="font-family:var(--font-heading);font-weight:700;font-size:0.95rem;color:#111827">Applications</span>
          <button class="btn btn-primary btn-sm" id="ictAddApplicationBtn">+ Add Application</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px" id="ictFilterTabs">
          ${['', 'pending_approval', 'approved', 'rejected'].map(s => `
            <button data-status="${s}" class="btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline'}" style="font-size:0.72rem">
              ${s === '' ? 'All' : ENROLL_COLORS[s].label}
            </button>`).join('')}
        </div>

        <div>
          ${applications.length
            ? applications.map(applicationCardHtml).join('')
            : '<p style="text-align:center;color:#9ca3af;padding:24px;font-size:0.85rem">No applications yet.</p>'}
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

    document.getElementById('ictAddApplicationBtn')?.addEventListener('click', openAddApplicationModal);
  }

  /* ============================================
     ADD APPLICATION — for pupils who ask to join in person/by phone
     rather than through the public website form. Same backend route
     (POST /ict-enrollments) — it doesn't require login either way.
     ============================================ */
  function openAddApplicationModal() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;padding:28px 32px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="margin-bottom:16px;color:var(--color-primary);font-size:1rem">Add ICT Enrollment Application</h3>
        <div class="form-group">
          <label>Pupil's Full Name *</label>
          <input type="text" id="ictAddPupilName" class="form-control">
        </div>
        <div class="form-group">
          <label>Class *</label>
          <select id="ictAddClass" class="form-control">
            <option value="">Select class…</option>
            <option value="Basic 3">Basic 3</option>
            <option value="Basic 4">Basic 4</option>
            <option value="Basic 5">Basic 5</option>
            <option value="Basic 6">Basic 6</option>
          </select>
        </div>
        <div class="form-group">
          <label>Parent/Guardian Name *</label>
          <input type="text" id="ictAddParentName" class="form-control">
        </div>
        <div class="form-group">
          <label>Parent/Guardian Phone *</label>
          <input type="tel" id="ictAddParentPhone" class="form-control">
        </div>
        <div class="form-group">
          <label>Parent/Guardian Email</label>
          <input type="email" id="ictAddParentEmail" class="form-control">
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="ictAddNotes" class="form-control" rows="2"></textarea>
        </div>
        <div id="ictAddError" style="display:none;background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:8px;padding:8px 12px;font-size:0.8rem;margin-bottom:12px"></div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-outline" style="flex:1" id="ictAddCancelBtn">Cancel</button>
          <button class="btn btn-primary" style="flex:1" id="ictAddSaveBtn">Add Application</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.getElementById('ictAddCancelBtn').addEventListener('click', () => modal.remove());
    document.getElementById('ictAddSaveBtn').addEventListener('click', async () => {
      const payload = {
        pupil_full_name: document.getElementById('ictAddPupilName').value.trim(),
        class_name:      document.getElementById('ictAddClass').value,
        parent_name:     document.getElementById('ictAddParentName').value.trim(),
        parent_phone:    document.getElementById('ictAddParentPhone').value.trim(),
        parent_email:    document.getElementById('ictAddParentEmail').value.trim(),
        notes:           document.getElementById('ictAddNotes').value.trim()
      };
      const errorBox = document.getElementById('ictAddError');

      if (!payload.pupil_full_name || !payload.class_name || !payload.parent_name || !payload.parent_phone) {
        errorBox.textContent = 'Pupil name, class, parent/guardian name and phone are required.';
        errorBox.style.display = 'block';
        return;
      }

      try {
        await window.RCA_API.call('/ict-enrollments', { method: 'POST', body: payload });
      } catch (e) {
        errorBox.textContent = 'Could not add application: ' + e.message;
        errorBox.style.display = 'block';
        return;
      }

      modal.remove();
      await loadAll();
      render();
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

  window._ictEnrollDelete = async function(id, pupilName) {
    if (!confirm(`Delete the application for ${pupilName}? This cannot be undone.`)) return;
    try {
      await window.RCA_API.call(`/ict-enrollments/${id}`, { method: 'DELETE' });
    } catch (e) {
      alert('Could not delete application: ' + e.message);
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
