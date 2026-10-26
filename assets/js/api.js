/* ============================================
   API BRIDGE — api.js
   Royal Crystal Academy
   ============================================
   Every admin page includes this file.
   It provides window.RCA_API — a set of functions
   that call the real backend API. Nothing falls back to sample or
   browser-saved data: a failed load shows a warning bar, a failed save
   throws so the page can say it was not saved.

   Usage:
     const students = await window.RCA_API.getStudents({ class: 'Basic 4' });
     const result   = await window.RCA_API.saveScore(studentId, subjectCode, term, scores);
     const payment  = await window.RCA_API.recordPayment(data);
*/

(function () {

  /* ---- Get JWT token from session ---- */
  function getToken() {
    return sessionStorage.getItem('rca_token');
  }

  /* ---- Base API call ---- */
  // A read that fails shows this bar instead of filling the page with old,
  // sample or browser-saved data: the page only ever shows the school's
  // real records, and says plainly when some couldn't be loaded.
  function serverProblem(err) {
    // "Not allowed for your role" is expected on some pages, not a fault.
    if (err && err.status === 403) return;
    console.warn('School server request failed:', err && err.message);
    const show = () => {
      if (document.getElementById('rcaServerProblem')) return;
      const bar = document.createElement('div');
      bar.id = 'rcaServerProblem';
      bar.setAttribute('role', 'alert');
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;background:#991b1b;color:#fff;' +
        'font:600 14px/1.4 Arial,sans-serif;padding:10px 44px 10px 16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.25)';
      bar.innerHTML = 'Could not load some information from the school server' +
        (err && err.message ? ' (' + String(err.message).replace(/[<>&]/g, '') + ')' : '') +
        '. Parts of this page may be empty. <a href="#" style="color:#fde68a;text-decoration:underline" onclick="location.reload();return false">Refresh</a> to try again.' +
        '<button aria-label="Close" style="position:absolute;right:10px;top:6px;background:none;border:0;color:#fff;font-size:20px;cursor:pointer" onclick="this.parentNode.remove()">&times;</button>';
      document.body.appendChild(bar);
    };
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  }

  async function apiCall(endpoint, options = {}) {
    const token  = getToken();
    const apiUrl = window.RCA_CONFIG?.API_URL || 'http://localhost:3000/api';

    const res = await fetch(apiUrl + endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      const e = new Error(err.error || "API error");
      e.status = res.status;
      throw e;
    }

    return res.json();
  }

  /* ============================================
     STUDENTS
     ============================================ */
  // A pupil whose class isn't in SCHOOL_CLASSES (a class dropped from the
  // list, or renamed before the records were) would vanish from every page
  // that lists classes. Add such classes to the list in place, right after
  // their level (e.g. "Nursery 1C" after "Nursery 1B"), so they still show.
  function addMissingClasses(students) {
    const list = window.SCHOOL_CLASSES;
    if (!Array.isArray(list)) return;
    const level = c => String(c).replace(/^(.*\d)[A-Z]$/, '$1');
    (students || []).forEach(s => {
      const name = s.class_name;
      if (!name || list.includes(name)) return;
      let at = -1;
      list.forEach((c, i) => { if (level(c) === level(name)) at = i; });
      list.splice(at < 0 ? list.length : at + 1, 0, name);
    });
  }

  async function getStudents(params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      const data = await apiCall(`/students${qs ? '?' + qs : ''}`);
      addMissingClasses(data.students);
      return data.students;
    } catch (e) {
      serverProblem(e);
      return [];
    }
  }

  // Throws on failure instead of quietly returning sample/empty data — a
  // failed load (e.g. "Too many requests") used to look exactly like a
  // pupil with nothing recorded. Callers show the error instead.
  async function getStudentResults(studentId, term = 'term2') {
    return apiCall(`/students/${encodeURIComponent(studentId)}/results?term=${term}`);
  }

  // Whole class in one request: { session, results: { [admission_no]: {...} } }
  // with the same per-pupil shape as getStudentResults().
  async function getClassResults(className, term) {
    return apiCall(`/students/class-results?class_name=${encodeURIComponent(className)}&term=${term}`);
  }

  async function saveClassReview(studentId, term, ratings, comment, nursery_record) {
    const body = { term, ratings, comment };
    if (nursery_record) body.nursery_record = nursery_record;
    return apiCall(`/students/${encodeURIComponent(studentId)}/review`, {
      method: 'PUT',
      body
    });
  }

  /* ============================================
     SCORES
     ============================================ */
  async function getScores(className, subjectCode, term = 'term2') {
    try {
      const data = await apiCall(`/scores?class=${encodeURIComponent(className)}&subject=${subjectCode}&term=${term}`);
      return data.scores;
    } catch (e) {
      serverProblem(e);
      return null;
    }
  }

  // Writes throw on failure (never "saved locally only"): the caller shows
  // the error, so nobody believes something was saved when it wasn't.
  async function saveScore(studentId, subjectCode, term, scores) {
    return apiCall(`/scores/${encodeURIComponent(studentId)}/${subjectCode}/${term}`, {
      method: 'PUT',
      body: scores
    });
  }

  async function submitScores(className, subjectCode, term) {
    return apiCall('/scores/submit', {
      method: 'POST',
      body: { class_name: className, subject_code: subjectCode, term }
    });
  }

  /* ============================================
     PAYMENTS
     ============================================ */
  async function getPayments(params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      const data = await apiCall(`/payments${qs ? '?' + qs : ''}`);
      return data.payments;
    } catch (e) {
      serverProblem(e);
      return null;
    }
  }

  async function recordPayment(paymentData) {
    return apiCall('/payments', { method: 'POST', body: paymentData });
  }

  async function getPaymentSummary() {
    try {
      return await apiCall('/payments/summary');
    } catch (e) {
      serverProblem(e);
      return null;
    }
  }

  /* ============================================
     USERS
     ============================================ */
  async function getUsers(params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      const data = await apiCall(`/users${qs ? '?' + qs : ''}`);
      return data.users;
    } catch (e) {
      serverProblem(e);
      return [];
    }
  }

  async function getStaffDirectory() {
    try {
      const data = await apiCall('/users/staff-directory');
      return data.staff;
    } catch (e) {
      serverProblem(e);
      return [];
    }
  }

  // createUser/updateUser/resetPassword deliberately do NOT catch-and-
  // return-null like the read-only helpers above — a failed write (e.g.
  // a duplicate-email rejection) must reach the caller's try/catch so
  // the UI can show the real error, instead of silently closing the
  // modal and re-rendering the unchanged data as if nothing happened
  // (which read like the edit "vanishing" back to the old value).
  async function createUser(userData) {
    return await apiCall('/users', { method: 'POST', body: userData });
  }

  async function updateUser(userId, userData) {
    return await apiCall(`/users/${userId}`, { method: 'PUT', body: userData });
  }

  async function updateMyDetails(data) {
    return await apiCall('/users/me', { method: 'PUT', body: data });
  }

  // newPassword is optional — without it the server generates one.
  async function resetPassword(userId, newPassword) {
    return await apiCall(`/users/${userId}/reset-password`, { method: 'POST', body: newPassword ? { password: newPassword } : {} });
  }

  /* ============================================
     APPROVALS
     ============================================ */
  async function getApprovals(term) {
    try {
      const qs = term ? `?term=${encodeURIComponent(term)}` : '';
      const data = await apiCall(`/approvals${qs}`);
      return data.approvals;
    } catch (e) {
      serverProblem(e);
      return null;
    }
  }

  async function updateApproval(approvalId, action, returnReason) {
    return apiCall(`/approvals/${approvalId}`, {
      method: 'PATCH',
      body: { action, return_reason: returnReason }
    });
  }

  /* ============================================
     ANNOUNCEMENTS
     ============================================ */
  async function getAnnouncements() {
    try {
      const data = await apiCall('/announcements');
      return data.announcements;
    } catch (e) {
      serverProblem(e);
      return [];
    }
  }

  async function createAnnouncement(data) {
    return apiCall('/announcements', { method: 'POST', body: data });
  }

  async function updateAnnouncement(id, data) {
    return apiCall(`/announcements/${id}`, { method: 'PATCH', body: data });
  }

  async function deleteAnnouncement(id) {
    return apiCall(`/announcements/${id}`, { method: 'DELETE' });
  }

  /* ============================================
     EVENTS
     ============================================ */
  async function getEvents() {
    try {
      const data = await apiCall('/events');
      return data.events;
    } catch (e) {
      serverProblem(e);
      return [];
    }
  }

  async function createEvent(data) {
    return apiCall('/events', { method: 'POST', body: data });
  }

  async function updateEvent(id, data) {
    return apiCall(`/events/${id}`, { method: 'PATCH', body: data });
  }

  async function deleteEvent(id) {
    return apiCall(`/events/${id}`, { method: 'DELETE' });
  }

  /* ============================================
     ATTENDANCE
     ============================================ */
  async function getAttendance(className, date) {
    try {
      const data = await apiCall(`/attendance?class=${encodeURIComponent(className)}&date=${date}`);
      return data.attendance;
    } catch (e) {
      serverProblem(e);
      return null;
    }
  }

  async function markAttendance(className, date, records) {
    return apiCall('/attendance/mark', {
      method: 'POST',
      body: { class_name: className, date, records }
    });
  }

  async function getAttendanceSummary(studentId) {
    try {
      const data = await apiCall(`/attendance/summary/${encodeURIComponent(studentId)}`);
      return data.summary;
    } catch (e) {
      serverProblem(e);
      return null;
    }
  }

  /* ============================================
     ACTIVITY LOGS
     ============================================ */
  async function getActivityLogs(params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      const data = await apiCall(`/activity-logs${qs ? '?' + qs : ''}`);
      return data.logs;
    } catch (e) {
      serverProblem(e);
      return [];
    }
  }

  /* ============================================
     DISCIPLINE
     ============================================ */
  async function getDiscipline(className) {
    try {
      const qs = className ? `?class=${encodeURIComponent(className)}` : '';
      const data = await apiCall(`/discipline${qs}`);
      return data.incidents;
    } catch (e) {
      serverProblem(e);
      return [];
    }
  }

  async function logDiscipline(incident) {
    return apiCall('/discipline', { method: 'POST', body: incident });
  }

  /* ============================================
     CALENDAR
     ============================================ */
  async function getCalendarEvents() {
    try {
      const data = await apiCall('/calendar');
      return data.events;
    } catch (e) {
      serverProblem(e);
      return [];
    }
  }

  async function createCalendarEvent(data) {
    return apiCall('/calendar', { method: 'POST', body: data });
  }

  async function updateCalendarEvent(id, data) {
    return apiCall(`/calendar/${id}`, { method: 'PUT', body: data });
  }

  async function deleteCalendarEvent(id) {
    return apiCall(`/calendar/${id}`, { method: 'DELETE' });
  }

  /* ============================================
     SCHOOL PROGRAMMES
     ============================================ */
  async function getSchoolProgrammes() {
    try {
      const data = await apiCall('/programmes');
      return data.programmes;
    } catch (e) {
      serverProblem(e);
      return [];
    }
  }

  async function createSchoolProgramme(data) {
    return apiCall('/programmes', { method: 'POST', body: data });
  }

  async function updateSchoolProgramme(id, data) {
    return apiCall(`/programmes/${id}`, { method: 'PUT', body: data });
  }

  async function deleteSchoolProgramme(id) {
    return apiCall(`/programmes/${id}`, { method: 'DELETE' });
  }

  /* ============================================
     CHANGE PASSWORD
     ============================================ */
  async function changePassword(currentPassword, newPassword) {
    return apiCall('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    });
  }

  /* ============================================
     NOTIFICATIONS
     ============================================ */
  async function getNotifications() {
    return apiCall('/notifications');
  }
  async function markNotificationRead(id) {
    return apiCall(`/notifications/${id}/read`, { method: 'PATCH' });
  }
  async function markAllNotificationsRead() {
    return apiCall('/notifications/read-all', { method: 'PATCH' });
  }

  /* ============================================
     EXPOSE AS window.RCA_API
     ============================================ */
  window.RCA_API = {
    // Students
    getStudents,
    getStudentResults,
    saveClassReview,
    getClassResults,

    // Scores
    getScores,
    saveScore,
    submitScores,

    // Payments
    getPayments,
    recordPayment,
    getPaymentSummary,

    // Users
    getUsers,
    getStaffDirectory,
    createUser,
    updateUser,
    updateMyDetails,
    resetPassword,

    // Approvals
    getApprovals,
    updateApproval,

    // Announcements
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,

    // Events
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,

    // Attendance
    getAttendance,
    markAttendance,
    getAttendanceSummary,

    // Logs
    getActivityLogs,

    // Discipline
    getDiscipline,
    logDiscipline,

    // Calendar
    getCalendarEvents,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,

    // School Programmes
    getSchoolProgrammes,
    createSchoolProgramme,
    updateSchoolProgramme,
    deleteSchoolProgramme,

    // Auth
    changePassword,

    // Notifications
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,

    // Direct API call (for advanced use)
    call: apiCall
  };

  console.log('RCA_API loaded — endpoint:', window.RCA_CONFIG?.API_URL || 'http://localhost:3000/api');

})();
