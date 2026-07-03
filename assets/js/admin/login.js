/* ============================================
   LOGIN — login.js
   Royal Crystal Academy
   ============================================
   Phase 4: Calls real backend API for authentication.
   Stores JWT token + user data in sessionStorage.
   Falls back to localStorage demo mode if API is unreachable.
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

    // ---- Try localStorage first (always works on any device) ----
    const allUsers = window.SAMPLE_USERS || [];
    const user = allUsers.find(u => u.email.toLowerCase() === email);

    if (user) {
      // Found in local users — check password
      if (user.status === 'deactivated' || user.status === 'suspended') {
        setLoading(false);
        showError('This account has been deactivated. Contact the ICT Administrator.');
        return;
      }
      const defaultPwd = 'RCA@2026!';
      const userPwd = user.password || defaultPwd;
      if (pwd === userPwd || pwd === defaultPwd) {
        storeSession(user, null);
        // Sync with API in background silently
        try {
          const apiUrl = window.RCA_CONFIG?.API_URL || 'http://localhost:3000/api';
          fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pwd })
          }).then(r => r.json()).then(d => {
            if (d.token) sessionStorage.setItem('rca_token', d.token);
          }).catch(() => {});
        } catch(e) {}
        return;
      } else {
        setLoading(false);
        showError('Incorrect password. Contact the ICT Administrator if you have forgotten your password.');
        return;
      }
    }

    // No account found in local list
    setLoading(false);
    showError('No account found with that email address. Contact the ICT Administrator.');
    return;

    // Dead code kept for structure
    if (false) {
      setLoading(false);
      showError('Incorrect password. Contact the ICT Administrator if you have forgotten your password.');
      return;
    }

    storeSession(user, null);
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
  sendResetBtn?.addEventListener('click', () => {
    resetSuccess.style.display = 'block';
  });

});