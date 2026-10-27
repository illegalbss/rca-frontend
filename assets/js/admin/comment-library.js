/* ============================================
   ROYAL CRYSTAL ACADEMY — Report Card Comment Library
   "Choose Comment" panel for the Form Teacher's comment (Class Review)
   and the Head Teacher's comment (Report Cards).

   window.RCA_COMMENTS.open({
     role: 'form_teacher' | 'head_teacher',
     pupil: { full_name, gender, class_name },
     currentText,               // what is in the comment box now
     onInsert(text)             // gets the finished paragraph
   })

   Templates live in the database (/api/comment-templates). Choosing a
   comment only fills the comment box; nothing is saved, submitted or
   approved until the teacher presses Save as before. The ICT Admin also
   gets a "Manage templates" tab to add, edit and switch templates on/off.
   ============================================ */
(function () {
  const CATEGORY_LABELS = {
    positive: 'Positive Traits',
    improvement: 'Areas for Improvement',
    overall: "Head Teacher's Overall Assessment"
  };
  const TONE_LABELS = { positive: 'Strong', neutral: 'Steady', support: 'Needs support' };
  const cache = {};

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const roles = () => { const u = window.CURRENT_USER || {}; return u.roles || [u.role]; };
  const isAdmin = () => roles().includes('ict_admin');
  const isNursery = c => (window.isNurseryClass ? window.isNurseryClass(c) : /nursery/i.test(c || ''));

  function pronouns(gender) {
    const g = String(gender || '').toLowerCase();
    if (g === 'male' || g === 'm') return { he_she: 'he', his_her: 'his', him_her: 'him' };
    if (g === 'female' || g === 'f') return { he_she: 'she', his_her: 'her', him_her: 'her' };
    return { he_she: 'he/she', his_her: 'his/her', him_her: 'him/her' };
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // Fills {pupil_name}, {he_she}, {He_She}, {his_her}, {His_Her}, {him_her}.
  function personalise(text, name, gender) {
    const p = pronouns(gender);
    return String(text)
      .replace(/\{pupil_name\}/g, name)
      .replace(/\{He_She\}/g, cap(p.he_she)).replace(/\{he_she\}/g, p.he_she)
      .replace(/\{His_Her\}/g, cap(p.his_her)).replace(/\{his_her\}/g, p.his_her)
      .replace(/\{him_her\}/g, p.him_her);
  }

  async function loadTemplates(role, all) {
    const key = role + (all ? ':all' : '');
    if (!cache[key]) {
      const qs = new URLSearchParams({ role });
      if (all) qs.set('all', '1');
      const data = await window.RCA_API.call('/comment-templates?' + qs.toString());
      cache[key] = data.templates || [];
    }
    return cache[key];
  }
  const clearCache = () => Object.keys(cache).forEach(k => delete cache[k]);

  function injectStyles() {
    if (document.getElementById('rcaCommentLibStyles')) return;
    const st = document.createElement('style');
    st.id = 'rcaCommentLibStyles';
    st.textContent = `
      .cl-overlay{position:fixed;inset:0;background:rgba(17,24,39,.55);z-index:4000;display:flex;align-items:center;justify-content:center;padding:16px}
      .cl-modal{background:#fff;border-radius:14px;width:100%;max-width:780px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.25);overflow:hidden;font-family:inherit}
      .cl-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;background:var(--color-primary,#7a1020);color:#fff}
      .cl-head h3{margin:0;font-size:1rem;color:#fff}
      .cl-close{background:none;border:none;color:#fff;font-size:1.4rem;line-height:1;cursor:pointer;padding:2px 6px}
      .cl-tabs{display:flex;gap:4px;padding:8px 18px 0;border-bottom:1px solid #e5e7eb}
      .cl-tab{border:none;background:none;padding:8px 12px;font-size:.82rem;font-weight:600;color:#6b7280;cursor:pointer;border-bottom:2px solid transparent}
      .cl-tab.active{color:var(--color-primary,#7a1020);border-bottom-color:var(--color-primary,#7a1020)}
      .cl-body{padding:14px 18px;overflow-y:auto;flex:1}
      .cl-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
      .cl-tools input,.cl-tools select,.cl-form input,.cl-form select,.cl-form textarea{padding:7px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:.84rem;font-family:inherit;box-sizing:border-box}
      .cl-tools .cl-search{flex:1;min-width:180px}
      .cl-chip{border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:5px 12px;font-size:.76rem;cursor:pointer;color:#374151}
      .cl-chip.active{background:var(--color-primary,#7a1020);border-color:var(--color-primary,#7a1020);color:#fff}
      .cl-name{display:flex;align-items:center;gap:8px;font-size:.78rem;color:#6b7280;margin-bottom:10px;flex-wrap:wrap}
      .cl-name input{padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.8rem;min-width:180px}
      .cl-group{margin-bottom:12px}
      .cl-group-title{font-size:.78rem;font-weight:700;color:#374151;margin:0 0 6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .cl-tag{font-size:.66rem;font-weight:600;padding:1px 8px;border-radius:999px;background:#f3f4f6;color:#6b7280}
      .cl-tag.positive{background:#dcfce7;color:#166534}.cl-tag.support{background:#fef3c7;color:#92400e}.cl-tag.improvement{background:#fef3c7;color:#92400e}
      .cl-item{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:9px 11px;margin-bottom:6px;cursor:pointer;font-size:.84rem;line-height:1.45;color:#1f2937;font-family:inherit}
      .cl-item:hover{border-color:var(--color-primary,#7a1020)}
      .cl-item.selected{border-color:var(--color-primary,#7a1020);background:#fdf2f4}
      .cl-item.blocked{opacity:.55;cursor:not-allowed}
      .cl-check{flex:none;width:20px;height:20px;border-radius:50%;border:2px solid #d1d5db;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:#fff;margin-top:1px}
      .cl-item.selected .cl-check{background:var(--color-primary,#7a1020);border-color:var(--color-primary,#7a1020)}
      .cl-why{display:block;font-size:.72rem;color:#b45309;margin-top:3px}
      .cl-foot{border-top:1px solid #e5e7eb;padding:12px 18px;background:#fafafa}
      .cl-preview{font-size:.84rem;line-height:1.5;color:#1f2937;background:#fff;border:1px dashed #d1d5db;border-radius:8px;padding:9px 11px;min-height:40px;margin-bottom:10px;max-height:120px;overflow-y:auto}
      .cl-preview.empty{color:#9ca3af;font-style:italic}
      .cl-msg{font-size:.76rem;color:#b45309;margin:-4px 0 8px}
      .cl-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
      .cl-btn{padding:8px 14px;border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#374151;font-family:inherit}
      .cl-btn.primary{background:var(--color-primary,#7a1020);border-color:var(--color-primary,#7a1020);color:#fff}
      .cl-btn:disabled{opacity:.5;cursor:not-allowed}
      .cl-empty{color:#6b7280;font-size:.84rem;padding:20px 0;text-align:center}
      .cl-row{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;border:1px solid #e5e7eb;border-radius:8px;padding:9px 11px;margin-bottom:6px;font-size:.82rem}
      .cl-row.off{background:#f9fafb;color:#9ca3af}
      .cl-row-actions{display:flex;gap:6px;flex:none}
      .cl-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:12px;background:#fafafa}
      .cl-form label{display:flex;flex-direction:column;gap:4px;font-size:.74rem;font-weight:600;color:#374151}
      .cl-form .wide{grid-column:1/-1}
      .cl-form textarea{min-height:80px;resize:vertical}
      @media (max-width:600px){
        .cl-overlay{padding:0;align-items:stretch}
        .cl-modal{max-height:100vh;height:100%;border-radius:0}
        .cl-form{grid-template-columns:1fr}
        .cl-actions .cl-btn{flex:1 1 auto}
      }`;
    document.head.appendChild(st);
  }

  function open(opts) {
    injectStyles();
    const role = opts.role === 'head_teacher' ? 'head_teacher' : 'form_teacher';
    const pupil = opts.pupil || {};
    const stageOk = t => t.stage === 'all' || t.stage === (isNursery(pupil.class_name) ? 'nursery' : 'primary');
    const state = { tab: 'choose', search: '', filter: 'all', name: pupil.full_name || '', selected: [], templates: [], msg: '' };

    const overlay = document.createElement('div');
    overlay.className = 'cl-overlay';
    overlay.innerHTML = `
      <div class="cl-modal" role="dialog" aria-modal="true" aria-label="Choose comment">
        <div class="cl-head">
          <h3>${role === 'head_teacher' ? "Choose Head Teacher's Comment" : "Choose Form Teacher's Comment"}</h3>
          <button type="button" class="cl-close" aria-label="Close">&times;</button>
        </div>
        ${isAdmin() ? `<div class="cl-tabs">
          <button type="button" class="cl-tab active" data-tab="choose">Choose comment</button>
          <button type="button" class="cl-tab" data-tab="manage">Manage templates</button>
        </div>` : ''}
        <div class="cl-body"><p class="cl-empty">Loading comments…</p></div>
        <div class="cl-foot"></div>
      </div>`;
    document.body.appendChild(overlay);
    const body = overlay.querySelector('.cl-body');
    const foot = overlay.querySelector('.cl-foot');

    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    overlay.querySelector('.cl-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelectorAll('.cl-tab').forEach(btn => btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      overlay.querySelectorAll('.cl-tab').forEach(b => b.classList.toggle('active', b === btn));
      state.tab === 'manage' ? renderManage() : loadChoose();
    }));

    /* ---------- Choose ---------- */
    // Why a template can't be added next to what is already chosen, or ''.
    function blockReason(t) {
      if (state.selected.some(s => s.id === t.id)) return '';
      if (state.selected.some(s => s.title === t.title)) return 'You already chose a sentence from this heading.';
      const clash = state.selected.find(s => s.topic && s.topic === t.topic &&
        ((s.tone === 'positive' && t.tone === 'support') || (s.tone === 'support' && t.tone === 'positive')));
      if (clash) return `Contradicts "${clash.title}", which you already chose.`;
      return '';
    }
    // Joins the chosen sentences. Only the first uses the pupil's name;
    // a later sentence that starts with it starts with He / She instead.
    const sentences = (list, nameUsed) => list.map((t, i) => {
      const body = (i > 0 || nameUsed) ? t.body.replace(/^\{pupil_name\}/, '{He_She}') : t.body;
      return personalise(body, state.name.trim() || 'The pupil', pupil.gender);
    });
    const paragraph = () => sentences(state.selected, false).join(' ');

    async function loadChoose() {
      body.innerHTML = '<p class="cl-empty">Loading comments…</p>';
      foot.innerHTML = '';
      try {
        state.templates = (await loadTemplates(role)).filter(t => t.role === role && t.is_active && stageOk(t));
      } catch (e) {
        body.innerHTML = `<p class="cl-empty" style="color:#dc2626">Could not load the comment library: ${esc(e.message)}</p>`;
        return;
      }
      renderChoose();
    }

    function renderChoose() {
      const filters = role === 'head_teacher'
        ? [['all', 'All'], ['positive', 'Strong'], ['neutral', 'Steady'], ['support', 'Needs support']]
        : [['all', 'All'], ['positive', 'Positive Traits'], ['improvement', 'Areas for Improvement']];
      const q = state.search.trim().toLowerCase();
      const shown = state.templates.filter(t =>
        (state.filter === 'all' || (role === 'head_teacher' ? t.tone === state.filter : t.category === state.filter)) &&
        (!q || t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q)));

      const groups = [];
      shown.forEach(t => {
        let g = groups.find(x => x.title === t.title && x.category === t.category);
        if (!g) groups.push(g = { title: t.title, category: t.category, tone: t.tone, items: [] });
        g.items.push(t);
      });

      body.innerHTML = `
        <div class="cl-tools">
          <input type="search" class="cl-search" placeholder="Search comments…" value="${esc(state.search)}">
          ${filters.map(([v, l]) => `<button type="button" class="cl-chip${state.filter === v ? ' active' : ''}" data-filter="${v}">${l}</button>`).join('')}
        </div>
        <div class="cl-name">Name used in comments:
          <input type="text" class="cl-name-input" value="${esc(state.name)}">
          <span>(${esc(pupil.class_name || '')})</span>
        </div>
        ${groups.length ? groups.map(g => `
          <div class="cl-group">
            <p class="cl-group-title">${esc(g.title)}
              <span class="cl-tag ${role === 'head_teacher' ? g.tone : g.category}">${role === 'head_teacher' ? TONE_LABELS[g.tone] : CATEGORY_LABELS[g.category]}</span>
            </p>
            ${g.items.map(t => {
              const idx = state.selected.findIndex(s => s.id === t.id);
              const why = blockReason(t);
              return `<button type="button" class="cl-item${idx >= 0 ? ' selected' : ''}${why ? ' blocked' : ''}" data-id="${t.id}">
                <span class="cl-check">${idx >= 0 ? idx + 1 : ''}</span>
                <span>${esc(personalise(t.body, state.name.trim() || 'The pupil', pupil.gender))}${why ? `<span class="cl-why">${esc(why)}</span>` : ''}</span>
              </button>`;
            }).join('')}
          </div>`).join('') : '<p class="cl-empty">No comments match your search.</p>'}`;

      const search = body.querySelector('.cl-search');
      search.addEventListener('input', () => {
        state.search = search.value;
        const pos = search.selectionStart;
        renderChoose();
        const s2 = body.querySelector('.cl-search');
        s2.focus(); s2.setSelectionRange(pos, pos);
      });
      body.querySelectorAll('.cl-chip').forEach(c => c.addEventListener('click', () => { state.filter = c.dataset.filter; renderChoose(); }));
      const nameInput = body.querySelector('.cl-name-input');
      nameInput.addEventListener('change', () => { state.name = nameInput.value; renderChoose(); });
      body.querySelectorAll('.cl-item').forEach(btn => btn.addEventListener('click', () => {
        const t = state.templates.find(x => String(x.id) === btn.dataset.id);
        const at = state.selected.findIndex(s => s.id === t.id);
        if (at >= 0) { state.selected.splice(at, 1); state.msg = ''; }
        else {
          const why = blockReason(t);
          if (why) { state.msg = why; renderFoot(); return; }
          state.selected.push(t); state.msg = '';
        }
        const top = body.scrollTop;
        renderChoose();
        body.scrollTop = top;
      }));
      renderFoot();
    }

    function renderFoot() {
      const text = paragraph();
      const hasCurrent = !!String(opts.currentText || '').trim();
      foot.innerHTML = `
        <div class="cl-preview${text ? '' : ' empty'}">${text ? esc(text) : 'Tap one or more comments above. They will be joined into one paragraph here.'}</div>
        ${state.msg ? `<p class="cl-msg">${esc(state.msg)}</p>` : ''}
        <div class="cl-actions">
          <button type="button" class="cl-btn" data-act="clear" ${state.selected.length ? '' : 'disabled'}>Clear selection</button>
          <button type="button" class="cl-btn" data-act="cancel">Cancel</button>
          ${hasCurrent ? `<button type="button" class="cl-btn" data-act="append" ${text ? '' : 'disabled'}>Add to current comment</button>` : ''}
          <button type="button" class="cl-btn primary" data-act="use" ${text ? '' : 'disabled'}>${hasCurrent ? 'Replace current comment' : 'Use this comment'}</button>
        </div>`;
      foot.querySelector('[data-act="clear"]').addEventListener('click', () => { state.selected = []; state.msg = ''; renderChoose(); });
      foot.querySelector('[data-act="cancel"]').addEventListener('click', close);
      foot.querySelector('[data-act="append"]')?.addEventListener('click', () => {
        const cur = String(opts.currentText || '').trim();
        // Don't repeat a sentence that is already in the comment box.
        const add = sentences(state.selected, true).filter(s => !cur.includes(s)).join(' ');
        opts.onInsert(add ? `${cur} ${add}` : cur);
        close();
      });
      foot.querySelector('[data-act="use"]').addEventListener('click', () => { opts.onInsert(paragraph()); close(); });
    }

    /* ---------- Manage (ICT Admin) ---------- */
    let manageRole = role;
    async function renderManage(editing) {
      foot.innerHTML = '';
      body.innerHTML = '<p class="cl-empty">Loading templates…</p>';
      let list;
      try { list = (await loadTemplates(manageRole, true)).filter(t => t.role === manageRole); }
      catch (e) { body.innerHTML = `<p class="cl-empty" style="color:#dc2626">${esc(e.message)}</p>`; return; }

      const formHtml = t => `
        <div class="cl-form" data-id="${t.id || ''}">
          <label>Heading / title<input name="title" value="${esc(t.title)}" maxlength="120"></label>
          <label>Category<select name="category">
            ${(manageRole === 'head_teacher' ? ['overall'] : ['positive', 'improvement']).map(c => `<option value="${c}"${t.category === c ? ' selected' : ''}>${CATEGORY_LABELS[c]}</option>`).join('')}
          </select></label>
          <label>School stage<select name="stage">
            ${[['all', 'All classes'], ['nursery', 'Nursery only'], ['primary', 'Primary only']].map(([v, l]) => `<option value="${v}"${t.stage === v ? ' selected' : ''}>${l}</option>`).join('')}
          </select></label>
          ${manageRole === 'head_teacher' ? `<label>Tone<select name="tone">
            ${['positive', 'neutral', 'support'].map(v => `<option value="${v}"${t.tone === v ? ' selected' : ''}>${TONE_LABELS[v]}</option>`).join('')}
          </select></label>` : `<label>Topic (stops contradictions)<input name="topic" value="${esc(t.topic || '')}" placeholder="e.g. focus, confidence"></label>`}
          <label class="wide">Comment text
            <textarea name="body" maxlength="1000">${esc(t.body)}</textarea>
            <span style="font-weight:400;color:#6b7280">Use {pupil_name}, {he_she}, {He_She}, {his_her}, {His_Her}, {him_her} — filled in for each pupil.</span>
          </label>
          <div class="wide cl-actions">
            <button type="button" class="cl-btn" data-act="cancel-edit">Cancel</button>
            <button type="button" class="cl-btn primary" data-act="save-edit">Save template</button>
          </div>
        </div>`;

      body.innerHTML = `
        <div class="cl-tools">
          <select class="cl-manage-role">
            <option value="form_teacher"${manageRole === 'form_teacher' ? ' selected' : ''}>Form Teacher templates</option>
            <option value="head_teacher"${manageRole === 'head_teacher' ? ' selected' : ''}>Head Teacher templates</option>
          </select>
          <button type="button" class="cl-btn primary" data-act="new">+ Add template</button>
          <span style="font-size:.74rem;color:#6b7280">Switching a template off hides it from teachers. Reports already written keep their text.</span>
        </div>
        ${editing === 'new' ? formHtml({ title: '', body: '', category: manageRole === 'head_teacher' ? 'overall' : 'positive', stage: 'all', tone: 'neutral', topic: '' }) : ''}
        ${list.map(t => editing === t.id ? formHtml(t) : `
          <div class="cl-row${t.is_active ? '' : ' off'}">
            <div>
              <strong>${esc(t.title)}</strong>
              <span class="cl-tag ${manageRole === 'head_teacher' ? t.tone : t.category}">${manageRole === 'head_teacher' ? TONE_LABELS[t.tone] : CATEGORY_LABELS[t.category]}</span>
              ${t.stage !== 'all' ? `<span class="cl-tag">${t.stage}</span>` : ''}
              ${t.is_active ? '' : '<span class="cl-tag">Off</span>'}
              <div style="margin-top:3px">${esc(t.body)}</div>
            </div>
            <div class="cl-row-actions">
              <button type="button" class="cl-btn" data-act="edit" data-id="${t.id}">Edit</button>
              <button type="button" class="cl-btn" data-act="toggle" data-id="${t.id}">${t.is_active ? 'Switch off' : 'Switch on'}</button>
            </div>
          </div>`).join('')}`;

      body.querySelector('.cl-manage-role').addEventListener('change', e => { manageRole = e.target.value; renderManage(); });
      body.querySelector('[data-act="new"]').addEventListener('click', () => renderManage('new'));
      body.querySelectorAll('[data-act="edit"]').forEach(b => b.addEventListener('click', () => renderManage(Number(b.dataset.id))));
      body.querySelectorAll('[data-act="toggle"]').forEach(b => b.addEventListener('click', async () => {
        const t = list.find(x => String(x.id) === b.dataset.id);
        b.disabled = true;
        try {
          await window.RCA_API.call(`/comment-templates/${t.id}`, { method: 'PUT', body: { is_active: !t.is_active } });
        } catch (e) { alert('Could not update: ' + e.message); b.disabled = false; return; }
        clearCache(); renderManage();
      }));
      const form = body.querySelector('.cl-form');
      if (form) {
        form.querySelector('[data-act="cancel-edit"]').addEventListener('click', () => renderManage());
        form.querySelector('[data-act="save-edit"]').addEventListener('click', async e => {
          const val = n => form.querySelector(`[name="${n}"]`)?.value;
          const payload = { title: val('title').trim(), body: val('body').trim(), category: val('category'), stage: val('stage') };
          if (manageRole === 'head_teacher') payload.tone = val('tone');
          else { payload.topic = val('topic'); payload.tone = payload.category === 'positive' ? 'positive' : 'support'; }
          e.target.disabled = true;
          try {
            if (form.dataset.id) await window.RCA_API.call(`/comment-templates/${form.dataset.id}`, { method: 'PUT', body: payload });
            else await window.RCA_API.call('/comment-templates', { method: 'POST', body: payload });
          } catch (err) { alert('Could not save: ' + err.message); e.target.disabled = false; return; }
          clearCache(); renderManage();
        });
      }
    }

    loadChoose();
  }

  window.RCA_COMMENTS = { open, personalise };
})();
