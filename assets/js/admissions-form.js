/* ============================================
   ADMISSIONS FORM — PHASE 1
   ============================================
   PHASE 1 GOAL: Handle form submission WITHOUT
   reloading the page, and show a success message.

   We do NOT save data yet — that's Phase 2, where
   we'll introduce localStorage.

   Concept: preventDefault()
   By default, submitting a <form> reloads the page
   and sends data to a URL (the "action" attribute).
   Since we have no backend yet, we STOP this default
   behavior and handle everything in JavaScript instead.
*/

document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('admissionForm');
  const successMessage = document.getElementById('formSuccess');

  if (!form) return; // Safety check - exit if form doesn't exist on this page

  form.addEventListener('submit', (event) => {
    // Stop the browser's default "reload and submit" behavior
    event.preventDefault();

    // --------------------------------------------
    // BASIC VALIDATION CHECK
    // --------------------------------------------
    // The "required" attribute already does basic HTML5 validation,
    // but checkValidity() lets us confirm it via JS and show our
    // own custom message instead of the browser's default popup.
    if (!form.checkValidity()) {
      // reportValidity() triggers the browser's built-in validation
      // bubbles (e.g., "Please fill out this field")
      form.reportValidity();
      return; // Stop here - don't show success message
    }

    // --------------------------------------------
    // COLLECT FORM DATA (just for demonstration)
    // --------------------------------------------
    // FormData automatically reads all named inputs in the form
    const formData = new FormData(form);

    // Convert to a plain object so we can easily inspect it
    const data = Object.fromEntries(formData.entries());

    // For now, just log it to the browser console (F12 → Console tab)
    // so you can SEE what data would be sent in Phase 2/4.
    console.log('Admission form submitted with data:', data);

    // --------------------------------------------
    // SHOW SUCCESS MESSAGE
    // --------------------------------------------
    successMessage.classList.add('show');

    // Scroll the success message into view (helpful on mobile,
    // where the form is long and the message might be off-screen)
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Reset the form fields back to empty
    form.reset();

    // Hide the success message again after 6 seconds
    setTimeout(() => {
      successMessage.classList.remove('show');
    }, 6000);
  });

});
