/* ============================================
   LOGIN — login.js
   Royal Crystal Academy
   ============================================
   Calls the real backend API for authentication and stores the JWT
   token + user data in sessionStorage. There is no offline/demo login:
   if the server can't be reached, the person is told to try again.
*/

document.addEventListener('DOMContentLoaded', () => {

  const form     = document.getElementById('loginForm');
  const errorBox = document.getElementById('loginError');
  const loginBtn = document.querySelector('.login-btn');

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }

  function hideError() { errorBox.style.display = 'none'; }

  function setLoading(loading) {
    if (loginBtn) {
      loginBtn.textContent = loading ? 'Signing in…' : 'Sign In →';
      loginBtn.disabled = loading;
    }
  }

  /* ---- Core login function — stores session ---- */
  function storeSession(user, token) {
    // Phase 4: store real JWT token
    if (token) sessionStorage.setItem('rca_token', token);

    // Store user data for dashboard-shell.js to read
    sessionStorage.setItem('rca_user_id',   user.id);
    sessionStorage.setItem('rca_demo_role', user.primary_role || user.role);
    sessionStorage.setItem('rca_demo_email', user.email);
    sessionStorage.setItem('rca_demo_name',  user.full_name);

    // Store full user object for pages that need linked_classes etc.
    sessionStorage.setItem('rca_user_data', JSON.stringify(user));

    const role = user.primary_role || user.role;
    if (role === 'parent') {
      window.location.href = 'parent-portal.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  }

  /* ---- Form submit ---- */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('login_email').value.trim().toLowerCase();
    const pwd   = document.getElementById('login_password').value;

    if (!email) { showError('Please enter your email address.'); return; }
    if (!pwd)   { showError('Please enter your password.'); return; }

    setLoading(true);

    // ---- Try the real backend FIRST ----
    // Real accounts (actual staff/parent emails) only exist in the database,
    // not in the hardcoded demo fixture — checking demo data first meant a
    // real user's email would never even reach the API.
    try {
      const apiUrl = window.RCA_CONFIG?.API_URL || 'http://localhost:3000/api';
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pwd })
      });
      const data = await res.json();

      if (res.ok && data.token && data.user) {
        storeSession(data.user, data.token);
        return;
      }

      // API reachable but rejected the login (wrong password, deactivated,
      // no such account) — that's authoritative, don't fall through to demo.
      if (res.status === 401 || res.status === 403) {
        setLoading(false);
        showError(data.error || 'Login failed.');
        return;
      }
      // Any other API error (500, too many requests, etc.)
      setLoading(false);
      showError((data.error || 'The school server had a problem') + '. Please try again in a moment.');
      return;
    } catch (e) {
      // No demo/offline login: only the school server can let anyone in.
      setLoading(false);
      showError('Could not reach the school server. Check your internet connection and try again.');
      return;
    }
  });

  /* ---- Password show/hide toggle ---- */
  const toggleBtn = document.getElementById('togglePassword');
  const pwdInput  = document.getElementById('login_password');
  if (toggleBtn && pwdInput) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = pwdInput.type === 'password';
      pwdInput.type  = isHidden ? 'text' : 'password';
      toggleBtn.textContent = isHidden ? '🙈' : '👁';
    });
  }

  /* ---- Parent login hint ---- */
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('role') === 'parent') {
    const emailInput = document.getElementById('login_email');
    if (emailInput) emailInput.focus();
    const note = document.createElement('div');
    note.style.cssText = 'background:#dbeafe;border:1px solid #93c5fd;color:#1e40af;border-radius:8px;padding:10px 14px;font-size:0.8rem;margin-bottom:14px';
    note.innerHTML = '👨‍👩‍👧 <strong>Parent Portal:</strong> Use the email address linked to your child\'s account.';
    form.insertBefore(note, form.firstChild);
  }

  /* ---- Forgot password modal ---- */
  const forgotLink    = document.getElementById('forgotPasswordLink');
  const forgotOverlay = document.getElementById('forgotModalOverlay');
  const forgotClose   = document.getElementById('forgotModalClose');
  const sendResetBtn  = document.getElementById('sendResetBtn');
  const resetSuccess  = document.getElementById('resetSuccess');

  forgotLink?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('reset_email').value = document.getElementById('login_email').value;
    resetSuccess.style.display = 'none';
    forgotOverlay.classList.add('open');
  });

  forgotClose?.addEventListener('click', () => forgotOverlay.classList.remove('open'));
  forgotOverlay?.addEventListener('click', e => {
    if (e.target === forgotOverlay) forgotOverlay.classList.remove('open');
  });
  // Sends a real request: the ICT Administrator / Proprietor get a
  // notification and reset the password in User Management.
  sendResetBtn?.addEventListener('click', async () => {
    const email = document.getElementById('reset_email').value.trim();
    if (!email) { document.getElementById('reset_email').focus(); return; }
    sendResetBtn.disabled = true;
    sendResetBtn.textContent = 'Sending…';
    let msg, ok = false;
    try {
      const apiUrl = window.RCA_CONFIG?.API_URL || 'http://localhost:3000/api';
      const res = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      ok = res.ok;
      msg = data.message || data.error || 'Something went wrong. Please try again.';
    } catch (e) {
      msg = 'Could not reach the school server. Check your internet connection and try again.';
    }
    resetSuccess.style.display = 'block';
    resetSuccess.style.color = ok ? '' : '#b91c1c';
    resetSuccess.textContent = (ok ? '✅ ' : '') + msg;
    sendResetBtn.disabled = false;
    sendResetBtn.textContent = 'Send Reset Request';
  });

});
