/* ============================================
   MAIN.JS — Royal Crystal Academy
   Hero slider, scroll reveal, counter animation,
   navbar scroll behaviour, mobile menu, back to top
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================
     HERO SLIDER
     ============================================ */
  const slides   = document.querySelectorAll('.hero-slide');
  const dots     = document.querySelectorAll('.hero-dot');
  const prevBtn  = document.getElementById('heroPrev');
  const nextBtn  = document.getElementById('heroNext');

  let currentSlide = 0;
  let sliderTimer  = null;

  function goToSlide(index) {
    slides[currentSlide].classList.remove('active');
    dots[currentSlide]?.classList.remove('active');
    currentSlide = (index + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
    dots[currentSlide]?.classList.add('active');
  }

  function startSlider() {
    sliderTimer = setInterval(() => goToSlide(currentSlide + 1), 5000);
  }

  function stopSlider() {
    clearInterval(sliderTimer);
  }

  if (slides.length > 0) {
    prevBtn?.addEventListener('click', () => { stopSlider(); goToSlide(currentSlide - 1); startSlider(); });
    nextBtn?.addEventListener('click', () => { stopSlider(); goToSlide(currentSlide + 1); startSlider(); });

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        stopSlider();
        goToSlide(parseInt(dot.dataset.index));
        startSlider();
      });
    });

    // Pause on hover
    const hero = document.getElementById('hero');
    hero?.addEventListener('mouseenter', stopSlider);
    hero?.addEventListener('mouseleave', startSlider);

    // Touch swipe support
    let touchStartX = 0;
    hero?.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    hero?.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        stopSlider();
        goToSlide(diff > 0 ? currentSlide + 1 : currentSlide - 1);
        startSlider();
      }
    });

    startSlider();
  }

  /* ============================================
     NAVBAR SCROLL BEHAVIOUR
     ============================================ */
  const header = document.getElementById('siteHeader');

  function handleScroll() {
    if (window.scrollY > 80) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }

    // Back to top
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
      if (window.scrollY > 400) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  /* ============================================
     MOBILE DRAWER
     ============================================ */
  const navToggle   = document.getElementById('navToggle');
  const navDrawer   = document.getElementById('navDrawer');
  const navOverlay  = document.getElementById('navOverlay');
  const drawerClose = document.getElementById('navDrawerClose');

  function openDrawer() {
    navDrawer?.classList.add('open');
    navOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    navDrawer?.classList.remove('open');
    navOverlay?.classList.remove('open');
    document.body.style.overflow = '';
  }

  navToggle?.addEventListener('click', openDrawer);
  drawerClose?.addEventListener('click', closeDrawer);
  navOverlay?.addEventListener('click', closeDrawer);

  // Close drawer on nav link click
  document.querySelectorAll('.nav-drawer-links a').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  /* ============================================
     BACK TO TOP
     ============================================ */
  document.getElementById('backToTop')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ============================================
     SCROLL REVEAL
     ============================================ */
  const revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback for older browsers
    revealElements.forEach(el => el.classList.add('visible'));
  }

  /* ============================================
     COUNTER ANIMATION
     ============================================ */
  const counters = document.querySelectorAll('.stat-number[data-target]');

  function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.round(current);
    }, 16);
  }

  if ('IntersectionObserver' in window && counters.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));
  }

  /* ============================================
     NEWSLETTER FORM
     ============================================ */
  document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = form.querySelector('input');
      if (input?.value) {
        input.value = '';
        const btn = form.querySelector('button');
        if (btn) {
          btn.textContent = '✓ Subscribed!';
          setTimeout(() => { btn.textContent = 'Subscribe'; }, 3000);
        }
      }
    });
  });

  /* ============================================
     ACTIVE NAV LINK
     ============================================ */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-drawer-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

});


/* ============================================
   GALLERY FILTER
   ============================================ */
document.querySelectorAll('.gallery-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Update active button
    document.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    document.querySelectorAll('.gallery-card').forEach(card => {
      if (filter === 'all' || card.dataset.cat === filter) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  });
});


/* ============================================
   HOMEPAGE — Dynamic Events & Announcements
   Loads from localStorage (set by admin)
   ============================================ */
(function loadHomepageEvents() {
  const eventsList = document.getElementById('homepageEventsList');
  if (!eventsList) return;

  try {
    const events = JSON.parse(localStorage.getItem('rca_events') || '[]');
    const today = new Date();

    // Show upcoming events only (today + future), visible to all/parents
    const upcoming = events
      .filter(e => new Date(e.event_date) >= today && e.audience !== 'staff')
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
      .slice(0, 5);

    if (upcoming.length === 0) {
      eventsList.innerHTML = '<p style="color:rgba(255,255,255,0.5);font-size:0.88rem;text-align:center;padding:24px">No upcoming events at this time.</p>';
      return;
    }

    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    eventsList.innerHTML = upcoming.map(ev => {
      const d = new Date(ev.event_date);
      return `
        <div class="event-item reveal">
          <div class="event-date-badge">
            <span class="event-day">${d.getDate()}</span>
            <span class="event-month">${months[d.getMonth()]}</span>
          </div>
          <div class="event-info">
            <h4>${ev.title}</h4>
            <p>${ev.time ? ev.time + ' — ' : ''}${ev.location || ''}${ev.description ? (ev.location ? ' · ' : '') + ev.description : ''}</p>
          </div>
          <span class="event-tag">Event</span>
        </div>`;
    }).join('');
  } catch(e) {
    eventsList.innerHTML = '<p style="color:rgba(255,255,255,0.5);font-size:0.88rem;text-align:center;padding:24px">Check back for upcoming events.</p>';
  }
})();
