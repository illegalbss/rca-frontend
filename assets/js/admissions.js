/* ============================================
   ADMISSIONS FORM — admissions.js
   Royal Crystal Academy
   ============================================
   Handles the online application form:
   - Validates all required fields
   - Submits to the real backend (POST /api/applications, no login
     required) — the server generates the reference number
   - Shows success message with that reference, or a clear error if
     the submission failed, so a visitor never thinks it went through
     when it didn't
*/

document.addEventListener('DOMContentLoaded', () => {

  const form        = document.getElementById('admissionForm');
  const successBox  = document.getElementById('formSuccess');
  const submitBtn   = form?.querySelector('button[type="submit"]');

  if (!form) return;

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

  /* ---- Submission error banner (created on demand) ---- */
  function showSubmitError(msg) {
    let box = document.getElementById('admissionFormError');
    if (!box) {
      box = document.createElement('div');
      box.id = 'admissionFormError';
      box.style.cssText = 'background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:0.85rem';
      form.prepend(box);
    }
    box.textContent = msg;
    box.style.display = 'block';
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---- Form submit ---- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) {
      const firstError = form.querySelector('[style*="dc2626"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    document.getElementById('admissionFormError')?.remove();
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    const application = {
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

    let result;
    try {
      result = await window.RCA_API.call('/applications', { method: 'POST', body: application });
    } catch (err) {
      showSubmitError(
        'Could not submit your application: ' + err.message +
        '. Please try again, or call the school office directly at 08036 721390.'
      );
      submitBtn.textContent = 'Submit Application';
      submitBtn.disabled = false;
      return;
    }

    // Show success with the real, server-generated reference number
    form.style.display = 'none';
    successBox.style.display = 'block';
    document.getElementById('refCode').textContent = result.ref;
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
