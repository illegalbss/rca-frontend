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
  let allStudents = [];
  let feeSchedule = [];
  const TERM_LABELS = { term1: 'First Term', term2: 'Second Term', term3: 'Third Term' };

  async function loadAll() {
    const [appsData, feeData, studentsData, scheduleData] = await Promise.all([
      window.RCA_API.call('/ict-enrollments' + (filterStatus ? `?enrollment_status=${filterStatus}` : '')),
      window.RCA_API.call('/settings/payment'),
      window.RCA_API.getStudents(),
      window.RCA_API.call('/payments/fee-schedule')
    ]);
    applications = appsData.applications || [];
    fee = feeData.ict_practical_fee || 0;
    allStudents = studentsData || [];
    feeSchedule = scheduleData.terms || [];
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
            <button class="btn btn-sm btn-outline" style="font-size:0.72rem" onclick="window._ictPracticalOpenPayModal(${a.id},'${a.pupil_full_name.replace(/'/g, "\\'")}')">Record Payment</button>
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
        <div style="font-size:0.75rem;color:#6b7280;margin-bottom:4px">ICT Practical Programme Fee (per term) — the after-school coding/ICT club</div>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="font-family:var(--font-heading);font-size:1.4rem;font-weight:700;color:#111827" id="ictFeeDisplay">${fmt(fee)}</div>
          ${isIctAdmin ? `
            <div style="display:flex;gap:8px;align-items:center;margin-left:auto">
              <input type="number" id="ictFeeInput" class="form-control" style="width:140px" value="${fee}" min="0" step="500">
              <button class="btn btn-primary btn-sm" id="ictFeeSaveBtn">Save Fee</button>
            </div>` : ''}
        </div>
      </div>

      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:18px 20px;margin-bottom:20px">
        <div style="font-family:var(--font-heading);font-weight:700;font-size:0.95rem;color:#111827;margin-bottom:4px">Practical Programme Fee Report</div>
        <p style="font-size:0.78rem;color:#6b7280;margin-bottom:14px">Who has paid the ICT Practical Programme fee (the after-school club — click "Record Payment" on an application below to add one). This is separate from the ICT/Portal Fee report further down.</p>
        <div id="ictPracticalReportStats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:14px"></div>
        <input type="text" id="ictPracticalReportSearch" class="form-control" placeholder="Search name or class…" style="margin-bottom:12px">
        <div id="ictPracticalReportList" style="max-height:240px;overflow-y:auto;margin-bottom:16px"></div>
        <div style="font-size:0.82rem;font-weight:700;color:#111827;margin-bottom:8px;padding-top:8px;border-top:1px solid #f3f4f6">Recorded Payments <span style="font-weight:400;color:#9ca3af">(delete a wrongly-recorded one here)</span></div>
        <div id="ictPracticalReportTransactions" style="max-height:240px;overflow-y:auto"></div>
      </div>

      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:18px 20px;margin-bottom:20px">
        <div style="font-family:var(--font-heading);font-weight:700;font-size:0.95rem;color:#111827;margin-bottom:4px">Record ICT / Portal Fee Payment</div>
        <p style="font-size:0.78rem;color:#6b7280;margin-bottom:16px">This is the separate termly website/results-portal fee every pupil pays (not the Practical Programme fee above) — required, along with the rest of a pupil's fees, before their results unlock for parents. Edit the amount on the <a href="fees.html" style="color:var(--color-primary,#6b0f1a)">Fee Schedule</a> page.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:12px">
          <div class="form-group" style="position:relative">
            <label>Pupil</label>
            <input type="text" id="ictPayPupilSearch" class="form-control" placeholder="Search name or admission no…" autocomplete="off">
            <div id="ictPayPupilResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-height:220px;overflow-y:auto;z-index:10"></div>
          </div>
          <div class="form-group">
            <label>Term</label>
            <select id="ictPayTerm" class="form-control">
              <option value="term1">First Term</option>
              <option value="term2" selected>Second Term</option>
              <option value="term3">Third Term</option>
            </select>
          </div>
          <div class="form-group">
            <label>Amount (₦)</label>
            <input type="number" id="ictPayAmount" class="form-control" min="0">
          </div>
          <div class="form-group">
            <label>Payment Method</label>
            <select id="ictPayMethod" class="form-control">
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="POS">POS</option>
              <option value="Online">Online</option>
            </select>
          </div>
        </div>
        <div id="ictPaySelectedPupil" style="font-size:0.8rem;color:#374151;margin-bottom:12px"></div>
        <div id="ictPayError" style="display:none;background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:8px;padding:8px 12px;font-size:0.8rem;margin-bottom:12px"></div>
        <button class="btn btn-primary btn-sm" id="ictPaySubmitBtn">Record Payment</button>
      </div>

      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:18px 20px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-family:var(--font-heading);font-weight:700;font-size:0.95rem;color:#111827">ICT / Portal Fee Report</span>
          <select id="ictReportTerm" class="form-control" style="width:auto">
            <option value="term1">First Term</option>
            <option value="term2" selected>Second Term</option>
            <option value="term3">Third Term</option>
          </select>
        </div>
        <p style="font-size:0.78rem;color:#6b7280;margin-bottom:14px">Who has and hasn't paid the ICT/Portal Fee this term — this money doesn't go through the school account, so it's kept separate from Finance Reports.</p>
        <div id="ictReportStats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:14px"></div>
        <input type="text" id="ictReportSearch" class="form-control" placeholder="Search name or admission no…" style="margin-bottom:12px">
        <div id="ictReportList" style="max-height:280px;overflow-y:auto;margin-bottom:16px"></div>
        <div style="font-size:0.82rem;font-weight:700;color:#111827;margin-bottom:8px;padding-top:8px;border-top:1px solid #f3f4f6">Recorded Payments <span style="font-weight:400;color:#9ca3af">(delete a wrongly-recorded one here)</span></div>
        <div id="ictReportTransactions" style="max-height:280px;overflow-y:auto"></div>
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

    wireIctFeePaymentForm();
    wireIctFeeReport();
    wireIctPracticalReport();
  }

  /* ============================================
     PRACTICAL PROGRAMME FEE REPORT — who's paid, who hasn't, plus the
     raw transaction list for deleting a wrongly-recorded payment.
     ============================================ */
  let ictPracticalReportSearch = '';

  async function loadAndRenderIctPracticalReport() {
    const statsBox = document.getElementById('ictPracticalReportStats');
    const listBox  = document.getElementById('ictPracticalReportList');
    const txBox    = document.getElementById('ictPracticalReportTransactions');
    if (!statsBox || !listBox) return;

    listBox.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:20px;font-size:0.85rem">Loading…</p>';

    let data;
    try {
      data = await window.RCA_API.call('/ict-enrollments/payments-report');
    } catch (e) {
      listBox.innerHTML = `<p style="text-align:center;color:#dc2626;padding:20px;font-size:0.85rem">Could not load report: ${e.message}</p>`;
      return;
    }

    statsBox.innerHTML = [
      { num: data.paid_count, label: 'Paid', color: '#059669' },
      { num: data.unpaid_count, label: 'Unpaid / Partial', color: '#dc2626' },
      { num: fmt(data.total_collected), label: 'Collected', color: '#7c3aed' }
    ].map(s => `
      <div style="background:#f9fafb;border-radius:10px;padding:12px 14px;border-left:4px solid ${s.color}">
        <div style="font-family:var(--font-heading);font-size:1.2rem;font-weight:700;color:#111827">${s.num}</div>
        <div style="font-size:0.72rem;color:#6b7280">${s.label}</div>
      </div>`).join('');

    const q = ictPracticalReportSearch.toLowerCase();
    const pupils = q
      ? data.pupils.filter(p => p.pupil_full_name.toLowerCase().includes(q) || p.class_name.toLowerCase().includes(q))
      : data.pupils;

    listBox.innerHTML = pupils.length
      ? pupils.map(p => {
          const c = p.status === 'paid' ? { bg: '#d1fae5', color: '#065f46', label: 'Paid' }
                  : p.status === 'partial' ? { bg: '#fef3c7', color: '#92400e', label: 'Partial' }
                  : { bg: '#fee2e2', color: '#991b1b', label: 'Unpaid' };
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6">
              <div style="min-width:0">
                <div style="font-size:0.82rem;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.pupil_full_name}</div>
                <div style="font-size:0.72rem;color:#9ca3af">${p.class_name} · ${fmt(p.amount_paid)} of ${fmt(data.fee_amount)}</div>
              </div>
              <span style="background:${c.bg};color:${c.color};padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;white-space:nowrap">${c.label}</span>
            </div>`;
        }).join('')
      : '<p style="text-align:center;color:#9ca3af;padding:20px;font-size:0.85rem">No applications found.</p>';

    if (txBox) {
      txBox.innerHTML = data.transactions.length
        ? data.transactions.map(t => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6">
              <div style="min-width:0">
                <div style="font-size:0.82rem;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.pupil_full_name} — ${fmt(t.amount)}</div>
                <div style="font-size:0.72rem;color:#9ca3af">${t.class_name} · ${new Date(t.payment_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}${t.payment_method ? ' · ' + t.payment_method : ''}</div>
              </div>
              <button class="btn btn-sm btn-outline" style="font-size:0.7rem;color:#dc2626;flex-shrink:0" onclick="window._ictPracticalPaymentDelete(${t.id},'${t.pupil_full_name.replace(/'/g, "\\'")}')">Delete</button>
            </div>`).join('')
        : '<p style="text-align:center;color:#9ca3af;padding:20px;font-size:0.85rem">No payments recorded yet.</p>';
    }
  }

  window._ictPracticalPaymentDelete = async function(paymentId, pupilName) {
    if (!confirm(`Delete this Practical Programme payment for ${pupilName}? This cannot be undone.`)) return;
    try {
      await window.RCA_API.call(`/ict-enrollments/payments/${paymentId}`, { method: 'DELETE' });
    } catch (e) {
      alert('Could not delete payment: ' + e.message);
      return;
    }
    await loadAll();
    render();
  };

  function wireIctPracticalReport() {
    const searchInput = document.getElementById('ictPracticalReportSearch');
    if (!searchInput) return;
    searchInput.value = ictPracticalReportSearch;

    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        ictPracticalReportSearch = searchInput.value.trim();
        loadAndRenderIctPracticalReport();
      }, 300);
    });

    loadAndRenderIctPracticalReport();
  }

  /* ============================================
     RECORD PRACTICAL PROGRAMME PAYMENT — opened from an application
     card's "Record Payment" button.
     ============================================ */
  window._ictPracticalOpenPayModal = function(enrollmentId, pupilName) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:420px;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="margin-bottom:4px;color:var(--color-primary);font-size:1rem">Record Payment</h3>
        <p style="font-size:0.8rem;color:#6b7280;margin-bottom:16px">${pupilName} — Practical Programme fee (${fmt(fee)})</p>
        <div class="form-group">
          <label>Amount (₦)</label>
          <input type="number" id="ictPracticalPayAmount" class="form-control" value="${fee}" min="0">
        </div>
        <div class="form-group">
          <label>Payment Method</label>
          <select id="ictPracticalPayMethod" class="form-control">
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="POS">POS</option>
            <option value="Online">Online</option>
          </select>
        </div>
        <div id="ictPracticalPayError" style="display:none;background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:8px;padding:8px 12px;font-size:0.8rem;margin-bottom:12px"></div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-outline" style="flex:1" id="ictPracticalPayCancelBtn">Cancel</button>
          <button class="btn btn-primary" style="flex:1" id="ictPracticalPaySaveBtn">Record</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.getElementById('ictPracticalPayCancelBtn').addEventListener('click', () => modal.remove());
    document.getElementById('ictPracticalPaySaveBtn').addEventListener('click', async () => {
      const errorBox = document.getElementById('ictPracticalPayError');
      const amount = Number(document.getElementById('ictPracticalPayAmount').value);
      if (!amount || amount <= 0) {
        errorBox.textContent = 'Please enter a valid amount.';
        errorBox.style.display = 'block';
        return;
      }

      try {
        await window.RCA_API.call(`/ict-enrollments/${enrollmentId}/payments`, {
          method: 'POST',
          body: { amount, payment_method: document.getElementById('ictPracticalPayMethod').value }
        });
      } catch (e) {
        errorBox.textContent = 'Could not record payment: ' + e.message;
        errorBox.style.display = 'block';
        return;
      }

      modal.remove();
      await loadAll();
      render();
    });
  };

  /* ============================================
     ICT / PORTAL FEE REPORT — who's paid, who hasn't
     ============================================ */
  let ictReportTerm = 'term2';
  let ictReportSearch = '';

  async function loadAndRenderIctFeeReport() {
    const statsBox = document.getElementById('ictReportStats');
    const listBox  = document.getElementById('ictReportList');
    if (!statsBox || !listBox) return;

    listBox.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:20px;font-size:0.85rem">Loading…</p>';

    let data;
    try {
      const qs = new URLSearchParams({ term: ictReportTerm });
      if (ictReportSearch) qs.set('search', ictReportSearch);
      data = await window.RCA_API.call('/payments/ict-fee-report?' + qs.toString());
    } catch (e) {
      listBox.innerHTML = `<p style="text-align:center;color:#dc2626;padding:20px;font-size:0.85rem">Could not load report: ${e.message}</p>`;
      return;
    }

    statsBox.innerHTML = [
      { num: data.paid_count, label: 'Paid', color: '#059669' },
      { num: data.unpaid_count, label: 'Unpaid', color: '#dc2626' },
      { num: fmt(data.total_collected), label: 'Collected', color: '#7c3aed' }
    ].map(s => `
      <div style="background:#f9fafb;border-radius:10px;padding:12px 14px;border-left:4px solid ${s.color}">
        <div style="font-family:var(--font-heading);font-size:1.2rem;font-weight:700;color:#111827">${s.num}</div>
        <div style="font-size:0.72rem;color:#6b7280">${s.label}</div>
      </div>`).join('');

    listBox.innerHTML = data.pupils.length
      ? data.pupils.map(p => {
          const c = p.status === 'paid' ? { bg: '#d1fae5', color: '#065f46', label: 'Paid' }
                  : p.status === 'partial' ? { bg: '#fef3c7', color: '#92400e', label: 'Partial' }
                  : { bg: '#fee2e2', color: '#991b1b', label: 'Unpaid' };
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6">
              <div style="min-width:0">
                <div style="font-size:0.82rem;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.full_name}</div>
                <div style="font-size:0.72rem;color:#9ca3af">${p.class_name} · ${p.admission_no}</div>
              </div>
              <span style="background:${c.bg};color:${c.color};padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;white-space:nowrap">${c.label}</span>
            </div>`;
        }).join('')
      : '<p style="text-align:center;color:#9ca3af;padding:20px;font-size:0.85rem">No pupils found.</p>';

    const txBox = document.getElementById('ictReportTransactions');
    if (txBox) {
      txBox.innerHTML = data.transactions.length
        ? data.transactions.map(t => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6">
              <div style="min-width:0">
                <div style="font-size:0.82rem;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.full_name} — ${fmt(t.amount)}</div>
                <div style="font-size:0.72rem;color:#9ca3af">${t.class_name} · ${t.admission_no} · ${new Date(t.payment_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} · ${t.payment_method}</div>
              </div>
              <button class="btn btn-sm btn-outline" style="font-size:0.7rem;color:#dc2626;flex-shrink:0" onclick="window._ictFeePaymentDelete(${t.id},'${t.full_name.replace(/'/g, "\\'")}')">Delete</button>
            </div>`).join('')
        : '<p style="text-align:center;color:#9ca3af;padding:20px;font-size:0.85rem">No payments recorded yet.</p>';
    }
  }

  window._ictFeePaymentDelete = async function(id, pupilName) {
    if (!confirm(`Delete this ICT fee payment for ${pupilName}? This cannot be undone.`)) return;
    try {
      await window.RCA_API.call(`/payments/${id}`, { method: 'DELETE' });
    } catch (e) {
      alert('Could not delete payment: ' + e.message);
      return;
    }
    loadAndRenderIctFeeReport();
  };

  function wireIctFeeReport() {
    const termSelect = document.getElementById('ictReportTerm');
    const searchInput = document.getElementById('ictReportSearch');
    if (!termSelect) return;

    termSelect.value = ictReportTerm;
    searchInput.value = ictReportSearch;

    termSelect.addEventListener('change', () => {
      ictReportTerm = termSelect.value;
      loadAndRenderIctFeeReport();
    });

    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        ictReportSearch = searchInput.value.trim();
        loadAndRenderIctFeeReport();
      }, 300);
    });

    loadAndRenderIctFeeReport();
  }

  /* ============================================
     RECORD ICT / PORTAL FEE PAYMENT
     ============================================ */
  let selectedPupil = null;

  function ictFeeAmountForTerm(term) {
    const sched = feeSchedule.find(t => t.term === term);
    return sched ? Number(sched.ict_fee || 0) : 0;
  }

  function wireIctFeePaymentForm() {
    const searchInput  = document.getElementById('ictPayPupilSearch');
    const resultsBox   = document.getElementById('ictPayPupilResults');
    const termSelect   = document.getElementById('ictPayTerm');
    const amountInput  = document.getElementById('ictPayAmount');
    const selectedInfo = document.getElementById('ictPaySelectedPupil');
    const errorBox     = document.getElementById('ictPayError');
    const submitBtn    = document.getElementById('ictPaySubmitBtn');
    if (!searchInput) return;

    selectedPupil = null;
    amountInput.value = ictFeeAmountForTerm(termSelect.value);

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      selectedPupil = null;
      selectedInfo.textContent = '';
      if (!q) { resultsBox.style.display = 'none'; return; }

      const matches = allStudents.filter(s =>
        s.full_name.toLowerCase().includes(q) || s.admission_no.toLowerCase().includes(q)
      ).slice(0, 8);

      if (!matches.length) {
        resultsBox.innerHTML = '<div style="padding:10px 12px;font-size:0.8rem;color:#9ca3af">No pupils found.</div>';
        resultsBox.style.display = 'block';
        return;
      }

      resultsBox.innerHTML = matches.map(s => `
        <div class="ict-pay-result" data-adm="${s.admission_no}" style="padding:8px 12px;font-size:0.82rem;cursor:pointer;border-bottom:1px solid #f3f4f6">
          <strong>${s.full_name}</strong> <span style="color:#9ca3af">— ${s.class_name} · ${s.admission_no}</span>
        </div>`).join('');
      resultsBox.style.display = 'block';

      resultsBox.querySelectorAll('.ict-pay-result').forEach(row => {
        row.addEventListener('click', () => {
          const s = allStudents.find(x => x.admission_no === row.dataset.adm);
          selectedPupil = s;
          searchInput.value = `${s.full_name} (${s.admission_no})`;
          selectedInfo.textContent = `Selected: ${s.full_name} — ${s.class_name}`;
          resultsBox.style.display = 'none';
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (!resultsBox.contains(e.target) && e.target !== searchInput) resultsBox.style.display = 'none';
    });

    termSelect.addEventListener('change', () => {
      amountInput.value = ictFeeAmountForTerm(termSelect.value);
    });

    submitBtn.addEventListener('click', async () => {
      errorBox.style.display = 'none';

      if (!selectedPupil) {
        errorBox.textContent = 'Please search for and select a pupil first.';
        errorBox.style.display = 'block';
        return;
      }
      const amount = Number(amountInput.value);
      if (!amount || amount <= 0) {
        errorBox.textContent = 'Please enter a valid amount.';
        errorBox.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      try {
        await window.RCA_API.call('/payments', {
          method: 'POST',
          body: {
            admission_no: selectedPupil.admission_no,
            amount,
            fee_type: 'ict_fee',
            term: termSelect.value,
            payment_method: document.getElementById('ictPayMethod').value
          }
        });
      } catch (e) {
        errorBox.textContent = 'Could not record payment: ' + e.message;
        errorBox.style.display = 'block';
        submitBtn.disabled = false;
        return;
      }

      selectedPupil = null;
      searchInput.value = '';
      selectedInfo.textContent = '✅ Payment recorded.';
      submitBtn.disabled = false;
      loadAndRenderIctFeeReport();
    });
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
