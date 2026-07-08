/* ============================================
   NEWSLETTER — newsletter.js
   Royal Crystal Academy
   ============================================
   Who can CREATE / SUBMIT : ict_admin, head_teacher
   Who can APPROVE / REJECT: head_teacher, proprietor
   Who can VIEW (staff)    : all roles (published only for non-managers)
   Parents                 : see published newsletters in parent portal
   (parent-portal.js reads /announcements filtered to type='newsletter'
   && status='published' directly — no dependency on this file).

   Real backend: uses the same /announcements table as the Announcements
   tab, with type='newsletter'. Previously this whole tab was a parallel
   localStorage-only system — anything "published" here never actually
   reached parents, since the real parent portal reads real announcements.
*/

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     CACHE — loaded from the real backend, refreshed after every
     mutating action (create/edit/submit/approve/reject/archive/delete)
  ============================================================ */
  let newslettersCache = [];

  async function loadNewsletters() {
    try {
      const data = await window.RCA_API.call('/announcements');
      newslettersCache = (data.announcements || []).filter(a => a.type === 'newsletter');
    } catch (e) {
      console.warn('Could not load newsletters:', e.message);
      newslettersCache = [];
    }
  }

  function getNewsletters() { return newslettersCache; }

  /* ============================================================
     ACADEMIC SESSION HELPER
     Academic year starts September 1. e.g. Sep 2025 → "2025/2026"
  ============================================================ */
  function currentSession() {
    const now = new Date();
    const yr  = now.getFullYear();
    const mo  = now.getMonth(); // 0=Jan … 8=Sep
    return mo >= 8 ? `${yr}/${yr + 1}` : `${yr - 1}/${yr}`;
  }

  /* List of all sessions that appear in the loaded newsletters,
     plus the current one, newest first */
  function allSessions() {
    const cur   = currentSession();
    const found = new Set(getNewsletters().map(n => n.session || cur));
    found.add(cur);
    return [...found].sort((a, b) => b.localeCompare(a)); // e.g. 2025/2026 > 2024/2025
  }

  /* ============================================================
     RBAC
  ============================================================ */
  function getAccess() {
    const user  = window.CURRENT_USER;
    const roles = user ? (user.roles || [user.role, user.primary_role]).filter(Boolean) : [];
    return {
      user,
      canCreate : roles.some(r => ['ict_admin', 'head_teacher'].includes(r)),
      canApprove: roles.some(r => ['head_teacher', 'proprietor'].includes(r)),
      isManager : roles.some(r => ['ict_admin', 'head_teacher', 'proprietor'].includes(r)),
    };
  }

  /* ============================================================
     STATUS BADGES
  ============================================================ */
  const STATUS = {
    draft:            { label: 'Draft',            bg: '#f3f4f6', color: '#374151', icon: '✏️' },
    pending_approval: { label: 'Pending Approval', bg: '#fef3c7', color: '#92400e', icon: '⏳' },
    published:        { label: 'Published',        bg: '#d1fae5', color: '#065f46', icon: '✅' },
    rejected:         { label: 'Rejected',         bg: '#fee2e2', color: '#991b1b', icon: '❌' },
    archived:         { label: 'Archived',         bg: '#f3f4f6', color: '#6b7280', icon: '📦' },
  };

  /* ============================================================
     SESSION FILTER STATE  (persists in module scope)
  ============================================================ */
  let _activeFilterSession = '';  // '' = All sessions

  /* ============================================================
     RENDER LIST  — grouped by academic session
  ============================================================ */
  function renderNewsletters() {
    const panel = document.getElementById('newsletterList');
    if (!panel) return;

    const { canCreate, canApprove, isManager } = getAccess();

    /* ---- Rebuild session filter bar ---- */
    const filterBar = document.getElementById('nlSessionFilter');
    if (filterBar) {
      const sessions = allSessions();
      filterBar.innerHTML = sessions.map(s => `
        <button onclick="window._nlSetSession('${s}')"
          style="padding:5px 14px;border-radius:20px;border:1px solid ${_activeFilterSession===s ? '#1a3a5c' : '#d1d5db'};
                 background:${_activeFilterSession===s ? '#1a3a5c' : '#fff'};
                 color:${_activeFilterSession===s ? '#fff' : '#374151'};
                 font-size:0.78rem;font-weight:600;cursor:pointer;white-space:nowrap">
          ${s}
        </button>`).join('') +
        `<button onclick="window._nlSetSession('')"
          style="padding:5px 14px;border-radius:20px;border:1px solid ${_activeFilterSession==='' ? '#1a3a5c' : '#d1d5db'};
                 background:${_activeFilterSession==='' ? '#1a3a5c' : '#fff'};
                 color:${_activeFilterSession==='' ? '#fff' : '#374151'};
                 font-size:0.78rem;font-weight:600;cursor:pointer">
          All Years
        </button>`;
    }

    /* ---- Get and filter newsletters ---- */
    let all = getNewsletters()
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Non-managers see only published
    if (!isManager) all = all.filter(n => n.status === 'published');

    // Apply session filter
    if (_activeFilterSession) {
      all = all.filter(n => (n.session || currentSession()) === _activeFilterSession);
    }

    /* ---- Empty state ---- */
    if (all.length === 0) {
      panel.innerHTML = `
        <div style="text-align:center;padding:56px 24px;color:#6b7280">
          <div style="font-size:3rem;margin-bottom:14px">📰</div>
          <h3 style="color:#374151;margin-bottom:8px;font-size:1rem">No Newsletters ${_activeFilterSession ? 'for ' + _activeFilterSession : 'Yet'}</h3>
          <p style="font-size:0.85rem">${canCreate
            ? 'Click "+ New Newsletter" to draft the first edition.'
            : 'No newsletters have been published yet. Check back later.'}</p>
        </div>`;
      return;
    }

    /* ---- Group by academic session ---- */
    const groups = {};
    all.forEach(nl => {
      const sess = nl.session || currentSession();
      if (!groups[sess]) groups[sess] = [];
      groups[sess].push(nl);
    });

    const sessionOrder = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    panel.innerHTML = sessionOrder.map(sess => `
      <div style="margin-bottom:28px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <span style="font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">
            📅 Academic Session ${sess}
          </span>
          <div style="flex:1;height:1px;background:#e5e7eb"></div>
          <span style="font-size:0.72rem;color:#9ca3af">${groups[sess].length} newsletter${groups[sess].length!==1?'s':''}</span>
        </div>
        ${groups[sess].map(nl => renderCard(nl, { canCreate, canApprove, isManager })).join('')}
      </div>`).join('');
  }

  function renderCard(nl, { canCreate, canApprove, isManager }) {
    const sc      = STATUS[nl.status] || STATUS.draft;
    const created = new Date(nl.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const pubDate = nl.published_at
      ? new Date(nl.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const preview = (nl.body || '').split('\n').filter(l => l.trim().length > 10)[0]
      || (nl.body || '').substring(0, 120);

    const btns = [];
    if (nl.status === 'draft' && canCreate) {
      btns.push(btn('✏️ Edit',            '#fff',    '#d1d5db', '#374151', `window.editNewsletter(${nl.id})`));
      btns.push(btn('📤 Submit',          '#1a3a5c', 'none',    '#fff',    `window.submitNewsletter(${nl.id})`));
      btns.push(btn('🗑 Delete',          '#fef2f2', '#fecaca', '#dc2626', `window.deleteNewsletter(${nl.id})`));
    }
    if (nl.status === 'pending_approval') {
      if (canApprove) {
        btns.push(btn('✅ Approve',       '#059669', 'none',    '#fff',    `window.approveNewsletter(${nl.id})`));
        btns.push(btn('❌ Reject',        '#fef2f2', '#fecaca', '#dc2626', `window.rejectNewsletter(${nl.id})`));
      }
      btns.push(btn('👁 Preview',         '#fff',    '#d1d5db', '#374151', `window.viewNewsletter(${nl.id})`));
    }
    if (nl.status === 'published') {
      btns.push(btn('👁 View',            '#fff',    '#d1d5db', '#374151', `window.viewNewsletter(${nl.id})`));
      if (isManager) btns.push(btn('📦 Archive', '#f3f4f6', '#d1d5db', '#374151', `window.archiveNewsletter(${nl.id})`));
    }
    if (nl.status === 'rejected' && canCreate) {
      btns.push(btn('✏️ Edit & Resubmit', '#1a3a5c', 'none',    '#fff',    `window.editNewsletter(${nl.id})`));
      btns.push(btn('🗑 Delete',          '#fef2f2', '#fecaca', '#dc2626', `window.deleteNewsletter(${nl.id})`));
    }
    if (nl.status === 'archived' && isManager) {
      btns.push(btn('🗑 Delete',          '#fef2f2', '#fecaca', '#dc2626', `window.deleteNewsletter(${nl.id})`));
    }

    return `
      <div style="border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:18px 20px;margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="background:${sc.bg};color:${sc.color};font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:20px">${sc.icon} ${sc.label}</span>
            ${nl.issue ? `<span style="background:#eff6ff;color:#1d4ed8;font-size:0.7rem;font-weight:600;padding:3px 10px;border-radius:20px">📋 ${nl.issue}</span>` : ''}
          </div>
          <span style="font-size:0.75rem;color:#9ca3af;white-space:nowrap">${created}</span>
        </div>

        <h3 style="font-size:1rem;color:#111827;margin-bottom:6px;font-weight:700">${nl.title}</h3>
        <p style="font-size:0.83rem;color:#6b7280;margin-bottom:8px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.5">${preview}</p>

        ${nl.status === 'rejected' && nl.rejection_reason
          ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:0.78rem;color:#dc2626"><strong>Rejection reason:</strong> ${nl.rejection_reason}</div>`
          : ''}
        ${nl.status === 'published' && pubDate
          ? `<p style="font-size:0.72rem;color:#059669;margin-bottom:4px">Published ${pubDate} — visible to parents &amp; staff</p>`
          : ''}
        ${nl.status === 'pending_approval'
          ? `<p style="font-size:0.72rem;color:#92400e;margin-bottom:4px">Awaiting approval from Head Teacher / Proprietor</p>`
          : ''}

        <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span style="font-size:0.75rem;color:#6b7280">— ${nl.author || 'Administration'}</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${btns.join('')}</div>
        </div>
      </div>`;
  }

  function btn(label, bg, border, color, onclick) {
    const bdr = border === 'none' ? 'none' : `1px solid ${border}`;
    return `<button onclick="${onclick}" style="padding:5px 12px;background:${bg};border:${bdr};color:${color};border-radius:6px;font-size:0.75rem;cursor:pointer;font-weight:600">${label}</button>`;
  }

  /* Filter setter — called from inline onclick */
  window._nlSetSession = function(sess) {
    _activeFilterSession = sess;
    renderNewsletters();
  };

  async function refresh() {
    await loadNewsletters();
    renderNewsletters();
  }

  /* ============================================================
     CREATE / EDIT MODAL
  ============================================================ */
  function showNewsletterModal(existing) {
    document.getElementById('nlModalOverlay')?.remove();
    const { user, canApprove } = getAccess();
    const sess = existing?.session || currentSession();

    const modal = document.createElement('div');
    modal.id = 'nlModalOverlay';
    modal.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px';

    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:640px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="background:#1a3a5c;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:16px 16px 0 0;position:sticky;top:0;z-index:1">
          <span style="color:#fff;font-weight:700;font-size:1rem">${existing ? '✏️ Edit' : '📰 New'} Newsletter</span>
          <button id="closeNlModal" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem">✕</button>
        </div>
        <div style="padding:24px">
          <div id="nlModalAlert" style="display:none;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:0.83rem"></div>

          <div style="display:grid;grid-template-columns:1fr auto;gap:12px;margin-bottom:16px">
            <div class="form-group">
              <label class="form-label">Newsletter Title *</label>
              <input type="text" id="nl_title" class="form-control"
                placeholder="e.g. Royal Crystal Academy — Third Term Newsletter"
                value="${existing?.title || ''}">
            </div>
            <div class="form-group" style="min-width:130px">
              <label class="form-label">Academic Session *</label>
              <input type="text" id="nl_session" class="form-control"
                placeholder="e.g. 2025/2026"
                value="${sess}">
            </div>
          </div>

          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Issue / Volume</label>
            <input type="text" id="nl_issue" class="form-control"
              placeholder="e.g. Term 3 Issue 1"
              value="${existing?.issue || ''}">
          </div>

          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Content *</label>
            <textarea id="nl_body" class="form-control" rows="12"
              placeholder="Write the full newsletter here. Include school news, achievements, upcoming events, term highlights, etc.">${existing?.body || ''}</textarea>
            <div style="font-size:0.75rem;color:#9ca3af;margin-top:4px">This content is stored permanently and will remain accessible in future years.</div>
          </div>

          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Send To</label>
            <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:6px">
              <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer">
                <input type="checkbox" id="nl_aud_staff" ${!existing || existing.audience?.includes('staff') ? 'checked' : ''}> Staff
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer">
                <input type="checkbox" id="nl_aud_parents" ${!existing || existing.audience?.includes('parents') ? 'checked' : ''}> Parents
              </label>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">Author / Signed by</label>
            <input type="text" id="nl_author" class="form-control"
              value="${existing?.author || user?.full_name || 'The Administration'}">
          </div>

          <div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:8px;padding:10px 14px;margin-bottom:18px;font-size:0.8rem;color:#065f46">
            ${canApprove
              ? '✅ As Head Teacher, submitting will <strong>publish immediately</strong>.'
              : '⏳ After submitting, the Head Teacher must approve before parents and staff can see it.'}
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:10px">
            <button id="closeNlModal2" class="btn btn-outline" style="flex:1 1 100px">Cancel</button>
            <button id="saveNlDraftBtn" class="btn" style="flex:1 1 100px;background:#6b7280;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;padding:10px">💾 Save Draft</button>
            <button id="saveNlSubmitBtn" class="btn btn-primary" style="flex:1 1 100px">📤 Submit</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('closeNlModal').onclick  = close;
    document.getElementById('closeNlModal2').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    function alertMsg(msg) {
      const el = document.getElementById('nlModalAlert');
      el.textContent = msg;
      el.style.display = 'block';
    }

    async function save(submit, btnEl) {
      const title   = document.getElementById('nl_title').value.trim();
      const body    = document.getElementById('nl_body').value.trim();
      const issue   = document.getElementById('nl_issue').value.trim();
      const author  = document.getElementById('nl_author').value.trim() || 'The Administration';
      const session = document.getElementById('nl_session').value.trim() || currentSession();

      if (!title)   { alertMsg('Please enter a newsletter title.'); return; }
      if (!body)    { alertMsg('Please enter the newsletter content.'); return; }
      if (!session) { alertMsg('Please enter the academic session (e.g. 2025/2026).'); return; }

      const audience = [];
      if (document.getElementById('nl_aud_staff').checked)   audience.push('staff');
      if (document.getElementById('nl_aud_parents').checked) audience.push('parents');
      if (audience.length === 0) { alertMsg('Please select at least one audience.'); return; }

      const { canApprove } = getAccess();
      const status = submit
        ? (canApprove ? 'published' : 'pending_approval')
        : 'draft';

      const payload = { type: 'newsletter', title, body, issue, author, audience, session, status };

      btnEl.disabled = true;
      try {
        if (existing) {
          await window.RCA_API.call(`/announcements/${existing.id}`, { method: 'PATCH', body: payload });
        } else {
          await window.RCA_API.call('/announcements', { method: 'POST', body: payload });
        }
      } catch (e) {
        alertMsg('Could not save: ' + e.message);
        btnEl.disabled = false;
        return;
      }

      modal.remove();
      await refresh();

      showToast(
        status === 'published'        ? 'Newsletter published ✅'     :
        status === 'pending_approval' ? 'Submitted for approval ⏳'   :
                                        'Draft saved 💾'
      );
    }

    document.getElementById('saveNlDraftBtn').onclick  = (e) => save(false, e.target);
    document.getElementById('saveNlSubmitBtn').onclick = (e) => save(true, e.target);
  }

  /* ============================================================
     VIEW MODAL  (read-only, shows full content)
  ============================================================ */
  function showViewModal(nl) {
    document.getElementById('nlViewOverlay')?.remove();
    const modal = document.createElement('div');
    modal.id = 'nlViewOverlay';
    modal.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.6);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px';

    const displayDate = (nl.published_at || nl.created_at)
      ? new Date(nl.published_at || nl.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:700px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="background:#1a3a5c;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:16px 16px 0 0;position:sticky;top:0;z-index:1">
          <span style="color:#fff;font-weight:700;font-size:1rem">📰 Newsletter</span>
          <button id="closeNlView" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem">✕</button>
        </div>
        <div style="padding:32px">
          <div style="text-align:center;border-bottom:2px solid #1a3a5c;padding-bottom:22px;margin-bottom:26px">
            <div style="font-size:0.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">
              Royal Crystal Academy ${nl.session ? '• Session ' + nl.session : ''}
            </div>
            <h2 style="font-size:1.5rem;color:#1a3a5c;font-weight:800;margin-bottom:6px">${nl.title}</h2>
            ${nl.issue ? `<div style="font-size:0.88rem;color:#4b5563;margin-bottom:4px">${nl.issue}</div>` : ''}
            <div style="font-size:0.8rem;color:#9ca3af">${displayDate}</div>
          </div>
          <div style="font-size:0.9rem;color:#374151;line-height:1.85;white-space:pre-wrap">${nl.body}</div>
          <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e5e7eb;font-size:0.78rem;color:#9ca3af;text-align:center">
            — ${nl.author || 'The Administration'} • Royal Crystal Academy
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    document.getElementById('closeNlView').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }

  /* ============================================================
     REJECT MODAL
  ============================================================ */
  function showRejectModal(id) {
    document.getElementById('nlRejectOverlay')?.remove();
    const modal = document.createElement('div');
    modal.id = 'nlRejectOverlay';
    modal.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.6);z-index:2100;display:flex;align-items:center;justify-content:center;padding:16px';

    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="background:#dc2626;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:16px 16px 0 0">
          <span style="color:#fff;font-weight:700">❌ Reject Newsletter</span>
          <button id="closeRejectNl" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:0.9rem">✕</button>
        </div>
        <div style="padding:20px">
          <p style="font-size:0.85rem;color:#374151;margin-bottom:12px">Provide a reason so the author can revise and resubmit:</p>
          <textarea id="nlRejectReason" class="form-control" rows="4"
            placeholder="e.g. Please include the Third Term timetable and correct the sports day date."></textarea>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px">
            <button id="cancelRejectNl" class="btn btn-outline" style="flex:1 1 100px">Cancel</button>
            <button id="confirmRejectNl" style="flex:1 1 140px;padding:10px;background:#dc2626;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">Reject &amp; Return</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    const close = () => modal.remove();
    document.getElementById('closeRejectNl').onclick  = close;
    document.getElementById('cancelRejectNl').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    document.getElementById('confirmRejectNl').onclick = async () => {
      const reason = document.getElementById('nlRejectReason').value.trim();
      if (!reason) { showToast('Please enter a rejection reason.', '#dc2626'); return; }

      try {
        await window.RCA_API.call(`/announcements/${id}`, {
          method: 'PATCH',
          body: { status: 'rejected', rejection_reason: reason }
        });
      } catch (e) {
        showToast('Could not reject: ' + e.message, '#dc2626');
        return;
      }

      close();
      await refresh();
      showToast('Newsletter returned to author with feedback.');
    };
  }

  /* ============================================================
     TOAST
  ============================================================ */
  function showToast(msg, color = '#059669') {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${color};color:#fff;padding:12px 20px;border-radius:10px;z-index:9999;font-size:0.85rem;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2)`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ============================================================
     GLOBAL ACTIONS  (called from onclick in rendered HTML)
  ============================================================ */
  window.editNewsletter    = id => { const nl = getNewsletters().find(n => n.id === id); if (nl) showNewsletterModal(nl); };
  window.viewNewsletter    = id => { const nl = getNewsletters().find(n => n.id === id); if (nl) showViewModal(nl); };

  window.deleteNewsletter  = async id => {
    if (!confirm('Delete this newsletter permanently? It cannot be recovered.')) return;
    try {
      await window.RCA_API.call(`/announcements/${id}`, { method: 'DELETE' });
    } catch (e) {
      showToast('Could not delete: ' + e.message, '#dc2626');
      return;
    }
    await refresh();
    showToast('Newsletter deleted.');
  };

  window.submitNewsletter  = async id => {
    try {
      await window.RCA_API.call(`/announcements/${id}`, { method: 'PATCH', body: { status: 'pending_approval' } });
    } catch (e) {
      showToast('Could not submit: ' + e.message, '#dc2626');
      return;
    }
    await refresh();
    showToast('Submitted for approval ⏳');
  };

  window.approveNewsletter = async id => {
    try {
      await window.RCA_API.call(`/announcements/${id}`, { method: 'PATCH', body: { status: 'published' } });
    } catch (e) {
      showToast('Could not approve: ' + e.message, '#dc2626');
      return;
    }
    await refresh();
    showToast('Newsletter approved and published ✅');
  };

  window.rejectNewsletter  = id => showRejectModal(id);

  window.archiveNewsletter = async id => {
    if (!confirm('Archive this newsletter? It will be hidden from parents and staff but kept in the archive.')) return;
    try {
      await window.RCA_API.call(`/announcements/${id}`, { method: 'PATCH', body: { status: 'archived' } });
    } catch (e) {
      showToast('Could not archive: ' + e.message, '#dc2626');
      return;
    }
    await refresh();
    showToast('Newsletter archived 📦');
  };

  /* ============================================================
     PUBLIC INIT — called by announcements.js when tab is activated
  ============================================================ */
  window.initNewsletterTab = async function () {
    /* Ensure the filter bar container exists */
    if (!document.getElementById('nlSessionFilter')) {
      const panel = document.getElementById('newsletterPanel');
      if (panel) {
        const bar = document.createElement('div');
        bar.id = 'nlSessionFilter';
        bar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center';
        // Insert before newsletterList div
        const list = document.getElementById('newsletterList');
        if (list) panel.insertBefore(bar, list);
        else panel.appendChild(bar);
      }
    }

    const addBtn = document.getElementById('addNewsletterBtn');
    const { canCreate } = getAccess();
    if (addBtn) {
      addBtn.style.display = canCreate ? 'inline-flex' : 'none';
      addBtn.onclick = () => showNewsletterModal(null);
    }

    const list = document.getElementById('newsletterList');
    if (list) list.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:40px;font-size:0.85rem">Loading…</p>';
    await refresh();
  };

});
