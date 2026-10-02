/*
  NEWS FILTER — news-filter.js
  ================================
  What this does:
  When a user clicks "Events", "News", or "Achievements",
  we show only cards that match that category.
  Cards that don't match get a "hidden" class (CSS hides them).

  Key concept: data-* attributes
  Each news card has data-category="event" (or "news" or "achievement").
  Each filter button has data-filter="event".
  We match them in JavaScript.
*/

document.addEventListener('DOMContentLoaded', () => {

  const filterBtns = document.querySelectorAll('.filter-btn');
  const noResults  = document.getElementById('noResults');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {

      // 1. Update active button styling
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const filter = btn.getAttribute('data-filter'); // "all", "news", "event", "achievement"

      // 2. Show / hide cards — queried fresh on every click (not cached
      // once at page load) so cards added later by the dynamic
      // news/events loader are included too.
      let visibleCount = 0;
      const newsCards = document.querySelectorAll('.news-card-item');

      newsCards.forEach(card => {
        const category = card.getAttribute('data-category');

        if (filter === 'all' || category === filter) {
          card.classList.remove('hidden');
          visibleCount++;
        } else {
          card.classList.add('hidden');
        }
      });

      // 3. Show "no results" message if nothing matched
      noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    });
  });

});
