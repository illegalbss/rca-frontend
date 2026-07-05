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
    SCHOOL_DOMAIN: 'royalcrystalacademy.edu.ng',
    SESSION:       '2025/2026',
    CURRENT_TERM:  'term2',

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

    setToken(token)  { sessionStorage.setItem('rca_token', token); },
    getToken()       { return sessionStorage.getItem('rca_token'); },
    clearToken()     { sessionStorage.removeItem('rca_token'); },
    isLoggedIn()     { return !!sessionStorage.getItem('rca_token'); }
  };

  console.log('RCA Config loaded');

})();
