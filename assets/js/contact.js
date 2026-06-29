/* ============================================
   CONTACT FORM — contact.js
   Royal Crystal Academy
   ============================================
   Validates and submits the contact form.
   Saves message to localStorage so ICT Admin
   can see it in the admin dashboard.
   Also tries to submit to backend API.
*/

document.addEventListener('DOMContentLoaded', () => {

  const form       = document.getElementById('contactForm');
  const successBox = document.getElementById('contactFormSuccess');
  const submitBtn  = form?.querySelector('button[type="submit"]');

  if (!form) return;

  /* ---- Show field error ---- */
  function showError(input, msg) {
    input.style.borderColor = '#dc2626';
    let err = input.parentElement.querySelector('.field-error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'field-error';
      err.style.cssText = 'color:#dc2626;font-size:0.75rem;margin-top:4px;display:block;font-weight:500';
      input.parentElement.appendChild(err);
    }
    err.textContent = msg;
  }

  function clearError(input) {
    input.style.borderColor = '';
    input.parentElement.querySelector('.field-error')?.remove();
  }

  /* ---- Validate ---- */
  function validate() {
    let valid = true;

    // Clear all errors first
    form.querySelectorAll('.field-error').forEach(e => e.remove());
    form.querySelectorAll('.form-control').forEach(i => i.style.borderColor = '');

    const name    = document.getElementById('contact_name');
    const email   = document.getElementById('contact_email');
    const subject = document.getElementById('contact_subject');
    const message = document.getElementById('contact_message');

    if (!name.value.trim()) {
      showError(name, 'Please enter your name.'); valid = false;
    }

    if (!email.value.trim()) {
      showError(email, 'Please enter your email address.'); valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      showError(email, 'Please enter a valid email address.'); valid = false;
    }

    if (!subject.value) {
      showError(subject, 'Please select a topic.'); valid = false;
    }

    if (!message.value.trim() || message.value.trim().length < 10) {
      showError(message, 'Please enter a message (at least 10 characters).'); valid = false;
    }

    return valid;
  }

  /* ---- Save to localStorage ---- */
  function saveMessage(data) {
    try {
      const msgs = JSON.parse(localStorage.getItem('rca_contact_messages') || '[]');
      msgs.unshift(data);
      localStorage.setItem('rca_contact_messages', JSON.stringify(msgs.slice(0, 100)));
    } catch(e) {}
  }

  /* ---- Submit to API ---- */
  async function submitToAPI(data) {
    try {
      const apiUrl = window.RCA_CONFIG?.API_URL || 'https://rca-backend-3r1c.onrender.com/api';
      const res = await fetch(`${apiUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch(e) {
      return false; // API not available, local save is enough
    }
  }

  /* ---- Form Submit ---- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) {
      form.querySelector('[style*="dc2626"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    const msgData = {
      id:         'MSG-' + Date.now(),
      name:       document.getElementById('contact_name').value.trim(),
      email:      document.getElementById('contact_email').value.trim(),
      phone:      document.getElementById('contact_phone')?.value.trim() || '',
      subject:    document.getElementById('contact_subject').value,
      message:    document.getElementById('contact_message').value.trim(),
      sent_at:    new Date().toISOString(),
      status:     'unread',
    };

    // Save locally
    saveMessage(msgData);

    // Try API (don't block on it)
    await submitToAPI(msgData);

    // Also log to admin activity
    try {
      const logs = JSON.parse(localStorage.getItem('rca_v1_activity_log') || '[]');
      logs.unshift({
        user: 'Public Website',
        role: 'public',
        action: 'create',
        category: 'contact',
        target: `New message from ${msgData.name} (${msgData.subject}): ${msgData.message.substring(0, 60)}...`,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('rca_v1_activity_log', JSON.stringify(logs.slice(0, 200)));
    } catch(e) {}

    // Show success
    form.style.display = 'none';
    successBox.style.display = 'block';
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ---- Live validation ---- */
  form.querySelectorAll('[required]').forEach(field => {
    field.addEventListener('blur', () => {
      if (!field.value.trim()) showError(field, 'This field is required.');
      else clearError(field);
    });
    field.addEventListener('input', () => {
      if (field.value.trim()) clearError(field);
    });
  });

});
