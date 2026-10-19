/* ============================================
   PARENT ACCOUNT MANAGEMENT — parent-accounts.js
   Royal Crystal Academy (ICT Admin only)
   ============================================
   Backed by /api/parent-accounts (see rca-backend routes/parentAccounts.js).
   Tabs: Accounts · Import CSV · Review Queue · Link Approvals · Audit Log.

   Statuses: Prepared (imported, not activated) → Pending Verification
   (activation code issued) → Active (parent verified with the code and set
   their own password) · Deactivated. Activation codes are shown ONCE when
   issued (only a hash is stored) — print or hand the slip to the parent.
*/
(function () {
  const STATUS = {
    prepared:    { label: 'Prepared',             bg: '#f3f4f6', color: '#374151' },
    pending:     { label: 'Pending Verification', bg: '#fef3c7', color: '#92400e' },
    active:      { label: 'Active',               bg: '#d1fae5', color: '#065f46' },
    deactivated: { label: 'Deactivated',          bg: '#fee2e2', color: '#991b1b' }
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const api = (path, opts) => window.RCA_API.call('/parent-accounts' + path, opts);
  const pill = s => { const c = STATUS[s] || STATUS.prepared; return `<span style="background:${c.bg};color:${c.color};padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;white-space:nowrap">${c.label}</span>`; };
  const card = (inner, extra = '') => `<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:18px 20px;margin-bottom:18px;${extra}">${inner}</div>`;
  const btn = (label, attrs, style = '') => `<button class="btn btn-sm btn-outline" style="font-size:0.72rem;padding:3px 10px;${style}" ${attrs}>${label}</button>`;

  let tab = 'accounts';
  let data = { parents: [], counts: {}, open_reviews: 0, pending_links: 0 };
  let filter = { status: '', q: '' };
  let importRows = null;   // parsed CSV rows
  let importPreview = null;

  const main = () => document.getElementById('paMain');

  document.addEventListener('DOMContentLoaded', async () => {
    const u = window.CURRENT_USER;
    const roles = u ? (u.roles || [u.primary_role || u.role]) : [];
    if (!roles.includes('ict_admin')) {
      main().innerHTML = card('<p style="color:#991b1b;margin:0">Parent Account Management is only available to the ICT Administrator.</p>');
      return;
    }
    await reload();
  });

  async function reload() {
    try {
      data = await api('');
    } catch (e) {
      main().innerHTML = card(`<p style="color:#dc2626;margin:0">Could not load parent accounts: ${esc(e.message)}</p>
        <p style="font-size:0.8rem;color:#6b7280;margin:8px 0 0">If this mentions a missing column or table, the database update for this feature hasn't been run yet.</p>`);
      return;
    }
    render();
  }

  function render() {
    const c = data.counts || {};
    const tabs = [
      ['accounts', 'Accounts'],
      ['import', 'Import CSV'],
      ['reviews', `Review Queue${data.open_reviews ? ` (${data.open_reviews})` : ''}`],
      ['links', `Link Approvals${data.pending_links ? ` (${data.pending_links})` : ''}`],
      ['audit', 'Audit Log']
    ];
    main().innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:18px">
        ${[['prepared', '#6b7280'], ['pending', '#d97706'], ['active', '#059669'], ['deactivated', '#dc2626']].map(([k, col]) => `
          <div style="background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,0.07);border-left:4px solid ${col};cursor:pointer" data-statcard="${k}">
            <div style="font-family:var(--font-heading);font-size:1.5rem;font-weight:700;color:#111827">${c[k] || 0}</div>
            <div style="font-size:0.75rem;color:#6b7280">${STATUS[k].label}</div>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
        ${tabs.map(([k, l]) => `<button class="btn btn-sm ${tab === k ? 'btn-primary' : 'btn-outline'}" style="font-size:0.78rem" data-tab="${k}">${l}</button>`).join('')}
      </div>
      <div id="paTab"></div>`;
    main().querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
    main().querySelectorAll('[data-statcard]').forEach(b => b.addEventListener('click', () => { tab = 'accounts'; filter.status = b.dataset.statcard; render(); }));
    ({ accounts: renderAccounts, import: renderImport, reviews: renderReviews, links: renderLinks, audit: renderAudit })[tab]();
  }

  /* ================================================== ACCOUNTS */
  function renderAccounts() {
    const q = filter.q.toLowerCase();
    const rows = data.parents.filter(p =>
      (!filter.status || p.status === filter.status) &&
      (!q || [p.full_name, p.email, p.phone, p.phone_display, ...p.children.map(c => c.full_name + ' ' + c.admission_no)].join(' ').toLowerCase().includes(q)));

    document.getElementById('paTab').innerHTML = card(`
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <input id="paSearch" class="form-control" placeholder="Search parent, phone, email or child…" value="${esc(filter.q)}" style="flex:1;min-width:200px">
        <select id="paStatus" class="form-control" style="width:auto">
          <option value="">All statuses</option>
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${filter.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
        <button class="btn btn-primary btn-sm" id="paAddParent" style="white-space:nowrap">+ Add Parent</button>
      </div>
      <div style="font-size:0.78rem;color:#6b7280;margin-bottom:10px">${rows.length} parent account${rows.length !== 1 ? 's' : ''}</div>
      <div style="overflow-x:auto">
        <table class="finance-table" style="width:100%;font-size:0.82rem;border-collapse:collapse">
          <thead><tr style="text-align:left;border-bottom:2px solid #e5e7eb">
            <th style="padding:8px">Parent</th><th style="padding:8px">Children</th><th style="padding:8px">Status</th><th style="padding:8px">Actions</th>
          </tr></thead>
          <tbody>
            ${rows.map(p => `
              <tr style="border-bottom:1px solid #f3f4f6;vertical-align:top">
                <td style="padding:8px">
                  <div style="font-weight:700;color:#111827">${esc(p.full_name)}</div>
                  <div style="font-size:0.75rem;color:#6b7280">${esc(p.phone_display || p.phone || 'no phone')}${p.email ? ' · ' + esc(p.email) : ''}</div>
                </td>
                <td style="padding:8px;font-size:0.78rem">
                  ${p.children.map(c => `<div>${esc(c.full_name)} <span style="color:#9ca3af">${esc(c.admission_no)}${c.class_name ? ' · ' + esc(c.class_name) : ''}</span>
                     <a href="#" data-unlink="${p.id}|${esc(c.admission_no)}" title="Remove link" style="color:#dc2626;text-decoration:none;margin-left:4px">✕</a></div>`).join('') || '<span style="color:#9ca3af">None linked</span>'}
                  ${p.pending_links.map(l => `<div style="color:#92400e">⏳ ${esc(l.full_name || l.admission_no)} — awaiting approval</div>`).join('')}
                </td>
                <td style="padding:8px">${pill(p.status)}
                  ${p.status === 'pending' && p.code_expires_at ? `<div style="font-size:0.7rem;color:#6b7280;margin-top:4px">Code expires ${fmtDate(p.code_expires_at)}</div>` : ''}
                  ${p.status === 'active' && p.activated_at ? `<div style="font-size:0.7rem;color:#6b7280;margin-top:4px">Since ${fmtDate(p.activated_at)}</div>` : ''}
                </td>
                <td style="padding:8px">
                  <div style="display:flex;gap:4px;flex-wrap:wrap">
                    ${p.status === 'prepared' || p.status === 'pending' ? btn(p.status === 'pending' ? 'New Code' : 'Issue Code', `data-code="${p.id}"`, 'color:#1d4ed8;border-color:#93c5fd') : ''}
                    ${p.status === 'pending' ? btn('Revoke Code', `data-revoke="${p.id}"`) : ''}
                    ${btn('+ Link Child', `data-link="${p.id}"`)}
                    ${p.status === 'deactivated' ? btn('Reactivate', `data-react="${p.id}"`) : btn('Deactivate', `data-deact="${p.id}"`, 'color:#dc2626;border-color:#fca5a5')}
                  </div>
                </td>
              </tr>`).join('') || '<tr><td colspan="4" style="padding:24px;text-align:center;color:#9ca3af">No parent accounts match.</td></tr>'}
          </tbody>
        </table>
      </div>`);

    const s = document.getElementById('paSearch');
    let t; s.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { filter.q = s.value; renderAccounts(); document.getElementById('paSearch').focus(); }, 250); });
    document.getElementById('paStatus').addEventListener('change', e => { filter.status = e.target.value; renderAccounts(); });
    document.getElementById('paAddParent').addEventListener('click', showAddParentModal);

    const tab = document.getElementById('paTab');
    tab.querySelectorAll('[data-code]').forEach(b => b.addEventListener('click', () => issueCode(b.dataset.code)));
    tab.querySelectorAll('[data-revoke]').forEach(b => b.addEventListener('click', () => act(`/${b.dataset.revoke}/activation-code/revoke`, {}, 'Revoke this activation code? The parent will not be able to use it.')));
    tab.querySelectorAll('[data-deact]').forEach(b => b.addEventListener('click', () => act(`/${b.dataset.deact}/status`, { action: 'deactivate' }, 'Deactivate this parent account? They will not be able to log in, and any activation code is revoked.')));
    tab.querySelectorAll('[data-react]').forEach(b => b.addEventListener('click', () => act(`/${b.dataset.react}/status`, { action: 'reactivate' })));
    tab.querySelectorAll('[data-link]').forEach(b => b.addEventListener('click', async () => {
      const adm = prompt('Admission number of the child to link to this parent (only link a child once you have verified the relationship):');
      if (adm && adm.trim()) await act(`/${b.dataset.link}/link`, { admission_no: adm.trim() });
    }));
    tab.querySelectorAll('[data-unlink]').forEach(a => a.addEventListener('click', async e => {
      e.preventDefault();
      const [id, adm] = a.dataset.unlink.split('|');
      if (!confirm(`Remove ${adm} from this parent's account? They will no longer see this child.`)) return;
      try { await window.RCA_API.call(`/parent-accounts/${id}/link/${encodeURIComponent(adm)}`, { method: 'DELETE' }); } catch (err) { alert(err.message); return; }
      await reload();
    }));
  }

  /* ---- + Add Parent: one new family, through the same /import checks as
     the CSV (duplicate detection, review queue, child-link verification),
     so a single registration can't bypass them. Creates a Prepared account;
     then issue a code from the same window. ---- */
  function showAddParentModal() {
    const m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px';
    m.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="margin:0 0 4px;color:var(--color-primary);font-size:1rem">Add a Parent</h3>
        <p style="font-size:0.8rem;color:#6b7280;margin:0 0 14px">Creates a <strong>Prepared</strong> account. The parent activates it with a code you give them and sets their own password.</p>
        <div class="form-group"><label>Parent / Guardian Full Name *</label><input id="apName" class="form-control"></div>
        <div class="form-group"><label>Phone Number *</label><input id="apPhone" class="form-control" placeholder="0803 123 4567"></div>
        <div class="form-group"><label>Email (optional)</label><input id="apEmail" type="email" class="form-control"></div>
        <div class="form-group"><label>Child's Admission Number(s) *</label><input id="apKids" class="form-control" placeholder="RCA/2026/001, RCA/2026/002">
          <small style="color:#6b7280;font-size:0.72rem">Separate several children with commas. The pupil must already be registered on the Students page.</small></div>
        <div id="apResult" style="font-size:0.8rem;margin-bottom:12px"></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-outline" style="flex:1" id="apCancel">Cancel</button>
          <button class="btn btn-outline" style="flex:1" id="apCheck">Check</button>
          <button class="btn btn-primary" style="flex:1;display:none" id="apSave">Add Parent</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    const $ = id => m.querySelector('#' + id);
    const RES = { create: '#065f46', link: '#1d4ed8', link_pending: '#92400e', review: '#7c2d12', unchanged: '#374151', error: '#991b1b' };

    function rows() {
      const kids = $('apKids').value.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      return kids.map(k => ({ full_name: $('apName').value.trim(), phone: $('apPhone').value.trim(), email: $('apEmail').value.trim(), admission_no: k }));
    }
    function show(res, saved) {
      $('apResult').innerHTML = res.rows.map(r => `<div style="color:${RES[r.result] || '#374151'};margin-bottom:4px">• <strong>${esc(r.admission_no)}</strong>: ${esc(r.message || r.result)}</div>`).join('');
      const ok = res.rows.some(r => ['create', 'link', 'link_pending'].includes(r.result));
      $('apSave').style.display = !saved && ok ? '' : 'none';
      return ok;
    }
    // Any edit means the preview no longer matches — make them check again.
    ['apName', 'apPhone', 'apEmail', 'apKids'].forEach(id => $(id).addEventListener('input', () => { $('apSave').style.display = 'none'; }));

    $('apCancel').onclick = () => m.remove();
    $('apCheck').onclick = async () => {
      const r = rows();
      if (!r.length || !r[0].full_name || !r[0].phone) { $('apResult').innerHTML = '<span style="color:#dc2626">Enter the name, phone number and at least one admission number.</span>'; return; }
      try { show(await api('/import', { method: 'POST', body: { rows: r, dry_run: true } }), false); }
      catch (e) { $('apResult').innerHTML = `<span style="color:#dc2626">${esc(e.message)}</span>`; }
    };
    $('apSave').onclick = async () => {
      let res;
      try { res = await api('/import', { method: 'POST', body: { rows: rows(), dry_run: false } }); }
      catch (e) { $('apResult').innerHTML = `<span style="color:#dc2626">${esc(e.message)}</span>`; return; }
      show(res, true);
      await reload();
      // Offer the activation code straight away for the account just added.
      const digits = $('apPhone').value.replace(/\D/g, '').slice(-10);
      const p = data.parents.find(x => (x.phone || '').replace(/\D/g, '').slice(-10) === digits && (x.status === 'prepared' || x.status === 'pending'));
      $('apCheck').style.display = 'none';
      $('apCancel').textContent = 'Close';
      if (p) {
        const b = document.createElement('button');
        b.className = 'btn btn-primary'; b.style.flex = '1'; b.textContent = 'Issue Activation Code';
        b.onclick = () => { m.remove(); issueCode(p.id); };
        $('apCancel').parentNode.appendChild(b);
      }
    };
  }

  async function act(path, body, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    try {
      const r = await api(path, { method: 'POST', body });
      if (r?.message) showToast(r.message);
    } catch (e) { alert(e.message); return; }
    await reload();
  }

  async function issueCode(id) {
    const p = data.parents.find(x => String(x.id) === String(id));
    if (p?.status === 'pending' && !confirm('Issuing a new code cancels the previous one. Continue?')) return;
    let r;
    try { r = await api(`/${id}/activation-code`, { method: 'POST', body: {} }); }
    catch (e) { alert(e.message); return; }
    showCodeModal(r);
    await reload();
  }

  function showCodeModal(r) {
    const m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px';
    m.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:440px;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="margin:0 0 4px;color:var(--color-primary);font-size:1rem">Activation Code Issued</h3>
        <p style="font-size:0.82rem;color:#6b7280;margin:0 0 14px">For <strong>${esc(r.full_name)}</strong> · phone ${esc(r.phone_display)}</p>
        <div style="font-family:monospace;font-size:1.9rem;font-weight:700;letter-spacing:0.12em;text-align:center;background:#f3f4f6;border-radius:10px;padding:14px;color:#111827">${esc(r.code)}</div>
        <p style="font-size:0.78rem;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin:12px 0">
          ⚠ This code is shown <strong>only now</strong> — it isn't stored anywhere readable. Print the slip or write it down, and give it to the parent in person.
          It expires on <strong>${fmtDate(r.expires_at)}</strong> and stops working after 5 wrong attempts.</p>
        <div style="display:flex;gap:10px">
          <button class="btn btn-outline" style="flex:1" id="paCodeClose">Close</button>
          <button class="btn btn-primary" style="flex:1" id="paCodePrint">🖨 Print Slip</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    m.querySelector('#paCodeClose').onclick = () => m.remove();
    m.querySelector('#paCodePrint').onclick = () => printSlip(r);
  }

  function printSlip(r) {
    const w = window.open('', '_blank', 'width=600,height=500');
    if (!w) { alert('Please allow pop-ups to print the slip.'); return; }
    const logo = new URL('../assets/images/logo.png', location.href).href;
    const site = 'www.royalcrystalacademy.com.ng/parent-login.html';
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Parent Portal Activation</title>
      <style>body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111827}.slip{border:2px dashed #13306b;border-radius:10px;padding:20px;max-width:480px;margin:auto}
      .h{display:flex;align-items:center;gap:10px;border-bottom:2px solid #c9960c;padding-bottom:8px;margin-bottom:12px}.h img{width:48px;height:48px}
      .n{font-family:Georgia,serif;font-weight:700;color:#13306b;font-size:18px;text-transform:uppercase}.code{font-family:monospace;font-size:28px;font-weight:700;letter-spacing:.15em;text-align:center;background:#eef3fb;border-radius:8px;padding:10px;margin:10px 0}
      ol{font-size:13px;padding-left:18px;line-height:1.6}small{color:#6b7280;font-size:11px}</style></head><body>
      <div class="slip"><div class="h"><img src="${logo}"><div><div class="n">Royal Crystal Academy</div><small>Parent Portal Activation</small></div></div>
      <p style="font-size:13px;margin:0">Dear <strong>${esc(r.full_name)}</strong>, your activation code is:</p>
      <div class="code">${esc(r.code)}</div>
      <ol><li>Go to <strong>${site}</strong></li><li>Click <strong>Activate my account</strong></li>
      <li>Enter your phone number (<strong>${esc(r.phone_display)}</strong>) and this code</li><li>Choose your own password, then sign in</li></ol>
      <small>Code expires ${fmtDate(r.expires_at)}. Keep it private — do not share it. School staff will never ask for your password.</small></div>
      <script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  }

  /* ================================================== IMPORT */
  // Small CSV parser: handles quotes, commas inside quotes and CRLF.
  function parseCsv(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim()));
  }

  const HEADER_MAP = {
    full_name: ['full_name', 'parent_name', 'name', 'parent', 'guardian', 'parent/guardian name', 'parent full name'],
    phone: ['phone', 'phone_number', 'phone number', 'parent_phone', 'mobile', 'telephone'],
    email: ['email', 'email address', 'parent_email'],
    admission_no: ['admission_no', 'admission number', 'admission no', 'adm_no', 'admission', 'pupil admission number', 'child admission number']
  };

  function toRows(table) {
    const header = table[0].map(h => h.trim().toLowerCase().replace(/\s+/g, ' '));
    const idx = {};
    for (const [key, names] of Object.entries(HEADER_MAP)) idx[key] = header.findIndex(h => names.includes(h) || names.includes(h.replace(/ /g, '_')));
    const missing = ['full_name', 'phone', 'admission_no'].filter(k => idx[k] < 0);
    if (missing.length) throw new Error(`The first line must be column headings. Missing: ${missing.join(', ')}. Expected: full_name, phone, email, admission_no`);
    return table.slice(1).map(r => ({
      full_name: (r[idx.full_name] || '').trim(),
      phone: (r[idx.phone] || '').trim(),
      email: idx.email >= 0 ? (r[idx.email] || '').trim() : '',
      admission_no: (r[idx.admission_no] || '').trim()
    }));
  }

  function renderImport() {
    const RES = {
      create: ['New account', '#065f46', '#d1fae5'], link: ['Link to existing', '#1d4ed8', '#dbeafe'],
      link_pending: ['Needs approval', '#92400e', '#fef3c7'], review: ['Review', '#7c2d12', '#ffedd5'],
      unchanged: ['No change', '#374151', '#f3f4f6'], error: ['Error', '#991b1b', '#fee2e2']
    };
    const pv = importPreview;
    document.getElementById('paTab').innerHTML = card(`
      <h3 style="margin:0 0 6px;font-size:0.95rem">Import parent records from CSV</h3>
      <p style="font-size:0.8rem;color:#6b7280;margin:0 0 12px">One row per parent–child pair. Columns: <code>full_name, phone, email, admission_no</code> (email optional).
        A parent with several children appears on several rows with the same phone number.
        Nothing is saved until you click <strong>Import</strong> after checking the preview.</p>
      <ul style="font-size:0.78rem;color:#374151;margin:0 0 12px;padding-left:18px;line-height:1.6">
        <li>A child is linked automatically only if the parent's phone matches the phone on the pupil's school record; otherwise the link goes to <strong>Link Approvals</strong>.</li>
        <li>Rows that could belong to an existing account (same phone/email but a different name, or several matches) go to the <strong>Review Queue</strong> — accounts are never merged automatically.</li>
        <li>Existing parent accounts, emails and passwords are never changed by an import. Re-importing the same file creates no duplicates.</li>
      </ul>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <input type="file" id="paCsv" accept=".csv,text/csv" class="form-control" style="max-width:320px">
        <button class="btn btn-sm btn-outline" id="paTemplate">↓ Download template</button>
      </div>
      <div id="paImportMsg" style="margin-top:10px;font-size:0.82rem"></div>
    `) + (pv ? card(`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <h3 style="margin:0;font-size:0.95rem">${pv.dry_run ? 'Preview — nothing saved yet' : '✔ Import complete'}</h3>
        ${pv.dry_run ? `<button class="btn btn-primary btn-sm" id="paDoImport">Import ${importRows.length} row${importRows.length !== 1 ? 's' : ''}</button>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:0.78rem;margin-bottom:12px">
        ${[['New accounts', pv.summary.created], ['Matched existing', pv.summary.matched_existing], ['Children linked', pv.summary.children_linked],
           ['Links needing approval', pv.summary.links_for_approval], ['Already linked', pv.summary.already_linked],
           ['For review', pv.summary.flagged_for_review], ['Errors (skipped)', pv.summary.errors]]
          .map(([l, n]) => `<span style="background:#f3f4f6;border-radius:8px;padding:5px 10px"><strong>${n}</strong> ${l}</span>`).join('')}
      </div>
      <div style="overflow-x:auto;max-height:420px;overflow-y:auto">
        <table style="width:100%;font-size:0.78rem;border-collapse:collapse">
          <thead><tr style="text-align:left;border-bottom:2px solid #e5e7eb;position:sticky;top:0;background:#fff">
            <th style="padding:6px">Row</th><th style="padding:6px">Parent</th><th style="padding:6px">Phone</th><th style="padding:6px">Child</th><th style="padding:6px">Result</th></tr></thead>
          <tbody>${pv.rows.map(r => { const c = RES[r.result] || RES.error; return `
            <tr style="border-bottom:1px solid #f3f4f6">
              <td style="padding:6px;color:#9ca3af">${r.row}</td><td style="padding:6px">${esc(r.full_name)}</td>
              <td style="padding:6px">${esc(r.phone)}</td><td style="padding:6px">${esc(r.admission_no)}</td>
              <td style="padding:6px"><span style="background:${c[2]};color:${c[1]};padding:2px 8px;border-radius:12px;font-weight:700;font-size:0.7rem">${c[0]}</span>
                <div style="color:#6b7280;font-size:0.72rem;margin-top:2px">${esc(r.message || '')}</div></td>
            </tr>`; }).join('')}</tbody>
        </table>
      </div>`) : '');

    document.getElementById('paTemplate').onclick = () => {
      const csv = 'full_name,phone,email,admission_no\nMrs Grace Okafor,0803 111 2222,grace@example.com,RCA/2026/001\nMrs Grace Okafor,0803 111 2222,,RCA/2026/002\n';
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'parent_import_template.csv' });
      a.click();
    };
    document.getElementById('paCsv').onchange = async e => {
      const f = e.target.files[0];
      const msg = document.getElementById('paImportMsg');
      if (!f) return;
      try {
        importRows = toRows(parseCsv(await f.text()));
        if (!importRows.length) throw new Error('The file has no data rows.');
        msg.innerHTML = `<span style="color:#6b7280">Checking ${importRows.length} rows…</span>`;
        importPreview = await api('/import', { method: 'POST', body: { rows: importRows, dry_run: true } });
        renderImport();
      } catch (err) {
        importRows = null; importPreview = null;
        msg.innerHTML = `<span style="color:#dc2626">${esc(err.message)}</span>`;
      }
    };
    document.getElementById('paDoImport')?.addEventListener('click', async () => {
      if (!confirm(`Import these ${importRows.length} rows now?`)) return;
      try {
        importPreview = await api('/import', { method: 'POST', body: { rows: importRows, dry_run: false } });
      } catch (err) { alert(err.message); return; }
      const keep = importPreview;
      await reload();
      tab = 'import'; importPreview = keep; render();
    });
  }

  /* ================================================== REVIEW QUEUE */
  async function renderReviews() {
    const box = document.getElementById('paTab');
    box.innerHTML = card('<p style="color:#9ca3af;margin:0">Loading…</p>');
    let reviews;
    try { reviews = (await api('/reviews?status=open')).reviews; } catch (e) { box.innerHTML = card(`<p style="color:#dc2626">${esc(e.message)}</p>`); return; }
    box.innerHTML = card(`
      <p style="font-size:0.8rem;color:#6b7280;margin:0 0 12px">Import rows that might belong to an existing account. Nothing was merged — decide each one.</p>
      ${reviews.map(r => `
        <div style="border:1px solid #eef0f3;border-radius:10px;padding:12px 14px;margin-bottom:10px">
          <div style="font-weight:700">${esc(r.full_name)} <span style="font-weight:400;color:#6b7280;font-size:0.78rem">· ${esc(r.phone)}${r.email ? ' · ' + esc(r.email) : ''} · child ${esc(r.admission_no)}</span></div>
          <div style="font-size:0.78rem;color:#7c2d12;margin:4px 0 8px">⚠ ${esc(r.reason)}</div>
          ${r.candidates.length ? `<div style="font-size:0.75rem;color:#374151;margin-bottom:8px">Existing account${r.candidates.length > 1 ? 's' : ''}: ${r.candidates.map(c => `<strong>${esc(c.full_name)}</strong> (${esc(c.phone || 'no phone')}${c.email ? ', ' + esc(c.email) : ''})`).join('; ')}</div>` : ''}
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${r.candidates.map(c => btn(`Link child to ${esc(c.full_name)}`, `data-rv="${r.id}" data-action="link_existing" data-user="${c.id}"`, 'color:#1d4ed8;border-color:#93c5fd')).join('')}
            ${btn('Create as new parent', `data-rv="${r.id}" data-action="create_new"`)}
            ${btn('Dismiss', `data-rv="${r.id}" data-action="dismiss"`, 'color:#6b7280')}
          </div>
        </div>`).join('') || '<p style="text-align:center;color:#059669;margin:10px 0">✔ Nothing waiting for review.</p>'}`);
    box.querySelectorAll('[data-rv]').forEach(b => b.addEventListener('click', async () => {
      const body = { action: b.dataset.action, user_id: b.dataset.user };
      if (body.action === 'dismiss') body.note = prompt('Optional note (why dismissed):') || '';
      if (body.action === 'link_existing' && !confirm('Link this child to that existing parent account? Only do this if you have confirmed they are the same person.')) return;
      try { const r = await api(`/reviews/${b.dataset.rv}`, { method: 'POST', body }); showToast(r.message); } catch (e) { alert(e.message); return; }
      await reload(); tab = 'reviews'; render();
    }));
  }

  /* ================================================== LINK APPROVALS */
  async function renderLinks() {
    const box = document.getElementById('paTab');
    box.innerHTML = card('<p style="color:#9ca3af;margin:0">Loading…</p>');
    let reqs;
    try { reqs = (await api('/link-requests?status=pending')).requests; } catch (e) { box.innerHTML = card(`<p style="color:#dc2626">${esc(e.message)}</p>`); return; }
    box.innerHTML = card(`
      <p style="font-size:0.8rem;color:#6b7280;margin:0 0 12px">These parent–child links couldn't be verified automatically (the parent's phone doesn't match the pupil's record). Approve only after confirming the relationship.</p>
      ${reqs.map(l => `
        <div style="border:1px solid #eef0f3;border-radius:10px;padding:12px 14px;margin-bottom:10px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="font-size:0.82rem">
            <div><strong>${esc(l.parent_name || 'Unknown parent')}</strong> (${esc(l.parent_phone_on_account || 'no phone')}) → <strong>${esc(l.pupil_name || l.admission_no)}</strong> ${esc(l.admission_no)}${l.class_name ? ' · ' + esc(l.class_name) : ''}</div>
            <div style="font-size:0.75rem;color:#6b7280;margin-top:3px">Pupil record lists: ${esc(l.pupil_record_parent || '—')}, ${esc(l.pupil_record_phone || 'no phone')} · ${esc(l.reason || '')}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            ${btn('Approve', `data-lr="${l.id}" data-d="approve"`, 'color:#065f46;border-color:#6ee7b7')}
            ${btn('Reject', `data-lr="${l.id}" data-d="reject"`, 'color:#dc2626;border-color:#fca5a5')}
          </div>
        </div>`).join('') || '<p style="text-align:center;color:#059669;margin:10px 0">✔ No links waiting for approval.</p>'}`);
    box.querySelectorAll('[data-lr]').forEach(b => b.addEventListener('click', async () => {
      try { const r = await api(`/link-requests/${b.dataset.lr}`, { method: 'POST', body: { decision: b.dataset.d } }); showToast(r.message); } catch (e) { alert(e.message); return; }
      await reload(); tab = 'links'; render();
    }));
  }

  /* ================================================== AUDIT */
  async function renderAudit() {
    const box = document.getElementById('paTab');
    box.innerHTML = card('<p style="color:#9ca3af;margin:0">Loading…</p>');
    let entries;
    try { entries = (await api('/audit')).entries; } catch (e) { box.innerHTML = card(`<p style="color:#dc2626">${esc(e.message)}</p>`); return; }
    box.innerHTML = card(`
      <table style="width:100%;font-size:0.78rem;border-collapse:collapse">
        <thead><tr style="text-align:left;border-bottom:2px solid #e5e7eb"><th style="padding:6px">When</th><th style="padding:6px">Who</th><th style="padding:6px">What</th></tr></thead>
        <tbody>${entries.map(e => `<tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:6px;white-space:nowrap;color:#6b7280">${new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
          <td style="padding:6px">${esc(e.user_name)}</td><td style="padding:6px">${esc(e.target)}</td></tr>`).join('')
          || '<tr><td colspan="3" style="padding:16px;text-align:center;color:#9ca3af">No activity yet.</td></tr>'}</tbody>
      </table>`);
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#059669;color:#fff;padding:12px 20px;border-radius:10px;z-index:9999;font-size:0.85rem;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
})();
