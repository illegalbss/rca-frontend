/* ============================================
   CONFIG — config.js
   Royal Crystal Academy
   ============================================ */

(function () {

  const isLocalhost = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === ''
  );

  window.RCA_CONFIG = {
    SUPABASE_URL: 'https://sftrchflhgxzenkkbqpl.supabase.co',
    SUPABASE_KEY: 'sb_publishable_tV5CjyAQRFCYuHk8_hF6zQ_JX9a7fKn',

   API_URL: isLocalhost
  ? 'http://localhost:3000/api'
  : 'https://rca-backend-five.vercel.app/api',

    SCHOOL_NAME:   'Royal Crystal Academy',
    SCHOOL_DOMAIN: 'royalcrystalacademy.com.ng',
    SESSION:       '2025/2026',
    // Worked out from today's date (Sept–Dec = First, Jan–Apr = Second,
    // May–Aug = Third) instead of a hardcoded 'term2', which left every
    // term picker on Second Term all year — e.g. the Report Card showing
    // an empty Second Term card while First Term results were entered.
    CURRENT_TERM:  (() => { const m = new Date().getMonth(); return m >= 8 ? 'term1' : m <= 3 ? 'term2' : 'term3'; })(),

    async fetch(endpoint, options = {}) {
      const token = sessionStorage.getItem('rca_token');
      const url   = this.API_URL + endpoint;
      const response = await window.fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
      return data;
    },

    // Everything a logout must remove from this device: the login session
    // (sessionStorage) plus any pupil data older "offline fallback" code
    // left in localStorage (rca_v1_* results/payments/attendance copies,
    // rca_parents). The install-reminder preference is kept — it isn't
    // personal. Also asks the service worker to drop its (public-only) cache.
    clearSession() {
      try {
        Object.keys(sessionStorage).filter(k => k.startsWith('rca_')).forEach(k => sessionStorage.removeItem(k));
        Object.keys(localStorage)
          .filter(k => k.startsWith('rca_v1_') || k === 'rca_parents' || k === 'rca_user_data' || k === 'rca_token')
          .forEach(k => localStorage.removeItem(k));
      } catch (e) {}
      try { navigator.serviceWorker?.controller?.postMessage('clear-cache'); } catch (e) {}
    },

    setToken(token)  { sessionStorage.setItem('rca_token', token); },
    getToken()       { return sessionStorage.getItem('rca_token'); },
    clearToken()     { sessionStorage.removeItem('rca_token'); },
    isLoggedIn()     { return !!sessionStorage.getItem('rca_token'); }
  };

  // Every term picker that was written with Second Term pre-selected now
  // opens on the current term instead. config.js loads before each
  // page's own script, so this listener runs first and those scripts
  // read the corrected value. "All Terms" pickers are left alone.
  document.addEventListener('DOMContentLoaded', () => {
    const term = window.RCA_CONFIG.CURRENT_TERM;
    document.querySelectorAll('select').forEach(sel => {
      const opt = sel.querySelector('option[value="term2"]');
      if (opt && opt.defaultSelected && sel.querySelector(`option[value="${term}"]`)) sel.value = term;
    });
  });

  console.log('RCA Config loaded');

})();
