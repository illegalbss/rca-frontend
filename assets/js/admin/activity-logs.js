/* ============================================
   ACTIVITY LOGS — activity-logs.js
   Royal Crystal Academy
   ============================================
   Renders the activity log table. The logActivity()
   function lives in localstorage.js so it is available
   on every admin page. Entries accumulate in
   window.ACTIVITY_LOG and persist in localStorage.
*/

document.addEventListener('DOMContentLoaded', () => {

  /* Access restricted to ICT Admin only */
  const user = window.CURRENT_USER;
  const role = user ? (user.primary_role || user.role) : sessionStorage.getItem('rca_demo_role');
  if (!['ict_admin', 'proprietor'].includes(role)) {
    document.querySelector('.admin-main').innerHTML = `
      <div style="text-align:center;padding:80px 24px;color:#6b7280">
        <div style="font-size:3rem;margin-bottom:16px">🔒</div>
        <h3 style="color:#374151;margin-bottom:8px">Access Restricted</h3>
        <p>Activity logs are visible to ICT Administrators only.</p>
      </div>`;
    return;
  }

  const searchEl     = document.getElementById('logSearch');
  const categoryEl   = document.getElementById('logCategory');
  const roleFilterEl = document.getElementById('logRoleFilter');
  const tableBody    = document.getElementById('logTableBody');
  const totalPill    = document.getElementById('logTotal');
  const statsEl      = document.getElementById('logStats');

  const ACTION_BADGES = {
    login:       { cls:'log-login',    label:'Login'     },
    create:      { cls:'log-create',   label:'Created'   },
    update:      { cls:'log-update',   label:'Updated'   },
    approve:     { cls:'log-approve',  label:'Approved'  },
    publish:     { cls:'log-publish',  label:'Published' },
    delete:      { cls:'log-delete',   label:'Deleted'   },
    payment:     { cls:'log-payment',  label:'Payment'   },
    system:      { cls:'log-system',   label:'System'    },
    discipline:  { cls:'log-delete',   label:'Discipline'},
    announcements:{ cls:'log-publish', label:'Announce'  },
  };

  const ROLE_LABELS = {
    ict_admin:       'ICT Administrator',
    head_teacher:    'Head Teacher',
    class_teacher:   'Form Teacher',
    subject_teacher: 'Subject Teacher',
    accountant:      'Accountant',
    parent:          'Parent',
  };

  function getFiltered() {
    const search   = searchEl?.value.trim().toLowerCase() || '';
    const category = categoryEl?.value || 'all';
    const role     = roleFilterEl?.value || 'all';

    return (window.ACTIVITY_LOG || []).filter(log => {
      if (category !== 'all' && log.category !== category) return false;
      if (role     !== 'all' && log.role     !== role)     return false;
      if (search) {
        const hay = `${log.user} ${log.target} ${log.action} ${log.category}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }

  function renderStats() {
    const logs     = window.ACTIVITY_LOG || [];
    const logins   = logs.filter(l => l.category === 'login').length;
    const scores   = logs.filter(l => l.category === 'scores').length;
    const pays     = logs.filter(l => l.category === 'payments').length;
    const today    = new Date().toISOString().split('T')[0];
    const todayCount = logs.filter(l => (l.timestamp || '').startsWith(today)).length;

    statsEl.innerHTML = `
      <div class="comm-stat"><span class="comm-stat-num">${logs.length}</span><div class="comm-stat-label">Total Events</div></div>
      <div class="comm-stat s-green"><span class="comm-stat-num">${logins}</span><div class="comm-stat-label">Login Events</div></div>
      <div class="comm-stat s-orange"><span class="comm-stat-num">${scores}</span><div class="comm-stat-label">Score Submissions</div></div>
      <div class="comm-stat s-red"><span class="comm-stat-num">${todayCount}</span><div class="comm-stat-label">Events Today</div></div>
    `;
  }

  function render() {
    const logs = getFiltered();
    totalPill.textContent = `${logs.length} event${logs.length !== 1 ? 's' : ''}`;

    if (logs.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:48px 24px">
          <div style="font-size:2rem;margin-bottom:10px">📋</div>
          <div style="font-size:0.85rem">No activity yet. Events appear here as staff log in and perform actions.</div>
        </td></tr>`;
      return;
    }

    tableBody.innerHTML = logs.map(log => {
      const badge   = ACTION_BADGES[log.action] || { cls:'log-system', label: log.action };
      const roleLabel = ROLE_LABELS[log.role] || log.role || '—';
      const ts      = log.timestamp ? new Date(log.timestamp) : new Date();
      const timeStr = ts.toLocaleString('en-NG', {
        day:'numeric', month:'short', year:'numeric',
        hour:'2-digit', minute:'2-digit'
      });
      const initials = (log.user || 'SY').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();

      return `<tr>
        <td style="white-space:nowrap;color:#6b7280;font-size:0.72rem">${timeStr}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1d4ed8,#6366f1);color:#fff;font-size:0.62rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${initials}</div>
            <div>
              <div style="font-size:0.8rem;font-weight:600;color:#111827">${log.user || 'System'}</div>
              <div style="font-size:0.7rem;color:#9ca3af">${roleLabel}</div>
            </div>
          </div>
        </td>
        <td><span class="log-action-badge ${badge.cls}">${badge.label}</span></td>
        <td style="font-size:0.78rem;color:#374151;max-width:320px">${log.target || '—'}</td>
        <td style="font-size:0.72rem;color:#9ca3af">${log.category || '—'}</td>
      </tr>`;
    }).join('');
  }

  searchEl?.addEventListener('input', render);
  categoryEl?.addEventListener('change', render);
  roleFilterEl?.addEventListener('change', render);

  /* Clear log button */
  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn btn-outline';
  clearBtn.style.cssText = 'font-size:0.82rem;white-space:nowrap;color:#dc2626;border-color:#fca5a5';
  clearBtn.textContent = '🗑 Clear Log';
  clearBtn.addEventListener('click', () => {
    if (!confirm('Clear all activity log entries? This cannot be undone.')) return;
    window.ACTIVITY_LOG = [];
    try { localStorage.removeItem('rca_v1_activity_log'); } catch(e) {}
    renderStats();
    render();
  });
  document.querySelector('.comm-toolbar')?.appendChild(clearBtn);

  /* Auto-refresh every 30 seconds to pick up new entries */
  setInterval(() => { renderStats(); render(); }, 30000);

  renderStats();
  render();
});
