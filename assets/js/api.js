/* ============================================
   API BRIDGE — api.js
   Royal Crystal Academy
   ============================================
   Every admin page includes this file.
   It provides window.RCA_API — a set of functions
   that call the real backend API and fall back to
   localStorage data if the API is unreachable.

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
      throw new Error(err.error || 'API error');
    }

    return res.json();
  }

  /* ============================================
     STUDENTS
     ============================================ */
  async function getStudents(params = {}) {
    try {
      const qs = new URLSearchParams(params).toString();
      const data = await apiCall(`/students${qs ? '?' + qs : ''}`);
      return data.students;
    } catch (e) {
      console.warn('API unavailable, using localStorage:', e.message);
      let students = window.SAMPLE_STUDENTS || [];
      if (params.class) students = students.filter(s => s.class_name === params.class);
      if (params.search) students = students.filter(s =>
        s.full_name?.toLowerCase().includes(params.search.toLowerCase()) ||
        s.admission_no?.toLowerCase().includes(params.search.toLowerCase())
      );
      return students;
    }
  }

  async function getStudentResults(studentId, term = 'term2') {
    try {
      return await apiCall(`/students/${studentId}/results?term=${term}`);
    } catch (e) {
      console.warn('API unavailable, using localStorage:', e.message);
      const student = (window.SAMPLE_STUDENTS || []).find(s => s.id == studentId || s.admission_no == studentId);
      if (!student) return { scores: [], behavior: [] };
      return { scores: Object.entries(window.SAMPLE_RESULTS?.[student.admission_no] || {}).map(([subId, data]) => ({
        subject_code: subId, ...data
      })), behavior: [] };
    }
  }

  /* ============================================
     SCORES
     ============================================ */
  async function getScores(className, subjectCode, term = 'term2') {
    try {
      const data = await apiCall(`/scores?class=${encodeURIComponent(className)}&subject=${subjectCode}&term=${term}`);
      return data.scores;
    } catch (e) {
      console.warn('API unavailable, using localStorage:', e.message);
      return null; // score-entry.js handles localStorage fallback
    }
  }

  async function saveScore(studentId, subjectCode, term, scores) {
    try {
      return await apiCall(`/scores/${studentId}/${subjectCode}/${term}`, {
        method: 'PUT',
        body: scores
      });
    } catch (e) {
      console.warn('Score save to API failed, saved to localStorage only:', e.message);
      if (window.RCA) window.RCA.save('results');
      return null;
    }
  }

  async function submitScores(className, subjectCode, term) {
    try {
      return await apiCall('/scores/submit', {
        method: 'POST',
        body: { class_name: className, subject_code: subjectCode, term }
      });
    } catch (e) {
      console.warn('Score submit API failed:', e.message);
      return null;
    }
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
      console.warn('API unavailable, using localStorage:', e.message);
      return null;
    }
  }

  async function recordPayment(paymentData) {
    try {
      return await apiCall('/payments', { method: 'POST', body: paymentData });
    } catch (e) {
      console.warn('Payment API failed, saved to localStorage only:', e.message);
      if (window.RCA) window.RCA.save('payments');
      return null;
    }
  }

  async function getPaymentSummary() {
    try {
      return await apiCall('/payments/summary');
    } catch (e) {
      console.warn('API unavailable:', e.message);
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
      console.warn('API unavailable, using localStorage:', e.message);
      return window.SAMPLE_USERS || [];
    }
  }

  async function createUser(userData) {
    try {
      return await apiCall('/users', { method: 'POST', body: userData });
    } catch (e) {
      console.warn('Create user API failed:', e.message);
      return null;
    }
  }

  async function updateUser(userId, userData) {
    try {
      return await apiCall(`/users/${userId}`, { method: 'PUT', body: userData });
    } catch (e) {
      console.warn('Update user API failed:', e.message);
      return null;
    }
  }

  async function resetPassword(userId) {
    try {
      return await apiCall(`/users/${userId}/reset-password`, { method: 'POST' });
    } catch (e) {
      console.warn('Reset password API failed:', e.message);
      return null;
    }
  }

  /* ============================================
     APPROVALS
     ============================================ */
  async function getApprovals() {
    try {
      const data = await apiCall('/approvals');
      return data.approvals;
    } catch (e) {
      console.warn('API unavailable, using localStorage:', e.message);
      return null;
    }
  }

  async function updateApproval(approvalId, action, returnReason) {
    try {
      return await apiCall(`/approvals/${approvalId}`, {
        method: 'PATCH',
        body: { action, return_reason: returnReason }
      });
    } catch (e) {
      console.warn('Approval API failed:', e.message);
      return null;
    }
  }

  /* ============================================
     ANNOUNCEMENTS
     ============================================ */
  async function getAnnouncements() {
    try {
      const data = await apiCall('/announcements');
      return data.announcements;
    } catch (e) {
      console.warn('API unavailable, using localStorage:', e.message);
      return window.ANNOUNCEMENTS || [];
    }
  }

  async function createAnnouncement(data) {
    try {
      return await apiCall('/announcements', { method: 'POST', body: data });
    } catch (e) {
      console.warn('Announcement API failed:', e.message);
      return null;
    }
  }

  async function updateAnnouncement(id, data) {
    try {
      return await apiCall(`/announcements/${id}`, { method: 'PATCH', body: data });
    } catch (e) {
      console.warn('Announcement update API failed:', e.message);
      return null;
    }
  }

  async function deleteAnnouncement(id) {
    try {
      return await apiCall(`/announcements/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Announcement delete API failed:', e.message);
      return null;
    }
  }

  /* ============================================
     ATTENDANCE
     ============================================ */
  async function getAttendance(className, date) {
    try {
      const data = await apiCall(`/attendance?class=${encodeURIComponent(className)}&date=${date}`);
      return data.attendance;
    } catch (e) {
      console.warn('API unavailable:', e.message);
      return null;
    }
  }

  async function markAttendance(className, date, records) {
    try {
      return await apiCall('/attendance/mark', {
        method: 'POST',
        body: { class_name: className, date, records }
      });
    } catch (e) {
      console.warn('Attendance API failed:', e.message);
      return null;
    }
  }

  async function getAttendanceSummary(studentId) {
    try {
      const data = await apiCall(`/attendance/summary/${studentId}`);
      return data.summary;
    } catch (e) {
      console.warn('API unavailable:', e.message);
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
      console.warn('API unavailable, using localStorage:', e.message);
      return window.ACTIVITY_LOG || [];
    }
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
     EXPOSE AS window.RCA_API
     ============================================ */
  window.RCA_API = {
    // Students
    getStudents,
    getStudentResults,

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
    createUser,
    updateUser,
    resetPassword,

    // Approvals
    getApprovals,
    updateApproval,

    // Announcements
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,

    // Attendance
    getAttendance,
    markAttendance,
    getAttendanceSummary,

    // Logs
    getActivityLogs,

    // Auth
    changePassword,

    // Direct API call (for advanced use)
    call: apiCall
  };

  console.log('RCA_API loaded — endpoint:', window.RCA_CONFIG?.API_URL || 'http://localhost:3000/api');

})();
