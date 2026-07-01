/* ============================================
   PARENT MANAGER — parent-manager.js
   Royal Crystal Academy
   ============================================
   Manages parent accounts and links them to students.
   ICT Admin / Head Teacher can:
   - Add a parent account (name, email, phone, password)
   - Link one or more students to the parent
   - Parents can then log in and see their children's:
     * Results / scores
     * Attendance
     * Fee payment status
     * Announcements
     * Report cards
*/

window.RCA_PARENTS = {

  /* ---- Get all parents ---- */
  getAll() {
    try { return JSON.parse(localStorage.getItem('rca_parents') || '[]'); }
    catch(e) { return []; }
  },

  /* ---- Save parents ---- */
  saveAll(parents) {
    localStorage.setItem('rca_parents', JSON.stringify(parents));
  },

  /* ---- Add new parent ---- */
  add(data) {
    const parents = this.getAll();
    const id = 'RCA-PAR-' + String(parents.length + 1).padStart(3, '0');
    const parent = {
      id,
      full_name:    data.full_name,
      email:        data.email.toLowerCase().trim(),
      phone:        data.phone,
      password:     data.password || 'RCA@2026!',
      children:     data.children || [], // array of admission_nos
      role:         'parent',
      primary_role: 'parent',
      status:       'active',
      created_at:   new Date().toISOString(),
    };
    parents.push(parent);
    this.saveAll(parents);
    return parent;
  },

  /* ---- Link student to parent ---- */
  linkStudent(parentId, admissionNo) {
    const parents = this.getAll();
    const p = parents.find(p => p.id === parentId);
    if (!p) return false;
    if (!p.children.includes(admissionNo)) {
      p.children.push(admissionNo);
      this.saveAll(parents);
    }
    return true;
  },

  /* ---- Unlink student from parent ---- */
  unlinkStudent(parentId, admissionNo) {
    const parents = this.getAll();
    const p = parents.find(p => p.id === parentId);
    if (!p) return false;
    p.children = p.children.filter(c => c !== admissionNo);
    this.saveAll(parents);
    return true;
  },

  /* ---- Get children of a parent (full student objects) ---- */
  getChildren(parentId) {
    const parents = this.getAll();
    const p = parents.find(p => p.id === parentId);
    if (!p) return [];
    const allStudents = window.SAMPLE_STUDENTS || [];
    return allStudents.filter(s => p.children.includes(s.admission_no));
  },

  /* ---- Get parent by email ---- */
  getByEmail(email) {
    return this.getAll().find(p => p.email === email.toLowerCase().trim());
  },

  /* ---- Delete parent ---- */
  delete(parentId) {
    const parents = this.getAll().filter(p => p.id !== parentId);
    this.saveAll(parents);
  },

  /* ---- Update parent ---- */
  update(parentId, data) {
    const parents = this.getAll();
    const idx = parents.findIndex(p => p.id === parentId);
    if (idx === -1) return false;
    parents[idx] = { ...parents[idx], ...data };
    this.saveAll(parents);
    return true;
  },

  /* ---- Seed demo accounts on first load ---- */
  _seedDemo() {
    if (this.getAll().length > 0) return;
    const demos = [
      { full_name: 'Mrs. Ngozi Okonkwo',   email: 'ngozi.okonkwo@gmail.com',    phone: '08012345678', password: 'RCA@2026!', children: [] },
      { full_name: 'Mr. Emeka Eze',         email: 'emeka.eze@gmail.com',         phone: '08087654321', password: 'RCA@2026!', children: [] },
      { full_name: 'Mrs. Adaeze Nwachukwu', email: 'adaeze.nwachukwu@gmail.com',  phone: '08033445566', password: 'RCA@2026!', children: [] },
    ];
    demos.forEach(d => this.add(d));
  },
};

/* Auto-seed demo parents if none exist yet */
window.RCA_PARENTS._seedDemo();
