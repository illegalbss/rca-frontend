/* ============================================
   PRINTABLE SCHOOL CALENDAR — calendar-print.js
   Royal Crystal Academy
   ============================================
   RCA_CALENDAR_PRINT.open({ startYear })  — opens a one-page A4
   "School Calendar" for the academic session Sept {startYear} – Aug
   {startYear+1}, built from the real calendar (GET /api/public/calendar,
   the same entries the ICT Administrator manages on the admin School
   Calendar page), and sends it to the printer / "Save as PDF".

   Layout: 12 month grids (3 per row) with entry days coloured by
   category, plus a side column of Key Dates, Term Breakdown (derived
   from long "academic" entries such as "First Term Begins" with an end
   date), School Holidays and notes. Used by the public Academic Calendar
   page and the admin School Calendar page.
*/
(function () {

  const SCHOOL = {
    name: 'Royal Crystal Academy',
    tagline: 'Nursery & Primary School',
    motto: 'Moral, Excellence & Greatness',
    address: '20/21 Amaigbo Lane, Uwani, Enugu State',
    phones: '08036721390 / 09080061094',
    email: 'royalcrystalacademy12@gmail.com',
    website: 'www.royalcrystalacademy.com.ng'
  };

  // Resolve the badge relative to THIS script (assets/js/…), so it works
  // from both the site root and /admin/ pages.
  const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
  const LOGO_URL = new URL('../images/logo.png', SCRIPT_URL).href;

  const CAT = {
    academic:       { color: '#1d4ed8', label: 'Academic / Term' },
    exam:           { color: '#d97706', label: 'Exam / Assessment' },
    event:          { color: '#7c3aed', label: 'Event / Activity' },
    fee:            { color: '#dc2626', label: 'Fee Deadline' },
    meeting:        { color: '#0f766e', label: 'Meeting / PTM' },
    holiday:        { color: '#16a34a', label: 'School Holiday' },
    holiday_public: { color: '#059669', label: 'Public Holiday' }
  };
  const catOf = c => CAT[c] || CAT.event;

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MON = MONTHS.map(m => m.slice(0, 3));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  // Dates come back as 'YYYY-MM-DD' or an ISO timestamp — take the date
  // part only so a timezone offset can never shift an entry by a day.
  function parseDay(v) {
    if (!v) return null;
    const [y, m, d] = String(v).slice(0, 10).split('-').map(Number);
    return (y && m && d) ? new Date(y, m - 1, d) : null;
  }
  const dayKey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const ord = n => n + (['th','st','nd','rd'][((n % 100) - 20) % 10] || ['th','st','nd','rd'][n % 100] || 'th');
  const shortDate = d => `${d.getDate()} ${MON[d.getMonth()]}`;
  const fullDate = d => `${ord(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}`;
  function rangeText(s, e, full) {
    const f = full ? fullDate : shortDate;
    if (!e || +e === +s) return f(s);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) return `${full ? ord(s.getDate()) : s.getDate()} – ${f(e)}`;
    return `${f(s)} – ${f(e)}`;
  }
  const days = (s, e) => Math.round(((e || s) - s) / 86400000) + 1;

  // Default session: Sept–Aug containing today (Aug counts as the run-up
  // to the session starting that September).
  function defaultStartYear() {
    const t = new Date();
    return t.getMonth() >= 7 ? t.getFullYear() : t.getFullYear() - 1;
  }

  const ICON = {
    cal:  '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2"/>',
    list: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    sun:  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    pin:  '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'
  };
  const icon = (n, s = 12, c = 'currentColor') =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

  const CSS = `
    :root { --navy:#13306b; --navy2:#1d4690; --gold:#c9960c; --ink:#1f2937; --muted:#6b7280; --line:#d6deeb; --soft:#eef3fb; }
    * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    html, body { margin:0; background:#e5e7eb; font-family:Arial, Helvetica, sans-serif; color:var(--ink); }
    @page { size:A4 portrait; margin:0; }
    .sheet { width:210mm; height:297mm; margin:12px auto; background:#fff; padding:7mm 8mm 0; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.15); position:relative; }
    @media print { html, body { background:#fff; } .sheet { margin:0; box-shadow:none; } .toolbar { display:none !important; } }
    .toolbar { position:sticky; top:0; z-index:5; display:flex; gap:8px; justify-content:center; align-items:center; padding:10px; background:#111827; color:#fff; font:600 13px Arial; }
    .toolbar button { font:600 13px Arial; padding:8px 16px; border-radius:6px; border:0; cursor:pointer; background:#374151; color:#fff; }
    .toolbar button.main { background:var(--gold); }

    .head { display:flex; align-items:center; gap:12px; padding-bottom:6px; border-bottom:3px solid var(--gold); }
    .head img { width:66px; height:66px; object-fit:contain; }
    .brand-name { font-family:Georgia,'Times New Roman',serif; font-size:25px; font-weight:700; color:var(--navy); text-transform:uppercase; letter-spacing:.03em; line-height:1.05; }
    .brand-sub { font-size:10.5px; font-weight:700; color:var(--gold); letter-spacing:.14em; text-transform:uppercase; margin-top:3px; }
    .brand-motto { font-family:Georgia,'Times New Roman',serif; font-style:italic; font-size:12px; color:var(--navy); margin-top:2px; }
    .contact { display:flex; flex-wrap:wrap; gap:3px 12px; margin-top:5px; font-size:9px; }
    .contact span { display:inline-flex; align-items:center; gap:4px; } .contact svg { color:var(--gold); }

    .banner { margin-top:7px; background:linear-gradient(90deg,var(--navy),var(--navy2)); color:#fff; border-radius:6px; padding:8px 14px 7px; display:flex; align-items:center; gap:14px; }
    .banner-ic { flex:none; color:#fff; opacity:.95; }
    .banner h1 { margin:0; font-size:27px; letter-spacing:.05em; line-height:1; }
    .banner .yr { color:#f3c94e; font-size:21px; font-weight:800; margin-top:2px; }
    .banner .terms { margin-top:4px; font-size:9px; opacity:.95; }
    .banner .terms b { color:#fff; }

    .body { flex:1; display:grid; grid-template-columns:1fr 1fr 1fr 0.98fr; gap:6px; margin-top:7px; min-height:0; }
    .months { grid-column:1 / span 3; display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(4,1fr); gap:6px; min-height:0; }
    .month { border:1px solid var(--line); border-radius:6px; overflow:hidden; display:flex; flex-direction:column; min-height:0; }
    .month-h { background:var(--navy); color:#fff; font-size:10px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; padding:4px 7px; display:flex; align-items:center; gap:5px; }
    .grid7 { display:grid; grid-template-columns:repeat(7,1fr); padding:3px 4px 0; text-align:center; font-size:9.6px; }
    .dow { font-weight:700; color:var(--navy); font-size:8px; padding:2px 0 3px; }
    .d { padding:2.6px 0; font-weight:600; border-radius:3px; margin:0.7px; }
    .sun { color:#dc2626; } .sat { color:#1d4ed8; }
    .d.ev { color:#fff !important; }
    .notes { margin-top:auto; padding:3px 5px 4px; background:var(--soft); font-size:7.2px; line-height:1.35; min-height:22px; }
    .notes div { display:flex; gap:3px; align-items:flex-start; }
    .dot { width:6px; height:6px; border-radius:50%; flex:none; margin-top:1.5px; }

    .side { display:flex; flex-direction:column; gap:6px; min-height:0; }
    .box { border:1px solid var(--line); border-radius:6px; overflow:hidden; }
    .box-h { background:var(--navy); color:#fff; font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; padding:5px 8px; display:flex; align-items:center; gap:6px; }
    .kd { width:100%; border-collapse:collapse; font-size:7.6px; }
    .kd td { padding:2.6px 5px; border-bottom:1px solid #edf1f7; vertical-align:top; }
    .kd td:last-child { text-align:right; white-space:nowrap; color:var(--navy); font-weight:700; }
    .kd tr:last-child td { border-bottom:0; }
    .term { margin:4px 5px; border-radius:5px; padding:5px 7px; font-size:8px; display:flex; justify-content:space-between; gap:6px; }
    .term b { font-size:8.5px; }
    .legend { display:grid; grid-template-columns:1fr 1fr; gap:2px 6px; padding:5px 7px; font-size:7.2px; }
    .legend span { display:flex; align-items:center; gap:3px; }
    .notes-box { padding:5px 8px; font-size:7.6px; line-height:1.45; color:#374151; }
    .notes-box ul { margin:0; padding-left:11px; }
    .muted { color:var(--muted); font-style:italic; padding:6px 8px; font-size:8px; }

    .foot { margin:6px -8mm 0; height:44px; position:relative; }
    .foot svg { position:absolute; inset:0; width:100%; height:100%; }
    .foot .sig { position:absolute; right:10mm; bottom:6px; color:#fff; font-size:8px; text-align:right; line-height:1.2; }
    .foot .sig b { display:block; font-size:10px; }
    .foot .web { position:absolute; left:10mm; bottom:8px; color:#fff; font-size:8.5px; }
  `;

  function buildDocument(events, startYear) {
    const sStart = new Date(startYear, 8, 1), sEnd = new Date(startYear + 1, 7, 31);

    const items = (events || []).map(e => {
      const s = parseDay(e.event_date);
      const en = parseDay(e.end_date) || s;
      return s ? { title: e.title || '', s, e: en < s ? s : en, cat: e.category || 'event', note: e.description || '' } : null;
    }).filter(x => x && x.e >= sStart && x.s <= sEnd)
      .sort((a, b) => a.s - b.s);

    // Day → colour. Short ranges (≤ 21 days, e.g. a mid-term break) are
    // filled in; long ones (a whole term) only mark their first/last day.
    const dayColor = {};
    items.forEach(it => {
      const color = catOf(it.cat).color;
      if (days(it.s, it.e) <= 21) {
        for (let d = new Date(it.s); d <= it.e; d.setDate(d.getDate() + 1)) dayColor[dayKey(d)] = dayColor[dayKey(d)] || color;
      } else {
        dayColor[dayKey(it.s)] = color;
        dayColor[dayKey(it.e)] = color;
      }
    });

    // Terms: academic entries spanning a month or more.
    const terms = items.filter(it => it.cat === 'academic' && days(it.s, it.e) >= 28).slice(0, 3);
    const termNames = ['First Term', 'Second Term', 'Third Term'];
    const termTitle = (t, i) => /term/i.test(t.title) ? t.title.replace(/\s*(begins|starts|resumes)\s*/i, ' ').trim() : termNames[i];
    const holidays = items.filter(it => it.cat === 'holiday');

    function monthCard(y, m) {
      const first = new Date(y, m, 1).getDay();
      const count = new Date(y, m + 1, 0).getDate();
      let cells = ['Su','Mo','Tu','We','Th','Fr','Sa'].map((d, i) => `<div class="dow ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${d}</div>`).join('');
      for (let i = 0; i < first; i++) cells += '<div></div>';
      for (let d = 1; d <= count; d++) {
        const dow = (first + d - 1) % 7;
        const c = dayColor[dayKey(new Date(y, m, d))];
        cells += `<div class="d ${dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''} ${c ? 'ev' : ''}" ${c ? `style="background:${c}"` : ''}>${d}</div>`;
      }

      // Notes: entries starting this month, plus long entries ending here.
      const mStart = new Date(y, m, 1), mEnd = new Date(y, m, count);
      const notes = [];
      items.forEach(it => {
        if (it.s >= mStart && it.s <= mEnd) {
          const long = days(it.s, it.e) > 21;
          notes.push({ color: catOf(it.cat).color, text: `${esc(it.title)} – ${long ? shortDate(it.s) : rangeText(it.s, it.e)}` });
        } else if (it.e >= mStart && it.e <= mEnd && days(it.s, it.e) > 21) {
          notes.push({ color: catOf(it.cat).color, text: `${esc(it.title.replace(/\s*(begins|starts|resumes)\s*/i, ' ').trim())} ends – ${shortDate(it.e)}` });
        }
      });
      const shown = notes.slice(0, 3);
      return `
        <div class="month">
          <div class="month-h">${icon('cal', 11, '#fff')}${MONTHS[m]} ${y}</div>
          <div class="grid7">${cells}</div>
          <div class="notes">${shown.map(n => `<div><span class="dot" style="background:${n.color}"></span><span>${n.text}</span></div>`).join('')}${notes.length > 3 ? `<div style="color:#6b7280">+${notes.length - 3} more</div>` : ''}</div>
        </div>`;
    }

    const monthList = [];
    for (let i = 0; i < 12; i++) monthList.push([startYear + (8 + i >= 12 ? 1 : 0), (8 + i) % 12]);

    const keyDates = items.slice(0, 16);
    const termLine = terms.length
      ? terms.map((t, i) => `<b>Term ${i + 1}:</b> ${MON[t.s.getMonth()]} – ${MON[t.e.getMonth()]} ${t.e.getFullYear()}`).join(' &nbsp;|&nbsp; ')
      : 'Term dates will be published on the school calendar.';
    const termTints = ['#e0ecff', '#dcfce7', '#f3e8ff'];
    const termInk = ['#1d4ed8', '#15803d', '#7e22ce'];

    return `
      <div class="sheet">
        <div class="head">
          <img src="${LOGO_URL}" alt="Royal Crystal Academy badge">
          <div style="flex:1">
            <div class="brand-name">${SCHOOL.name}</div>
            <div class="brand-motto">${SCHOOL.motto}</div>
            <div class="brand-sub">${SCHOOL.tagline}</div>
            <div class="contact">
              <span>${icon('pin', 10)}${SCHOOL.address}</span>
              <span>${icon('phone', 10)}${SCHOOL.phones}</span>
              <span>${icon('mail', 10)}${SCHOOL.email}</span>
              <span>${icon('globe', 10)}${SCHOOL.website}</span>
            </div>
          </div>
        </div>

        <div class="banner">
          <span class="banner-ic">${icon('cal', 46, '#fff')}</span>
          <div>
            <h1>SCHOOL CALENDAR</h1>
            <div class="yr">${startYear} / ${startYear + 1}</div>
            <div class="terms">Academic Session: <b>${startYear}/${startYear + 1}</b> &nbsp;|&nbsp; ${termLine}</div>
          </div>
        </div>

        <div class="body">
          <div class="months">${monthList.map(([y, m]) => monthCard(y, m)).join('')}</div>

          <div class="side">
            <div class="box">
              <div class="box-h">${icon('list', 11, '#fff')}Key Dates</div>
              ${keyDates.length ? `<table class="kd">${keyDates.map(it => `<tr><td>${esc(it.title)}</td><td>${rangeText(it.s, it.e)}</td></tr>`).join('')}</table>
                ${items.length > keyDates.length ? `<div class="muted">+${items.length - keyDates.length} more — see the website calendar</div>` : ''}`
                : '<div class="muted">No dates published for this session yet.</div>'}
            </div>

            ${terms.length ? `
            <div class="box">
              <div class="box-h">${icon('layers', 11, '#fff')}Term Breakdown</div>
              ${terms.map((t, i) => `
                <div class="term" style="background:${termTints[i]}">
                  <b style="color:${termInk[i]}">${esc(termTitle(t, i)).toUpperCase()}</b>
                  <span style="text-align:right">${rangeText(t.s, t.e)} ${t.e.getFullYear()}<br><span style="color:#6b7280">(${Math.round(days(t.s, t.e) / 7)} weeks)</span></span>
                </div>`).join('')}
            </div>` : ''}

            <div class="box">
              <div class="box-h">${icon('sun', 11, '#fff')}School Holidays</div>
              ${holidays.length ? `<table class="kd">${holidays.map(h => `<tr><td>${esc(h.title)}</td><td>${rangeText(h.s, h.e)}</td></tr>`).join('')}</table>`
                : '<div class="muted">To be announced.</div>'}
            </div>

            <div class="box">
              <div class="box-h">${icon('cal', 11, '#fff')}Colour Key</div>
              <div class="legend">${Object.values(CAT).map(c => `<span><span class="dot" style="background:${c.color}"></span>${c.label}</span>`).join('')}</div>
            </div>

            <div class="box" style="flex:1">
              <div class="box-h">${icon('info', 11, '#fff')}Important Notes</div>
              <div class="notes-box">
                <ul>
                  <li>Dates are subject to change. Updates are published on the school website and the parent portal.</li>
                  <li>Parents are encouraged to keep track of important dates and school activities.</li>
                  <li>For enquiries, please contact the school office: ${SCHOOL.phones}.</li>
                </ul>
                <p style="margin:6px 0 0;font-weight:700;color:var(--navy)">Printed ${fullDate(new Date())}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="foot">
          <svg viewBox="0 0 800 44" preserveAspectRatio="none">
            <path d="M0,10 C220,26 460,-2 800,8 L800,44 L0,44 Z" fill="#13306b"/>
            <path d="M0,10 C220,26 460,-2 800,8" fill="none" stroke="#c9960c" stroke-width="3"/>
          </svg>
          <div class="web">${SCHOOL.website}</div>
          <div class="sig"><b>Management</b>${SCHOOL.name}</div>
        </div>
      </div>`;
  }

  async function fetchEvents() {
    const apiUrl = window.RCA_CONFIG?.API_URL || 'http://localhost:3000/api';
    const res = await fetch(`${apiUrl}/public/calendar`);
    if (!res.ok) throw new Error('Could not load the calendar.');
    return (await res.json()).events || [];
  }

  // Opens the window synchronously (call straight from a click so pop-up
  // blockers allow it), then fills it once the dates have loaded. The
  // toolbar's ◀ ▶ buttons re-render the same tab for another session.
  async function open(opts = {}) {
    const win = opts.win || window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups for this site to download the calendar.'); return; }
    const startYear = opts.startYear || defaultStartYear();
    if (!opts.win) win.document.write('<p style="font:14px Arial;padding:24px;color:#6b7280">Preparing calendar…</p>');

    let events;
    try {
      events = opts.events || await fetchEvents();
    } catch (e) {
      win.document.open();
      win.document.write(`<p style="font:14px Arial;padding:24px;color:#dc2626">${esc(e.message)}</p>`);
      win.document.close();
      return;
    }

    win.document.open();
    win.document.write(`<!doctype html><html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>School Calendar ${startYear}-${startYear + 1} — ${SCHOOL.name}</title><style>${CSS}</style></head><body>
      <div class="toolbar">
        <button id="prevYr">◀ ${startYear - 1}/${startYear}</button>
        <button class="main" onclick="window.print()">🖨 Print / Save as PDF</button>
        <button id="nextYr">${startYear + 1}/${startYear + 2} ▶</button>
        <button onclick="window.close()">Close</button>
      </div>
      ${buildDocument(events, startYear)}
      </body></html>`);
    win.document.close();

    const again = y => open({ startYear: y, events, win });
    win.document.getElementById('prevYr').onclick = () => again(startYear - 1);
    win.document.getElementById('nextYr').onclick = () => again(startYear + 1);

    if (!opts.win) {
      const go = () => setTimeout(() => win.print(), 300);
      const img = win.document.querySelector('.head img');
      if (img && !img.complete) img.addEventListener('load', go, { once: true }); else go();
    }
  }

  window.RCA_CALENDAR_PRINT = { open, buildDocument, CSS };
})();
