/* ============================================
   ADMISSIONS FORM — admissions.js
   Royal Crystal Academy
   ============================================
   Handles the online application form:
   - Validates all required fields
   - Generates a unique reference number
   - Saves application to localStorage
   - Submits to backend API if available
   - Shows success message with reference
   - Notifies ICT Admin via activity log
*/

document.addEventListener('DOMContentLoaded', () => {

  const form        = document.getElementById('admissionForm');
  const successBox  = document.getElementById('formSuccess');
  const submitBtn   = form?.querySelector('button[type="submit"]');

  if (!form) return;

  /* ---- Generate reference number ---- */
  function generateRef() {
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 90000) + 10000;
    return `RCA-APP-${year}-${rand}`;
  }

  /* ---- Show field error ---- */
  function showError(input, msg) {
    input.style.borderColor = '#dc2626';
    let err = input.parentElement.querySelector('.field-error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'field-error';
      err.style.cssText = 'color:#dc2626;font-size:0.75rem;margin-top:4px;display:block';
      input.parentElement.appendChild(err);
    }
    err.textContent = msg;
  }

  /* ---- Clear field error ---- */
  function clearError(input) {
    input.style.borderColor = '';
    const err = input.parentElement.querySelector('.field-error');
    if (err) err.remove();
  }

  /* ---- Validate form ---- */
  function validate() {
    let valid = true;
    const required = form.querySelectorAll('[required]');

    required.forEach(field => {
      clearError(field);
      if (!field.value.trim()) {
        showError(field, 'This field is required.');
        valid = false;
      }
    });

    // Phone number format
    const phone = document.getElementById('parent_phone');
    if (phone?.value && !/^0[7-9][0-1]\d{8}$/.test(phone.value.replace(/\s/g, ''))) {
      showError(phone, 'Enter a valid Nigerian phone number (e.g. 08036721390).');
      valid = false;
    }

    // Email format (optional but if filled must be valid)
    const email = document.getElementById('parent_email');
    if (email?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      showError(email, 'Enter a valid email address.');
      valid = false;
    }

    return valid;
  }

  /* ---- Save application ---- */
  function saveApplication(data) {
    try {
      const existing = JSON.parse(localStorage.getItem('rca_applications') || '[]');
      existing.push(data);
      localStorage.setItem('rca_applications', JSON.stringify(existing));
    } catch(e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  /* ---- Submit to API ---- */
  async function submitToAPI(data) {
    try {
      const apiUrl = window.RCA_CONFIG?.API_URL || 'https://rca-backend-3r1c.onrender.com/api';
      const res = await fetch(`${apiUrl}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch(e) {
      // API not available — local save is enough
      console.warn('API not available, application saved locally only');
    }
    return null;
  }

  /* ---- Form submit ---- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) {
      // Scroll to first error
      const firstError = form.querySelector('[style*="dc2626"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Loading state
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    const refNumber = generateRef();

    // Build application data
    const application = {
      ref:             refNumber,
      submitted_at:    new Date().toISOString(),
      status:          'pending',
      pupil_name:      document.getElementById('pupil_full_name').value.trim(),
      pupil_dob:       document.getElementById('pupil_dob').value,
      pupil_gender:    document.getElementById('pupil_gender').value,
      class_applying:  document.getElementById('class_applying_for').value,
      parent_name:     document.getElementById('parent_full_name').value.trim(),
      parent_phone:    document.getElementById('parent_phone').value.trim(),
      parent_email:    document.getElementById('parent_email')?.value.trim() || '',
      relationship:    document.getElementById('relationship').value,
      home_address:    document.getElementById('home_address').value.trim(),
      additional_info: document.getElementById('additional_info')?.value.trim() || '',
    };

    // Save locally
    saveApplication(application);

    // Try API
    await submitToAPI(application);

    // Also log to admin activity log
    try {
      const logs = JSON.parse(localStorage.getItem('rca_v1_activity_log') || '[]');
      logs.unshift({
        user: 'Public Website',
        role: 'public',
        action: 'create',
        category: 'admissions',
        target: `New application: ${application.pupil_name} — ${application.class_applying} (Ref: ${refNumber})`,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('rca_v1_activity_log', JSON.stringify(logs.slice(0, 200)));
    } catch(e) {}

    // Show success
    form.style.display = 'none';
    successBox.style.display = 'block';
    document.getElementById('refCode').textContent = refNumber;

    // Scroll to success message
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ---- Live validation on blur ---- */
  form.querySelectorAll('[required]').forEach(field => {
    field.addEventListener('blur', () => {
      if (!field.value.trim()) {
        showError(field, 'This field is required.');
      } else {
        clearError(field);
      }
    });

    field.addEventListener('input', () => {
      if (field.value.trim()) clearError(field);
    });
  });

});
