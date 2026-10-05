/* ============================================
   CONTACT MESSAGES — contact-messages.js
   Royal Crystal Academy
   ============================================
   Reviews messages submitted through the public Contact page
   (POST /api/contact, no auth needed there).
*/

document.addEventListener('DOMContentLoaded', async () => {

  const STATUS_COLORS = {
    unread:  { bg: '#fef3c7', color: '#92400e', label: 'Unread' },
    read:    { bg: '#eff6ff', color: '#1d4ed8', label: 'Read' },
    replied: { bg: '#d1fae5', color: '#065f46', label: 'Replied' }
  };
  const SUBJECT_LABELS = {
    admissions: 'Admissions Inquiry', fees: 'Fee Information',
    ict: 'ICT Department', complaint: 'Complaint / Feedback', general: 'General Inquiry',
    // Parent correction requests from the Parent Portal (POST /contact/parent)
    'parent:name': 'Correction — Name / Spelling', 'parent:result': 'Correction — Result / Score',
    'parent:fees': 'Correction — Fees / Payment', 'parent:details': 'Correction — Personal Details',
    'parent:other': 'Correction — Other'
  };
  const isParentMsg = m => (m.subject || '').startsWith('parent:');
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  let messages = [];
  let filterStatus = '';
  let filterSource = '';   // '' | 'parent' | 'public'

  async function loadAll() {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterSource) params.set('source', filterSource);
    const data = await window.RCA_API.call('/contact' + (params.toString() ? '?' + params.toString() : ''));
    messages = data.messages || [];
    updateBadge(data.unread_count || 0);
  }

  function updateBadge(count) {
    const badge = document.getElementById('contactBadge');
    if (!badge) return;
    if (count > 0) { badge.textContent = count; badge.style.display = ''; }
    else badge.style.display = 'none';
  }

  function messageCardHtml(m) {
    const sc = STATUS_COLORS[m.status] || STATUS_COLORS.unread;
    const sent = new Date(m.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const subjectLabel = SUBJECT_LABELS[m.subject] || m.subject || 'General';

    return `
      <div style="border:1px solid #eef0f3;border-radius:12px;padding:16px 18px;margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">
          <div>
            <div style="font-weight:700;font-size:0.92rem;color:#111827">${escapeHtml(m.name)}${isParentMsg(m) ? ' <span style="background:#f5e6e8;color:#6b0f1a;padding:2px 8px;border-radius:20px;font-size:0.65rem;font-weight:700;vertical-align:middle">PARENT</span>' : ''}</div>
            <div style="font-size:0.75rem;color:#6b7280">${subjectLabel} · ${sent}</div>
          </div>
          <span style="background:${sc.bg};color:${sc.color};padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;white-space:nowrap">${sc.label}</span>
        </div>

        <div style="font-size:0.8rem;color:#374151;margin-bottom:10px">
          <a href="mailto:${m.email}" style="color:var(--color-primary,#6b0f1a)">${m.email}</a>${m.phone ? ` · ${m.phone}` : ''}
        </div>
        <div style="font-size:0.83rem;color:#374151;background:#f9fafb;border-radius:8px;padding:10px 12px;margin-bottom:12px;line-height:1.6;white-space:pre-line">${escapeHtml(m.message)}</div>

        ${m.admin_reply ? `
        <div style="font-size:0.83rem;color:#065f46;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;margin-bottom:12px;line-height:1.6;white-space:pre-line"><strong>Your reply:</strong> ${escapeHtml(m.admin_reply)}</div>` : ''}

        ${isParentMsg(m) ? `
        <div style="margin-bottom:12px">
          <textarea id="reply-${m.id}" rows="2" placeholder="${m.admin_reply ? 'Update your reply…' : 'Write a reply the parent will see, e.g. “Corrected — the surname now reads Okafor.”'}" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:0.82rem;font-family:inherit"></textarea>
          <button class="btn btn-sm btn-primary" style="font-size:0.72rem;margin-top:6px" onclick="window._msgReply(${m.id})">&#9993; Send Reply &amp; Resolve</button>
        </div>` : ''}

        <div style="display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid #f3f4f6;padding-top:12px">
          ${m.status === 'unread' ? `<button class="btn btn-sm btn-outline" style="font-size:0.72rem" onclick="window._msgUpdate(${m.id},'read')">Mark Read</button>` : ''}
          ${m.status !== 'replied' ? `<button class="btn btn-sm btn-primary" style="font-size:0.72rem" onclick="window._msgUpdate(${m.id},'replied')">${isParentMsg(m) ? 'Mark Resolved (notifies parent)' : 'Mark Replied'}</button>` : ''}
          <button class="btn btn-sm btn-outline" style="font-size:0.72rem;color:#dc2626;margin-left:auto" onclick="window._msgDelete(${m.id},'${m.name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </div>`;
  }

  function render() {
    const unreadCount  = messages.filter(m => m.status === 'unread').length;
    const readCount    = messages.filter(m => m.status === 'read').length;
    const repliedCount = messages.filter(m => m.status === 'replied').length;

    const main = document.getElementById('contactMain');
    main.innerHTML = `
      <div style="overflow-x:auto;margin-bottom:20px;-webkit-overflow-scrolling:touch">
        <div style="display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:14px;min-width:600px">
          ${[
            { num: messages.length, label: 'Total Messages', color: '#1d4ed8', icon: '✉️' },
            { num: unreadCount, label: 'Unread', color: '#d97706', icon: '📩' },
            { num: readCount, label: 'Read', color: '#2563eb', icon: '👁' },
            { num: repliedCount, label: 'Replied', color: '#059669', icon: '✅' }
          ].map(s => `
            <div style="background:#fff;border-radius:12px;padding:16px 18px;box-shadow:0 1px 4px rgba(0,0,0,0.07);border-left:4px solid ${s.color}">
              <div style="font-size:1.3rem;margin-bottom:6px">${s.icon}</div>
              <div style="font-family:var(--font-heading);font-size:1.6rem;font-weight:700;color:#111827">${s.num}</div>
              <div style="font-size:0.75rem;color:#6b7280">${s.label}</div>
            </div>`).join('')}
        </div>
      </div>

      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);padding:18px 20px">
        <div style="font-family:var(--font-heading);font-weight:700;font-size:0.95rem;color:#111827;margin-bottom:12px">Messages</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px" id="msgFilterTabs">
          ${['', 'unread', 'read', 'replied'].map(s => `
            <button data-status="${s}" class="btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline'}" style="font-size:0.72rem">
              ${s === '' ? 'All' : STATUS_COLORS[s].label}
            </button>`).join('')}
          <span style="width:1px;background:#e5e7eb;margin:0 4px"></span>
          ${[['', 'All Sources'], ['parent', 'From Parents'], ['public', 'Website Form']].map(([v, label]) => `
            <button data-source="${v}" class="btn btn-sm ${filterSource === v ? 'btn-primary' : 'btn-outline'}" style="font-size:0.72rem">${label}</button>`).join('')}
        </div>

        <div>
          ${messages.length
            ? messages.map(messageCardHtml).join('')
            : '<p style="text-align:center;color:#9ca3af;padding:24px;font-size:0.85rem">No messages yet.</p>'}
        </div>
      </div>
    `;

    document.querySelectorAll('#msgFilterTabs [data-source]').forEach(btn => {
      btn.addEventListener('click', async () => {
        filterSource = btn.dataset.source;
        await loadAll();
        render();
      });
    });

    document.querySelectorAll('#msgFilterTabs [data-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        filterStatus = btn.dataset.status;
        await loadAll();
        render();
      });
    });
  }

  window._msgUpdate = async function(id, status) {
    try {
      await window.RCA_API.call(`/contact/${id}`, { method: 'PATCH', body: { status } });
    } catch (e) {
      alert('Could not update message: ' + e.message);
      return;
    }
    await loadAll();
    render();
  };

  // Parent correction requests only: saves a written reply the parent
  // sees under their request, marks it resolved and notifies them.
  window._msgReply = async function(id) {
    const reply = (document.getElementById(`reply-${id}`)?.value || '').trim();
    if (!reply) { alert('Please write a reply first.'); return; }
    try {
      await window.RCA_API.call(`/contact/${id}`, { method: 'PATCH', body: { admin_reply: reply } });
    } catch (e) {
      alert('Could not send reply: ' + e.message);
      return;
    }
    await loadAll();
    render();
  };

  window._msgDelete = async function(id, name) {
    if (!confirm(`Delete the message from ${name}? This cannot be undone.`)) return;
    try {
      await window.RCA_API.call(`/contact/${id}`, { method: 'DELETE' });
    } catch (e) {
      alert('Could not delete message: ' + e.message);
      return;
    }
    await loadAll();
    render();
  };

  try {
    await loadAll();
  } catch (e) {
    console.warn('Could not load contact messages:', e.message);
  }
  render();
});
