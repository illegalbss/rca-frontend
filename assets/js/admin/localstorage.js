/* ============================================
   PHASE 2 — localStorage Persistence
   localstorage.js — Royal Crystal Academy
   ============================================
   This file bridges Phase 1 (in-memory data) and
   Phase 4 (real database). It:

   1. On FIRST EVER load: generates all sample data,
      saves it to localStorage, sets a version flag.

   2. On EVERY subsequent load: reads from localStorage
      instead of regenerating — so data created in a
      previous session (payments, accounts, scores)
      is still there.

   3. Wraps every mutation with a SAVE function so
      changes persist immediately.

   STORAGE KEYS (all prefixed rca_v1_ to avoid
   collision with other apps on the same origin):

     rca_v1_meta          — version + first-load flag
     rca_v1_students      — SAMPLE_STUDENTS array
     rca_v1_teachers      — SAMPLE_TEACHERS array
     rca_v1_users         — SAMPLE_USERS array
     rca_v1_results       — SAMPLE_RESULTS object
     rca_v1_approvals     — RESULT_APPROVALS object
     rca_v1_behavior      — BEHAVIOR_RATINGS object
     rca_v1_payments      — PAYMENT_RECORDS object
     rca_v1_announcements — ANNOUNCEMENTS array
     rca_v1_events        — SCHOOL_EVENTS array
     rca_v1_computers     — ICT_COMPUTERS array
     rca_v1_maintenance   — ICT_MAINTENANCE array
     rca_v1_activity_log  — ACTIVITY_LOG array

   DATA VERSION: Bump DATA_VERSION when the schema
   changes. Old localStorage will be cleared and
   regenerated automatically.

   In Phase 4: Every window.RCA.save* call becomes
   a fetch() POST to the API instead.
   ============================================ */

(function () {

  const VERSION   = 'rca_v1';
  const META_KEY  = VERSION + '_meta';
  const DATA_VERSION = '2.6.0'; // bumped: Christmas Party levy removed; payment records reset so fees recalculate

  /* ---- Safe JSON helpers ---- */
  function lsGet(key) {
    try {
      const raw = localStorage.getItem(VERSION + '_' + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('localStorage read error:', key, e);
      return null;
    }
  }

  function lsSet(key, value) {
    try {
      localStorage.setItem(VERSION + '_' + key, JSON.stringify(value));
      return true;
    } catch (e) {
      // QuotaExceededError — storage full
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.error('localStorage FULL — cannot save', key);
        window.RCA_STORAGE_FULL = true;
        showStorageWarning();
      } else {
        console.warn('localStorage write error:', key, e);
      }
      return false;
    }
  }

  function lsDel(key) {
    try { localStorage.removeItem(VERSION + '_' + key); } catch(e) {}
  }

  /* ---- Storage full warning ---- */
  function showStorageWarning() {
    if (document.getElementById('rcaStorageWarning')) return;
    const el = document.createElement('div');
    el.id = 'rcaStorageWarning';
    el.style.cssText = 'position:fixed;bottom:16px;right:16px;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;padding:12px 16px;border-radius:8px;font-size:0.82rem;z-index:9999;max-width:320px;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
    el.innerHTML = '⚠️ <strong>Storage limit reached.</strong> Some changes may not be saved. This is a Phase 1 limitation — Phase 4 uses a real database with no size limit.';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 8000);
  }

  /* ---- Check if we need to (re)initialize ---- */
  const meta = lsGet('meta');
  const needsInit = !meta || meta.dataVersion !== DATA_VERSION;

  if (needsInit) {
    console.log('RCA localStorage: initializing fresh data (version', DATA_VERSION, ')');
    // Preserve student, teacher, and user data across version bumps so that
    // phone numbers, DOBs, and other admin edits are never lost when the
    // version changes (e.g. fee structure update, payment reset).
    const savedStudents      = lsGet('students');
    const savedTeachers      = lsGet('teachers');
    const savedUsers         = lsGet('users');
    const savedAdmissions    = lsGet('admission_register');
    const savedPaySettings   = lsGet('payment_settings');
    const savedResults       = lsGet('results');
    const savedApprovals     = lsGet('approvals');
    const savedBehavior      = lsGet('behavior');
    const savedDiscipline    = lsGet('discipline');
    const savedActivityLog   = lsGet('activity_log');
    const savedParentPayments = lsGet('parent_payments');

    // Clear all versioned keys. rca_newsletters is excluded because newsletters are
    // permanent school records that must survive version upgrades and resets.
    Object.keys(localStorage)
      .filter(k => k.startsWith(VERSION + '_'))
      .forEach(k => localStorage.removeItem(k));

    // Restore people data immediately so it is available to the load steps below
    if (savedStudents  && savedStudents.length  > 0) lsSet('students', savedStudents);
    if (savedTeachers  && savedTeachers.length  > 0) lsSet('teachers', savedTeachers);
    if (savedUsers     && savedUsers.length     > 0) lsSet('users',    savedUsers);
    // Admission Register holds permanent official records — must survive version bumps too
    if (savedAdmissions && savedAdmissions.length > 0) lsSet('admission_register', savedAdmissions);
    // Payment Settings is admin configuration (gateway mode, keys), not sample data — must survive too
    if (savedPaySettings) lsSet('payment_settings', savedPaySettings);
    // Real academic/administrative records — must survive version bumps too
    if (savedResults        && Object.keys(savedResults).length        > 0) lsSet('results',         savedResults);
    if (savedApprovals      && Object.keys(savedApprovals).length      > 0) lsSet('approvals',       savedApprovals);
    if (savedBehavior       && Object.keys(savedBehavior).length       > 0) lsSet('behavior',        savedBehavior);
    if (savedDiscipline     && savedDiscipline.length                  > 0) lsSet('discipline',      savedDiscipline);
    if (savedActivityLog    && savedActivityLog.length                 > 0) lsSet('activity_log',    savedActivityLog);
    if (savedParentPayments && Object.keys(savedParentPayments).length > 0) lsSet('parent_payments',  savedParentPayments);
  }

  /* ---- LOAD OR GENERATE each data store ---- */

  /* STUDENTS */
  let students = lsGet('students');
  if (!students) {
    students = window.SAMPLE_STUDENTS_SEED || [];
    lsSet('students', students);
  }
  // Filter out any archived/inactive students on load
  // so deleted students never come back after refresh
  window.SAMPLE_STUDENTS = students.filter(s =>
    s.status !== 'archived' &&
    s.status !== 'removed'
  );

  /* TEACHERS */
  let teachers = lsGet('teachers');
  if (!teachers) {
    teachers = window.SAMPLE_TEACHERS || [];
    lsSet('teachers', teachers);
  }
  window.SAMPLE_TEACHERS = teachers;

  /* USERS */
  let users = lsGet('users');
  if (!users) {
    users = window.SAMPLE_USERS || [];
    lsSet('users', users);
  }
  window.SAMPLE_USERS = users;

  /* RESULTS */
  let results = lsGet('results');
  if (!results) {
    results = window.SAMPLE_RESULTS || {};
    lsSet('results', results);
  }
  window.SAMPLE_RESULTS = results;

  /* APPROVALS */
  let approvals = lsGet('approvals');
  if (!approvals) {
    approvals = window.RESULT_APPROVALS || {};
    lsSet('approvals', approvals);
  }
  window.RESULT_APPROVALS = approvals;

  /* BEHAVIOR RATINGS */
  let behavior = lsGet('behavior');
  if (!behavior) {
    behavior = window.BEHAVIOR_RATINGS || {};
    lsSet('behavior', behavior);
  }
  window.BEHAVIOR_RATINGS = behavior;

  /* PAYMENTS */
  let payments = needsInit ? null : lsGet('payments');
  if (!payments) {
    payments = window.PAYMENT_RECORDS || {};
    lsSet('payments', payments);
  }
  window.PAYMENT_RECORDS = payments;

  /* ANNOUNCEMENTS */
  let announcements = needsInit ? null : lsGet('announcements');
  if (!announcements) {
    announcements = window.ANNOUNCEMENTS || [];
    lsSet('announcements', announcements);
  }
  window.ANNOUNCEMENTS = announcements;

  /* SCHOOL EVENTS (calendar) */
  let events = needsInit ? null : lsGet('events');
  if (!events) {
    events = window.SCHOOL_EVENTS || [];
    lsSet('events', events);
  }
  window.SCHOOL_EVENTS = events;

  /* DISCIPLINE RECORDS */
  let discipline = lsGet('discipline');
  if (!discipline) {
    const cleanMode = lsGet('clean_mode');
    discipline = cleanMode ? [] : (window.SAMPLE_DISCIPLINE || []);
    lsSet('discipline', discipline);
  }
  window.SAMPLE_DISCIPLINE = discipline;

  /* ICT COMPUTERS */
  let computers = needsInit ? null : lsGet('computers');
  if (!computers) {
    computers = window.ICT_COMPUTERS || [];
    lsSet('computers', computers);
  }
  window.ICT_COMPUTERS = computers;

  /* ICT MAINTENANCE */
  let maintenance = needsInit ? null : lsGet('maintenance');
  if (!maintenance) {
    maintenance = window.ICT_MAINTENANCE || [];
    lsSet('maintenance', maintenance);
  }
  window.ICT_MAINTENANCE = maintenance;

  /* ACTIVITY LOG */
  let activityLog = lsGet('activity_log');
  if (!activityLog) {
    activityLog = window.ACTIVITY_LOG || [];
    lsSet('activity_log', activityLog);
  }
  window.ACTIVITY_LOG = activityLog;

  /* PARENT PAYMENTS (result access fees) */
  let parentPayments = lsGet('parent_payments') || {};
  window.PARENT_PAYMENTS = parentPayments;

  /* ADMISSION REGISTER (permanent official student records) */
  let admissionRegister = lsGet('admission_register') || [];
  window.ADMISSION_REGISTER = admissionRegister;

  /* ---- Persistent admission number counter ----
     Generating admission numbers from the CURRENT active-student count
     (e.g. "RCA/2026/" + (activeCount + 1)) breaks the moment anyone is
     ever archived/removed: the count shrinks, so a later "next" number
     can collide with one already issued to an existing student. A real
     counter that only ever increments — seeded once from the highest
     number seen across the full (unfiltered) roster and register —
     can never hand out the same number twice. */
  if (!lsGet('admission_counter')) {
    let maxSeen = 0;
    students.concat(admissionRegister).forEach(r => {
      const m = (r && r.admission_no || '').match(/RCA\/\d+\/(\d+)/);
      if (m) maxSeen = Math.max(maxSeen, parseInt(m[1], 10));
    });
    lsSet('admission_counter', maxSeen);
  }
  window.nextAdmissionNo = function () {
    const year = new Date().getFullYear();
    const next = (lsGet('admission_counter') || 0) + 1;
    lsSet('admission_counter', next);
    return 'RCA/' + year + '/' + String(next).padStart(4, '0');
  };

  /* PAYMENT SETTINGS (manual vs online mode, gateway config) */
  const defaultPaymentSettings = {
    mode: 'manual', online_gateway: 'paystack', online_public_key: '',
    receipt_prefix: 'RCA-RCP', enable_result_unlock: true,
    last_updated: null, last_updated_by: null
  };
  const savedPaySettings = lsGet('payment_settings');
  window.PAYMENT_SETTINGS = savedPaySettings
    ? Object.assign({}, defaultPaymentSettings, savedPaySettings)
    : defaultPaymentSettings;

  /* ---- Write meta ---- */
  lsSet('meta', {
    dataVersion: DATA_VERSION,
    initializedAt: meta?.initializedAt || new Date().toISOString(),
    lastSaved: new Date().toISOString()
  });

  /* ================================================
     SAVE FUNCTIONS
     ================================================
     Every mutation anywhere in the app calls one of
     these. In Phase 4 each becomes a fetch() to the API.

     Pattern:  window.RCA.save('users')
               window.RCA.save('payments')
               window.RCA.save('results')
     ================================================ */

  window.RCA = {

    /* Save a specific store by name */
    save(storeName) {
      const MAP = {
        students:      () => lsSet('students',      window.SAMPLE_STUDENTS),
        teachers:      () => lsSet('teachers',      window.SAMPLE_TEACHERS),
        users:         () => lsSet('users',         window.SAMPLE_USERS),
        results:       () => lsSet('results',       window.SAMPLE_RESULTS),
        approvals:     () => lsSet('approvals',     window.RESULT_APPROVALS),
        behavior:      () => lsSet('behavior',      window.BEHAVIOR_RATINGS),
        payments:      () => lsSet('payments',      window.PAYMENT_RECORDS),
        announcements: () => lsSet('announcements', window.ANNOUNCEMENTS),
        events:        () => lsSet('events',        window.SCHOOL_EVENTS),
        computers:     () => lsSet('computers',     window.ICT_COMPUTERS),
        maintenance:   () => lsSet('maintenance',   window.ICT_MAINTENANCE),
        discipline:    () => lsSet('discipline',    window.SAMPLE_DISCIPLINE),
        activity_log:  () => lsSet('activity_log',  window.ACTIVITY_LOG),
        parent_payments:  () => lsSet('parent_payments',  window.PARENT_PAYMENTS),
        admission_register: () => lsSet('admission_register', window.ADMISSION_REGISTER),
        payment_settings:   () => lsSet('payment_settings',   window.PAYMENT_SETTINGS)
      };
      if (MAP[storeName]) {
        MAP[storeName]();
        // Update last-saved timestamp
        const m = lsGet('meta') || {};
        m.lastSaved = new Date().toISOString();
        lsSet('meta', m);
      } else {
        console.warn('RCA.save: unknown store', storeName);
      }
    },

    /* Save ALL stores at once (used on logout or before page close) */
    saveAll() {
      ['students','teachers','users','results','approvals','behavior',
       'payments','announcements','events','computers','maintenance',
       'discipline','activity_log','parent_payments','admission_register',
       'payment_settings'].forEach(s => this.save(s));
    },

    /* Clear all localStorage and start fresh (reset button in ICT Admin) */
    reset() {
      if (!confirm('⚠️ This will RESET ALL DATA to the original sample data. Are you sure?')) return;
      // NOTE: rca_newsletters is intentionally excluded — newsletters are permanent records
      // that must survive resets and version bumps. Delete them only via explicit admin action.
      Object.keys(localStorage)
        .filter(k => k.startsWith(VERSION + '_'))
        .forEach(k => localStorage.removeItem(k));
      alert('Data reset. The page will now reload.');
      window.location.reload();
    },

    /* Get storage usage info */
    usage() {
      let total = 0;
      Object.keys(localStorage)
        .filter(k => k.startsWith(VERSION + '_'))
        .forEach(k => { total += (localStorage.getItem(k) || '').length; });
      return {
        usedKB:  Math.round(total / 1024),
        usedPct: Math.round(total / (5 * 1024 * 1024) * 100),
        limitKB: 5120
      };
    },

    /* Version info */
    version: DATA_VERSION,
    isFirstLoad: needsInit,

    /* Set clean mode — removes all fake sample data */
    setCleanMode() {
      lsSet('clean_mode', true);
      // Clear fake students and scores
      lsSet('students',   []);
      lsSet('results',    {});
      lsSet('payments',   {});
      lsSet('behavior',   {});
      lsSet('discipline', []);
      window.SAMPLE_STUDENTS   = [];
      window.SAMPLE_RESULTS    = {};
      window.PAYMENT_RECORDS   = {};
      window.BEHAVIOR_RATINGS  = {};
      window.SAMPLE_DISCIPLINE = [];
      console.log('RCA: Clean mode enabled — all fake data cleared');
    }
  };

  /* ---- Auto-save before tab/window closes ---- */
  window.addEventListener('beforeunload', () => {
    window.RCA.saveAll();
  });

  /* ---- Seed demo activity log on first init only (never overwrite real logged activity) ---- */
  if (needsInit && !lsGet('clean_mode') && (!window.ACTIVITY_LOG || window.ACTIVITY_LOG.length === 0)) {
    const now = Date.now();
    const ago = ms => new Date(now - ms).toISOString();
    const seedLogs = [
      { user:'Ada Nwankwo',         role:'head_teacher',    action:'login',   category:'login',     target:'Admin portal',                              timestamp: ago(7200000)   },
      { user:'Chukwuma Izuchukwu',  role:'ict_admin',       action:'login',   category:'login',     target:'Admin portal',                              timestamp: ago(5400000)   },
      { user:'Ada Nwankwo',         role:'head_teacher',    action:'approve', category:'approvals', target:'Basic 4 — Term 2 results approved',          timestamp: ago(5100000)   },
      { user:'Ada Nwankwo',         role:'head_teacher',    action:'publish', category:'results',   target:'Basic 4 — Term 2 report cards published',    timestamp: ago(4900000)   },
      { user:'Chukwuma Izuchukwu',  role:'ict_admin',       action:'create',  category:'users',     target:'New staff account created: Mrs. Amaka Obi',  timestamp: ago(3600000)   },
      { user:'Nnamdi Eze',          role:'accountant',      action:'payment', category:'payments',  target:'₦30,000 payment recorded — Basic 3 pupil',   timestamp: ago(3300000)   },
      { user:'Chioma Okafor',       role:'class_teacher',   action:'create',  category:'scores',    target:'Scores entered for Basic 5 — Mathematics',   timestamp: ago(2700000)   },
      { user:'Nnamdi Eze',          role:'accountant',      action:'payment', category:'payments',  target:'₦30,000 payment recorded — Nursery 2 pupil', timestamp: ago(2400000)   },
      { user:'Chioma Okafor',       role:'class_teacher',   action:'create',  category:'scores',    target:'Scores entered for Basic 5 — English Language', timestamp: ago(1800000) },
      { user:'Ada Nwankwo',         role:'head_teacher',    action:'create',  category:'review',    target:'Class review completed — Basic 5',            timestamp: ago(900000)    },
      { user:'Chukwuma Izuchukwu',  role:'ict_admin',       action:'system',  category:'system',    target:'Data version upgraded to 2.5.0',              timestamp: ago(60000)     },
    ];
    lsSet('activity_log', seedLogs);
    window.ACTIVITY_LOG = seedLogs;
  }

  /* ---- Log the init result ---- */
  const usage = window.RCA.usage();
  console.log(
    `RCA Storage: ${needsInit ? 'INITIALIZED' : 'LOADED'} | ` +
    `${usage.usedKB}KB used (${usage.usedPct}% of 5MB) | ` +
    `Version: ${DATA_VERSION}`
  );

})();

/* ============================================
   GLOBAL LOG HELPER
   Available to every admin page that loads localstorage.js.
   Call: window.logActivity('create', 'Student added: John Doe', 'students')
   ============================================ */
window.logActivity = function(action, target, category) {
  if (!window.ACTIVITY_LOG) window.ACTIVITY_LOG = [];
  const user = window.CURRENT_USER;
  window.ACTIVITY_LOG.unshift({
    user:      user ? user.full_name : 'System',
    role:      user ? (user.primary_role || user.role) : 'system',
    action:    action,
    category:  category || 'general',
    target:    target || '',
    timestamp: new Date().toISOString()
  });
  // Persist immediately
  try {
    localStorage.setItem('rca_v1_activity_log', JSON.stringify(window.ACTIVITY_LOG));
  } catch(e) {}
};
