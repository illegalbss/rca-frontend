# Greenfield Primary School Management System
## Phase 1: Static Frontend (HTML, CSS, JavaScript)

This is the foundation of your school management system — a fully static
website and dashboard UI built with HTML, CSS, and vanilla JavaScript.
No backend, no database yet. Everything you see is "for display only."

---

## 🚀 How to Run This Project

### Option 1: VS Code Live Server (Recommended)
1. Open this folder in VS Code (`File → Open Folder`)
2. Install the **"Live Server"** extension (by Ritwick Dey) from the Extensions tab
3. Right-click `index.html` → **"Open with Live Server"**
4. Your browser opens automatically at `http://127.0.0.1:5500`
5. Any time you save a file, the browser refreshes automatically

### Option 2: Just open the file
Double-click `index.html` — it will open in your default browser.
(Some features like fetch() won't work this way later, but for Phase 1 it's fine.)

### Testing on your phone (same WiFi network)
1. Find your computer's local IP address (e.g., `192.168.1.50`)
   - Windows: open Command Prompt, type `ipconfig`
   - Mac: System Settings → WiFi → Details
2. With Live Server running, on your phone's browser go to:
   `http://192.168.1.50:5500`
3. Now you can test how the site looks on a real Android phone!

---

## 📁 Folder Structure Explained

```
school-management-system/
├── index.html              ← Homepage (start here)
├── about.html               (to be built)
├── admissions.html          (to be built)
├── ...other public pages
│
├── admin/                  ← Admin dashboard pages
├── results/                ← Result management pages
├── finance/                ← Finance management pages
├── ict/                    ← ICT department pages
├── communication/          ← Newsletters & notices
│
└── assets/
    ├── css/
    │   ├── variables.css   ← ALL colors, fonts, spacing defined here
    │   ├── style.css        ← Reset + reusable components (buttons, cards, grid)
    │   ├── layout.css       ← Header, footer, navigation
    │   └── pages/           ← One CSS file per page (home.css, etc.)
    │
    ├── js/
    │   └── main.js          ← Shared JS: mobile menu, active nav link
    │
    └── images/
```

---

## 🎨 Design System

Every color, font size, and spacing value lives in `assets/css/variables.css`.
**Never hardcode a color in a page file.** Always reference a variable:

```css
/* ❌ Don't do this */
.my-element { color: #1e5631; }

/* ✅ Do this instead */
.my-element { color: var(--color-primary); }
```

This means if you ever want to change your school's brand color, you change
ONE line in `variables.css` and the entire site updates.

---

## ✅ What's Built So Far

- [x] Folder structure
- [x] Design system (`variables.css`)
- [x] Global reset & reusable components (`style.css`)
- [x] Header/Footer/Navigation with mobile hamburger menu (`layout.css` + `main.js`)
- [x] Homepage (`index.html` + `home.css`)
- [x] About Us page (`about.html` + `about.css`)
- [x] Admissions page with full application form (`admissions.html` + `admissions.css`)
- [x] Contact page with contact form (`contact.html` + `contact.css`)
- [x] News & Events page with category filtering (`news-events.html` + `news.css` + `news-filter.js`)
- [x] Gallery page with lightbox image viewer (`gallery.html` + `gallery.css` + `gallery.js`)
- [x] Academic Calendar with vertical timeline (`academic-calendar.html` + `calendar.css`)
- [x] ICT Department page with curriculum accordion (`ict-department.html` + `ict.css` + `ict-accordion.js`)
- [x] Shared components: page banners, CTA sections, form styles (`shared.css`)

**🎉 MODULE 1 (Public School Website) — COMPLETE — all 8 pages built and linked**

- [x] Pre-Nursery 1-2 and Nursery 1-3 added across Admissions, About, Homepage, ICT, and Calendar
- [x] Homepage slideshow (auto-play, dots, prev/next, pause-on-hover)
- [x] Gallery "Featured Highlights" slideshow + Nursery filter category

**🎉 MODULE 2 (Administration) — IN PROGRESS**

- [x] Admin login page — demo only, no real authentication (`admin/login.html`)
- [x] Dashboard shell — sidebar + topbar + content area (`admin/dashboard.html`)
- [x] Role-based sidebar visibility using `data-roles` + sessionStorage
- [x] Mobile-responsive off-canvas sidebar (slides in/out below 900px)
- [x] CSS-only bar charts (no library) for attendance + class distribution
- [x] "Staff Login" link added to footer of all 8 public pages
- [x] **Student Management** — class picker + per-class searchable/sortable table (`admin/students.html`)
- [x] Procedural sample data generator — ~370-400 realistic pupil records (`sample-students.js`)
- [x] Dashboard's "Total Pupils" stat now reads live from the same sample data (single source of truth)
- [x] **Teacher Management** — filterable card grid + detail modal for ~19-22 staff (`admin/teachers.html`)
- [x] Sample staff data generator with realistic roles, subjects, and class assignments (`sample-teachers.js`)
- [x] **Class Management** — class grid + detail panel, joins Students + Teachers data by class name (`admin/classes.html`)
- [x] Deep-linking between Classes and Students pages via URL query parameters
- [x] **Attendance Management** — class/date register with Present/Absent/Late/Excused marking (`admin/attendance.html`)
- [x] In-memory attendance storage keyed by class+date composite key, with unsaved-changes warning
- [x] **Discipline Records** — class picker, severity-coded incident log, log-incident form (`admin/discipline.html`)
- [x] First admin page that creates new records in-session, not just displays existing data
- [x] **Promotion Records** — threshold-based suggestions, manual overrides, Basic 6 graduate handling (`admin/promotion.html`)

**🎉 MODULE 2 (Administration) — COMPLETE — every admin page built, every internal link verified**

- [x] **Subjects & Grading rulebook** — single source of truth for CA weights, exam max, and A-F grade scale (`subjects-and-grading.js`)
- [x] **Score Entry** — editable CA + Exam grid with live grade computation per class/subject (`admin/score-entry.html`)
- [x] **Report Cards** — printable per-pupil document with class ranking, remarks, and `@media print` styling (`admin/report-card.html`)
- [x] Sample result data generator using realistic "ability bands" — ~3,300 records across all pupils and subjects

- [ ] Subject Management as a standalone page, Examination Records, Result Approval workflow
- [ ] Finance, Communication modules
- [ ] Parent login & fee payment (Module 4/8/9 — planned for Phase 4, requires real backend)

---

## 🧠 Key Concepts Used So Far

| Concept | Where | What it does |
|---|---|---|
| CSS Variables (`:root`) | variables.css | Central place for design tokens |
| CSS Reset | style.css | Removes inconsistent browser defaults |
| Flexbox | layout.css (navbar) | Aligns logo, links, button in a row |
| CSS Grid | style.css (.grid classes) | Responsive card layouts |
| Mobile-first media queries | layout.css | `@media (max-width: 768px)` for mobile nav |
| `classList.toggle()` | main.js | Opens/closes mobile menu |
| `DOMContentLoaded` | main.js | Ensures HTML is loaded before JS runs |
| Sticky positioning | layout.css | Header stays visible on scroll |

---

## 🎨 CSS Architecture (Updated)

```
variables.css   → design tokens (colors, fonts, spacing)
style.css       → global reset + base components (buttons, cards, grid, badges)
layout.css      → header, footer, navigation
shared.css      → components used on 2+ inner pages (page banners, CTA, forms)
pages/*.css     → styles unique to ONE page only
```

**Loading order matters!** Always link them in this order:
```html
<link rel="stylesheet" href="assets/css/variables.css">
<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/layout.css">
<link rel="stylesheet" href="assets/css/shared.css">      <!-- only on inner pages -->
<link rel="stylesheet" href="assets/css/pages/PAGENAME.css">
```

---

## 🧠 New Concepts: Forms & Validation (Admissions + Contact)

- **`required` attribute** — browser won't submit the form until filled
- **`event.preventDefault()`** — stops the page from reloading on submit
- **`form.checkValidity()`** — checks all required fields via JS
- **`FormData` + `Object.fromEntries()`** — turns form inputs into a JS object (open browser console with F12 to see this in action when you submit a form!)
- **`snake_case` field names** — `pupil_full_name`, `parent_phone` etc. — these will become database column names in Phase 3, so naming them correctly NOW saves work later

### Try this:
1. Open `admissions.html` in your browser
2. Open DevTools (F12) → Console tab
3. Fill out the form and click Submit
4. You'll see the form data printed as a JavaScript object — this is EXACTLY the kind of data we'll save to a database in later phases

---

## ✅ Correction: Real Curriculum Subjects + Official Grading Scale

The original 9-subject placeholder list and 5-band A-F scale have been
replaced with the school's actual values:

**19 subjects** (was 9): English Language, Comprehension, Phonics,
Spelling/Dictation, Asusu Igbo, Mathematics, Basic Science, Home Economics,
Social Studies, C.R.K, Agric Science, Health Education, Verbal Reasoning,
Quantitative Reasoning, Writing, Creative Arts, Civic Education, Computer,
History.

**6-band grading scale** (was 5-band): A = 70-100 Excellent, B = 60-69
Very Good, C = 50-59 Good, D = 45-49 Pass, E = 40-44 Weak Pass, F = 0-39
Fail.

Because both values live in exactly one place — `subjects-and-grading.js`
— this correction automatically applied everywhere: the sample data
generator, Score Entry's grid, and Report Cards' per-subject and overall
grades. No other file needed editing for the grading logic itself; I only
had to update a few comments and an unrelated teacher-specialism list
(`sample-teachers.js`) that happened to reference the old subject names for
flavor text, not computation.

I re-ran the full result generation pipeline after the change: 6,916-7,087
records (366 pupils × 19 subjects, varies slightly per page load since
enrollment is randomly generated), zero mathematical violations, and every
grade boundary tested exactly against your specified cutoffs (70/60/50/45/40)
— including the easy-to-miss edges like 69 vs 70 and 44 vs 45.

A new `gradeToLabel()` helper was also added so the report card's overall
grade reads as "B — Very Good" rather than a bare letter, making the
result clearer to a parent without a key.

---

Every page is built and cross-linked: Dashboard, Students, Teachers, Classes,
Attendance, Discipline, and Promotion. I ran a project-wide link check and
confirmed every internal `href` across all 7 admin pages now resolves to a
real file — zero "not yet built" links remain anywhere in the admin module.

## 📌 Next Steps

Module 3 (Result Management) now has Score Entry and Report Cards built.
Next we'll either extend Module 3 further (Subject Management as its own
dedicated page, Examination Records as a distinct concept from Score Entry)
or move on to **Module 4: Finance Management**. Promotion's placeholder
scores can now be swapped for these real computed averages whenever you're
ready to wire that connection up.

---

## 📝 New Module: Result Management — Score Entry & Report Cards

This is the most structurally complex module in the project — it has to
connect Subjects, Continuous Assessment, Examination scores, automatic
grade computation, and a printable Report Card, all flowing correctly into
the Promotion module we already built. Per your spec: Test + Assessment +
Project + Mid-term Test combine to 40% Continuous Assessment, Exam is 60%,
graded on the school's official 6-band A-F scale, with the same 19 subjects across all 11 classes.

### File structure

```
admin/score-entry.html                     ← class/subject picker + editable score grid
admin/report-card.html                     ← class/pupil picker + printable report card
assets/css/admin/score-entry.css            ← editable grid, live computed columns
assets/css/admin/report-card.css            ← printable document styling + @media print
assets/js/admin/subjects-and-grading.js     ← THE RULEBOOK: subjects, CA weights, grade scale
assets/js/admin/sample-results.js           ← generates ~3,300 realistic CA+Exam records
assets/js/admin/score-entry.js              ← live recalculation as scores are typed
assets/js/admin/report-card.js              ← builds the full report card + class ranking
```

### The rulebook: one shared source of truth

`subjects-and-grading.js` defines three things every other file in this
module depends on: the 19-subject list (English Language, Comprehension,
Phonics, Spelling/Dictation, Asusu Igbo, Mathematics, Basic Science, Home
Economics, Social Studies, C.R.K, Agric Science, Health Education, Verbal
Reasoning, Quantitative Reasoning, Writing, Creative Arts, Civic Education,
Computer, History), the CA component maxes (Test 10 +
Assessment 10 + Project 10 + Mid-term 10 = 40, Exam 60), and the grade
boundaries (A≥70 Excellent, B≥60 Very Good, C≥50 Good, D≥45 Pass, E≥40 Weak
Pass, F below 40 Fail). Crucially, it also exports
ONE function — `computeFinalScore()` — that every other piece of code
calls to turn raw scores into a final mark and grade. Score Entry uses it
on every keystroke; the sample data generator uses it to build realistic
placeholder records; Report Cards uses it (via `scoreToGrade()`) to compute
overall averages. There is exactly one place where "what counts as a B" is
defined — never duplicated, never able to quietly drift out of sync.

### Score Entry: live computation without losing focus

Pick a class and subject, and every pupil appears in an editable grid —
four CA component inputs, an Exam input, and three read-only computed
columns (CA Total, Final Score, Grade) that update **as you type**, not on
a separate "calculate" button. The key implementation detail: typing a
score doesn't re-render the whole table (which would steal focus mid-type)
— it surgically updates just that row's computed cells via
`row.querySelector(...)`. Out-of-range input (like typing 15 into a /10
field) gets visually flagged red but is also mathematically clamped, so a
typo can't silently corrupt a pupil's final score.

### Report Cards: the culmination, with real ranking

Pick a class and a pupil, and the page builds a complete, printable
document: every subject's CA/Exam/Final/Grade, an overall average and
grade, the pupil's position within their class, and an auto-generated
remark whose tone matches their grade band. Class position uses standard
competition ranking — ties share a position, and the rank correctly skips
ahead afterward (e.g. two pupils tied for 24th, next pupil is 26th, not
25th). I verified this against real generated data for an entire class of
42 pupils and confirmed the ranking, including two genuine ties, computed
exactly right.

### Key concepts introduced

**A single computation function, called everywhere**
`computeFinalScore()` is the one function responsible for CA+Exam math
across the entire module. This is the same "single source of truth"
principle from Promotion's pass threshold, applied to something with real
mathematical consequences if it were ever duplicated and allowed to drift.

**Targeted DOM updates vs. full re-renders**
Every other admin page so far re-renders its whole list on any change.
Score Entry can't do that — re-rendering on every keystroke would yank
focus out of the input the person is actively typing in. Updating just the
3 computed cells in that one row, by reference, is the first time this
project needed that more surgical approach.

**Print stylesheets with `@media print`**
Report Cards is the first page styled for both screen AND paper from one
HTML file. `@media print { }` rules hide the sidebar and toolbar entirely
and strip card shadows/borders — completely inert on screen, fully active
the moment you print or print-preview. `.no-print` marks anything that
should vanish on paper.

**Standard competition ranking**
Computing "position in class" isn't just sorting and taking an array
index — ties need to share a position. The formula `1 + count of pupils
with a strictly higher average` handles this correctly without any special
tie-detection code, which I confirmed against a real tie in the generated
data rather than a synthetic test case.

**Ability bands for realistic generated data**
`sample-results.js` assigns each pupil one overall ability band (struggling
through excellent), then generates every subject's scores as small
variations around that pupil's center — not pure independent randomness
per subject. This is why a "strong" pupil's report card looks like a real
one: generally consistent performance with believable subject-to-subject
wobble, not a wild A-in-Maths/F-in-English swing from chance alone.

### Try this:
1. Open `admin/score-entry.html` — pick a class and subject, change a
   Test score, watch CA Total, Final, and Grade update instantly without
   the page jumping or losing your cursor position
2. Try typing 15 into a Test field (max is 10) — the input flags red, and
   the math still uses the clamped value of 10
3. Open `admin/report-card.html` — pick the same class, browse a few
   pupils, and compare their "Position in Class" — the ranks should make
   sense relative to their averages
4. Click "Print Report Card" and look at the print preview — the sidebar
   and dropdowns should vanish, leaving a clean printable document
5. In the same browser tab, edit a score on Score Entry, then navigate
   to Report Cards (without refreshing) — that pupil's report card should
   reflect your edit, since both pages share one in-memory results object
   for the duration of the tab session

---

## 🎓 New Module: Promotion Records (the most logic-heavy page yet)

This page already existed, with code I'd call the most carefully reasoned
in the project so far. I reviewed every file in full, then specifically
stress-tested its branching logic in Node, since promotion decisions have
more edge cases (the Basic 6 "graduate instead of promote" rule, manual
overrides) than anything we'd built before.

### File structure

```
admin/promotion.html                      ← class picker, review table, confirm modal
assets/css/admin/promotion.css             ← summary cards, decision badges, sticky confirm bar
assets/js/admin/sample-promotion.js        ← generates a placeholder average score per pupil
assets/js/admin/promotion.js               ← suggestion logic, manual overrides, confirm flow
```

### How it works

Pick a class, and every pupil appears with their (placeholder) average
score, a system-suggested decision badge, and an editable dropdown.
Scores at or above 40% suggest "Promote" (or "Graduate" for Basic 6
specifically, since there's no Basic 7 to promote into); below 40%
suggests "Repeat." Staff can override any individual pupil's decision —
overridden rows are visually flagged — and "Apply Suggested to All" resets
a class back to the computed defaults. A sticky confirm bar at the bottom
opens a modal summarizing exactly what will happen before anything is
"applied."

### Key concepts introduced

**An honest placeholder, not a fake one**
Promotion decisions should be based on real exam results — but Module 3
doesn't exist yet. Rather than skip this page or silently fake the data,
`sample-promotion.js` generates a clearly-labeled placeholder average
score per pupil (with a visible on-page notice explaining this), while
keeping the *threshold rule itself* — `window.PROMOTION_PASS_THRESHOLD`,
shared as a single source of truth — exactly what Module 3 will plug real
computed averages into later. The promotion *logic* doesn't change when
real data arrives; only where the score number comes from does.

**Suggested vs. actual: two separate concepts**
`getSuggestedDecision()` always reflects what the threshold rule says,
full stop. `getActualDecision()` checks for a manual override first,
falling back to the suggestion otherwise. Keeping these separate (rather
than overwriting the suggestion when someone overrides it) is what makes
"Apply Suggested to All" possible — it can always reset cleanly because
the original rule-based suggestion was never destroyed.

**A self-cleaning override map**
If a person overrides a pupil to "Repeat" and then changes their mind back
to the suggested "Promote," the code deletes that override entry entirely
rather than storing a redundant value that happens to match the default.
I tested this exact sequence in Node — override, then revert — and
confirmed the override map ends up empty again, not just visually
matching.

**A special case handled consistently everywhere it appears**
Basic 6 has no "next class." This single fact — `getNextClass('Basic 6')
=== null` — correctly cascades through the dropdown options (Graduate
instead of Promote), the summary card labels, and the confirmation modal
text, all driven from one function rather than separate hardcoded checks
in four places. I tested `getNextClass()` across all 11 classes and
confirmed only Basic 6 returns null.

**A confirmation step before a consequential action**
Clicking "Confirm & Apply" doesn't immediately change anything — it opens
a modal summarizing exactly what will happen ("33 pupils will be promoted
to Basic 4, 7 will repeat Basic 3") and requires a second explicit click.
For an action this significant, making the person review a plain-English
summary before committing is a real safety habit worth keeping even once
this becomes a permanent database operation in Phase 4.

### Try this:
1. Open `admin/promotion.html` — read the Phase 1 placeholder-data notice
   at the top
2. Pick a class other than Basic 6 — note the summary cards and the
   "→ promotes into [Class]" text
3. Switch to Basic 6 — the text changes to "final year," and the dropdown
   options change from Promote/Repeat to Graduate/Repeat
4. Override a pupil's decision manually — the row and dropdown visually
   flag as overridden, and the summary cards update
5. Change that same pupil's dropdown back to the suggested value — the
   "overridden" flag disappears
6. Click "Apply Suggested to All" — every override in the current class
   clears at once
7. Click "Confirm & Apply Promotion Decisions" — review the modal's
   plain-English summary before confirming

---

## ⚠️ New Module: Discipline Records (the first page that creates new data)

This page exists already had its HTML, CSS, and data generator built —
I reviewed every file thoroughly rather than rebuilding, then ran the full
generation and add-incident logic end-to-end in Node to confirm correctness
before signing off on it.

### File structure

```
admin/discipline.html                     ← class picker + incident log + log-incident modal
assets/css/admin/discipline.css            ← severity color-coding, filter pills, modal
assets/js/admin/sample-discipline.js       ← generates ~100 realistic incidents
assets/js/admin/discipline.js              ← class cards, severity filter, ADDING new incidents
```

### How it works

Discipline tracking applies to Basic 1-6 only — the data generator
deliberately excludes Pre-Nursery/Nursery, since incident logging like this
doesn't apply to children that young in a real primary school. Each of the
6 class cards is left-border color-coded by the *worst* severity present:
gray for a clean record, amber if there's minor/moderate activity, red if
any major incident exists — letting a Head Teacher scan all 6 cards and
immediately spot which classes need attention without opening each one.

Inside a class, a severity filter (All/Minor/Moderate/Major) narrows the
incident table, and a "Log Incident" button opens a modal form — pupil
dropdown (scoped to just this class), date, severity, description, action
taken, and a parent-notified checkbox.

### Key concepts introduced

**The first page that truly creates data, not just displays it**
Every previous admin page only ever read and displayed existing sample
data. Submitting the Log Incident form does something new:
`allIncidents.push(newIncident)` adds a brand new record to the in-memory
array. The critical design detail: the new record's shape exactly matches
what the generator produces, so the same rendering functions
(`renderClassCards`, `renderIncidentTable`) work identically whether a
record came from generated sample data or was just typed in by a person.
I tested this specifically in Node — submitting a simulated incident
correctly increased the total count, appeared under its class, and
appeared under its severity filter.

**Severity encoded as a visual signal, not just text**
The class cards' left-border color and the severity chips/badges aren't
decorative — they're a deliberate triage tool. Color communicating
priority at a glance, before reading any text, is a real UX pattern worth
noticing here.

**Realistic data distribution, not uniform randomness**
The generator doesn't give every pupil a random number of incidents
evenly — about 70% have zero, ~22% have one, and major incidents are
rare. This kind of weighted randomness produces sample data that actually
feels like a real school, rather than an obviously fake uniform spread.

### Try this:
1. Open `admin/discipline.html` — scan the 6 class cards; note the
   left-border colors signal severity at a glance before you read any
   numbers
2. Click into a class with a red border — filter by "Major" to see only
   the serious incidents
3. Click "Log Incident," fill out the form, submit — your new incident
   should appear immediately in the table, correctly sorted by date
   alongside the generated ones
4. Go back to the class picker — the card's incident count and severity
   chips should reflect the incident you just added

---

## 📋 New Module: Attendance Management (the first page with real "saving")

This is the first admin page where the person actually *changes* data
(marking pupils Present/Absent/Late/Excused) and needs those changes to
persist while they keep using the page — a meaningfully different problem
from Students/Teachers/Classes, which only ever *displayed* data.

### File structure

```
admin/attendance.html                     ← class/date picker + register + save bar
assets/css/admin/attendance.css            ← summary cards, status pills, sticky save bar
assets/js/admin/attendance.js              ← register logic, date math, in-memory storage
```

### How it works

Pick a class and a date (or use the Prev/Next/Today buttons), and the page
shows every pupil in that class with four status pill buttons — Present,
Absent, Late, Excused — defaulting to Present, since most schools mark
exceptions rather than everyone individually. Click a pill to change that
pupil's status; the summary cards above the table update instantly. A
"Mark All Present" button handles the common case in one click. A sticky
save bar at the bottom shows "Unsaved changes" until you click Save.

### Key concepts introduced

**Composite keys**
Each register is stored under a key like `"Basic 1|2026-06-19"` — combining
class name and date together, since attendance genuinely depends on both.
This is exactly how you'd design a real database table's primary key in
Phase 3 (a unique constraint on `class_id + date`, not just one or the
other). I tested this in Node to confirm different class/date combinations
never overwrite each other.

**In-memory state that mimics future persistence**
`attendanceStore` is a plain JS object living only in memory — refreshing
the page loses everything, which is a real Phase 1 limitation we keep
visible on purpose (the "Unsaved changes" indicator). The important design
choice: this object's *shape* is exactly what Phase 2 will store in
`localStorage`, and exactly what a real `attendance` database table will
look like in Phase 3/4. Only *where* the data lives changes — the
rendering code stays the same.

**Date math with the built-in `Date` object**
The Prev/Next day buttons use `date.setDate(date.getDate() ± 1)`, which
correctly rolls over month and year boundaries (e.g. June 30 → July 1)
without any special-case code — JavaScript's `Date` handles that
arithmetic for you. I tested this specifically across a month boundary to
confirm it behaves correctly.

**`beforeunload` — warning before losing work**
If there are unsaved changes and the person tries to close the tab or
navigate away, the browser shows its built-in "Leave site? Changes you
made may not be saved" dialog. This only fires when `hasUnsavedChanges` is
true, so it never annoys someone who hasn't changed anything.

### Try this:
1. Open `admin/attendance.html` — it defaults to today's date and the
   first class in the list
2. Click a few status pills for different pupils — watch the summary
   cards update live, and notice "Unsaved changes" appear in the save bar
3. Click "Mark All Present" — every pupil resets, summary updates
4. Click Save — the status changes to "Saved at [time]"
5. Use the Prev/Next day buttons to move between dates, then come back —
   each date you've visited keeps its own independent register in memory
6. Try closing or refreshing the tab right after marking someone absent
   (before clicking Save) — your browser should warn you about unsaved
   changes
7. Pick a Saturday or Sunday — the weekend notice banner should appear

---

## 🏫 New Module: Class Management (joins Students + Teachers)

This page introduces no new sample data of its own — instead it **derives**
everything by combining the existing student and teacher data, joined by
class name. This is the closest Phase 1 gets to how a real database query
works in Phase 3/4.

### File structure

```
admin/classes.html                        ← class grid + detail panel
assets/css/admin/classes.css               ← cards, detail layout, chips
assets/js/admin/classes.js                 ← the "join" logic + rendering
```

### How the join works

`getClassData(className)` is the heart of this page. Given a class name, it:
- filters `SAMPLE_STUDENTS` for pupils in that class
- finds the ONE teacher whose role is "Class Teacher" and whose
  `assigned_classes` includes this class
- filters for any OTHER staff (specialists like the ICT Administrator)
  who also teach this class but aren't its dedicated class teacher
- counts male/female pupils and combines subjects from all teaching staff,
  using a `Set` to automatically remove duplicates

This single function powers both the class grid cards (compact summary)
and the detail panel (full breakdown) — write the data logic once, render
it twice in different levels of detail.

### Key concepts introduced

**The "join" pattern**
Real databases combine rows from multiple tables using a shared column —
here, `class_name`. `classes.js` does the same thing in plain JavaScript
using `.filter()` and `.find()`, which is exactly the mental model you'll
need once we write real SQL `JOIN` queries in Phase 3.

**`Set` for automatic de-duplication**
`new Set()` is a JavaScript structure that silently discards duplicate
values when you `.add()` them. We use it to combine subjects from multiple
teachers into one clean list with no repeats, then convert back to an array
with `[...mySet]` to use `.map()` on it.

**Deep-linking with `URLSearchParams`**
The "View Pupils" button on a class's detail panel now links to
`students.html?class=Basic%201` instead of the generic Students page.
`encodeURIComponent()` safely escapes the space in "Basic 1" for use in a
URL; on the receiving end, `students.js` reads it back with
`new URLSearchParams(window.location.search).get('class')` and jumps
straight to that class's pupil table — no class picker step required.
This is the standard way two pages "talk" to each other through the URL
itself, without needing localStorage or a backend.

### Try this:
1. Open `admin/classes.html` — browse all 11 class cards, each showing its
   assigned class teacher and a live pupil/gender count
2. Click into "Basic 1" — see the full detail panel: class teacher contact
   info, statistics, subjects (de-duplicated across all teaching staff),
   and any specialist staff also teaching that class
3. Click "View Pupils" — you should land directly on Basic 1's pupil table
   on the Students page, not the generic class picker
4. Compare the pupil counts shown here against what you saw on the
   Students page — they should always match exactly, since both pages
   read from the same underlying sample data

---

## 👩‍🏫 New Module: Teacher Management (~19-22 staff)

Unlike the 400 pupils, staff count is small and fixed, so this page uses a
simpler pattern than Student Management: a **filterable card grid** with a
**detail modal**, instead of class-grouping or drill-down views.

### File structure added

```
admin/teachers.html                       ← card grid + detail modal
assets/css/admin/teachers.css              ← cards, role badges, modal styling
assets/js/admin/sample-teachers.js         ← generates ~19-22 realistic staff records
assets/js/admin/teachers.js                ← card rendering, search, role filter, modal logic
```

### How it works

Every staff member appears as a card showing their avatar initials, name,
role, staff ID, and up to 3 assigned classes (with a "+N more" chip if they
teach across more classes than that — useful for specialists like the ICT
Administrator who may be assigned to 6+ classes). A search box filters by
name or staff ID; a role dropdown filters by role; both filters apply
together using `&&`, not `||` — searching "Okafor" while filtering "Class
Teacher" shows only class teachers named Okafor, not everyone matching
either condition.

Clicking any card opens a **modal** — a popup overlay showing full contact
details, date joined, every subject taught, and every class assigned (no
truncation here, since there's more room in the modal than on a compact
card). The modal closes via its X button, by clicking the dark overlay
outside the card, or by pressing Escape.

### Key concepts introduced

**Modals with `position: fixed`**
`inset: 0` (shorthand for `top/right/bottom/left: 0`) combined with
`display: flex; align-items: center; justify-content: center` centers a
popup over the entire viewport regardless of scroll position. This is the
same family of technique as the Gallery lightbox from Module 1, applied to
a new use case.

**Combined AND filtering**
`teachers.js` filters by checking `matchesSearch && matchesRole` together,
not separately. This is the standard pattern for any page with more than
one filter control — you'll see it again in Attendance and Finance.

**Closing a modal three ways**
Click the X, click outside the card (checked via
`event.target === modalOverlay`, so clicks *inside* the card don't
accidentally close it), or press Escape. Supporting multiple natural ways
to dismiss a popup is a small but real accessibility/UX habit worth building
now.

**Random sampling without duplicates**
`sample-teachers.js` introduces `randomItems()`, which shuffles an array
with `.sort(() => Math.random() - 0.5)` then takes the first N items — a
common JavaScript idiom for "give me N different random items from this
list," used here to assign random class sets to specialist teachers.

### Try this:
1. Open `admin/teachers.html` — browse the staff card grid
2. Filter by role "Class Teacher" — you should see exactly 11 cards, one
   per class level
3. Search a surname while a role filter is active — confirm both conditions
   apply together
4. Click any card — the modal opens with full details
5. Try all three ways to close it: the X button, clicking outside the card,
   and pressing Escape

---

## 👨‍🎓 New Module: Student Management (handles ~400 pupils)

You asked specifically: with up to 400 pupils, one giant table doesn't work
well. We solved this with a **class-first browsing pattern** instead of
pagination — staff almost always think "show me Basic 3's pupils," not
"show me page 4 of 400."

### File structure added

```
admin/students.html                       ← class picker + class detail (two views, one page)
assets/css/admin/students.css              ← class cards, search bar, data table
assets/js/admin/sample-students.js         ← generates ~370-400 realistic sample pupils
assets/js/admin/students.js                ← class cards, drill-in, search, sort, table rendering
```

### How the two-view page works

**View 1 — class picker**: 11 cards (one per class), each showing a live
pupil count and a male/female breakdown, grouped under "Pre-Nursery & Nursery"
and "Primary (Basic 1-6)" headings. A global search bar above the cards lets
staff find any pupil by name across the *entire* school without knowing their
class first.

**View 2 — class detail**: clicking a card hides the picker and shows a
single class's pupil table, with its own search box (searches only within
that class) and a sort dropdown (Name A-Z, Name Z-A, Admission Number).
A "Back to all classes" link returns to View 1.

Both views live in the same HTML file — JavaScript toggles which one is
visible (`style.display = 'none'` / `'block'`), so navigating between them
is instant, with no page reload.

### Key concepts introduced

**Procedural data generation (the IIFE pattern)**
`sample-students.js` is wrapped in `(function () { ... })();` — an
Immediately Invoked Function Expression. This keeps helper variables like
`randomInt()` and the name lists private, while deliberately exposing only
`window.SAMPLE_STUDENTS` and `window.SCHOOL_CLASSES` for other scripts to use.
This is the same technique you'll use later to seed a real database with
test data in Phase 3/4.

**Script load order dependencies**
`students.html` loads `sample-students.js` *before* `students.js`, because
the second file reads data the first one creates. Swap that order and
you'll get a confusing "undefined" error — a classic beginner trap once a
page uses more than one script file.

**filter → map → join: the core list-rendering pattern**
`students.js` uses three array methods together constantly:
`.filter()` keeps only matching items (e.g. pupils in one class, or matching
a search term), `.map()` transforms each item into an HTML string, and
`.join('')` glues those strings into one block to insert into the page.
This exact pattern is how you'll render almost any data-driven list, with
or without a real backend behind it.

**Single source of truth**
The dashboard's "Total Pupils" stat card now reads directly from
`window.SAMPLE_STUDENTS.length` instead of a hardcoded number, so it always
matches what the Students page shows. This matters even more once a real
database exists — every page should ask the same backend for facts, never
keep its own separate copy that can drift out of sync.

### Try this:
1. Open `admin/dashboard.html` — note the "Total Pupils" number
2. Click into Students — the class picker shows 11 cards; do the math
   across all of them and it should match the dashboard number exactly
3. Click "Basic 1" — you'll see its full pupil table with a male/female-aware
   data set
4. Type a name into the class search box — the table filters live, no page
   reload
5. Change the sort dropdown to "Name (Z-A)" — the table re-orders instantly
6. Go back to all classes, and use the global search bar at the top —
   search a surname like "Okafor" and click "Go to class" on a result
7. Refresh the page a few times — the total pupil count will vary slightly
   each time (somewhere between ~360-400), since the data is randomly
   generated fresh on every page load. This is expected for Phase 1; once
   we add real data storage in Phase 2, the numbers will stay consistent
   between visits.

---

## 🏛️ New Module: Admin Dashboard Shell

This is the entry point into Module 2 (Administration). It introduces a
**completely different layout pattern** from the public site: instead of a
top navbar, admin pages use a **sidebar + topbar** layout, common in any
"back office" software.

### File structure added

```
admin/
├── login.html                    ← staff sign-in (demo only)
└── dashboard.html                ← dashboard shell + overview content

assets/css/admin/
├── login.css
├── dashboard-shell.css           ← sidebar, topbar, responsive grid (shared by ALL admin pages)
└── dashboard.css                 ← dashboard-page-only content styles

assets/js/admin/
├── login.js                      ← demo "authentication" via sessionStorage
└── dashboard-shell.js            ← sidebar toggle, role-based visibility, user badge
```

**Important: `dashboard-shell.css` and `dashboard-shell.js` are NOT page-specific.**
Every future admin page (`students.html`, `teachers.html`, `attendance.html`, etc.)
will link these two files unchanged. Only the `<main class="admin-main">` content
and an optional page-specific CSS file change per page — exactly like `shared.css`
served the public pages.

### Key concepts introduced

**CSS Grid for page-level layout**
`.admin-shell` uses `display: grid; grid-template-columns: 240px 1fr;` to create
a fixed-width sidebar and a flexible content area. We used Flexbox for the public
navbar (one row of items) — Grid is the right tool here because we have true rows
*and* columns (sidebar spans full height, content area holds its own rows).

**Relative paths from a subfolder**
Every link inside `/admin/*.html` starts with `../` (e.g. `../assets/css/style.css`)
because these files live one folder deeper than `index.html`. Forgetting this is
one of the most common beginner mistakes when a project grows past one folder.

**`data-roles` — permissions without an if/else chain**
Every sidebar link carries `data-roles="proprietor,head_teacher,teacher"` (or
`data-roles="all"`). JavaScript reads the current demo role and hides any link
that doesn't list it. Adding a new role later means editing an HTML attribute,
not rewriting JavaScript logic.

**`sessionStorage` — temporary browser memory (Phase 2 preview)**
`sessionStorage.setItem('gp_demo_role', role)` on the login page lets every
dashboard page "remember" which role is signed in, for as long as the browser
tab stays open. This is **not security** — it's a teaching tool so we can build
and test role-based UI now, before real backend authentication exists in Phase 4.

**CSS-only bar charts — no charting library needed**
Each bar's height comes from an inline custom property: `style="--val: 92%"`,
read by CSS as `height: var(--val)`. This is a clean way to keep "data" right
next to the markup describing it, without pulling in Chart.js for something
this simple. We'll likely switch to a real charting library once live data
exists in Phase 4 — but it's worth understanding the lightweight version first.

### Try this:
1. Open `admin/login.html`, select any role from the dropdown, click Sign In
2. Notice the sidebar — links you shouldn't see for that role are hidden
3. Resize your browser below 900px width — the sidebar disappears and the
   hamburger icon (☰) appears in the topbar; click it to slide the sidebar in
4. Click "Log out" — you're returned to the login screen, and the session clears
5. Try logging in as "Accountant" vs "Teacher" — compare which sidebar links
   each role can see (this is exactly how Module 8's user roles will eventually work for real)

---

## 🏫 Class Structure Update — Pre-Nursery & Nursery Added

The school now spans **11 class levels**: Pre-Nursery 1, Pre-Nursery 2,
Nursery 1, Nursery 2, Nursery 3, then Basic 1 through Basic 6. This was
updated across:

- `admissions.html` — age guide table + class dropdown (now using `<optgroup>`
  to visually group Pre-Nursery / Nursery / Primary options)
- `about.html` — school story wording
- `index.html` — homepage stats card and feature description
- `ict-department.html` — clarified ICT lab access starts at Basic 1, with a
  brief nursery "screen-time readiness" note (a deliberate judgment call —
  not every module needs every class level forced into it)
- `academic-calendar.html` — mid-term test description

**Why this matters for later phases:** when we design the database in
Phase 3, the `classes` table will have 11 rows instead of 6. Every report
card, attendance sheet, and result computation in Module 3 needs to handle
this full range correctly from day one.

---

## 🎞️ New Feature: Image Slideshow

Both `index.html` and `gallery.html` now have an auto-playing slideshow
(`assets/js/slideshow.js` + slideshow styles in `home.css`).

**Key JavaScript concept: a reusable initializer function**
Instead of writing separate slideshow code for the homepage and the gallery
page, we wrote ONE function — `initSlideshow()` — that takes any slideshow
container and wires up its dots, captions, and buttons.
`document.querySelectorAll('.slideshow').forEach(initSlideshow)` then finds
every slideshow on the current page (one, two, or none) and initializes each
one independently. This is the **DRY principle** (Don't Repeat Yourself) in
action — a core habit for writing maintainable code.

**Key concept: `setInterval()` / `clearInterval()`**
`setInterval(fn, 5000)` runs `fn` every 5 seconds forever, until stopped with
`clearInterval()`. We stop it on mouse-hover (so a parent reading a caption
isn't interrupted) and restart it after any manual click.

### Try this:
1. Open `index.html` — watch the slideshow auto-advance every 5 seconds
2. Hover your mouse over it — it pauses
3. Click a dot — it jumps directly to that slide and resets the timer
4. Open `gallery.html` — a second, independent slideshow appears above the
   filterable photo grid, plus a new "Nursery" filter button

---

## 🔐 Planned but Not Yet Built: Login, Fee Payment, Result Viewing

You asked about **parent login**, **fee payment**, and **viewing/computing
results**. These are real, important features — but building them now would
mean rebuilding them later, for one reason: **they all require actual user
authentication**, which only becomes meaningful once we have a real backend
and database (Phase 4).

Here's why a Phase 1 mockup would be wasted work:
- A "login form" with no server behind it cannot actually check a password
- "Viewing results" requires real student data tied to a real logged-in
  parent — in Phase 1 there's no database to pull that from
- "Fee payment" requires a real payment gateway (e.g. Paystack/Flutterwave)
  integrated with a backend that records the transaction securely

**Where these fit in our roadmap (already part of Module 3, 4, 8, 9):**
- Phase 3: design the `students`, `results`, `subjects`, `fee_payments`,
  and `users` (with roles) database tables — this is where login becomes
  *possible to plan properly*
- Phase 4: build real backend authentication (so a parent can only see
  their own child's results, not anyone else's), connect a payment gateway,
  and build the result computation logic (CA + Exam scores → grade →
  report card)
- Phase 5: deploy it all securely with HTTPS, so payments and login are safe

We have not lost these requirements — they are fully captured in Module 3
(Result Management), Module 4 (Finance), Module 8 (User Roles), and Module 9
(Security) from your original spec, and we'll build them properly once the
backend exists.

---

## 🧠 New Concepts: News, Gallery, Calendar & ICT pages

**Category filtering (`news-filter.js`, also used in `gallery.js`)**
Buttons carry a `data-filter="event"` attribute; cards carry a matching
`data-category="event"` attribute. Clicking a button loops through every card
and shows/hides it based on whether the two attributes match. This is the
`data-*` attribute pattern — a clean way to attach custom data to HTML elements
without inventing new tags.

**Lightbox image viewer (`gallery.js`)**
Clicking a gallery photo opens a full-screen overlay showing the larger image.
This uses a fixed-position `<div>` that's hidden by default and toggled visible
via a CSS class, plus Previous/Next buttons that change which image is loaded.

**Accordion component (`ict-accordion.js`)**
The ICT curriculum list expands and collapses per class level. Notice this
reuses the exact same `max-height` animation trick as the mobile nav menu —
once you learn a pattern in CSS/JS, you'll see it reappear everywhere.

**Vertical timeline (`calendar.css`)**
The Academic Calendar uses a CSS pseudo-element (`::before`) to draw a vertical
line, with circular "dot" markers positioned on top of it using `position: absolute`.
This is a common pattern for any chronological list (order history, project
milestones, etc).

### Try this:
1. Open `news-events.html` and click the filter buttons — watch cards
   appear/disappear instantly (no page reload)
2. Open `gallery.html`, click any photo — the lightbox opens; use the
   arrow buttons or press Escape to close it
3. Open `ict-department.html` and click "Basic 1" — watch the panel
   smoothly expand; click it again to collapse
