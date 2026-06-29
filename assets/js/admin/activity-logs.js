/* ============================================
   ACTIVITY LOGS — activity-logs.js
   Royal Crystal Academy
   ============================================
   Tracks and displays all system activities.
   Seeds realistic historical log entries.
   Any admin action (login, payment, score entry,
   account creation, approval) pushes to
   window.ACTIVITY_LOG for display here.
*/

/* ---- Initialize log store ---- */
if (!window.ACTIVITY_LOG) window.ACTIVITY_LOG = [];

/* Phase 4: Real activity logs come from the database via API.
   No fake seed entries. The log starts empty and fills with
   real actions as staff use the system. */

/* ---- Log helper (called from other pages) ---- */
window.logActivity = function(action, target, category) {
  const user = window.CURRENT_USER;
  if (window.RCA) window.RCA.save('activity_log');
  window.ACTIVITY_LOG.unshift({
    user:      user ? user.full_name : 'Unknown',
    role:      user ? (user.primary_role || user.role) : 'unknown',
    action:    action,
    category:  category || 'general',
    target:    target || '',
    timestamp: new Date().toISOString()
  });
};

/* ---- Auto-log current login ---- */
(function autoLog() {
  const user = window.CURRENT_USER;
  if (user && window.ACTIVITY_LOG.filter(l => l.user === user.full_name && l.action === 'login').length === 0) {
    window.logActivity('login', 'Admin portal', 'login');
  }
})();

document.addEventListener('DOMContentLoaded', () => {

  const searchEl     = document.getElementById('logSearch');
  const categoryEl   = document.getElementById('logCategory');
  const roleFilterEl = document.getElementById('logRoleFilter');
  const tableBody    = document.getElementById('logTableBody');
  const totalPill    = document.getElementById('logTotal');
  const statsEl      = document.getElementById('logStats');

  const ACTION_BADGES = {
    login:   { cls:'log-login',   label:'Login' },
    create:  { cls:'log-create',  label:'Created' },
    update:  { cls:'log-update',  label:'Updated' },
    approve: { cls:'log-approve', label:'Approved' },
    publish: { cls:'log-publish', label:'Published' },
    delete:  { cls:'log-delete',  label:'Deleted' },
    payment: { cls:'log-payment', label:'Payment' },
    system:  { cls:'log-system',  label:'System' }
  };

  const ROLE_LABELS = window.RBAC_ROLE_LABELS || {};

  function getFiltered() {
    const search   = searchEl?.value.trim().toLowerCase() || '';
    const category = categoryEl?.value || 'all';
    const role     = roleFilterEl?.value || 'all';

    return window.ACTIVITY_LOG.filter(log => {
      if (category !== 'all' && log.category !== category) return false;
      if (role     !== 'all' && log.role     !== role)     return false;
      if (search && !log.user.toLowerCase().includes(search) &&
          !log.target.toLowerCase().includes(search) &&
          !log.action.toLowerCase().includes(search)) return false;
      return true;
    });
  }

  function renderStats() {
    const logs   = window.ACTIVITY_LOG;
    const logins = logs.filter(l => l.category === 'login').length;
    const scores = logs.filter(l => l.category === 'scores').length;
    const pays   = logs.filter(l => l.category === 'payments').length;
    const today  = new Date().toISOString().split('T')[0];
    const todayCount = logs.filter(l => l.timestamp.startsWith(today)).length;

    statsEl.innerHTML = `
      <div class="comm-stat"><span class="comm-stat-num">${logs.length}</span><div class="comm-stat-label">Total Events</div></div>
      <div class="comm-stat s-green"><span class="comm-stat-num">${logins}</span><div class="comm-stat-label">Login Events</div></div>
      <div class="comm-stat s-orange"><span class="comm-stat-num">${scores}</span><div class="comm-stat-label">Score Entries</div></div>
      <div class="comm-stat s-red"><span class="comm-stat-num">${todayCount}</span><div class="comm-stat-label">Events Today</div></div>
    `;
  }

  function render() {
    const logs = getFiltered();
    totalPill.textContent = `${logs.length} event${logs.length !== 1 ? 's' : ''}`;

    if (logs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:40px">No activity logs match your filter.</td></tr>`;
      return;
    }

    tableBody.innerHTML = logs.map(log => {
      const badge  = ACTION_BADGES[log.action] || { cls:'log-system', label: log.action };
      const role   = ROLE_LABELS[log.role] || log.role;
      const ts     = new Date(log.timestamp);
      const timeStr = ts.toLocaleString('en-NG', {
        day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
      });
      const initials = log.user.split(' ').map(p=>p[0]).join('').substring(0,2).toUpperCase();

      return `<tr>
        <td style="white-space:nowrap;color:#6b7280;font-size:0.72rem">${timeStr}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1d4ed8,#6366f1);color:#fff;font-size:0.62rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${initials}</div>
            <div>
              <div style="font-size:0.8rem;font-weight:600;color:#111827">${log.user}</div>
              <div style="font-size:0.7rem;color:#9ca3af">${role}</div>
            </div>
          </div>
        </td>
        <td><span class="log-action-badge ${badge.cls}">${badge.label}</span></td>
        <td style="font-size:0.78rem;color:#374151">${log.target}</td>
        <td style="font-size:0.72rem;color:#9ca3af">${log.category || '—'}</td>
      </tr>`;
    }).join('');
  }

  searchEl?.addEventListener('input', render);
  categoryEl?.addEventListener('change', render);
  roleFilterEl?.addEventListener('change', render);

  // Auto-refresh every 30 seconds
  setInterval(() => { renderStats(); render(); }, 30000);

  renderStats();
  render();
});
