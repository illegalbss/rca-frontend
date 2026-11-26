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
      ['slips', '🖨 Login Slips'],
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
    ({ accounts: renderAccounts, slips: renderSlips, import: renderImport, reviews: renderReviews, links: renderLinks, audit: renderAudit })[tab]();
  }

  /* ================================================== ACCOUNTS */
  // Search: every word typed must appear somewhere (name, phone, email,
  // child, admission no.), so "mrs odoh" or "odoh basic 4" both work. Phone
  // numbers match with or without spaces, and +234 / 0 at the start.
  const digitsOf = s => String(s || '').replace(/\D/g, '');
  const phoneKey = s => { const d = digitsOf(s); return d.startsWith('234') ? '0' + d.slice(3) : d; };
  function matchesSearch(text, phones, q) {
    const hay = text.toLowerCase();
    const phoneHay = phones.map(phoneKey).join(' ');
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => {
      if (hay.includes(w)) return true;
      const d = phoneKey(w);
      return d.length >= 3 && phoneHay.includes(d);
    });
  }

  function renderAccounts() {
    // The toolbar (search box) is drawn once; typing only redraws the list
    // below it, so the keyboard stays open and no letters are lost.
    document.getElementById('paTab').innerHTML = card(`
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <input id="paSearch" type="search" class="form-control" placeholder="Search parent, phone, email or child…" value="${esc(filter.q)}" style="flex:1;min-width:200px" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
        <select id="paStatus" class="form-control" style="width:auto">
          <option value="">All statuses</option>
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${filter.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
        <button class="btn btn-outline btn-sm" id="paCheck" style="white-space:nowrap" title="Find deactivated parents who still have a child in school, and active parents whose children have all left">✓ Check against pupils</button>
        <button class="btn btn-primary btn-sm" id="paAddParent" style="white-space:nowrap">+ Add Parent</button>
      </div>
      <div id="paList"></div>`);

    const s = document.getElementById('paSearch');
    let t;
    s.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { filter.q = s.value; renderAccountRows(); }, 200); });
    s.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(t); filter.q = s.value; renderAccountRows(); } });
    document.getElementById('paStatus').addEventListener('change', e => { filter.status = e.target.value; renderAccountRows(); });
    document.getElementById('paAddParent').addEventListener('click', showAddParentModal);
    document.getElementById('paCheck').addEventListener('click', showSchoolCheck);
    renderAccountRows();
  }

  function renderAccountRows() {
    const list = document.getElementById('paList');
    if (!list) return;
    const rows = data.parents.filter(p =>
      (!filter.status || p.status === filter.status) &&
      (!filter.q.trim() || matchesSearch(
        [p.full_name, p.email, ...p.children.map(c => `${c.full_name} ${c.admission_no} ${c.class_name || ''}`)].join(' '),
        [p.phone, p.phone_display], filter.q)));

    list.innerHTML = `
      <div style="font-size:0.78rem;color:#6b7280;margin-bottom:10px">${rows.length} parent account${rows.length !== 1 ? 's' : ''}${filter.q.trim() ? ` matching “${esc(filter.q.trim())}”` : ''}</div>
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
                  ${(p.same_phone_as || []).length ? `<div style="font-size:0.72rem;color:#991b1b;background:#fee2e2;border-radius:6px;padding:4px 8px;margin-top:5px;line-height:1.4">⚠ Same phone as <strong>${esc(p.same_phone_as.join(', '))}</strong>. Codes and phone login won't work until one of them gets their own number — press 📞 Change phone.</div>` : ''}
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
                    ${p.status === 'active' ? btn('Reset Code', `data-code="${p.id}" title="Parent forgot their password: give them a code to choose a new one"`, 'color:#92400e;border-color:#fcd34d') : ''}
                    ${btn('📞 Change phone', `data-phone="${p.id}"`, (p.same_phone_as || []).length ? 'color:#991b1b;border-color:#fca5a5;font-weight:700' : '')}
                    ${btn('+ Link Child', `data-link="${p.id}"`)}
                    ${p.status === 'deactivated' ? btn('Reactivate', `data-react="${p.id}"`) : btn('Deactivate', `data-deact="${p.id}"`, 'color:#dc2626;border-color:#fca5a5')}
                  </div>
                </td>
              </tr>`).join('') || '<tr><td colspan="4" style="padding:24px;text-align:center;color:#9ca3af">No parent accounts match.</td></tr>'}
          </tbody>
        </table>
      </div>`;

    const tab = list;
    tab.querySelectorAll('[data-code]').forEach(b => b.addEventListener('click', () => issueCode(b.dataset.code)));
    tab.querySelectorAll('[data-revoke]').forEach(b => b.addEventListener('click', () => act(`/${b.dataset.revoke}/activation-code/revoke`, {}, 'Revoke this activation code? The parent will not be able to use it.')));
    tab.querySelectorAll('[data-deact]').forEach(b => b.addEventListener('click', () => {
      const p = data.parents.find(x => String(x.id) === b.dataset.deact);
      const here = (p?.children || []).filter(c => c.class_name && (!c.status || c.status === 'active'));
      const warn = here.length
        ? `⚠ ${p.full_name} still has ${here.length === 1 ? 'a child' : here.length + ' children'} in school (${here.map(c => c.full_name).join(', ')}).\nAccounts should only be deactivated when all their children have left.\n\nDeactivate anyway?`
        : 'Deactivate this parent account? They will not be able to log in, and any activation code is revoked.';
      act(`/${b.dataset.deact}/status`, { action: 'deactivate' }, warn);
    }));
    tab.querySelectorAll('[data-react]').forEach(b => b.addEventListener('click', () => act(`/${b.dataset.react}/status`, { action: 'reactivate' })));
    tab.querySelectorAll('[data-link]').forEach(b => b.addEventListener('click', () => showLinkChildModal(b.dataset.link)));
    tab.querySelectorAll('[data-phone]').forEach(b => b.addEventListener('click', async () => {
      const p = data.parents.find(x => String(x.id) === b.dataset.phone);
      const now = p?.phone_display || p?.phone || 'none';
      const typed = prompt(`New phone number for ${p?.full_name}\n(now: ${now})\n\nThis is the number they will type with their code and to log in. Any unused code is cancelled.`, '');
      if (typed === null || !typed.trim()) return;
      try {
        const r = await api(`/${b.dataset.phone}/phone`, { method: 'POST', body: { phone: typed.trim() } });
        showToast(r.message);
        if (r.code_cancelled) alert(r.message);
      } catch (e) { alert(e.message); return; }
      await reload();
    }));
    tab.querySelectorAll('[data-unlink]').forEach(a => a.addEventListener('click', async e => {
      e.preventDefault();
      const [id, adm] = a.dataset.unlink.split('|');
      if (!confirm(`Remove ${adm} from this parent's account? They will no longer see this child.`)) return;
      try { await window.RCA_API.call(`/parent-accounts/${id}/link/${encodeURIComponent(adm)}`, { method: 'DELETE' }); } catch (err) { alert(err.message); return; }
      await reload();
    }));
  }

  /* ---- Child picker: find pupils by name instead of typing admission
     numbers. Type part of a name (or class / admission number / parent's
     phone), tap a match to add it; chosen children show as removable chips.
     suggestByPhone(phone) lists pupils registered with that parent phone. ---- */
  let pupilsCache = null;
  async function loadPupils() {
    if (!pupilsCache) {
      const list = await window.RCA_API.getStudents();
      pupilsCache = (list || []).filter(s => !s.status || s.status === 'active');
    }
    return pupilsCache;
  }
  const digits10 = p => String(p || '').replace(/\D/g, '').slice(-10);

  function childPicker(box, onChange) {
    const chosen = [];
    box.innerHTML = `
      <div class="cp-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px"></div>
      <input class="form-control cp-search" placeholder="Type the child's name…" autocomplete="off">
      <div class="cp-list" style="border:1px solid #e5e7eb;border-radius:8px;margin-top:4px;max-height:220px;overflow-y:auto;display:none"></div>
      <div class="cp-suggest" style="font-size:0.75rem;margin-top:6px"></div>`;
    const chips = box.querySelector('.cp-chips');
    const input = box.querySelector('.cp-search');
    const list = box.querySelector('.cp-list');
    const suggestEl = box.querySelector('.cp-suggest');

    const row = (s, attr) => `<button type="button" ${attr}="${esc(s.admission_no)}" style="display:block;width:100%;text-align:left;background:#fff;border:0;border-bottom:1px solid #f3f4f6;padding:8px 10px;cursor:pointer;font-size:0.82rem">
        <strong>${esc(s.full_name)}</strong>
        <span style="color:#6b7280"> · ${esc(s.class_name || '')} · ${esc(s.admission_no)}</span>
        ${s.parent_name || s.parent_phone ? `<div style="color:#9ca3af;font-size:0.72rem">Parent on record: ${esc([s.parent_name, s.parent_phone].filter(Boolean).join(', '))}</div>` : ''}
      </button>`;

    function renderChips() {
      chips.innerHTML = chosen.map(s => `<span style="background:#eef2ff;color:#3730a3;border-radius:16px;padding:4px 6px 4px 10px;font-size:0.78rem;display:inline-flex;align-items:center;gap:6px">
          ${esc(s.full_name)} <small style="color:#6366f1">${esc(s.class_name || '')}</small>
          <button type="button" data-remove="${esc(s.admission_no)}" aria-label="Remove" style="border:0;background:#c7d2fe;color:#3730a3;border-radius:50%;width:18px;height:18px;line-height:16px;cursor:pointer">×</button></span>`).join('');
      chips.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => {
        const i = chosen.findIndex(s => s.admission_no === b.dataset.remove);
        if (i >= 0) chosen.splice(i, 1);
        renderChips(); onChange && onChange();
      });
    }
    function add(adm) {
      const s = (pupilsCache || []).find(x => x.admission_no === adm);
      if (s && !chosen.some(c => c.admission_no === adm)) { chosen.push(s); renderChips(); onChange && onChange(); }
      input.value = ''; list.style.display = 'none'; input.focus();
    }

    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const q = input.value.trim().toLowerCase();
        if (q.length < 2) { list.style.display = 'none'; return; }
        list.style.display = 'block';
        list.innerHTML = '<div style="padding:8px 10px;color:#6b7280;font-size:0.8rem">Searching…</div>';
        const all = await loadPupils();
        const words = q.split(/\s+/);
        const qDigits = q.replace(/\D/g, '');
        const hits = all.filter(s => {
          const hay = `${s.full_name} ${s.class_name} ${s.admission_no}`.toLowerCase();
          return words.every(w => hay.includes(w)) || (qDigits.length >= 6 && digits10(s.parent_phone).includes(qDigits));
        }).filter(s => !chosen.some(c => c.admission_no === s.admission_no)).slice(0, 15);
        list.innerHTML = hits.length ? hits.map(s => row(s, 'data-pick')).join('')
          : '<div style="padding:8px 10px;color:#6b7280;font-size:0.8rem">No pupil found. Check the spelling, or register the child on the Students page first.</div>';
        list.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => add(b.dataset.pick));
      }, 200);
    });

    return {
      get: () => chosen.map(s => s.admission_no),
      // Pupils whose record has this parent phone, offered with one tap.
      async suggestByPhone(phone) {
        const d = digits10(phone);
        if (d.length < 10) { suggestEl.innerHTML = ''; return; }
        const all = await loadPupils();
        const hits = all.filter(s => digits10(s.parent_phone) === d && !chosen.some(c => c.admission_no === s.admission_no));
        suggestEl.innerHTML = hits.length
          ? `<div style="color:#065f46;margin-bottom:4px">Children registered with this phone number — tap to add:</div>` +
            `<div style="border:1px solid #d1fae5;border-radius:8px">${hits.map(s => row(s, 'data-sugg')).join('')}</div>`
          : '';
        suggestEl.querySelectorAll('[data-sugg]').forEach(b => b.onclick = () => { add(b.dataset.sugg); this.suggestByPhone(phone); });
      }
    };
  }

  /* ---- + Link Child (existing parent): same picker in a small window ---- */
  function showLinkChildModal(parentId) {
    const p = data.parents.find(x => String(x.id) === String(parentId)) || {};
    const m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px';
    m.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="margin:0 0 4px;color:var(--color-primary);font-size:1rem">Link a Child to ${esc(p.full_name || 'this parent')}</h3>
        <p style="font-size:0.8rem;color:#6b7280;margin:0 0 14px">Only link a child once you have checked that this is their parent or guardian.</p>
        <div id="lcPicker"></div>
        <div id="lcResult" style="font-size:0.8rem;margin:10px 0"></div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-outline" style="flex:1" id="lcCancel">Cancel</button>
          <button class="btn btn-primary" style="flex:1" id="lcSave">Link</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    const picker = childPicker(m.querySelector('#lcPicker'));
    picker.suggestByPhone(p.phone);
    m.querySelector('#lcCancel').onclick = () => m.remove();
    m.querySelector('#lcSave').onclick = async () => {
      const kids = picker.get();
      if (!kids.length) { m.querySelector('#lcResult').innerHTML = '<span style="color:#dc2626">Search for the child and tap their name first.</span>'; return; }
      const btnSave = m.querySelector('#lcSave');
      btnSave.disabled = true; btnSave.textContent = 'Saving…';
      const msgs = [];
      for (const adm of kids) {
        try {
          const r = await api(`/${parentId}/link`, { method: 'POST', body: { admission_no: adm } });
          msgs.push(`<div style="color:#065f46">• ${esc(adm)}: ${esc(r?.message || 'linked')}</div>`);
        } catch (e) {
          msgs.push(`<div style="color:#991b1b">• ${esc(adm)}: ${esc(e.message)}</div>`);
        }
      }
      m.querySelector('#lcResult').innerHTML = msgs.join('');
      btnSave.style.display = 'none';
      m.querySelector('#lcCancel').textContent = 'Close';
      await reload();
    };
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
        <div class="form-group"><label>Child / Children *</label><div id="apKids"></div>
          <small style="color:#6b7280;font-size:0.72rem">Search by the child's name and tap them; add as many children as this parent has. The pupil must already be registered on the Students page.</small></div>
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

    const picker = childPicker($('apKids'), () => { $('apSave').style.display = 'none'; });
    let phoneTimer;
    $('apPhone').addEventListener('input', () => { clearTimeout(phoneTimer); phoneTimer = setTimeout(() => picker.suggestByPhone($('apPhone').value), 300); });

    function rows() {
      return picker.get().map(k => ({ full_name: $('apName').value.trim(), phone: $('apPhone').value.trim(), email: $('apEmail').value.trim(), admission_no: k }));
    }
    function show(res, saved) {
      $('apResult').innerHTML = res.rows.map(r => `<div style="color:${RES[r.result] || '#374151'};margin-bottom:4px">• <strong>${esc(r.admission_no)}</strong>: ${esc(r.message || r.result)}</div>`).join('');
      const ok = res.rows.some(r => ['create', 'link', 'link_pending'].includes(r.result));
      $('apSave').style.display = !saved && ok ? '' : 'none';
      return ok;
    }
    // Any edit means the preview no longer matches — make them check again.
    ['apName', 'apPhone', 'apEmail'].forEach(id => $(id).addEventListener('input', () => { $('apSave').style.display = 'none'; }));

    $('apCancel').onclick = () => m.remove();
    $('apCheck').onclick = async () => {
      const r = rows();
      if (!r.length || !r[0].full_name || !r[0].phone) { $('apResult').innerHTML = '<span style="color:#dc2626">Enter the parent name and phone number, and add at least one child.</span>'; return; }
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
    if (p?.status === 'active' && !confirm('Give ' + p.full_name + ' a password reset code? They enter it with their phone number on the Parent Login page ("Use my code") and choose a new password. Their current password keeps working until then.')) return;
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
        <h3 style="margin:0 0 4px;color:var(--color-primary);font-size:1rem">${r.reset ? "Password Reset Code Issued" : "Activation Code Issued"}</h3>
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
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${r.reset ? "Parent Portal Password Reset" : "Parent Portal Activation"}</title>
      <style>body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111827}.slip{border:2px dashed #13306b;border-radius:10px;padding:20px;max-width:480px;margin:auto}
      .h{display:flex;align-items:center;gap:10px;border-bottom:2px solid #c9960c;padding-bottom:8px;margin-bottom:12px}.h img{width:48px;height:48px}
      .n{font-family:Georgia,serif;font-weight:700;color:#13306b;font-size:18px;text-transform:uppercase}.code{font-family:monospace;font-size:28px;font-weight:700;letter-spacing:.15em;text-align:center;background:#eef3fb;border-radius:8px;padding:10px;margin:10px 0}
      ol{font-size:13px;padding-left:18px;line-height:1.6}small{color:#6b7280;font-size:11px}</style></head><body>
      <div class="slip"><div class="h"><img src="${logo}"><div><div class="n">Royal Crystal Academy</div><small>${r.reset ? "Parent Portal Password Reset" : "Parent Portal Activation"}</small></div></div>
      <p style="font-size:13px;margin:0">Dear <strong>${esc(r.full_name)}</strong>, your ${r.reset ? "password reset" : "activation"} code is:</p>
      <div class="code">${esc(r.code)}</div>
      <ol><li>Go to <strong>${site}</strong></li><li>Click <strong>Use my code</strong></li>
      <li>Enter your phone number (<strong>${esc(r.phone_display)}</strong>) and this code</li><li>Choose ${r.reset ? "a new" : "your own"} password, then sign in</li></ol>
      <small>Code expires ${fmtDate(r.expires_at)}. Keep it private — do not share it. School staff will never ask for your password.</small></div>
      <script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  }

  /* ================================================== CHECK AGAINST PUPILS */
  // Rule: deactivate a parent only when all their children have left.
  async function showSchoolCheck() {
    let r;
    try { r = await api('/school-check'); } catch (e) { alert(e.message); return; }
    const m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px';
    const kids = l => l.map(k => `${esc(k.full_name)} <span style="color:#6b7280">(${esc(k.class_name || '')}${k.status ? ' · ' + esc(k.status) : ''})</span>`).join(', ');
    const section = (key, title, note, list, btnLabel, color, childrenOf) => `
      <div style="margin-bottom:18px">
        <h4 style="margin:0 0 4px;font-size:0.9rem;color:${color}">${title} (${list.length})</h4>
        <p style="font-size:0.76rem;color:#6b7280;margin:0 0 8px">${note}</p>
        ${list.length ? `
          <label style="font-size:0.76rem;display:flex;gap:6px;align-items:center;margin-bottom:6px;cursor:pointer"><input type="checkbox" data-allof="${key}" checked> Tick all</label>
          <div style="max-height:220px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px">
          ${list.map(p => `<label style="display:flex;gap:8px;padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:0.8rem;cursor:pointer">
            <input type="checkbox" data-${key}="${p.id}" checked style="margin-top:3px">
            <span><strong>${esc(p.full_name)}</strong> <span style="color:#6b7280">${esc(p.phone_display)}</span><br>${childrenOf(p)}</span></label>`).join('')}
          </div>
          <button class="btn btn-sm" data-do="${key}" style="margin-top:8px;background:${color};color:#fff;border:none">${btnLabel}</button>`
        : '<div style="font-size:0.8rem;color:#059669">✓ None — all good.</div>'}
      </div>`;
    m.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:640px;max-height:90vh;overflow:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="margin:0 0 4px;color:var(--color-primary);font-size:1rem">Check parent accounts against pupils</h3>
        <p style="font-size:0.8rem;color:#6b7280;margin:0 0 16px">A parent account should be switched off only when <strong>all</strong> their children have left the school.
          Parents who haven't used their login code yet are not counted as deactivated.</p>
        ${section('reactivate', 'Deactivated, but still has a child in school', 'These should be switched back on.', r.reactivate, 'Reactivate ticked parents', '#059669', p => 'In school: ' + kids(p.in_school))}
        ${section('deactivate', 'Active, but all their children have left', 'Optional — switch these off only if you want to.', r.deactivate, 'Deactivate ticked parents', '#dc2626', p => 'Left: ' + kids(p.left))}
        <div style="text-align:right"><button class="btn btn-outline" id="scClose">Close</button></div>
      </div>`;
    document.body.appendChild(m);
    m.querySelector('#scClose').onclick = () => m.remove();
    m.querySelectorAll('[data-allof]').forEach(a => a.addEventListener('change', () =>
      m.querySelectorAll(`[data-${a.dataset.allof}]`).forEach(c => { c.checked = a.checked; })));
    m.querySelectorAll('[data-do]').forEach(b => b.addEventListener('click', async () => {
      const key = b.dataset.do;
      const ids = [...m.querySelectorAll(`input[data-${key}]`)].filter(c => c.checked).map(c => c.getAttribute('data-' + key));
      if (!ids.length) { alert('Tick at least one parent.'); return; }
      if (!confirm(`${key === 'reactivate' ? 'Reactivate' : 'Deactivate'} ${ids.length} parent account${ids.length !== 1 ? 's' : ''}?`)) return;
      b.disabled = true;
      try { const res = await api('/school-check', { method: 'POST', body: { action: key, ids } }); showToast(res.message); }
      catch (e) { alert(e.message); b.disabled = false; return; }
      m.remove(); await reload(); showSchoolCheck();
    }));
  }

  /* ================================================== LOGIN SLIPS */
  // Print login slips for many families at once, straight from the pupils'
  // school records: missing parent accounts are prepared, children linked
  // and one activation code issued per parent.
  const SLIP_STATE = {
    no_account: { label: 'No account yet',     bg: '#e0e7ff', color: '#3730a3' },
    prepared:   { label: 'Account ready',      bg: '#f3f4f6', color: '#374151' },
    pending:    { label: 'Code already given', bg: '#fef3c7', color: '#92400e' },
    active:     { label: 'Has an account',     bg: '#d1fae5', color: '#065f46' },
    deactivated:{ label: 'Deactivated',        bg: '#fee2e2', color: '#991b1b' },
    problem:    { label: 'Needs fixing',       bg: '#fee2e2', color: '#991b1b' }
  };
  let slipPupils = null;
  const slipSel = new Set();
  const slipFilter = { cls: '', q: '', hideActive: false, newOnly: false };
  const NEW_DAYS = 150; // "joined recently" = admitted within about one term

  async function renderSlips() {
    const box = document.getElementById('paTab');
    if (!slipPupils) {
      box.innerHTML = card('<p style="margin:0;color:#6b7280">Loading pupils…</p>');
      try { slipPupils = (await api('/login-slips')).pupils; }
      catch (e) { box.innerHTML = card(`<p style="color:#dc2626;margin:0">Could not load pupils: ${esc(e.message)}</p>`); slipPupils = null; return; }
    }
    const classes = [...new Set(slipPupils.map(p => p.class_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    // The toolbar (search box, filters) is drawn once; typing, ticking and
    // filtering only redraw the list, so the keyboard stays open on phones.
    box.innerHTML = card(`
      <h3 style="margin:0 0 4px;font-size:1rem;color:var(--color-primary)">Print parent login slips</h3>
      <p style="font-size:0.8rem;color:#6b7280;margin:0 0 14px;line-height:1.5">
        Tick the pupils, then press <strong>Make &amp; print slips</strong>. Each parent gets one slip with their phone number and a login code.
        Parents without an account get one made from the pupil's record (parent name and phone). Brothers and sisters with the same parent phone share one slip. Works for old and new pupils.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
        <select id="slCls" class="form-control" style="width:auto">
          <option value="">All classes</option>
          ${classes.map(c => `<option ${slipFilter.cls === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        <input id="slQ" type="search" class="form-control" placeholder="Search pupil, parent or phone…" value="${esc(slipFilter.q)}" style="flex:1;min-width:180px" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.8rem;margin-bottom:12px">
        <label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="slNew" ${slipFilter.newOnly ? 'checked' : ''}> Only new pupils (joined in the last ${Math.round(NEW_DAYS / 30)} months)</label>
        <label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="slHide" ${slipFilter.hideActive ? 'checked' : ''}> Hide parents who already have an account</label>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
        ${btn('Tick all shown', 'id="slAll"')} ${btn('Untick all', 'id="slNone"')}
        <span style="font-size:0.78rem;color:#6b7280" id="slCount"></span>
      </div>
      <div style="overflow-x:auto;max-height:520px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px">
        <table style="width:100%;font-size:0.8rem;border-collapse:collapse">
          <thead style="position:sticky;top:0;background:#f9fafb"><tr style="text-align:left;color:#6b7280">
            <th style="padding:8px;width:28px"></th><th style="padding:8px">Pupil</th><th style="padding:8px">Class</th>
            <th style="padding:8px">Parent (from records)</th><th style="padding:8px">Phone</th><th style="padding:8px">Login status</th></tr></thead>
          <tbody id="slBody"></tbody>
        </table>
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid #f3f4f6">
        <label style="font-size:0.8rem;display:flex;gap:6px;align-items:center">Codes work for
          <select id="slDays" class="form-control" style="width:auto;padding:4px 8px">
            <option value="14">2 weeks</option><option value="30" selected>1 month</option><option value="60">2 months</option><option value="90">3 months</option>
          </select></label>
        <label style="font-size:0.8rem;display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="slReissue"> Give new codes to parents who already have one (their old code stops working)</label>
        <button class="btn btn-primary" id="slGo" style="margin-left:auto" disabled>🖨 Make &amp; print slips (0)</button>
      </div>`);

    document.getElementById('slCls').onchange = e => { slipFilter.cls = e.target.value; drawSlipRows(); };
    let t; const qi = document.getElementById('slQ');
    qi.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { slipFilter.q = qi.value; drawSlipRows(); }, 200); });
    qi.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(t); slipFilter.q = qi.value; drawSlipRows(); } });
    document.getElementById('slNew').onchange = e => { slipFilter.newOnly = e.target.checked; drawSlipRows(); };
    document.getElementById('slHide').onchange = e => { slipFilter.hideActive = e.target.checked; drawSlipRows(); };
    document.getElementById('slAll').onclick = () => { visibleSlipRows().filter(slipSelectable).forEach(p => slipSel.add(p.admission_no)); drawSlipRows(); };
    document.getElementById('slNone').onclick = () => { slipSel.clear(); drawSlipRows(); };
    document.getElementById('slGo').onclick = () => makeSlips(slipPupils.filter(p => slipSel.has(p.admission_no)));
    // One listener for every tick box, so redrawing rows needs no re-binding.
    document.getElementById('slBody').addEventListener('change', e => {
      const c = e.target.closest('[data-slp]'); if (!c) return;
      c.checked ? slipSel.add(c.dataset.slp) : slipSel.delete(c.dataset.slp);
      updateSlipCounts();
    });
    drawSlipRows();
  }

  const slipRecent = p => p.enrolled_at && (Date.now() - new Date(p.enrolled_at).getTime()) < NEW_DAYS * 864e5;
  const slipSelectable = p => p.state !== 'problem' && p.state !== 'deactivated';
  function visibleSlipRows() {
    return (slipPupils || []).filter(p =>
      (!slipFilter.cls || p.class_name === slipFilter.cls) &&
      (!slipFilter.hideActive || p.state !== 'active') &&
      (!slipFilter.newOnly || slipRecent(p)) &&
      (!slipFilter.q.trim() || matchesSearch(`${p.full_name} ${p.admission_no} ${p.parent_name} ${p.class_name}`, [p.phone_display], slipFilter.q)));
  }
  function updateSlipCounts() {
    const rows = visibleSlipRows();
    const n = slipPupils.filter(p => slipSel.has(p.admission_no)).length;
    const cnt = document.getElementById('slCount');
    if (cnt) cnt.innerHTML = `${rows.length} pupil${rows.length !== 1 ? 's' : ''} shown · <strong style="color:#111827">${n} ticked</strong>`;
    const go = document.getElementById('slGo');
    if (go) { go.disabled = !n; go.textContent = `🖨 Make & print slips (${n})`; }
  }
  function drawSlipRows() {
    const body = document.getElementById('slBody');
    if (!body) return;
    const st = s => { const c = SLIP_STATE[s] || SLIP_STATE.prepared; return `<span style="background:${c.bg};color:${c.color};padding:2px 9px;border-radius:20px;font-size:0.68rem;font-weight:700;white-space:nowrap">${c.label}</span>`; };
    body.innerHTML = visibleSlipRows().map(p => `<tr style="border-top:1px solid #f3f4f6">
            <td style="padding:7px 8px"><input type="checkbox" data-slp="${esc(p.admission_no)}" ${slipSel.has(p.admission_no) ? 'checked' : ''} ${slipSelectable(p) ? '' : 'disabled'}></td>
            <td style="padding:7px 8px"><strong>${esc(p.full_name)}</strong><div style="font-size:0.7rem;color:#6b7280">${esc(p.admission_no)}${slipRecent(p) ? ' · <span style="color:#3730a3;font-weight:700">new</span>' : ''}</div></td>
            <td style="padding:7px 8px;white-space:nowrap">${esc(p.class_name)}</td>
            <td style="padding:7px 8px">${esc(p.parent_name) || '<span style="color:#9ca3af">—</span>'}</td>
            <td style="padding:7px 8px;white-space:nowrap">${esc(p.phone_display) || '<span style="color:#9ca3af">—</span>'}</td>
            <td style="padding:7px 8px">${st(p.state)}${p.problem ? `<div style="font-size:0.7rem;color:#991b1b;margin-top:3px">${esc(p.problem)}</div>` : ''}
              ${p.state === 'pending' ? `<div style="font-size:0.7rem;color:#92400e;margin-top:3px">given ${fmtDate(p.code_issued_at)}</div>` : ''}</td>
          </tr>`).join('') || '<tr><td colspan="6" style="padding:18px;text-align:center;color:#6b7280">No pupils match.</td></tr>';
    updateSlipCounts();
  }

  async function makeSlips(chosen) {
    const reissue = document.getElementById('slReissue').checked;
    const days = parseInt(document.getElementById('slDays').value, 10);
    const withCode = chosen.filter(p => p.state === 'pending').length;
    let msg = `Make login slips for ${chosen.length} pupil${chosen.length !== 1 ? 's' : ''}?`;
    if (withCode && reissue) msg += `\n\n${withCode} of them already have a code — those old codes will stop working.`;
    else if (withCode) msg += `\n\n${withCode} of them already have a code, so they are left as they are (tick "Give new codes" to replace them).`;
    const withAcct = chosen.filter(p => p.state === 'active').length;
    if (withAcct) msg += `\n\n${withAcct} of them are old pupils whose parent already has an account. Their slip lets the parent choose a new password; the old password keeps working until they do.`;
    if (!confirm(msg)) return;
    const go = document.getElementById('slGo');
    go.disabled = true; go.textContent = 'Making slips…';
    let r;
    try { r = await api('/login-slips', { method: 'POST', body: { admission_nos: chosen.map(p => p.admission_no), reissue, days, include_active: true } }); }
    catch (e) { alert(e.message); go.disabled = false; go.textContent = `🖨 Make & print slips (${chosen.length})`; return; }
    slipSel.clear(); slipPupils = null;
    showSlipsResult(r);
    await reload();
  }

  function showSlipsResult(r) {
    const m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px';
    const s = r.summary;
    m.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="margin:0 0 10px;color:var(--color-primary);font-size:1rem">${s.slips} login slip${s.slips !== 1 ? 's' : ''} ready</h3>
        <div style="font-size:0.82rem;line-height:1.7;margin-bottom:12px">
          ${s.accounts_created ? `✓ ${s.accounts_created} new parent account${s.accounts_created !== 1 ? 's' : ''} made from pupil records<br>` : ''}
          ${s.children_linked ? `✓ ${s.children_linked} child${s.children_linked !== 1 ? 'ren' : ''} linked to their parent<br>` : ''}
          ${s.skipped ? `<span style="color:#92400e">• ${s.skipped} pupil${s.skipped !== 1 ? 's' : ''} got no slip — see below</span>` : ''}
        </div>
        ${s.slips ? `<p style="font-size:0.78rem;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin:0 0 12px">
          ⚠ The codes are shown <strong>only now</strong>. Print the slips before closing this box. They expire on <strong>${fmtDate(r.slips[0].expires_at)}</strong>.</p>` : ''}
        ${r.skipped.length ? `<details style="font-size:0.78rem;margin-bottom:12px" ${s.slips ? '' : 'open'}><summary style="cursor:pointer;font-weight:600">Pupils without a slip (${r.skipped.length})</summary>
          <ul style="margin:8px 0 0;padding-left:18px;line-height:1.5">${r.skipped.map(k => `<li><strong>${esc(k.full_name)}</strong> (${esc(k.class_name)}) — ${esc(k.reason)}</li>`).join('')}</ul></details>` : ''}
        <div style="display:flex;gap:10px">
          <button class="btn btn-outline" style="flex:1" id="slClose">Close</button>
          ${s.slips ? '<button class="btn btn-primary" style="flex:1" id="slPrint">🖨 Print slips</button>' : ''}
        </div>
      </div>`;
    document.body.appendChild(m);
    let printed = false;
    m.querySelector('#slClose').onclick = () => {
      if (s.slips && !printed && !confirm('You haven\'t printed the slips. Once you close this box the codes can\'t be seen again (you would have to give new codes). Close anyway?')) return;
      m.remove();
    };
    const pb = m.querySelector('#slPrint');
    if (pb) pb.onclick = () => { printed = true; printSlips(r.slips); };
  }

  // A4 sheet, 2 slips across × 4 down, dashed lines to cut along.
  function printSlips(slips) {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Please allow pop-ups to print the slips.'); return; }
    const logo = new URL('../assets/images/logo.png', location.href).href;
    const site = 'www.royalcrystalacademy.com.ng/parent-login.html';
    const one = s => `
      <div class="slip">
        <div class="h"><img src="${logo}" alt=""><div><div class="n">Royal Crystal Academy</div><div class="t">Parent Portal Login</div></div></div>
        <div class="row"><span>Parent</span><b>${esc(s.parent_name)}</b></div>
        <div class="row"><span>${s.children.length > 1 ? 'Children' : 'Child'}</span><b>${s.children.map(c => `${esc(c.full_name)} <i>(${esc(c.class_name)})</i>`).join('<br>')}</b></div>
        <div class="row"><span>Phone</span><b>${esc(s.phone_display)}</b></div>
        <div class="code">${esc(s.code)}</div>
        <ol><li>Go to <b>${site}</b></li><li>Click <b>Use my code</b></li><li>Type the phone number above and this code</li><li>${s.reset ? 'Choose a new password (your old one also works until then)' : 'Choose your own password'}, then log in</li></ol>
        <div class="f">Code works until ${fmtDate(s.expires_at)}. Keep it private. Help: 08036721390 / 09080061094</div>
      </div>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Parent Login Slips</title>
      <style>
        @page { size: A4; margin: 8mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; margin: 0; color: #111827; }
        .sheet { display: grid; grid-template-columns: 1fr 1fr; }
        .slip { border: 1.5px dashed #9ca3af; padding: 9px 11px; height: 68mm; overflow: hidden; break-inside: avoid; page-break-inside: avoid; font-size: 10.5px; }
        .h { display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #c9960c; padding-bottom: 5px; margin-bottom: 6px; }
        .h img { width: 30px; height: 30px; }
        .n { font-family: Georgia, serif; font-weight: 700; color: #13306b; font-size: 13px; text-transform: uppercase; }
        .t { font-size: 9.5px; color: #6b7280; }
        .row { display: flex; gap: 6px; line-height: 1.35; margin-bottom: 2px; }
        .row span { width: 46px; flex-shrink: 0; color: #6b7280; }
        .row i { font-style: normal; color: #6b7280; font-weight: 400; }
        .code { font-family: 'Courier New', monospace; font-size: 20px; font-weight: 700; letter-spacing: .12em; text-align: center; background: #eef3fb; border-radius: 6px; padding: 5px; margin: 5px 0; }
        ol { margin: 0; padding-left: 16px; line-height: 1.4; }
        .f { font-size: 8.5px; color: #6b7280; margin-top: 4px; }
        .tip { font-size: 11px; color: #6b7280; margin: 0 0 6px; }
        @media print { .tip { display: none; } }
      </style></head><body>
      <p class="tip">${slips.length} slip${slips.length !== 1 ? 's' : ''} · cut along the dashed lines.</p>
      <div class="sheet">${slips.map(one).join('')}</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
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
