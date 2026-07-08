/* ============================================
   CONTACT FORM — contact.js
   Royal Crystal Academy
   ============================================
   Validates and submits the contact form to the real backend
   (POST /api/contact, no login required). Shows a clear error if the
   submission fails, so a visitor never thinks it went through when it
   didn't.
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

  /* ---- Submission error banner (created on demand) ---- */
  function showSubmitError(msg) {
    let box = document.getElementById('contactFormError');
    if (!box) {
      box = document.createElement('div');
      box.id = 'contactFormError';
      box.style.cssText = 'background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:0.85rem';
      form.prepend(box);
    }
    box.textContent = msg;
    box.style.display = 'block';
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---- Form Submit ---- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) {
      form.querySelector('[style*="dc2626"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    document.getElementById('contactFormError')?.remove();
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    const msgData = {
      name:    document.getElementById('contact_name').value.trim(),
      email:   document.getElementById('contact_email').value.trim(),
      phone:   document.getElementById('contact_phone')?.value.trim() || '',
      subject: document.getElementById('contact_subject').value,
      message: document.getElementById('contact_message').value.trim(),
    };

    try {
      await window.RCA_API.call('/contact', { method: 'POST', body: msgData });
    } catch (err) {
      showSubmitError(
        'Could not send your message: ' + err.message +
        '. Please try again, or call the school office directly at 08036 721390.'
      );
      submitBtn.textContent = 'Send Message';
      submitBtn.disabled = false;
      return;
    }

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
