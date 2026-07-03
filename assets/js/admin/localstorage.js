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
  const DATA_VERSION = '2.0.0'; // Phase 4 — all fake data removed // bump this to force a reset

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
    // Clear all old rca keys
    Object.keys(localStorage)
      .filter(k => k.startsWith(VERSION + '_'))
      .forEach(k => localStorage.removeItem(k));
  }

  /* ---- LOAD OR GENERATE each data store ---- */

  /* STUDENTS */
  let students = needsInit ? null : lsGet('students');
  if (!students) {
    // Start empty — real students come from API or manual entry
    students = [];
    lsSet('students', students);
  }
  // Filter out any archived/inactive students on load
  // so deleted students never come back after refresh
  window.SAMPLE_STUDENTS = students.filter(s =>
    s.status !== 'archived' &&
    s.status !== 'removed'
  );

  /* TEACHERS */
  let teachers = needsInit ? null : lsGet('teachers');
  if (!teachers) {
    teachers = window.SAMPLE_TEACHERS || [];
    lsSet('teachers', teachers);
  }
  window.SAMPLE_TEACHERS = teachers;

  /* USERS */
  let users = needsInit ? null : lsGet('users');
  if (!users) {
    users = window.SAMPLE_USERS || [];
    lsSet('users', users);
  }
  window.SAMPLE_USERS = users;

  /* RESULTS */
  let results = needsInit ? null : lsGet('results');
  if (!results) {
    results = window.SAMPLE_RESULTS || {};
    lsSet('results', results);
  }
  window.SAMPLE_RESULTS = results;

  /* APPROVALS */
  let approvals = needsInit ? null : lsGet('approvals');
  if (!approvals) {
    approvals = window.RESULT_APPROVALS || {};
    lsSet('approvals', approvals);
  }
  window.RESULT_APPROVALS = approvals;

  /* BEHAVIOR RATINGS */
  let behavior = needsInit ? null : lsGet('behavior');
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
  let discipline = needsInit ? null : lsGet('discipline');
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
  let activityLog = needsInit ? null : lsGet('activity_log');
  if (!activityLog) {
    activityLog = window.ACTIVITY_LOG || [];
    lsSet('activity_log', activityLog);
  }
  window.ACTIVITY_LOG = activityLog;

  /* PARENT PAYMENTS (result access fees) */
  let parentPayments = lsGet('parent_payments') || {};
  window.PARENT_PAYMENTS = parentPayments;

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
        parent_payments:()=> lsSet('parent_payments',window.PARENT_PAYMENTS)
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
       'discipline','activity_log','parent_payments'].forEach(s => this.save(s));
    },

    /* Clear all localStorage and start fresh (reset button in ICT Admin) */
    reset() {
      if (!confirm('⚠️ This will RESET ALL DATA to the original sample data. Are you sure?')) return;
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

  /* ---- Log the init result ---- */
  const usage = window.RCA.usage();
  console.log(
    `RCA Storage: ${needsInit ? 'INITIALIZED' : 'LOADED'} | ` +
    `${usage.usedKB}KB used (${usage.usedPct}% of 5MB) | ` +
    `Version: ${DATA_VERSION}`
  );

})();


/* ============================================
   SYNC TO API — pushes local data to Supabase
   Called after every save operation
   ============================================ */
window.RCA_SYNC = {

  SUPABASE_URL: 'https://sftrchflhgxzenkkbqpl.supabase.co',
  SUPABASE_KEY: 'sb_publishable_tV5CjyAQRFCYuHk8_hF6zQ_JX9a7fKn',

  headers() {
    return {
      'Content-Type':  'application/json',
      'apikey':        this.SUPABASE_KEY,
      'Authorization': `Bearer ${this.SUPABASE_KEY}`,
      'Prefer':        'return=representation'
    };
  },

  async saveStudent(student) {
    try {
      // Format for Supabase students table
      const record = {
        admission_no:  student.admission_no,
        first_name:    student.full_name?.split(' ')[0] || student.first_name || '',
        last_name:     student.full_name?.split(' ').slice(1).join(' ') || student.last_name || '',
        full_name:     student.full_name || `${student.first_name} ${student.last_name}`,
        gender:        student.gender || 'male',
        class_name:    student.class_name,
        date_of_birth: student.dob || student.date_of_birth || null,
        parent_name:   student.parent_name || '',
        parent_phone:  student.parent_phone || '',
        parent_email:  student.parent_email || '',
        home_address:  student.home_address || '',
        status:        student.status || 'active',
        session_label: '2025/2026'
      };

      const res = await fetch(`${this.SUPABASE_URL}/rest/v1/students`, {
        method:  'POST',
        headers: this.headers(),
        body:    JSON.stringify(record)
      });

      if (res.ok) {
        const data = await res.json();
        console.log('✅ Student saved to Supabase:', data);
        return Array.isArray(data) ? data[0] : data;
      } else {
        const err = await res.json();
        console.warn('⚠ Supabase save error:', err);
      }
    } catch(e) {
      console.warn('⚠ Supabase save failed:', e.message);
    }
    return null;
  },

  async loadStudents() {
    try {
      const res = await fetch(
        `${this.SUPABASE_URL}/rest/v1/students?status=eq.active&order=full_name.asc`,
        { headers: this.headers() }
      );

      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          // Merge with localStorage
          const local = JSON.parse(localStorage.getItem('rca_v1_students') || '[]');
          const dbNos = data.map(s => s.admission_no);
          const localOnly = local.filter(s => !dbNos.includes(s.admission_no));
          const merged = [...data, ...localOnly].filter(
            s => s.status !== 'archived' && s.status !== 'inactive'
          );
          localStorage.setItem('rca_v1_students', JSON.stringify(merged));
          window.SAMPLE_STUDENTS = merged;
          console.log(`✅ Loaded ${data.length} students from Supabase`);
          return merged;
        }
      }
    } catch(e) {
      console.warn('⚠ Could not load from Supabase:', e.message);
    }
    return null;
  },

  async deleteStudent(admissionNo) {
    try {
      await fetch(
        `${this.SUPABASE_URL}/rest/v1/students?admission_no=eq.${admissionNo}`,
        { method: 'DELETE', headers: this.headers() }
      );
      console.log('✅ Student deleted from Supabase');
    } catch(e) {
      console.warn('⚠ Supabase delete failed:', e.message);
    }
  },

  async updateStudent(admissionNo, data) {
    try {
      await fetch(
        `${this.SUPABASE_URL}/rest/v1/students?admission_no=eq.${admissionNo}`,
        { method: 'PATCH', headers: this.headers(), body: JSON.stringify(data) }
      );
      console.log('✅ Student updated in Supabase');
    } catch(e) {
      console.warn('⚠ Supabase update failed:', e.message);
    }
  }
};

// Auto-load students from API when page loads
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('rca_token') || sessionStorage.getItem('rca_user_data')) {
    setTimeout(() => {
      window.RCA_SYNC.loadStudents().then(students => {
        if (students) {
          // Refresh page data if on students page
          if (typeof renderClassCards === 'function') renderClassCards();
          if (typeof renderStudentTable === 'function') renderStudentTable();
        }
      });
    }, 1000);
  }
});
