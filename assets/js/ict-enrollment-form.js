/* ============================================
   ICT ENROLLMENT FORM — ict-enrollment-form.js
   Royal Crystal Academy
   ============================================
   Powers the "Enroll Now" slide-over on ict-department.html:
   - Displays the live programme fee (GET /public/ict-fee)
   - Opens/closes the panel WITHOUT navigating away from the page
   - Submits the application (POST /ict-enrollments, no login required)
*/

document.addEventListener('DOMContentLoaded', () => {

  const fmt = n => '₦' + Number(n || 0).toLocaleString();

  /* ---- Fee display ---- */
  const feeEl = document.getElementById('ictFeeAmount');
  if (feeEl && window.RCA_API) {
    window.RCA_API.call('/public/ict-fee')
      .then(data => { feeEl.textContent = fmt(data.ict_practical_fee); })
      .catch(() => { feeEl.textContent = 'Contact the school office'; });
  }

  /* ---- Slide-over open/close ---- */
  const overlay   = document.getElementById('ictEnrollOverlay');
  const panel     = document.getElementById('ictEnrollPanel');
  const openBtn   = document.getElementById('ictEnrollOpenBtn');
  const closeBtn  = document.getElementById('ictEnrollCloseBtn');

  function openPanel() {
    overlay?.classList.add('open');
    panel?.classList.add('open');
    panel?.setAttribute('aria-hidden', 'false');
  }
  function closePanel() {
    overlay?.classList.remove('open');
    panel?.classList.remove('open');
    panel?.setAttribute('aria-hidden', 'true');
  }

  openBtn?.addEventListener('click', openPanel);
  closeBtn?.addEventListener('click', closePanel);
  overlay?.addEventListener('click', closePanel);

  /* ---- Form submission ---- */
  const form        = document.getElementById('ictEnrollForm');
  const formWrap     = document.getElementById('ictEnrollFormWrap');
  const successWrap  = document.getElementById('ictEnrollSuccessWrap');
  const errorBox      = document.getElementById('ictEnrollError');
  const submitBtn      = document.getElementById('ictEnrollSubmitBtn');
  const anotherBtn     = document.getElementById('ictEnrollAnotherBtn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorBox) errorBox.style.display = 'none';

    const payload = {
      pupil_full_name: document.getElementById('ictPupilName').value.trim(),
      class_name:      document.getElementById('ictPupilClass').value,
      parent_name:     document.getElementById('ictParentName').value.trim(),
      parent_phone:    document.getElementById('ictParentPhone').value.trim(),
      parent_email:    document.getElementById('ictParentEmail').value.trim(),
      notes:           document.getElementById('ictNotes').value.trim()
    };

    if (!payload.pupil_full_name || !payload.class_name || !payload.parent_name || !payload.parent_phone) {
      if (errorBox) {
        errorBox.textContent = 'Please fill in the pupil\'s name, class, and parent/guardian name and phone.';
        errorBox.style.display = 'block';
      }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      await window.RCA_API.call('/ict-enrollments', { method: 'POST', body: payload });
      formWrap.style.display = 'none';
      successWrap.style.display = 'block';
      form.reset();
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = 'Could not submit your application: ' + err.message;
        errorBox.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
    }
  });

  anotherBtn?.addEventListener('click', () => {
    successWrap.style.display = 'none';
    formWrap.style.display = 'block';
  });

});
