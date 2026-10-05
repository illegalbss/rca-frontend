/* ============================================
   FINANCE PRINTOUTS — finance-print.js
   Royal Crystal Academy
   ============================================
   Branded, print-ready A4 documents for finance, each opened in a new
   tab and sent to the printer (or "Save as PDF"):

     RCA_PRINT.outstanding({ termLabel, session, rows })  — who is owing
     RCA_PRINT.paid({ title, subtitle, termLabel, session, rows }) — who has paid
     RCA_PRINT.statement({ pupil, termLabel, session, lines, adjustments,
                           totalDue, totalPaid, balance, status, payments })

   Callers pass plain data they already have; this file only lays it
   out. All styles are inline in the generated document so the printout
   never depends on (or is disturbed by) the dashboard's own CSS.
*/
(function () {

  const SCHOOL = {
    name: 'Royal Crystal Academy',
    tagline: 'Nursery & Primary School',
    address: '20/21 Amaigbo Lane, Uwani, Enugu State',
    email: 'royalcrystalacademy12@gmail.com',
    phones: '08036721390 / 09080061094',
    website: 'www.royalcrystalacademy.com.ng'
  };

  const LOGO_URL = new URL('../assets/images/logo.png', location.href).href;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const money = n => Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 });
  const naira = n => '₦' + money(n);
  const dateStr = d => {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt) ? esc(d) : dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const STATUS = {
    paid:    { label: 'Paid',    bg: '#dcfce7', color: '#166534', border: '#86efac' },
    partial: { label: 'Partial', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
    unpaid:  { label: 'Unpaid',  bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' }
  };
  const pill = s => {
    const st = STATUS[s] || STATUS.unpaid;
    return `<span class="pill" style="background:${st.bg};color:${st.color};border-color:${st.border}">${st.label}</span>`;
  };

  /* --- Small line icons (inline SVG, print crisply at any size) --- */
  const ICON = {
    pin:   '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    mail:  '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    cal:   '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5.5"/>',
    coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.7-2.7-3-6-3"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
    user:  '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  };
  const icon = (name, size = 16, color = 'currentColor') =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

  /* --- Shared document chrome --- */
  const CSS = `
    :root { --navy:#13306b; --navy-2:#1d4690; --gold:#c9960c; --ink:#1f2937; --muted:#6b7280; --line:#d6deeb; --soft:#eef3fb; }
    * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    html, body { margin:0; background:#e5e7eb; }
    body { font-family: Arial, Helvetica, sans-serif; color:var(--ink); font-size:12px; line-height:1.4; }
    .sheet { width:210mm; min-height:297mm; margin:12px auto; background:#fff; padding:12mm 12mm 0; display:flex; flex-direction:column; box-shadow:0 2px 12px rgba(0,0,0,.15); }
    .grow { flex:1; }
    @page { size:A4 portrait; margin:0; }
    @media print { html, body { background:#fff; } .sheet { margin:0; box-shadow:none; } .toolbar { display:none !important; } }

    .toolbar { position:sticky; top:0; z-index:5; display:flex; gap:8px; justify-content:center; padding:10px; background:#111827; }
    .toolbar button { font:600 13px Arial; padding:8px 18px; border-radius:6px; border:0; cursor:pointer; background:var(--gold); color:#fff; }
    .toolbar button.alt { background:#374151; }

    .head { display:flex; justify-content:space-between; align-items:center; gap:16px; padding-bottom:10px; border-bottom:3px solid var(--gold); }
    .brand { display:flex; align-items:center; gap:12px; }
    .brand img { width:78px; height:78px; object-fit:contain; }
    .brand-name { font-family:Georgia,'Times New Roman',serif; font-size:24px; font-weight:700; color:var(--navy); letter-spacing:.02em; text-transform:uppercase; line-height:1.1; }
    .brand-sub { margin-top:4px; font-size:12px; font-weight:700; color:var(--gold); letter-spacing:.12em; text-transform:uppercase; }
    .contact { font-size:10.5px; color:var(--ink); display:grid; gap:4px; }
    .contact div { display:flex; align-items:center; gap:6px; }
    .contact svg { color:var(--navy); flex:none; }

    .banner { margin-top:12px; background:linear-gradient(90deg,var(--navy),var(--navy-2)); color:#fff; text-align:center; padding:11px 10px 10px; border-radius:4px; }
    .banner h1 { margin:0; font-size:19px; letter-spacing:.04em; text-transform:uppercase; }
    .banner p { margin:3px 0 0; font-size:12px; opacity:.92; }

    .meta { margin-top:10px; display:grid; grid-template-columns:repeat(3,1fr); border:1px solid var(--line); border-radius:6px; }
    .meta > div { display:flex; align-items:center; gap:10px; padding:9px 14px; }
    .meta > div + div { border-left:1px solid var(--line); }
    .meta svg { color:var(--navy); flex:none; }
    .meta small { display:block; color:var(--muted); font-size:10.5px; }
    .meta b { font-size:13px; color:var(--navy); }

    .kpis { margin-top:10px; display:grid; gap:8px; }
    .kpi { border-radius:6px; padding:9px 12px; display:flex; align-items:center; gap:10px; border:1px solid; }
    .kpi .ic { width:32px; height:32px; border-radius:50%; display:grid; place-items:center; color:#fff; flex:none; }
    .kpi small { display:block; font-size:10.5px; font-weight:700; color:var(--ink); }
    .kpi b { font-size:17px; }
    .k-red    { background:#fef2f2; border-color:#fecaca; } .k-red .ic { background:#dc2626; } .k-red b { color:#b91c1c; }
    .k-blue   { background:#eff6ff; border-color:#bfdbfe; } .k-blue .ic { background:var(--navy-2); } .k-blue b { color:var(--navy); }
    .k-green  { background:#f0fdf4; border-color:#bbf7d0; } .k-green .ic { background:#16a34a; } .k-green b { color:#15803d; }
    .k-amber  { background:#fffbeb; border-color:#fde68a; } .k-amber .ic { background:#d97706; } .k-amber b { color:#b45309; }

    table { width:100%; border-collapse:collapse; }
    .grid { margin-top:10px; font-size:11px; }
    .grid th { background:var(--navy); color:#fff; font-weight:700; font-size:10.5px; padding:7px 5px; text-align:center; border:1px solid var(--navy); }
    .grid td { padding:5px; border:1px solid var(--line); text-align:center; }
    .grid tbody tr:nth-child(even) td { background:var(--soft); }
    .grid td.l, .grid th.l { text-align:left; }
    .grid td.r, .grid th.r { text-align:right; }
    .grid tr { page-break-inside:avoid; }
    .grid thead { display:table-header-group; }
    .pill { display:inline-block; min-width:52px; padding:2px 8px; border-radius:4px; border:1px solid; font-size:10px; font-weight:700; }

    .lower { margin-top:12px; display:grid; grid-template-columns:1.15fr 1fr; gap:16px; align-items:end; page-break-inside:avoid; }
    .box { border:1px solid var(--line); border-radius:6px; overflow:hidden; }
    .box-title { background:var(--soft); color:var(--navy); font-weight:700; font-size:12px; padding:7px 10px; border-bottom:1px solid var(--line); }
    .mini td, .mini th { padding:5px 8px; border-bottom:1px solid var(--line); font-size:11px; }
    .mini th { color:var(--navy); text-align:left; font-size:10.5px; }
    .mini td.r, .mini th.r { text-align:right; }
    .mini tr.total td { font-weight:700; background:var(--soft); color:var(--navy); border-bottom:0; }

    .sign { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; }
    .sign-line { width:170px; border-top:1.5px solid var(--ink); padding-top:4px; font-size:11px; font-weight:700; }
    .sign-line span { display:block; font-weight:400; color:var(--muted); }

    .note { margin-top:10px; font-size:10.5px; color:var(--muted); }
    .footer { margin:14px -12mm 0; height:26px; position:relative; }
    .footer svg { position:absolute; inset:0; width:100%; height:100%; }
    .empty { padding:22px; text-align:center; color:var(--muted); font-style:italic; }
  `;

  function header() {
    return `
      <div class="head">
        <div class="brand">
          <img src="${LOGO_URL}" alt="Royal Crystal Academy badge">
          <div>
            <div class="brand-name">${SCHOOL.name}</div>
            <div class="brand-sub">${SCHOOL.tagline}</div>
          </div>
        </div>
        <div class="contact">
          <div>${icon('pin', 13)}${SCHOOL.address}</div>
          <div>${icon('mail', 13)}${SCHOOL.email}</div>
          <div>${icon('phone', 13)}${SCHOOL.phones}</div>
          <div>${icon('globe', 13)}${SCHOOL.website}</div>
        </div>
      </div>`;
  }

  const banner = (title, sub) => `<div class="banner"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;

  const meta = (session, termLabel) => `
    <div class="meta">
      <div>${icon('cal', 22)}<div><small>Academic Session</small><b>${esc(session || '—')}</b></div></div>
      <div>${icon('cal', 22)}<div><small>Term</small><b>${esc(termLabel || '—')}</b></div></div>
      <div>${icon('print', 22)}<div><small>Date Printed</small><b>${today()}</b></div></div>
    </div>`;

  const kpi = (cls, ic, label, value) =>
    `<div class="kpi ${cls}"><span class="ic">${icon(ic, 17, '#fff')}</span><div><small>${label}</small><b>${value}</b></div></div>`;

  // An empty seal ring with the badge in the middle — the real stamp is
  // pressed on top of it by hand. Circular text via an SVG textPath.
  function seal() {
    return `
      <svg width="104" height="104" viewBox="0 0 120 120" aria-label="School seal">
        <defs><path id="sealArc" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs>
        <circle cx="60" cy="60" r="57" fill="none" stroke="#13306b" stroke-width="2.5"/>
        <circle cx="60" cy="60" r="34" fill="none" stroke="#13306b" stroke-width="1.2"/>
        <text font-family="Arial" font-size="10" font-weight="700" fill="#13306b">
          <textPath href="#sealArc" startOffset="0" textLength="268" lengthAdjust="spacing">ROYAL CRYSTAL ACADEMY • SCHOOL SEAL •</textPath>
        </text>
        <image href="${LOGO_URL}" x="35" y="35" width="50" height="50"/>
      </svg>`;
  }

  function signBlock(role) {
    return `
      <div class="sign">
        <div class="sign-line">${esc(role)}<span>${SCHOOL.name}</span></div>
        ${seal()}
      </div>`;
  }

  const footer = () => `
    <div class="footer">
      <svg viewBox="0 0 800 26" preserveAspectRatio="none">
        <path d="M0,10 C200,30 420,-6 800,12 L800,26 L0,26 Z" fill="#13306b"/>
        <path d="M0,10 C200,30 420,-6 800,12" fill="none" stroke="#c9960c" stroke-width="3"/>
      </svg>
    </div>`;

  // Groups rows by class_name in the school's class order where possible.
  function byClass(rows, valueFn) {
    const order = window.SCHOOL_CLASSES || [];
    const map = {};
    rows.forEach(r => {
      const k = r.class_name || '—';
      (map[k] = map[k] || { count: 0, value: 0 });
      map[k].count++;
      map[k].value += valueFn(r);
    });
    return Object.entries(map).sort((a, b) => {
      const ia = order.indexOf(a[0]), ib = order.indexOf(b[0]);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a[0].localeCompare(b[0]);
    });
  }

  // Call prepare() synchronously inside the click handler, BEFORE any
  // await, and pass the result as { win } — browsers block pop-ups that
  // open after an async wait, but allow one opened straight from a click.
  function prepare() {
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups for this site to print the report.'); return null; }
    w.document.write('<p style="font:14px Arial;padding:24px;color:#6b7280">Preparing document…</p>');
    return w;
  }

  function open(title, bodyHtml, win) {
    const w = win || window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups for this site to print the report.'); return; }
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${esc(title)}</title><style>${CSS}</style></head><body>
      <div class="toolbar"><button onclick="window.print()">🖨 Print / Save as PDF</button><button class="alt" onclick="window.close()">Close</button></div>
      ${bodyHtml}
      <script>
        // Print once the badge (used in the header and the seal) has loaded.
        window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });
      <\/script></body></html>`);
    w.document.close();
  }

  /* ================= OUTSTANDING PAYMENT REPORT ================= */
  function outstanding({ termLabel, session, rows, win }) {
    rows = rows || [];
    const due = rows.reduce((s, r) => s + Number(r.grand_total || 0), 0);
    const paid = rows.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const owing = rows.reduce((s, r) => s + Number(r.balance || 0), 0);
    const classes = byClass(rows, r => Number(r.balance || 0));

    open('Outstanding Payment Report', `
      <div class="sheet">
        ${header()}
        ${banner('Outstanding Payment Report', 'Pupils Yet to Fully Pay Their Fees')}
        ${meta(session, termLabel)}
        <div class="kpis" style="grid-template-columns:repeat(4,1fr)">
          ${kpi('k-red', 'users', 'Total Pupils Owing', rows.length)}
          ${kpi('k-blue', 'coins', 'Total Amount Due', naira(due))}
          ${kpi('k-green', 'check', 'Total Amount Paid', naira(paid))}
          ${kpi('k-red', 'alert', 'Total Outstanding', naira(owing))}
        </div>
        <table class="grid">
          <thead><tr><th>S/N</th><th>Admission No.</th><th class="l">Pupil Name</th><th>Class</th><th class="r">Fee Due (₦)</th><th class="r">Paid (₦)</th><th class="r">Outstanding (₦)</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.length ? rows.map((r, i) => `
              <tr><td>${i + 1}</td><td>${esc(r.admission_no)}</td><td class="l">${esc(r.full_name)}</td><td>${esc(r.class_name)}</td>
                <td class="r">${money(r.grand_total)}</td><td class="r">${money(r.amount_paid)}</td><td class="r"><b>${money(r.balance)}</b></td><td>${pill(r.status)}</td></tr>`).join('')
              : '<tr><td colspan="8" class="empty">No outstanding balances for this selection.</td></tr>'}
          </tbody>
        </table>
        <div class="grow"></div>
        <div class="lower">
          <div class="box">
            <div class="box-title">Summary by Class (Owing)</div>
            <table class="mini">
              <thead><tr><th>Class</th><th class="r">Pupils Owing</th><th class="r">Amount Outstanding</th></tr></thead>
              <tbody>
                ${classes.map(([c, v]) => `<tr><td>${esc(c)}</td><td class="r">${v.count}</td><td class="r">${naira(v.value)}</td></tr>`).join('')}
                <tr class="total"><td>Total</td><td class="r">${rows.length}</td><td class="r">${naira(owing)}</td></tr>
              </tbody>
            </table>
          </div>
          ${signBlock('Finance Department')}
        </div>
        ${footer()}
      </div>`, win);
  }

  /* ================= PAID FEES REPORT ================= */
  function paid({ title, subtitle, termLabel, session, rows, win }) {
    rows = rows || [];
    const collected = rows.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const classes = byClass(rows, r => Number(r.amount_paid || 0));

    open(title || 'Paid School Fees Report', `
      <div class="sheet">
        ${header()}
        ${banner(title || 'Paid School Fees Report', subtitle || 'Pupils Who Have Completely Paid Their School Fees')}
        ${meta(session, termLabel)}
        <div class="kpis" style="grid-template-columns:1fr 1.4fr 1.6fr">
          ${kpi('k-green', 'users', 'Total Pupils Listed', rows.length)}
          ${kpi('k-blue', 'coins', 'Total Amount Collected', naira(collected))}
          <div></div>
        </div>
        <table class="grid">
          <thead><tr><th>S/N</th><th>Admission No.</th><th class="l">Pupil Name</th><th>Class</th><th class="r">Amount Due (₦)</th><th class="r">Amount Paid (₦)</th><th>Payment Date</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.length ? rows.map((r, i) => `
              <tr><td>${i + 1}</td><td>${esc(r.admission_no)}</td><td class="l">${esc(r.full_name)}</td><td>${esc(r.class_name)}</td>
                <td class="r">${money(r.grand_total)}</td><td class="r"><b>${money(r.amount_paid)}</b></td><td>${dateStr(r.last_payment_date)}</td><td>${pill(r.status)}</td></tr>`).join('')
              : '<tr><td colspan="8" class="empty">No pupils match this selection.</td></tr>'}
          </tbody>
        </table>
        <div class="grow"></div>
        <div class="lower">
          <div class="box">
            <div class="box-title">Payment Summary</div>
            <table class="mini">
              <thead><tr><th>Class</th><th class="r">Pupils</th><th class="r">Amount Collected (₦)</th></tr></thead>
              <tbody>
                ${classes.map(([c, v]) => `<tr><td>${esc(c)}</td><td class="r">${v.count}</td><td class="r">${money(v.value)}</td></tr>`).join('')}
                <tr class="total"><td>Total</td><td class="r">${rows.length}</td><td class="r">${money(collected)}</td></tr>
              </tbody>
            </table>
          </div>
          ${signBlock('Finance Department')}
        </div>
        ${footer()}
      </div>`, win);
  }

  /* ================= INDIVIDUAL PAYMENT STATEMENT ================= */
  function statement({ pupil, termLabel, session, lines, adjustments, totalDue, totalPaid, balance, status, payments, win }) {
    pupil = pupil || {};
    lines = lines || [];
    adjustments = adjustments || [];
    payments = payments || [];
    const st = STATUS[status] || STATUS.unpaid;
    const statusText = status === 'paid' ? 'PAID' : status === 'partial' ? 'PART PAID' : 'NOT PAID';

    const paidSchool = payments.filter(p => p.category !== 'ICT Fee').reduce((s, p) => s + Number(p.amount || 0), 0);
    const paidIct    = payments.filter(p => p.category === 'ICT Fee').reduce((s, p) => s + Number(p.amount || 0), 0);

    const infoRow = (k, v) => `<tr><td style="color:#6b7280;width:42%">${k}:</td><td><b>${esc(v || '—')}</b></td></tr>`;

    open(`Payment Statement — ${pupil.full_name || ''}`, `
      <div class="sheet">
        ${header()}
        ${banner('Individual Payment Statement', 'Student Payment Record and Fee Breakdown')}

        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="box">
            <div class="box-title">Pupil Information</div>
            <div style="display:flex;gap:12px;padding:10px">
              <div style="width:62px;height:72px;border:1px solid var(--line);border-radius:4px;display:grid;place-items:center;background:var(--soft);flex:none">${icon('user', 40, '#13306b')}</div>
              <table class="mini" style="font-size:11px">
                ${infoRow('Name', pupil.full_name)}
                ${infoRow('Admission No.', pupil.admission_no)}
                ${infoRow('Class', pupil.class_name)}
                ${infoRow('Parent/Guardian', pupil.parent_name)}
                ${infoRow('Academic Session', session)}
                ${infoRow('Term', termLabel)}
              </table>
            </div>
          </div>
          <div class="box">
            <div class="box-title">Fee Breakdown</div>
            <table class="mini">
              <thead><tr><th>Fee Category</th><th class="r">Amount (₦)</th></tr></thead>
              <tbody>
                ${lines.map(l => `<tr><td>${esc(l.label)}</td><td class="r">${money(l.amount)}</td></tr>`).join('')}
                ${adjustments.map(a => `<tr><td style="color:${a.isCharge ? '#b91c1c' : '#15803d'}">${esc(a.label)}</td><td class="r" style="color:${a.isCharge ? '#b91c1c' : '#15803d'}">${a.isCharge ? '+' : '−'}${money(a.amount)}</td></tr>`).join('')}
                <tr class="total"><td>Total Assigned</td><td class="r">${money(totalDue)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="kpis" style="grid-template-columns:repeat(3,1fr) 1.2fr">
          ${kpi('k-blue', 'coins', 'Total Due', naira(totalDue))}
          ${kpi('k-green', 'check', 'Total Paid', naira(totalPaid))}
          ${kpi(balance > 0 ? 'k-red' : 'k-green', balance > 0 ? 'alert' : 'check', 'Outstanding', naira(balance))}
          <div class="kpi" style="background:${st.bg};border-color:${st.border}">
            <span class="ic" style="background:${st.color}">${icon(status === 'paid' ? 'check' : 'alert', 17, '#fff')}</span>
            <div><small>Payment Status</small><b style="color:${st.color}">${statusText}</b></div>
          </div>
        </div>

        <div class="box" style="margin-top:12px">
          <div class="box-title">Payment History</div>
          <table class="grid" style="margin:0">
            <thead><tr><th>Date</th><th class="l">Description</th><th>Category</th><th class="r">Amount (₦)</th><th>Method</th><th>Receipt No.</th></tr></thead>
            <tbody>
              ${payments.length ? payments.map(p => `
                <tr><td>${dateStr(p.date)}</td><td class="l">${esc(p.description)}</td><td>${esc(p.category)}</td>
                  <td class="r">${money(p.amount)}</td><td>${esc(p.method || '—')}</td><td>${esc(p.reference || '—')}</td></tr>`).join('')
                : '<tr><td colspan="6" class="empty">No payments recorded for this term.</td></tr>'}
            </tbody>
          </table>
        </div>

        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">
          <div class="box">
            <div class="box-title">Payment Summary</div>
            <table class="mini">
              <tr><td>School Fees</td><td class="r">${money(paidSchool)}</td></tr>
              <tr><td>ICT / Portal Fee</td><td class="r">${money(paidIct)}</td></tr>
              <tr class="total"><td>Total Paid</td><td class="r">${money(totalPaid)}</td></tr>
            </table>
          </div>
          <div class="note" style="margin-top:0">
            <b style="color:#1f2937">Note:</b><br>
            This statement is generated from the school's payment records and is valid only for the stated academic session and term.
            Voided payments are not included.
          </div>
        </div>

        <div class="grow"></div>
        <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:flex-end;page-break-inside:avoid">
          <div class="sign-line">Accountant<span>${SCHOOL.name}</span></div>
          <div style="font-size:11px"><b>Date Printed</b><br>${today()}</div>
          ${seal()}
        </div>
        ${footer()}
      </div>`, win);
  }

  window.RCA_PRINT = { prepare, outstanding, paid, statement };
})();
