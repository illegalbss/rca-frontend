/* ============================================
   ICT CLUBS — ict-clubs.js
   Royal Crystal Academy
   ============================================
   ICT Club management:
   - Club membership (Basic 3–6 pupils only)
   - Meeting records
   - Projects and awards
   - Typing competition tracking
*/

if (!window.ICT_CLUB_DATA) {
  window.ICT_CLUB_DATA = {
    meetings: [
      { date:'2026-04-08', topic:'Introduction to HTML Tags', attendance:14, notes:'All members present. HTML tag exercise completed.' },
      { date:'2026-04-15', topic:'Typing Speed Competition Round 1', attendance:16, notes:'Average typing speed: 18 WPM. Best: 32 WPM.' },
      { date:'2026-04-22', topic:'Graphic Design with Paint', attendance:15, notes:'Members created digital posters for the school event.' },
      { date:'2026-05-06', topic:'Build Your First Web Page', attendance:16, notes:'12 members successfully created their first HTML page.' },
      { date:'2026-05-13', topic:'CSS Styling Basics', attendance:14, notes:'Members styled their HTML pages with colours and fonts.' },
      { date:'2026-05-20', topic:'Coding Games — Scratch', attendance:17, notes:'Introduced Scratch programming. Members built simple animations.' },
      { date:'2026-06-03', topic:'Digital Creativity — Logo Design', attendance:15, notes:'Members designed logos for their dream businesses.' },
      { date:'2026-06-10', topic:'Club Showcase Preparation', attendance:16, notes:'Practising presentations for end-of-term showcase.' },
    ],
    projects: [
      { title:'School Newsletter Design', members:'All', status:'completed', result:'Published in May 2026 newsletter.' },
      { title:'Typing Speed Championship', members:'All', status:'completed', result:'Trophy awarded to top 3 fastest typists.' },
      { title:'HTML Web Page Portfolio', members:'Basic 5 & 6', status:'ongoing',   result:'14 of 16 members completed their pages.' },
      { title:'Digital Creativity Exhibition', members:'All', status:'upcoming',  result:'Scheduled for end-of-term showcase.' },
      { title:'Coding Games Tournament', members:'All', status:'upcoming',  result:'Scratch game competition — July 2026.' },
    ],
    awards: [
      { name:'Best Typist',          winner:'', class:'', speed:'32 WPM', date:'April 2026' },
      { name:'Best HTML Page',       winner:'', class:'', speed:'',       date:'May 2026'   },
      { name:'Best Graphic Designer',winner:'', class:'', speed:'',       date:'May 2026'   },
    ]
  };
}

document.addEventListener('DOMContentLoaded', () => {

  const allStudents = window.SAMPLE_STUDENTS || [];
  const clubData    = window.ICT_CLUB_DATA;

  // ICT Club members — Basic 3–6 only
  const eligible  = allStudents.filter(s => ['Basic 3','Basic 4','Basic 5','Basic 6'].includes(s.class_name));
  const members   = eligible.filter((_, i) => i % 3 === 0).slice(0, 18);
  const nonMembers= eligible.filter(s => !members.includes(s));

  const STATUS_COLORS = {
    completed: { bg:'#d1fae5', color:'#065f46' },
    ongoing:   { bg:'#dbeafe', color:'#1e40af' },
    upcoming:  { bg:'#fef3c7', color:'#92400e' }
  };

  const main = document.getElementById('clubsMain');
  main.innerHTML = `
    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      ${[
        { num:members.length, label:'Club Members', color:'#7c3aed', icon:'👥' },
        { num:clubData.meetings.length, label:'Meetings This Term', color:'#1d4ed8', icon:'📅' },
        { num:clubData.projects.filter(p=>p.status==='completed').length, label:'Completed Projects', color:'#16a34a', icon:'✅' },
        { num:clubData.awards.length, label:'Awards Given', color:'#f59e0b', icon:'🏆' }
      ].map(s => `
        <div style="background:#fff;border-radius:12px;padding:16px 18px;box-shadow:0 1px 4px rgba(0,0,0,0.07);border-left:4px solid ${s.color}">
          <div style="font-size:1.3rem;margin-bottom:6px">${s.icon}</div>
          <div style="font-family:var(--font-heading);font-size:1.6rem;font-weight:700;color:#111827">${s.num}</div>
          <div style="font-size:0.75rem;color:#6b7280">${s.label}</div>
        </div>`).join('')}
    </div>

    <!-- Two-column: members + meetings -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

      <!-- Members panel -->
      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between">
          <span style="font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">👥 Club Members (${members.length})</span>
          <button onclick="window._ictAddMember()" class="btn btn-primary btn-sm" style="font-size:0.72rem">+ Add Member</button>
        </div>
        <div style="padding:14px 18px;max-height:340px;overflow-y:auto">
          ${members.map((m,i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f9fafb">
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#4c1d95,#7c3aed);color:#fff;font-size:0.62rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                ${m.full_name.split(' ').map(p=>p[0]).join('').substring(0,2)}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:0.8rem;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.full_name}</div>
                <div style="font-size:0.7rem;color:#9ca3af">${m.class_name} · ${m.admission_no}</div>
              </div>
              <button onclick="window._ictRemoveMember(${i})" style="font-size:0.7rem;color:#dc2626;background:none;border:none;cursor:pointer;padding:2px 6px">✕</button>
            </div>`).join('')}
        </div>
      </div>

      <!-- Meetings panel -->
      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between">
          <span style="font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">📅 Meeting Records</span>
          <button onclick="window._ictAddMeeting()" class="btn btn-outline btn-sm" style="font-size:0.72rem">+ Log Meeting</button>
        </div>
        <div style="max-height:340px;overflow-y:auto">
          ${[...clubData.meetings].reverse().map(m => `
            <div style="padding:12px 18px;border-bottom:1px solid #f9fafb">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
                <span style="font-weight:600;font-size:0.82rem;color:#111827">${m.topic}</span>
                <span style="font-size:0.68rem;color:#9ca3af">${m.date}</span>
              </div>
              <div style="font-size:0.75rem;color:#6b7280;margin-bottom:3px">${m.notes}</div>
              <span style="background:#ede9fe;color:#5b21b6;padding:2px 7px;border-radius:999px;font-size:0.65rem;font-weight:700">Attendance: ${m.attendance}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Projects + Awards -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

      <!-- Projects -->
      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">🛠 Projects & Activities</div>
        <div style="padding:14px 18px;display:flex;flex-direction:column;gap:10px">
          ${clubData.projects.map(p => {
            const s = STATUS_COLORS[p.status];
            return `<div style="padding:10px 14px;border-radius:8px;border:1px solid #f3f4f6;background:#fafafa">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <span style="font-weight:600;font-size:0.82rem;color:#111827">${p.title}</span>
                <span style="background:${s.bg};color:${s.color};padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:700">${p.status}</span>
              </div>
              <div style="font-size:0.72rem;color:#6b7280;margin-bottom:3px">Members: ${p.members}</div>
              <div style="font-size:0.72rem;color:#374151">${p.result}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Awards -->
      <div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid #f3f4f6;font-family:var(--font-heading);font-weight:700;font-size:0.875rem;color:#111827">🏆 Club Awards</div>
        <div style="padding:14px 18px;display:flex;flex-direction:column;gap:10px">
          ${clubData.awards.map(a => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:linear-gradient(135deg,#fef9c3,#fef3c7);border-radius:8px;border:1px solid #fde68a">
              <div style="font-size:1.5rem">🏆</div>
              <div>
                <div style="font-weight:700;font-size:0.85rem;color:#92400e">${a.name}</div>
                <div style="font-size:0.72rem;color:#6b7280">${a.date}${a.speed ? ' · Speed: ' + a.speed : ''}</div>
                <div style="font-size:0.72rem;color:#374151;margin-top:2px">
                  ${a.winner ? `Winner: ${a.winner} (${a.class})` : '<em style="color:#9ca3af">Award ceremony pending</em>'}
                </div>
              </div>
            </div>`).join('')}
          <button onclick="window._ictAddAward()" class="btn btn-outline" style="font-size:0.78rem">+ Record New Award</button>
        </div>
      </div>
    </div>
  `;

  /* ---- Actions ---- */
  window._ictAddMember = function() {
    const name = prompt('Search pupil by name (must be Basic 3–6):');
    if (!name) return;
    const found = nonMembers.find(s => s.full_name.toLowerCase().includes(name.toLowerCase()));
    if (!found) { alert('Pupil not found or already a member.'); return; }
    members.push(found);
    alert(`${found.full_name} added to ICT Club!`);
    location.reload(); // Simple refresh for Phase 1
  };

  window._ictRemoveMember = function(i) {
    if (!confirm(`Remove ${members[i].full_name} from ICT Club?`)) return;
    members.splice(i, 1);
    location.reload();
  };

  window._ictAddMeeting = function() {
    const topic    = prompt('Meeting topic:');
    if (!topic) return;
    const att      = parseInt(prompt('Attendance count:') || '0');
    const notes    = prompt('Meeting notes:') || '';
    clubData.meetings.push({
      date: new Date().toISOString().split('T')[0],
      topic, attendance: att, notes
    });
    location.reload();
  };

  window._ictAddAward = function() {
    const name   = prompt('Award name:');
    if (!name) return;
    const winner = prompt('Winner name:') || '';
    const cls    = prompt('Winner\'s class:') || '';
    clubData.awards.push({ name, winner, class: cls, speed:'', date: new Date().toLocaleDateString('en-NG', {month:'long',year:'numeric'}) });
    location.reload();
  };
});
