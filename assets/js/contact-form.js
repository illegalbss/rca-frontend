/* ============================================
   CONTACT FORM — PHASE 1
   ============================================
   Same pattern as admissions-form.js:
   - prevent default page reload
   - validate
   - show success message
   - log data to console for now
*/

document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('contactForm');
  const successMessage = document.getElementById('contactFormSuccess');

  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    console.log('Contact form submitted with data:', data);

    successMessage.classList.add('show');
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.reset();

    setTimeout(() => {
      successMessage.classList.remove('show');
    }, 6000);
  });

});
