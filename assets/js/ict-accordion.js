/* ============================================
   ICT CURRICULUM ACCORDION — ict-accordion.js
   ============================================
   Concept: This uses the SAME max-height trick as the
   mobile nav menu in main.js! Instead of display:none
   (which can't be animated), we use max-height: 0 and
   transition to a large value when opened.

   Each accordion-item is independent — clicking one
   doesn't close the others (this is sometimes called
   an "open multiple" accordion, vs "open one at a time").
*/

document.addEventListener('DOMContentLoaded', () => {

  const headers = document.querySelectorAll('.accordion-header');

  headers.forEach(header => {
    header.addEventListener('click', () => {

      // The content panel is the next sibling element after the header
      const content = header.nextElementSibling;
      const isOpen = header.getAttribute('aria-expanded') === 'true';

      if (isOpen) {
        // Currently open -> close it
        header.setAttribute('aria-expanded', 'false');
        content.style.maxHeight = null; // resets to CSS default (0)
      } else {
        // Currently closed -> open it
        header.setAttribute('aria-expanded', 'true');
        // scrollHeight = the FULL height of the content, even though
        // it's currently hidden. We set max-height to that exact value
        // so the CSS transition can animate smoothly to it.
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });

});
