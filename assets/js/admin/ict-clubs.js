/* ============================================
   ICT CLUBS — ict-clubs.js
   Royal Crystal Academy
   ============================================
   ICT Club management:
   - Club membership (Basic 3–6 pupils only)
   - Meeting records
   - Projects and awards

   All real (ict_club_members/meetings/projects/awards via
   /api/ict-clubs/*) — this used to be in-memory-only data that reset
   (via location.reload()) immediately after every "edit".
*/

document.addEventListener('DOMContentLoaded', async () => {

  const cu = window.CURRENT_USER;
  const canEdit = cu && (cu.roles || [cu.role]).some(r => ['ict_admin','head_teacher'].includes(r));

  const STATUS_COLORS = {
    completed: { bg:'#d1fae5', color:'#065f46' },
    ongoing:   { bg:'#dbeafe', color:'#1e40af' },
    upcoming:  { bg:'#fef3c7', color:'#92400e' }
  };

  let allStudents = [];
  let members     = [];
  let meetings     = [];
  let projects      = [];
  let awards        = [];

  async function loadAll() {
    const [students, mem, meet, proj, awd] = await Promise.all([
      window.RCA_API.getStudents(),
      window.RCA_API.call('/ict-clubs/members'),
      window.RCA_API.call('/ict-clubs/meetings'),
      window.RCA_API.call('/ict-clubs/projects'),
      window.RCA_API.call('/ict-clubs/awards')
    ]);
    allStudents = students || [];
    members     = mem.members || [];
    meetings     = meet.meetings || [];
    projects      = proj.projects || [];
    awards        = awd.awards || [];
  }

  function render() {
    const eligible   = allStudents.filter(s => ['Basic 3','Basic 4','Basic 5','Basic 6'].includes(s.class_name));
    const memberNos  = members.map(m => m.admission_no);
    const nonMembers = eligible.filter(s => !memberNos.includes(s.admission_no));

    const main = document.getElementById('clubsMain');
    main.innerHTML = `
      <!-- Stats — horizontally scrollable in its own lane on narrow
           screens, instead of overflowing the whole page -->
      <div style="overflow-x:auto;margin-bottom:20px;-webkit-overflow-scrolling:touch">
        <div style="display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:14px;min-width:600px">
          ${[
            { num:members.length, label:'Club Members', color:'#7c3aed', icon:'👥' },
            { num:meetings.length, label:'Meetings This Term', color:'#1d4ed8', icon:'📅' },
            { num:projects.filter(p=>p.status==='completed').length, label:'Completed Projects', color:'#16a34a', icon:'✅' },
            { num:awards.length, label:'Awards Given', color:'#f59e0b', icon:'🏆' }
          ].map(s => `
            <div style="background:#fff;border-radius:12px;padding:16px 18px;box-shadow:0 1px 4px rgba(0,0,0,0.07);border-left:4px solid ${s.color}">
              <div style="font-size:1.3rem;margin-bottom:6px">${s.icon}</div>
              <div style="font-family:var(--font-heading);font-size:1.6rem;font-weight:700;color:#111827">${s.num}</div>
              <div style="font-size:0.75rem;color:#6b7280">${s.label}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Two-column: members + meetings -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

        <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
          <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between">
            <span style="font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">👥 Club Members (${members.length})</span>
            ${canEdit ? `<button onclick="window._ictAddMember()" class="btn btn-primary btn-sm" style="font-size:0.72rem">+ Add Member</button>` : ''}
          </div>
          <div style="padding:14px 18px;max-height:340px;overflow-y:auto">
            ${members.length ? members.map(m => `
              <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f9fafb">
                <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#4c1d95,#7c3aed);color:#fff;font-size:0.62rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  ${(m.full_name || '?').split(' ').map(p=>p[0]).join('').substring(0,2)}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:0.8rem;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.full_name || m.admission_no}</div>
                  <div style="font-size:0.7rem;color:#9ca3af">${m.class_name || ''} · ${m.admission_no}</div>
                </div>
                ${canEdit ? `<button onclick="window._ictRemoveMember('${m.admission_no}')" style="font-size:0.7rem;color:#dc2626;background:none;border:none;cursor:pointer;padding:2px 6px">✕</button>` : ''}
              </div>`).join('') : '<p style="color:#9ca3af;font-size:0.82rem;text-align:center;padding:16px">No members yet.</p>'}
          </div>
        </div>

        <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
          <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between">
            <span style="font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">📅 Meeting Records</span>
            ${canEdit ? `<button onclick="window._ictAddMeeting()" class="btn btn-outline btn-sm" style="font-size:0.72rem">+ Log Meeting</button>` : ''}
          </div>
          <div style="max-height:340px;overflow-y:auto">
            ${meetings.length ? meetings.map(m => `
              <div style="padding:12px 18px;border-bottom:1px solid #f9fafb">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
                  <span style="font-weight:600;font-size:0.82rem;color:#111827">${m.topic}</span>
                  <span style="font-size:0.68rem;color:#9ca3af">${m.meeting_date}</span>
                </div>
                ${m.notes ? `<div style="font-size:0.75rem;color:#6b7280;margin-bottom:3px">${m.notes}</div>` : ''}
                <span style="background:#ede9fe;color:#5b21b6;padding:2px 7px;border-radius:999px;font-size:0.65rem;font-weight:700">Attendance: ${m.attendance}</span>
              </div>`).join('') : '<p style="color:#9ca3af;font-size:0.82rem;text-align:center;padding:16px">No meetings logged yet.</p>'}
          </div>
        </div>
      </div>

      <!-- Projects + Awards -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

        <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
          <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between">
            <span style="font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">🛠 Projects &amp; Activities</span>
            ${canEdit ? `<button onclick="window._ictAddProject()" class="btn btn-outline btn-sm" style="font-size:0.72rem">+ Add Project</button>` : ''}
          </div>
          <div style="padding:14px 18px;display:flex;flex-direction:column;gap:10px">
            ${projects.length ? projects.map(p => {
              const s = STATUS_COLORS[p.status] || STATUS_COLORS.upcoming;
              return `<div style="padding:10px 14px;border-radius:8px;border:1px solid #f3f4f6;background:#fafafa">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                  <span style="font-weight:600;font-size:0.82rem;color:#111827">${p.title}</span>
                  <span ${canEdit ? `onclick="window._ictCycleProjectStatus(${p.id},'${p.status}')" style="cursor:pointer"` : ''} title="${canEdit ? 'Click to advance status' : ''}"
                    style="background:${s.bg};color:${s.color};padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:700">${p.status}</span>
                </div>
                ${p.members_label ? `<div style="font-size:0.72rem;color:#6b7280;margin-bottom:3px">Members: ${p.members_label}</div>` : ''}
                ${p.result ? `<div style="font-size:0.72rem;color:#374151">${p.result}</div>` : ''}
              </div>`;
            }).join('') : '<p style="color:#9ca3af;font-size:0.82rem;text-align:center;padding:16px">No projects yet.</p>'}
          </div>
        </div>

        <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
          <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">🏆 Club Awards</div>
          <div style="padding:14px 18px;display:flex;flex-direction:column;gap:10px">
            ${awards.length ? awards.map(a => `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:linear-gradient(135deg,#fef9c3,#fef3c7);border-radius:8px;border:1px solid #fde68a">
                <div style="font-size:1.5rem">🏆</div>
                <div>
                  <div style="font-weight:700;font-size:0.85rem;color:#92400e">${a.name}</div>
                  <div style="font-size:0.72rem;color:#6b7280">${a.awarded_date || ''}${a.detail ? ' · ' + a.detail : ''}</div>
                  <div style="font-size:0.72rem;color:#374151;margin-top:2px">
                    ${a.winner_name ? `Winner: ${a.winner_name}${a.class_name ? ' (' + a.class_name + ')' : ''}` : '<em style="color:#9ca3af">Award ceremony pending</em>'}
                  </div>
                </div>
              </div>`).join('') : ''}
            ${canEdit ? `<button onclick="window._ictAddAward()" class="btn btn-outline" style="font-size:0.78rem">+ Record New Award</button>` : ''}
          </div>
        </div>
      </div>
    `;

    window._ictAddMember = async function() {
      const name = prompt('Search pupil by name (must be Basic 3–6):');
      if (!name) return;
      const found = nonMembers.find(s => s.full_name.toLowerCase().includes(name.toLowerCase()));
      if (!found) { alert('Pupil not found or already a member.'); return; }
      try {
        await window.RCA_API.call('/ict-clubs/members', { method: 'POST', body: { admission_no: found.admission_no } });
      } catch (e) { alert('Could not add member: ' + e.message); return; }
      await loadAll();
      render();
    };

    window._ictRemoveMember = async function(admissionNo) {
      const m = members.find(x => x.admission_no === admissionNo);
      if (!confirm(`Remove ${m?.full_name || admissionNo} from ICT Club?`)) return;
      try {
        await window.RCA_API.call(`/ict-clubs/members/${encodeURIComponent(admissionNo)}`, { method: 'DELETE' });
      } catch (e) { alert('Could not remove: ' + e.message); return; }
      await loadAll();
      render();
    };

    window._ictAddMeeting = async function() {
      const topic = prompt('Meeting topic:');
      if (!topic) return;
      const att   = parseInt(prompt('Attendance count:') || '0', 10);
      const notes = prompt('Meeting notes (optional):') || '';
      try {
        await window.RCA_API.call('/ict-clubs/meetings', { method: 'POST', body: { topic, attendance: att, notes } });
      } catch (e) { alert('Could not save: ' + e.message); return; }
      await loadAll();
      render();
    };

    window._ictAddProject = async function() {
      const title = prompt('Project title:');
      if (!title) return;
      const membersLabel = prompt('Which members? (e.g. "All", "Basic 5 & 6"):') || 'All';
      try {
        await window.RCA_API.call('/ict-clubs/projects', { method: 'POST', body: { title, members_label: membersLabel, status: 'upcoming' } });
      } catch (e) { alert('Could not save: ' + e.message); return; }
      await loadAll();
      render();
    };

    window._ictCycleProjectStatus = async function(id, current) {
      const next = current === 'upcoming' ? 'ongoing' : current === 'ongoing' ? 'completed' : 'upcoming';
      try {
        await window.RCA_API.call(`/ict-clubs/projects/${id}`, { method: 'PUT', body: { status: next } });
      } catch (e) { alert('Could not update: ' + e.message); return; }
      await loadAll();
      render();
    };

    window._ictAddAward = async function() {
      const name = prompt('Award name:');
      if (!name) return;
      const winnerName = prompt('Winner name (optional):') || null;
      const cls = prompt('Winner\'s class (optional):') || null;
      const detail = prompt('Detail, e.g. typing speed (optional):') || null;
      try {
        await window.RCA_API.call('/ict-clubs/awards', {
          method: 'POST',
          body: { name, winner_name: winnerName, class_name: cls, detail, awarded_date: new Date().toISOString().split('T')[0] }
        });
      } catch (e) { alert('Could not save: ' + e.message); return; }
      await loadAll();
      render();
    };
  }

  await loadAll();
  render();
});
