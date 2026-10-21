/* ============================================
   PROMOTION — promotion.js
   ============================================
   End-of-year promotion on the school's real records.

   Pupils come from RCA_API.getStudents(); each pupil's year average from
   GET /students/year-averages (the mean of their term averages this
   session). Every pupil gets a SUGGESTED decision from the pass mark;
   staff can change any of them. Decisions:
     promote:<class>  move up (for a level with arms, e.g. Basic 3A/3B,
                      pick the arm; the A arm is suggested)
     repeat           stay in the same class
     graduate         final class only — leaves as graduated
     skip             no change for this pupil now

   "Apply" sends one class per request to POST /students/bulk-promote,
   all sharing one batch id, so "Undo last promotion" (POST
   /students/undo-promotion) can put every pupil back.
*/

document.addEventListener('DOMContentLoaded', async () => {

  const PASS_MARK  = window.PROMOTION_PASS_THRESHOLD || 40;
  const LAST_BATCH = 'rca_last_promotion_batch';   // only the batch id, nothing personal
  const allClasses = window.SCHOOL_CLASSES || [];
  const levelOf    = window.classLevel || (c => c);
  const ALL        = '__all__';

  let pupils   = [];   // current pupils
  let averages = {};   // admission_no -> { average, terms }
  const overrides = {}; // admission_no -> decision chosen by staff

  /* ---------- ELEMENTS ---------- */
  const classSelect     = document.getElementById('sourceClassSelect');
  const arrowText       = document.getElementById('promotionArrowText');
  const sessionPill     = document.getElementById('sessionPill');
  const summary         = document.getElementById('promotionSummary');
  const searchInput     = document.getElementById('promotionSearch');
  const resetBtn        = document.getElementById('applyThresholdBtn');
  const tableBody       = document.getElementById('promotionTableBody');
  const noResults       = document.getElementById('noPromotionResults');
  const statusText      = document.getElementById('confirmBarStatus');
  const applyBtn        = document.getElementById('applyPromotionsBtn');
  const undoBtn         = document.getElementById('undoPromotionBtn');
  const modal           = document.getElementById('confirmModalOverlay');
  const modalBody       = document.getElementById('confirmModalBody');
  const modalConfirmBtn = document.getElementById('confirmApplyBtn');
  document.getElementById('passMarkText').textContent = PASS_MARK + '%';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const initials = n => String(n || '').split(' ').map(p => p.charAt(0)).join('').substring(0, 2).toUpperCase();

  /* ---------- RULES ---------- */
  // Every class of the level pupils move into: Basic 2 -> [Basic 3A, Basic 3B].
  function nextOptions(className) {
    const next = window.nextSchoolClass(className);
    if (!next) return [];
    const level = levelOf(next);
    const arms = allClasses.filter(c => c !== level && levelOf(c) === level);
    return arms.length ? arms : [next];
  }
  const isFinalClass = className => !window.nextSchoolClass(className) && allClasses.includes(className);

  function suggested(p) {
    const avg = (averages[p.admission_no] || {}).average;
    if (avg != null && avg < PASS_MARK) return 'repeat';
    if (isFinalClass(p.class_name)) return 'graduate';
    const opts = nextOptions(p.class_name);
    return opts.length ? 'promote:' + opts[0] : 'skip';
  }
  const decisionOf = p => overrides[p.admission_no] || suggested(p);

  function label(decision, p) {
    if (decision.startsWith('promote:')) return 'Promote → ' + decision.slice(8);
    if (decision === 'repeat')   return 'Repeat ' + p.class_name;
    if (decision === 'graduate') return 'Graduate';
    return 'No change';
  }
  const kind = d => d.startsWith('promote:') ? 'promote' : d;

  /* ---------- LOAD ---------- */
  async function load() {
    applyBtn.disabled = true;
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#6b7280">Loading pupils and results…</td></tr>';
    const [list, avg] = await Promise.all([
      window.RCA_API.getStudents(),
      window.RCA_API.call('/students/year-averages').catch(e => ({ error: e.message }))
    ]);
    pupils = (list || []).filter(p => !p.status || p.status === 'active');
    if (avg.error) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:#b91c1c">Could not load the year's results (${esc(avg.error)}). Please refresh before promoting.</td></tr>`;
      return false;
    }
    averages = {};
    (avg.averages || []).forEach(a => { averages[a.admission_no] = a; });
    sessionPill.textContent = (avg.session || '') + ' Session';
    applyBtn.disabled = false;
    return true;
  }

  function populateClasses() {
    const withPupils = allClasses.filter(c => pupils.some(p => p.class_name === c));
    classSelect.innerHTML = `<option value="${ALL}">All classes (whole school)</option>` +
      withPupils.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  }

  function shownPupils() {
    const cls = classSelect.value;
    const term = searchInput.value.trim().toLowerCase();
    return pupils
      .filter(p => cls === ALL || p.class_name === cls)
      .filter(p => !term || p.full_name.toLowerCase().includes(term) || p.admission_no.toLowerCase().includes(term))
      .sort((a, b) => allClasses.indexOf(b.class_name) - allClasses.indexOf(a.class_name) || a.full_name.localeCompare(b.full_name));
  }

  /* ---------- RENDER ---------- */
  function render() {
    const cls = classSelect.value;
    if (cls === ALL) arrowText.textContent = 'Every class moves up one level; Basic 6 graduates.';
    else if (isFinalClass(cls)) arrowText.textContent = '→ final year — passing pupils graduate';
    else arrowText.textContent = '→ promotes into ' + (nextOptions(cls).join(' or ') || '—');

    const list = shownPupils();
    noResults.style.display = list.length ? 'none' : 'block';
    tableBody.innerHTML = list.map(p => {
      const a = averages[p.admission_no] || {};
      const sug = suggested(p);
      const dec = decisionOf(p);
      const options = [
        ...nextOptions(p.class_name).map(c => 'promote:' + c),
        'repeat',
        ...(isFinalClass(p.class_name) ? ['graduate'] : []),
        'skip'
      ];
      const terms = Object.entries(a.terms || {}).map(([t, v]) => t.replace('term', 'T') + ' ' + v + '%').join(' · ');
      return `
        <tr>
          <td class="col-avatar"><div class="row-avatar">${initials(p.full_name)}</div></td>
          <td>${esc(p.full_name)}<div style="font-size:0.75rem;color:#6b7280">${esc(p.class_name)} · ${esc(p.admission_no)}</div></td>
          <td>${a.average == null
            ? '<span style="color:#9ca3af">No results yet</span>'
            : `<span class="score-value ${a.average >= PASS_MARK ? 'above-threshold' : 'below-threshold'}">${a.average}%</span><div style="font-size:0.72rem;color:#6b7280">${terms}</div>`}</td>
          <td><span class="decision-badge ${kind(sug)}">${esc(label(sug, p))}</span></td>
          <td>
            <select class="form-control decision-select ${dec !== sug ? 'overridden' : ''}" data-admission="${esc(p.admission_no)}">
              ${options.map(o => `<option value="${esc(o)}" ${o === dec ? 'selected' : ''}>${esc(label(o, p))}</option>`).join('')}
            </select>
          </td>
        </tr>`;
    }).join('');

    tableBody.querySelectorAll('.decision-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const p = pupils.find(x => x.admission_no === sel.dataset.admission);
        if (sel.value === suggested(p)) delete overrides[p.admission_no];
        else overrides[p.admission_no] = sel.value;
        sel.classList.toggle('overridden', sel.value !== suggested(p));
        renderSummary();
      });
    });
    renderSummary();
  }

  function counts(list) {
    const c = { promote: 0, repeat: 0, graduate: 0, skip: 0 };
    list.forEach(p => { c[kind(decisionOf(p))]++; });
    return c;
  }

  function renderSummary() {
    const cls = classSelect.value;
    const c = counts(pupils.filter(p => cls === ALL || p.class_name === cls));
    summary.innerHTML = `
      <div class="card summary-card-promo promote"><span class="num">${c.promote}</span><span class="label">Promote</span></div>
      <div class="card summary-card-promo repeat"><span class="num">${c.repeat}</span><span class="label">Repeat</span></div>
      <div class="card summary-card-promo graduate"><span class="num">${c.graduate}</span><span class="label">Graduate</span></div>
      <div class="card summary-card-promo"><span class="num">${c.skip}</span><span class="label">No change</span></div>`;
  }

  /* ---------- APPLY ---------- */
  function pendingDecisions() {
    const cls = classSelect.value;
    return pupils
      .filter(p => cls === ALL || p.class_name === cls)
      .map(p => ({ p, d: decisionOf(p) }))
      .filter(x => x.d !== 'skip');
  }

  applyBtn.addEventListener('click', () => {
    const items = pendingDecisions();
    if (!items.length) { alert('Nothing to apply — every pupil is set to "No change".'); return; }
    const c = counts(items.map(x => x.p));
    const where = classSelect.value === ALL ? 'the <strong>whole school</strong>' : '<strong>' + esc(classSelect.value) + '</strong>';
    modalBody.innerHTML = `
      <p>You're about to apply the end-of-year promotion for ${where}:</p>
      <ul>
        <li><strong>${c.promote}</strong> pupils move up to their new class</li>
        <li><strong>${c.repeat}</strong> pupils repeat their class</li>
        <li><strong>${c.graduate}</strong> pupils graduate (kept in the register as graduated)</li>
      </ul>
      <p style="margin-top:12px">Every move is written into each pupil's class history.
      If something is wrong, use <strong>Undo last promotion</strong> straight after.</p>`;
    modal.classList.add('open');
  });

  const closeModal = () => modal.classList.remove('open');
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('cancelApplyBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  modalConfirmBtn.addEventListener('click', async () => {
    const items = pendingDecisions();
    const batchId = 'P' + Date.now().toString(36).toUpperCase();
    // One request per class keeps each one short on the slow server.
    const byClass = {};
    items.forEach(({ p, d }) => {
      (byClass[p.class_name] = byClass[p.class_name] || []).push({
        admission_no: p.admission_no,
        decision: kind(d),
        class_name: d.startsWith('promote:') ? d.slice(8) : p.class_name
      });
    });

    closeModal();
    applyBtn.disabled = true;
    const classes = Object.keys(byClass);
    let done = 0;
    const failed = [];
    try { localStorage.setItem(LAST_BATCH, batchId); } catch (e) {}
    for (let i = 0; i < classes.length; i++) {
      statusText.textContent = `Saving… ${classes[i]} (${i + 1} of ${classes.length})`;
      try {
        const r = await window.RCA_API.call('/students/bulk-promote', {
          method: 'POST', body: { batch_id: batchId, decisions: byClass[classes[i]] }
        });
        done += r.done || 0;
        (r.failed || []).forEach(f => failed.push(`${f.admission_no}: ${f.error}`));
      } catch (e) {
        failed.push(`${classes[i]}: ${e.message} (whole class not saved)`);
      }
    }

    Object.keys(overrides).forEach(k => delete overrides[k]);
    await load();
    populateClasses();
    render();
    showUndo();
    statusText.textContent = `Done: ${done} pupil${done === 1 ? '' : 's'} updated.` + (failed.length ? ` ${failed.length} not saved.` : '');
    statusText.classList.add('applied');
    if (failed.length) {
      alert('Some pupils were NOT updated:\n\n' + failed.slice(0, 15).join('\n') +
        (failed.length > 15 ? `\n…and ${failed.length - 15} more` : '') + '\n\nYou can apply again for the rest.');
    }
  });

  /* ---------- UNDO ---------- */
  function showUndo() {
    let id = null;
    try { id = localStorage.getItem(LAST_BATCH); } catch (e) {}
    undoBtn.style.display = id ? '' : 'none';
  }

  undoBtn.addEventListener('click', async () => {
    let id = null;
    try { id = localStorage.getItem(LAST_BATCH); } catch (e) {}
    if (!id) return;
    if (!confirm('Undo the last promotion? Every pupil it moved goes back to their old class, and graduated pupils become current pupils again.')) return;
    undoBtn.disabled = true;
    statusText.textContent = 'Undoing…';
    try {
      const r = await window.RCA_API.call('/students/undo-promotion', { method: 'POST', body: { batch_id: id } });
      try { localStorage.removeItem(LAST_BATCH); } catch (e) {}
      await load();
      populateClasses();
      render();
      showUndo();
      statusText.textContent = `Undone: ${r.undone} pupil${r.undone === 1 ? '' : 's'} put back.`;
      if (r.failed && r.failed.length) alert('Not put back:\n\n' + r.failed.map(f => f.error).join('\n'));
    } catch (e) {
      statusText.textContent = 'Undo failed.';
      alert('Could not undo: ' + e.message);
    } finally {
      undoBtn.disabled = false;
    }
  });

  /* ---------- EVENTS + START ---------- */
  classSelect.addEventListener('change', () => { searchInput.value = ''; render(); });
  searchInput.addEventListener('input', render);
  resetBtn.addEventListener('click', () => {
    const cls = classSelect.value;
    pupils.filter(p => cls === ALL || p.class_name === cls).forEach(p => { delete overrides[p.admission_no]; });
    render();
  });

  if (await load()) {
    populateClasses();
    render();
  }
  showUndo();
});
