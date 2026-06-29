/* ============================================
   SLIDESHOW — slideshow.js
   ============================================
   This file powers EVERY slideshow on the site (Homepage
   AND Gallery page) using one reusable function instead
   of writing the same code twice.

   Concept: a reusable "initializer" function
   Rather than copy-pasting all the slideshow logic for
   each instance, we wrote ONE function — initSlideshow() —
   that takes a container element and wires up everything
   inside it. We then simply CALL that function once per
   slideshow found on the page.

   Features per slideshow:
   1. Auto-advances every 5 seconds
   2. Dot indicators - click any dot to jump to that slide
   3. Prev / Next arrow buttons
   4. Pauses auto-play on mouse hover
   5. Updates the caption text to match the active slide
*/

document.addEventListener('DOMContentLoaded', () => {

  const AUTO_PLAY_DELAY = 5000; // 5 seconds per slide

  function initSlideshow(slideshow) {
    const slides    = slideshow.querySelectorAll('.slide');
    const dotsWrap  = slideshow.querySelector('.slide-dots');
    const captionEl = slideshow.querySelector('.slideshow-caption');
    const prevBtn   = slideshow.querySelector('.slide-prev');
    const nextBtn   = slideshow.querySelector('.slide-next');

    if (slides.length === 0) return; // nothing to do

    let currentIndex = 0;
    let autoPlayTimer = null;

    // Build one dot per slide
    slides.forEach((slide, index) => {
      const dot = document.createElement('button');
      dot.classList.add('slide-dot');
      if (index === 0) dot.classList.add('active');
      dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
      dot.addEventListener('click', () => {
        goToSlide(index);
        restartAutoPlay();
      });
      dotsWrap.appendChild(dot);
    });

    const dots = dotsWrap.querySelectorAll('.slide-dot');

    function goToSlide(index) {
      slides[currentIndex].classList.remove('active');
      dots[currentIndex].classList.remove('active');

      currentIndex = index;

      slides[currentIndex].classList.add('active');
      dots[currentIndex].classList.add('active');
      captionEl.textContent = slides[currentIndex].getAttribute('data-caption');
    }

    function showNext() {
      goToSlide((currentIndex + 1) % slides.length);
    }

    function showPrev() {
      goToSlide((currentIndex - 1 + slides.length) % slides.length);
    }

    function startAutoPlay() {
      autoPlayTimer = setInterval(showNext, AUTO_PLAY_DELAY);
    }

    function stopAutoPlay() {
      clearInterval(autoPlayTimer);
    }

    function restartAutoPlay() {
      stopAutoPlay();
      startAutoPlay();
    }

    startAutoPlay();
    slideshow.addEventListener('mouseenter', stopAutoPlay);
    slideshow.addEventListener('mouseleave', startAutoPlay);

    nextBtn.addEventListener('click', () => { showNext(); restartAutoPlay(); });
    prevBtn.addEventListener('click', () => { showPrev(); restartAutoPlay(); });
  }

  /* --------------------------------------------
     FIND AND INITIALIZE EVERY SLIDESHOW ON THE PAGE
     -------------------------------------------- 
     querySelectorAll('.slideshow') finds ALL elements with
     that class — could be 0, 1, or 5 of them on a page.
     forEach() runs initSlideshow() on each one found.
  */
  document.querySelectorAll('.slideshow').forEach(initSlideshow);

});
