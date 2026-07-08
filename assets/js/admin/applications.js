/* ============================================
   ADMISSION APPLICATIONS — applications.js
   Royal Crystal Academy
   ============================================
   Reviews applications submitted through the public Admissions page
   (POST /api/applications, no auth needed there). Approving/rejecting
   here just records the school's decision — actually enrolling an
   approved applicant as a real pupil is still done separately via the
   Admission Form / Admission Register pages.
*/

document.addEventListener('DOMContentLoaded', async () => {

  const STATUS_COLORS = {
    pending:  { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    approved: { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' }
  };

  let applications = [];
  let filterStatus = '';

  async function loadAll() {
    const data = await window.RCA_API.call('/applications' + (filterStatus ? `?status=${filterStatus}` : ''));
    applications = data.applications || [];
    updateBadge(data.pending_count || 0);
  }

  function updateBadge(count) {
    const badge = document.getElementById('applicationsBadge');
    if (!badge) return;
    if (count > 0) { badge.textContent = count; badge.style.display = ''; }
    else badge.style.display = 'none';
  }

  function applicationCardHtml(a) {
    const sc = STATUS_COLORS[a.status] || STATUS_COLORS.pending;
    const submitted = new Date(a.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const dob = a.pupil_dob ? new Date(a.pupil_dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    return `
      <div style="border:1px solid #eef0f3;border-radius:12px;padding:16px 18px;margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">
          <div>
            <div style="font-weight:700;font-size:0.92rem;color:#111827">${a.pupil_name}</div>
            <div style="font-size:0.75rem;color:#6b7280">Applying for ${a.class_applying} · Ref ${a.ref} · Submitted ${submitted}</div>
          </div>
          <span style="background:${sc.bg};color:${sc.color};padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;white-space:nowrap">${sc.label}</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:6px 16px;font-size:0.8rem;color:#374151;margin-bottom:12px">
          <div><span style="color:#9ca3af">DOB:</span> ${dob}</div>
          <div><span style="color:#9ca3af">Gender:</span> ${a.pupil_gender ? a.pupil_gender.charAt(0).toUpperCase() + a.pupil_gender.slice(1) : '—'}</div>
          <div><span style="color:#9ca3af">Parent/Guardian:</span> ${a.parent_name} (${a.relationship || '—'})</div>
          <div><span style="color:#9ca3af">Phone:</span> ${a.parent_phone}</div>
          <div><span style="color:#9ca3af">Email:</span> ${a.parent_email || '—'}</div>
          <div><span style="color:#9ca3af">Address:</span> ${a.home_address || '—'}</div>
        </div>
        ${a.additional_info ? `<div style="font-size:0.78rem;color:#6b7280;background:#f9fafb;border-radius:8px;padding:8px 12px;margin-bottom:12px">"${a.additional_info}"</div>` : ''}

        <div style="display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid #f3f4f6;padding-top:12px">
          ${a.status === 'pending' ? `
            <button class="btn btn-sm btn-primary" style="font-size:0.72rem" onclick="window._appUpdate(${a.id},'approved')">Approve</button>
            <button class="btn btn-sm btn-outline" style="font-size:0.72rem;color:#dc2626" onclick="window._appUpdate(${a.id},'rejected')">Reject</button>
          ` : ''}
          ${a.status !== 'pending' ? `
            <button class="btn btn-sm btn-outline" style="font-size:0.72rem" onclick="window._appUpdate(${a.id},'pending')">Reopen</button>
          ` : ''}
          <button class="btn btn-sm btn-outline" style="font-size:0.72rem;color:#dc2626;margin-left:auto" onclick="window._appDelete(${a.id},'${a.pupil_name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </div>`;
  }

  function render() {
    const pendingCount  = applications.filter(a => a.status === 'pending').length;
    const approvedCount = applications.filter(a => a.status === 'approved').length;
    const rejectedCount = applications.filter(a => a.status === 'rejected').length;

    const main = document.getElementById('applicationsMain');
    main.innerHTML = `
      <div style="overflow-x:auto;margin-bottom:20px;-webkit-overflow-scrolling:touch">
        <div style="display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:14px;min-width:600px">
          ${[
            { num: applications.length, label: 'Total Applications', color: '#1d4ed8', icon: '📋' },
            { num: pendingCount, label: 'Pending', color: '#d97706', icon: '⏳' },
            { num: approvedCount, label: 'Approved', color: '#059669', icon: '✅' },
            { num: rejectedCount, label: 'Rejected', color: '#dc2626', icon: '❌' }
          ].map(s => `
            <div style="background:#fff;border-radius:12px;padding:16px 18px;box-shadow:0 1px 4px rgba(0,0,0,0.07);border-left:4px solid ${s.color}">
              <div style="font-size:1.3rem;margin-bottom:6px">${s.icon}</div>
              <div style="font-family:var(--font-heading);font-size:1.6rem;font-weight:700;color:#111827">${s.num}</div>
              <div style="font-size:0.75rem;color:#6b7280">${s.label}</div>
            </div>`).join('')}
        </div>
      </div>

      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:18px 20px">
        <div style="font-family:var(--font-heading);font-weight:700;font-size:0.95rem;color:#111827;margin-bottom:12px">Applications</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px" id="appFilterTabs">
          ${['', 'pending', 'approved', 'rejected'].map(s => `
            <button data-status="${s}" class="btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline'}" style="font-size:0.72rem">
              ${s === '' ? 'All' : STATUS_COLORS[s].label}
            </button>`).join('')}
        </div>

        <div>
          ${applications.length
            ? applications.map(applicationCardHtml).join('')
            : '<p style="text-align:center;color:#9ca3af;padding:24px;font-size:0.85rem">No applications yet.</p>'}
        </div>
      </div>
    `;

    document.querySelectorAll('#appFilterTabs [data-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        filterStatus = btn.dataset.status;
        await loadAll();
        render();
      });
    });
  }

  window._appUpdate = async function(id, status) {
    try {
      await window.RCA_API.call(`/applications/${id}`, { method: 'PATCH', body: { status } });
    } catch (e) {
      alert('Could not update application: ' + e.message);
      return;
    }
    await loadAll();
    render();
  };

  window._appDelete = async function(id, pupilName) {
    if (!confirm(`Delete the application for ${pupilName}? This cannot be undone.`)) return;
    try {
      await window.RCA_API.call(`/applications/${id}`, { method: 'DELETE' });
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
    console.warn('Could not load applications:', e.message);
  }
  render();
});
