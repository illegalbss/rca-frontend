/* ============================================
   API CONFIG — config.js
   Royal Crystal Academy
   ============================================
   This file controls which backend URL the
   frontend talks to.

   Development:  http://localhost:3000
   Production:   https://rca-backend.onrender.com

   It switches automatically based on whether
   you are running on localhost or on Netlify.
   ============================================ */

(function () {

  const isLocalhost = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === ''
  );

  window.RCA_CONFIG = {
    // Backend API base URL
    API_URL: isLocalhost
      ? 'http://localhost:3000/api'
      : 'https://rca-backend-3r1c.onrender.com/api',

    // School info
    SCHOOL_NAME:   'Royal Crystal Academy',
    SCHOOL_DOMAIN: 'royalcrystalacademy.edu.ng',
    SESSION:       '2025/2026',
    CURRENT_TERM:  'term2',

    // Helper: make an authenticated API call
    // Usage: await window.RCA_CONFIG.fetch('/students')
    //        await window.RCA_CONFIG.fetch('/payments', { method:'POST', body: data })
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

      if (!response.ok) {
        throw new Error(data.error || `Request failed: ${response.status}`);
      }

      return data;
    },

    // Save token after login
    setToken(token) {
      sessionStorage.setItem('rca_token', token);
    },

    // Get current token
    getToken() {
      return sessionStorage.getItem('rca_token');
    },

    // Clear token on logout
    clearToken() {
      sessionStorage.removeItem('rca_token');
    },

    // Check if user is logged in
    isLoggedIn() {
      return !!sessionStorage.getItem('rca_token');
    }
  };

  console.log(`RCA Config loaded — API: ${window.RCA_CONFIG.API_URL}`);

})();
