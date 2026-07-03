/* ============================================
   CONFIG — config.js
   Royal Crystal Academy
   Powered by Supabase — no backend server needed
   ============================================ */

(function () {

  const SUPABASE_URL = 'https://sftrchflhgxzenkkbqpl.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_tV5CjyAQRFCYuHk8_hF6zQ_JX9a7fKn';

  // Helper: call Supabase REST API directly
  async function supabaseCall(table, method = 'GET', body = null, filter = '') {
    const token = sessionStorage.getItem('rca_token');
    const url   = `${SUPABASE_URL}/rest/v1/${table}${filter}`;

    const headers = {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${token || SUPABASE_KEY}`,
      'Prefer':        method === 'POST' ? 'return=representation' : ''
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Supabase error: ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  window.RCA_CONFIG = {
    SUPABASE_URL,
    SUPABASE_KEY,
    SCHOOL_NAME:   'Royal Crystal Academy',
    SCHOOL_DOMAIN: 'royalcrystalacademy.edu.ng',
    SESSION:       '2025/2026',
    CURRENT_TERM:  'term2',

    // Supabase direct calls
    async db(table, method, body, filter) {
      return supabaseCall(table, method, body, filter);
    },

    // GET records
    async getAll(table, filter = '') {
      return supabaseCall(table, 'GET', null, filter);
    },

    // INSERT record
    async insert(table, data) {
      return supabaseCall(table, 'POST', data);
    },

    // UPDATE record
    async update(table, data, filter) {
      return supabaseCall(table, 'PATCH', data, filter);
    },

    // DELETE record
    async delete(table, filter) {
      return supabaseCall(table, 'DELETE', null, filter);
    },

    // Keep old API_URL for backward compatibility
    API_URL: 'https://rca-backend-3r1c.onrender.com/api',

    // Old fetch method — now uses Supabase
    async fetch(endpoint, options = {}) {
      console.log('Using Supabase directly for:', endpoint);
    },

    setToken(token)  { sessionStorage.setItem('rca_token', token); },
    getToken()       { return sessionStorage.getItem('rca_token'); },
    clearToken()     { sessionStorage.removeItem('rca_token'); },
    isLoggedIn()     { return !!sessionStorage.getItem('rca_token'); }
  };

  console.log('RCA Config loaded — Supabase direct connection');

})();
