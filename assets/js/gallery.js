/* ============================================
   GALLERY.JS — Royal Crystal Academy
   Filter tabs, lightbox, keyboard nav
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================
     FILTER TABS
     ============================================ */
  const tabs    = document.querySelectorAll('.gallery-tab');
  const items   = document.querySelectorAll('.gal-item');
  const sections = document.querySelectorAll('.gallery-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.dataset.filter;

      if (filter === 'all') {
        // Show all sections and items
        sections.forEach(s => s.classList.remove('hidden-section'));
        items.forEach(item => item.classList.remove('hidden'));
      } else {
        // Show only matching section, hide others
        sections.forEach(sec => {
          const secCat = sec.querySelector('.gallery-masonry')?.dataset.category;
          if (secCat === filter) {
            sec.classList.remove('hidden-section');
          } else {
            sec.classList.add('hidden-section');
          }
        });

        // Show only matching items
        items.forEach(item => {
          if (item.dataset.cat === filter) {
            item.classList.remove('hidden');
          } else {
            item.classList.add('hidden');
          }
        });

        // Scroll to the section
        const targetSection = document.querySelector(`#sec-${filter}`);
        if (targetSection) {
          setTimeout(() => {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    });
  });

  /* ============================================
     LIGHTBOX
     ============================================ */
  const lightbox        = document.getElementById('lightbox');
  const lightboxOverlay = document.getElementById('lightboxOverlay');
  const lightboxImg     = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose   = document.getElementById('lightboxClose');
  const lightboxPrev    = document.getElementById('lightboxPrev');
  const lightboxNext    = document.getElementById('lightboxNext');

  let currentIndex = 0;
  let visibleItems = [];

  function openLightbox(index) {
    // Get all currently visible items
    visibleItems = [...document.querySelectorAll('.gal-item:not(.hidden)')];
    currentIndex = index;
    showImage(currentIndex);
    lightbox.classList.add('open');
    lightboxOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightboxOverlay.classList.remove('open');
    document.body.style.overflow = '';
    lightboxImg.src = '';
  }

  function showImage(index) {
    const item = visibleItems[index];
    if (!item) return;
    const img     = item.querySelector('img');
    const caption = item.querySelector('.gal-overlay span');
    lightboxImg.src      = img.src;
    lightboxImg.alt      = img.alt;
    lightboxCaption.textContent = caption ? caption.textContent : img.alt;

    // Update prev/next visibility
    lightboxPrev.style.opacity = index === 0 ? '0.3' : '1';
    lightboxNext.style.opacity = index === visibleItems.length - 1 ? '0.3' : '1';
  }

  function prevImage() {
    if (currentIndex > 0) {
      currentIndex--;
      showImage(currentIndex);
    }
  }

  function nextImage() {
    if (currentIndex < visibleItems.length - 1) {
      currentIndex++;
      showImage(currentIndex);
    }
  }

  // Attach click to all gallery items
  items.forEach((item, idx) => {
    item.addEventListener('click', () => {
      // Find index among visible items
      const visible = [...document.querySelectorAll('.gal-item:not(.hidden)')];
      const visIdx  = visible.indexOf(item);
      openLightbox(visIdx >= 0 ? visIdx : idx);
    });
  });

  lightboxClose?.addEventListener('click', closeLightbox);
  lightboxOverlay?.addEventListener('click', closeLightbox);
  lightboxPrev?.addEventListener('click', prevImage);
  lightboxNext?.addEventListener('click', nextImage);

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   prevImage();
    if (e.key === 'ArrowRight')  nextImage();
  });

  // Touch swipe on lightbox
  let touchStartX = 0;
  lightbox.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  lightbox.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? nextImage() : prevImage();
    }
  });

});
