/* ============================================
   BEHAVIOUR RATINGS — behavior-ratings.js
   Royal Crystal Academy
   ============================================
   Phase 4: Real behaviour ratings stored in PostgreSQL.
   This file defines the 13 trait labels and starts
   with empty ratings. localstorage.js restores saved data.
*/

(function () {

  // The 13 behaviour traits used across the school
  window.BEHAVIOR_TRAITS = [
    { id: 'punctuality',         label: 'Punctuality' },
    { id: 'neatness',            label: 'Neatness' },
    { id: 'politeness',          label: 'Politeness' },
    { id: 'honesty',             label: 'Honesty' },
    { id: 'cooperation',         label: 'Cooperation' },
    { id: 'leadership',          label: 'Leadership' },
    { id: 'helping_others',      label: 'Helping Others' },
    { id: 'emotional_stability', label: 'Emotional Stability' },
    { id: 'health',              label: 'Health' },
    { id: 'social_work',         label: 'Aptitude on Social Work' },
    { id: 'preservation',        label: 'Preservation (Care of Property)' },
    { id: 'speaking',            label: 'Speaking' },
    { id: 'writing',             label: 'Writing' }
  ];

  // Rating labels
  window.RATING_LABELS = {
    5: 'Excellent',
    4: 'Very Good',
    3: 'Good',
    2: 'Fair',
    1: 'Poor'
  };

  // [{ value, label }] for 1–5, used by Class Review for the word shown
  // beside each trait (was referenced but never defined, so it stayed blank).
  window.RATING_SCALE = [1, 2, 3, 4, 5].map(v => ({ value: v, label: window.RATING_LABELS[v] }));

  // 1–5 → "Poor" … "Excellent". Used by the Report Card and Student
  // Portal; it was referenced there but never defined, so any pupil WITH
  // behaviour ratings crashed the report card (stuck on "Loading…").
  // Number() also accepts ratings the database returns as text ("4").
  window.ratingValueToLabel = function (value) {
    return window.RATING_LABELS[Number(value)] || '';
  };

  // Empty ratings — real data comes from API/localStorage
  if (!window.BEHAVIOR_RATINGS) {
    window.BEHAVIOR_RATINGS = {};
  }

})();
