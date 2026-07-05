/* =============================================
   ADMISSION REGISTER — admission-register.js
   Royal Crystal Academy
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* ── DATA ─────────────────────────────────── */
  var REGISTER = window.ADMISSION_REGISTER || [];

  /* ── DOM REFS ─────────────────────────────── */
  var searchInput    = document.getElementById('arSearch');
  var classFilter    = document.getElementById('arClassFilter');
  var statusFilter   = document.getElementById('arStatusFilter');
  var tableBody      = document.getElementById('arTableBody');
  var totalCountEl   = document.getElementById('arTotalCount');
  var noResultsEl    = document.getElementById('arNoResults');
  var statTotal      = document.getElementById('statTotal');
  var statActive     = document.getElementById('statActive');
  var statGraduated  = document.getElementById('statGraduated');
  var statTransferred = document.getElementById('statTransferred');
  var statWithdrawn  = document.getElementById('statWithdrawn');
  var statNew        = document.getElementById('statNew');

  /* ── HELPERS ──────────────────────────────── */

  function getUser() {
    return window.CURRENT_USER || { full_name: 'Admin', primary_role: 'ict_admin' };
  }

  function fmtDate(d) {
    if (!d) return '—';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch (e) { return d || '—'; }
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(function (p) { return p[0] || ''; })
      .join('').substring(0, 2).toUpperCase();
  }

  function generateAdmissionNo() {
    // Uses the same persistent counter as the Students page (see
    // window.nextAdmissionNo in localstorage.js) so numbers issued from
    // either screen can never collide with each other.
    if (window.nextAdmissionNo) return window.nextAdmissionNo();
    var year = new Date().getFullYear();
    var allNos = [].concat(
      REGISTER.map(function (r) { return r.admission_no || ''; }),
      (window.SAMPLE_STUDENTS || []).map(function (s) { return s.admission_no || ''; })
    );
    var max = 0;
    allNos.forEach(function (no) {
      var m = no && no.match(/RCA\/\d+\/(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'RCA/' + year + '/' + String(max + 1).padStart(4, '0');
  }

  function getNextSerialNo() {
    if (!REGISTER.length) return 1;
    return Math.max.apply(null, REGISTER.map(function (r) { return r.serial_no || 0; })) + 1;
  }

  function getStatusBadge(status) {
    var map = {
      active:      '<span class="ar-badge ar-badge-active">Active</span>',
      graduated:   '<span class="ar-badge ar-badge-graduated">Graduated</span>',
      transferred: '<span class="ar-badge ar-badge-transferred">Transferred</span>',
      withdrawn:   '<span class="ar-badge ar-badge-withdrawn">Withdrawn</span>',
      deceased:    '<span class="ar-badge ar-badge-deceased">Deceased</span>'
    };
    return map[status] || ('<span class="ar-badge ar-badge-active">' + (status || 'Active') + '</span>');
  }

  function saveRegister() {
    window.ADMISSION_REGISTER = REGISTER;
    if (window.RCA) window.RCA.save('admission_register');
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  /* ── STATS ────────────────────────────────── */

  function renderStats() {
    var now = new Date();
    var thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var counts = { total: 0, active: 0, graduated: 0, transferred: 0, withdrawn: 0, newThisMonth: 0 };
    REGISTER.forEach(function (r) {
      counts.total++;
      if (r.status === 'active')      counts.active++;
      if (r.status === 'graduated')   counts.graduated++;
      if (r.status === 'transferred') counts.transferred++;
      if (r.status === 'withdrawn')   counts.withdrawn++;
      if (r.date_of_admission && r.date_of_admission.startsWith(thisMonth)) counts.newThisMonth++;
    });
    if (statTotal)       statTotal.textContent       = counts.total;
    if (statActive)      statActive.textContent      = counts.active;
    if (statGraduated)   statGraduated.textContent   = counts.graduated;
    if (statTransferred) statTransferred.textContent = counts.transferred;
    if (statWithdrawn)   statWithdrawn.textContent   = counts.withdrawn;
    if (statNew)         statNew.textContent         = counts.newThisMonth;
  }

  /* ── FILTER ───────────────────────────────── */

  function getFiltered() {
    var term   = (searchInput ? searchInput.value : '').trim().toLowerCase();
    var cls    = classFilter   ? classFilter.value   : '';
    var status = statusFilter  ? statusFilter.value  : '';
    return REGISTER.filter(function (r) {
      if (term) {
        var hit = (r.full_name        || '').toLowerCase().includes(term) ||
                  (r.admission_no     || '').toLowerCase().includes(term) ||
                  (r.parent_name      || '').toLowerCase().includes(term) ||
                  (r.parent_phone     || '').toLowerCase().includes(term) ||
                  (r.previous_school  || '').toLowerCase().includes(term) ||
                  (r.current_class    || '').toLowerCase().includes(term);
        if (!hit) return false;
      }
      if (cls    && r.current_class !== cls)   return false;
      if (status && r.status        !== status) return false;
      return true;
    });
  }

  /* ── TABLE RENDER ─────────────────────────── */

  function renderTable() {
    var filtered = getFiltered();
    renderStats();
    if (totalCountEl)
      totalCountEl.textContent = filtered.length + ' record' + (filtered.length !== 1 ? 's' : '');

    if (!filtered.length) {
      tableBody.innerHTML = '';
      if (noResultsEl) noResultsEl.style.display = 'block';
      return;
    }
    if (noResultsEl) noResultsEl.style.display = 'none';

    var sorted = filtered.slice().sort(function (a, b) {
      return (a.serial_no || 0) - (b.serial_no || 0);
    });

    tableBody.innerHTML = sorted.map(function (r) {
      var genderClass = r.gender === 'female' ? 'ar-avatar-female' : 'ar-avatar-male';
      return '<tr>' +
        '<td class="col-serial">' + (r.serial_no || '—') + '</td>' +
        '<td class="col-admno"><span class="ar-admno">' + (r.admission_no || '—') + '</span></td>' +
        '<td class="col-name"><div style="display:flex;align-items:center;gap:10px">' +
          '<div class="row-avatar ' + genderClass + '">' + getInitials(r.full_name) + '</div>' +
          '<div><div class="ar-name">' + (r.full_name || '—') + '</div>' +
          '<div class="ar-sub">' + (r.gender === 'female' ? 'Female' : 'Male') + '</div></div>' +
        '</div></td>' +
        '<td class="col-class">' + (r.current_class || '—') + '</td>' +
        '<td class="col-dob">'        + fmtDate(r.date_of_birth)    + '</td>' +
        '<td class="col-admission">'  + fmtDate(r.date_of_admission) + '</td>' +
        '<td class="col-parent"><div class="ar-parent-name">' + (r.parent_name  || '—') + '</div>' +
          '<div class="ar-sub">' + (r.parent_phone || '') + '</div></td>' +
        '<td class="col-status">' + getStatusBadge(r.status) + '</td>' +
        '<td class="col-actions"><div class="row-actions">' +
          '<button class="row-action-btn" onclick="AR.view(\'' + r.id + '\')">View</button>' +
          '<button class="row-action-btn" onclick="AR.edit(\'' + r.id + '\')">Edit</button>' +
          '<button class="row-action-btn ar-btn-promote" onclick="AR.promote(\'' + r.id + '\')" title="Promote to next class">&#8593; Promote</button>' +
          '<button class="row-action-btn" style="color:#dc2626;border-color:#fca5a5" onclick="AR.remove(\'' + r.id + '\')">Remove</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  /* ── FORM MODAL (Add / Edit) ──────────────── */

  function buildClassOptions(selected) {
    var classes = window.SCHOOL_CLASSES || [
      'Pre-Nursery 1','Pre-Nursery 2','Nursery 1','Nursery 2','Nursery 3',
      'Basic 1A','Basic 1B','Basic 2','Basic 3','Basic 4','Basic 5','Basic 6'
    ];
    return '<option value="">— Select Class —</option>' +
      classes.map(function (c) {
        return '<option value="' + c + '"' + (selected === c ? ' selected' : '') + '>' + c + '</option>';
      }).join('');
  }

  function buildStatusOptions(selected) {
    return ['active','graduated','transferred','withdrawn','deceased'].map(function (s) {
      var label = s.charAt(0).toUpperCase() + s.slice(1);
      return '<option value="' + s + '"' + (selected === s ? ' selected' : '') + '>' + label + '</option>';
    }).join('');
  }

  function showFormModal(record) {
    var isEdit = !!record;
    var r = record || {
      admission_no:     generateAdmissionNo(),
      serial_no:        getNextSerialNo(),
      date_of_admission: new Date().toISOString().split('T')[0],
      status:           'active',
      gender:           'male',
      docs:             {}
    };
    var docs = r.docs || {};

    var modal = document.getElementById('arFormModal');
    modal.innerHTML =
      '<div class="ar-modal">' +
        '<div class="ar-modal-header">' +
          '<span class="ar-modal-title">' + (isEdit ? 'Edit Student Record' : 'Add Student to Register') + '</span>' +
          '<button class="ar-modal-close" onclick="AR.closeModal(\'arFormModal\')">&#10005;</button>' +
        '</div>' +
        '<div class="ar-modal-body">' +

          /* Admission No + Serial */
          '<div class="ar-form-row">' +
            '<div class="ar-form-group">' +
              '<label class="ar-form-label">Admission Number</label>' +
              '<input id="fAdmNo" class="ar-form-input" value="' + (r.admission_no || '') + '" readonly>' +
            '</div>' +
            '<div class="ar-form-group" style="max-width:110px">' +
              '<label class="ar-form-label">Serial No.</label>' +
              '<input id="fSerial" class="ar-form-input" value="' + (r.serial_no || '') + '" readonly>' +
            '</div>' +
          '</div>' +

          '<div class="ar-section-divider">Pupil Information</div>' +

          /* Name row */
          '<div class="ar-form-row">' +
            '<div class="ar-form-group ar-form-group-wide">' +
              '<label class="ar-form-label">First Name *</label>' +
              '<input id="fFirstName" class="ar-form-input" placeholder="First name" value="' + (r.first_name || '') + '">' +
            '</div>' +
            '<div class="ar-form-group ar-form-group-wide">' +
              '<label class="ar-form-label">Last Name / Surname *</label>' +
              '<input id="fLastName" class="ar-form-input" placeholder="Surname / family name" value="' + (r.last_name || '') + '">' +
            '</div>' +
          '</div>' +

          /* Gender + DOB + Date of Admission */
          '<div class="ar-form-row">' +
            '<div class="ar-form-group">' +
              '<label class="ar-form-label">Gender *</label>' +
              '<select id="fGender" class="ar-form-select">' +
                '<option value="male"'   + (r.gender !== 'female' ? ' selected' : '') + '>Male</option>' +
                '<option value="female"' + (r.gender === 'female' ? ' selected' : '') + '>Female</option>' +
              '</select>' +
            '</div>' +
            '<div class="ar-form-group">' +
              '<label class="ar-form-label">Date of Birth</label>' +
              '<input id="fDOB" type="date" class="ar-form-input" value="' + (r.date_of_birth || '') + '">' +
            '</div>' +
            '<div class="ar-form-group">' +
              '<label class="ar-form-label">Date of Admission *</label>' +
              '<input id="fDOA" type="date" class="ar-form-input" value="' + (r.date_of_admission || '') + '">' +
            '</div>' +
          '</div>' +

          /* Current Class + Status + Completion Date */
          '<div class="ar-form-row">' +
            '<div class="ar-form-group ar-form-group-wide">' +
              '<label class="ar-form-label">Current Class *</label>' +
              '<select id="fClass" class="ar-form-select">' + buildClassOptions(r.current_class) + '</select>' +
            '</div>' +
            '<div class="ar-form-group">' +
              '<label class="ar-form-label">Status</label>' +
              '<select id="fStatus" class="ar-form-select">' + buildStatusOptions(r.status) + '</select>' +
            '</div>' +
            '<div class="ar-form-group">' +
              '<label class="ar-form-label">Date of Completion</label>' +
              '<input id="fDOC" type="date" class="ar-form-input" value="' + (r.date_of_completion || '') + '">' +
            '</div>' +
          '</div>' +

          '<div class="ar-section-divider">Parent / Guardian Information</div>' +

          '<div class="ar-form-row">' +
            '<div class="ar-form-group ar-form-group-full">' +
              '<label class="ar-form-label">Parent / Guardian Full Name</label>' +
              '<input id="fParentName" class="ar-form-input" placeholder="Full name of parent or guardian" value="' + (r.parent_name || '') + '">' +
            '</div>' +
          '</div>' +
          '<div class="ar-form-row">' +
            '<div class="ar-form-group ar-form-group-wide">' +
              '<label class="ar-form-label">Phone Number</label>' +
              '<input id="fParentPhone" class="ar-form-input" placeholder="e.g. 08012345678" value="' + (r.parent_phone || '') + '">' +
            '</div>' +
            '<div class="ar-form-group ar-form-group-wide">' +
              '<label class="ar-form-label">Home Address</label>' +
              '<input id="fParentAddress" class="ar-form-input" placeholder="Street, Town / City" value="' + (r.parent_address || '') + '">' +
            '</div>' +
          '</div>' +

          '<div class="ar-section-divider">Previous School Information</div>' +

          '<div class="ar-form-row">' +
            '<div class="ar-form-group ar-form-group-wide">' +
              '<label class="ar-form-label">Previous School</label>' +
              '<input id="fPrevSchool" class="ar-form-input" placeholder="Name of previous school (leave blank if first school)" value="' + (r.previous_school || '') + '">' +
            '</div>' +
            '<div class="ar-form-group">' +
              '<label class="ar-form-label">Class Passed</label>' +
              '<input id="fPrevClass" class="ar-form-input" placeholder="e.g. Nursery 2" value="' + (r.class_passed_previous || '') + '">' +
            '</div>' +
          '</div>' +

          '<div class="ar-section-divider">Supporting Documents on File</div>' +

          '<div class="ar-docs-row">' +
            '<label class="ar-doc-check"><input type="checkbox" id="fDocPassport"'  + (docs.passport      ? ' checked' : '') + '> Passport Photograph</label>' +
            '<label class="ar-doc-check"><input type="checkbox" id="fDocBirth"'     + (docs.birth_cert    ? ' checked' : '') + '> Birth Certificate</label>' +
            '<label class="ar-doc-check"><input type="checkbox" id="fDocTransfer"'  + (docs.transfer_letter ? ' checked' : '') + '> Transfer Letter</label>' +
          '</div>' +
          '<div class="ar-form-row" style="margin-top:6px">' +
            '<div class="ar-form-group ar-form-group-full">' +
              '<label class="ar-form-label">Other Documents</label>' +
              '<input id="fDocOthers" class="ar-form-input" placeholder="List any other documents submitted (comma separated)" value="' + (docs.others || '') + '">' +
            '</div>' +
          '</div>' +

        '</div>' + /* end modal-body */
        '<div class="ar-modal-footer">' +
          '<button class="btn btn-outline" onclick="AR.closeModal(\'arFormModal\')">Cancel</button>' +
          '<button class="btn btn-primary" id="arFormSaveBtn">' + (isEdit ? 'Save Changes' : 'Add to Register') + '</button>' +
        '</div>' +
      '</div>';

    modal.classList.add('open');

    document.getElementById('arFormSaveBtn').addEventListener('click', function () {
      var firstName    = (document.getElementById('fFirstName').value || '').trim().toUpperCase();
      var lastName     = (document.getElementById('fLastName').value  || '').trim().toUpperCase();
      var gender       = document.getElementById('fGender').value;
      var dob          = document.getElementById('fDOB').value;
      var doa          = document.getElementById('fDOA').value;
      var cls          = document.getElementById('fClass').value;
      var status       = document.getElementById('fStatus').value;
      var docDate      = document.getElementById('fDOC').value;
      var parentName   = (document.getElementById('fParentName').value    || '').trim();
      var parentPhone  = (document.getElementById('fParentPhone').value   || '').trim();
      var parentAddr   = (document.getElementById('fParentAddress').value || '').trim();
      var prevSchool   = (document.getElementById('fPrevSchool').value    || '').trim();
      var prevClass    = (document.getElementById('fPrevClass').value     || '').trim();
      var docPassport  = document.getElementById('fDocPassport').checked;
      var docBirth     = document.getElementById('fDocBirth').checked;
      var docTransfer  = document.getElementById('fDocTransfer').checked;
      var docOthers    = (document.getElementById('fDocOthers').value     || '').trim();

      if (!firstName || !lastName) { alert('Please enter the student\'s first name and last name.'); return; }
      if (!doa)  { alert('Please enter the date of admission.'); return; }
      if (!cls)  { alert('Please select the current class.'); return; }

      var fullName = firstName + ' ' + lastName;
      var user = getUser();
      var now  = new Date().toISOString();

      if (isEdit) {
        var changes = [];
        if (r.first_name    !== firstName) changes.push({ field: 'first_name',    old: r.first_name,    new: firstName });
        if (r.last_name     !== lastName)  changes.push({ field: 'last_name',     old: r.last_name,     new: lastName  });
        if (r.gender        !== gender)    changes.push({ field: 'gender',         old: r.gender,        new: gender    });
        if (r.current_class !== cls)       changes.push({ field: 'current_class', old: r.current_class, new: cls       });
        if (r.status        !== status)    changes.push({ field: 'status',         old: r.status,        new: status    });
        if ((r.parent_name  || '') !== parentName) changes.push({ field: 'parent_name', old: r.parent_name, new: parentName });

        r.first_name           = firstName;
        r.last_name            = lastName;
        r.full_name            = fullName;
        r.gender               = gender;
        r.date_of_birth        = dob;
        r.date_of_admission    = doa;
        r.current_class        = cls;
        r.status               = status;
        r.date_of_completion   = docDate;
        r.parent_name          = parentName;
        r.parent_phone         = parentPhone;
        r.parent_address       = parentAddr;
        r.previous_school      = prevSchool;
        r.class_passed_previous = prevClass;
        r.docs = { passport: docPassport, birth_cert: docBirth, transfer_letter: docTransfer, others: docOthers };
        r.updated_at           = now;
        r.updated_by           = user.full_name;
        if (!r.audit_log) r.audit_log = [];
        r.audit_log.push({ action: 'edited', by: user.full_name, at: now, changes: changes });
        if (window.logActivity) window.logActivity('edit', 'Updated register record: ' + fullName, 'students');
      } else {
        /* Duplicate check */
        var duplicate = REGISTER.find(function (x) {
          return x.full_name === fullName && x.date_of_birth === dob;
        });
        if (duplicate) {
          if (!confirm('A record with the same name and date of birth already exists (' + duplicate.admission_no + ').\n\nAdd anyway?')) return;
        }
        var newRec = {
          id:                    'AR-' + Date.now(),
          serial_no:             getNextSerialNo(),
          admission_no:          r.admission_no,
          first_name:            firstName,
          last_name:             lastName,
          full_name:             fullName,
          gender:                gender,
          date_of_birth:         dob,
          date_of_admission:     doa,
          parent_name:           parentName,
          parent_phone:          parentPhone,
          parent_address:        parentAddr,
          previous_school:       prevSchool,
          class_passed_previous: prevClass,
          current_class:         cls,
          date_of_completion:    docDate,
          status:                status,
          docs: { passport: docPassport, birth_cert: docBirth, transfer_letter: docTransfer, others: docOthers },
          class_history: [{ class_name: cls, session: '2025/2026', enrolled_on: doa, enrolled_by: user.full_name }],
          audit_log:     [{ action: 'created', by: user.full_name, at: now, changes: [] }],
          created_at:    now,
          created_by:    user.full_name,
          updated_at:    now,
          updated_by:    user.full_name
        };
        REGISTER.push(newRec);
        if (window.logActivity) window.logActivity('create', 'Added to register: ' + fullName + ' (' + newRec.admission_no + ')', 'students');
      }

      saveRegister();
      closeModal('arFormModal');
      renderTable();
    });
  }

  /* ── VIEW MODAL ───────────────────────────── */

  function arInfoRow(label, value) {
    return '<div class="ar-info-row"><span class="ar-info-label">' + label +
      '</span><span class="ar-info-value">' + (value || '—') + '</span></div>';
  }

  function showViewModal(id) {
    var r = REGISTER.find(function (x) { return x.id === id; });
    if (!r) return;

    var docs = r.docs || {};
    var history  = r.class_history || [];
    var auditLog = r.audit_log     || [];

    var histHTML = history.length
      ? history.map(function (h, i) {
          var promText = h.promoted_on
            ? fmtDate(h.promoted_on) + ' &#8594; ' + (h.promoted_to || '')
            : '<em style="color:#9ca3af">Current class</em>';
          return '<tr><td>' + (i + 1) + '</td><td>' + (h.class_name || '—') + '</td>' +
            '<td>' + (h.session || '—') + '</td>' +
            '<td>' + (h.enrolled_on ? fmtDate(h.enrolled_on) : '—') + '</td>' +
            '<td>' + promText + '</td>' +
            '<td>' + (h.enrolled_by || h.promoted_by || '—') + '</td></tr>';
        }).join('')
      : '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">No class history recorded</td></tr>';

    var auditHTML = auditLog.length
      ? auditLog.slice().reverse().map(function (a) {
          var changeSummary = '';
          if (a.changes && a.changes.length) {
            changeSummary = a.changes.map(function (c) {
              return c.field + ': ' + (c.old || '—') + ' &#8594; ' + (c.new || '—');
            }).join('; ');
          }
          return '<tr><td>' + ((a.action || '').charAt(0).toUpperCase() + (a.action || '').slice(1)) + '</td>' +
            '<td>' + (a.by || '—') + '</td>' +
            '<td>' + (a.at ? new Date(a.at).toLocaleString('en-GB') : '—') + '</td>' +
            '<td style="font-size:0.73rem;color:#6b7280">' + (changeSummary || '—') + '</td></tr>';
        }).join('')
      : '<tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af">No audit records</td></tr>';

    var docsHTML = [
      { label: 'Passport Photograph', has: docs.passport },
      { label: 'Birth Certificate',   has: docs.birth_cert },
      { label: 'Transfer Letter',     has: docs.transfer_letter }
    ].map(function (d) {
      return '<div class="ar-doc-status ' + (d.has ? 'ar-doc-have' : 'ar-doc-missing') + '">' +
        (d.has ? '&#10003;' : '&#10007;') + ' ' + d.label + '</div>';
    }).join('');
    if (docs.others) {
      docsHTML += '<div class="ar-doc-status ar-doc-have">&#10003; Others: ' + docs.others + '</div>';
    }
    if (!docs.passport && !docs.birth_cert && !docs.transfer_letter && !docs.others) {
      docsHTML = '<div style="padding:20px;text-align:center;color:#9ca3af">No documents marked as received</div>';
    }

    var gClass = r.gender === 'female' ? 'ar-avatar-female' : 'ar-avatar-male';
    var modal = document.getElementById('arViewModal');

    modal.innerHTML =
      '<div class="ar-modal ar-modal-wide">' +
        '<div class="ar-modal-header">' +
          '<div style="display:flex;align-items:center;gap:14px">' +
            '<div class="ar-avatar-lg ' + gClass + '">' + getInitials(r.full_name) + '</div>' +
            '<div>' +
              '<div class="ar-modal-title">' + (r.full_name || '—') + '</div>' +
              '<div style="font-size:0.8rem;color:#6b7280;margin-top:3px">' +
                (r.admission_no || '') + ' &nbsp;&#183;&nbsp; ' + (r.current_class || '—') +
                ' &nbsp;&#183;&nbsp; ' + getStatusBadge(r.status) +
              '</div>' +
            '</div>' +
          '</div>' +
          '<button class="ar-modal-close" onclick="AR.closeModal(\'arViewModal\')">&#10005;</button>' +
        '</div>' +

        '<div class="ar-view-tabs">' +
          '<button class="ar-tab active"   onclick="AR.switchTab(this,\'vTab-info\')"   >Profile</button>' +
          '<button class="ar-tab"          onclick="AR.switchTab(this,\'vTab-history\')">Class History</button>' +
          '<button class="ar-tab"          onclick="AR.switchTab(this,\'vTab-docs\')"   >Documents</button>' +
          '<button class="ar-tab"          onclick="AR.switchTab(this,\'vTab-audit\')"  >Audit Log</button>' +
        '</div>' +

        '<div class="ar-modal-body">' +

          /* TAB: Profile */
          '<div id="vTab-info" class="ar-tab-panel">' +
            '<div style="font-weight:700;font-size:0.78rem;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Pupil Details</div>' +
            '<div class="ar-view-grid">' +
              arInfoRow('Admission Number', r.admission_no) +
              arInfoRow('Serial Number', r.serial_no) +
              arInfoRow('Full Name', r.full_name) +
              arInfoRow('Gender', r.gender === 'female' ? 'Female' : 'Male') +
              arInfoRow('Date of Birth', fmtDate(r.date_of_birth)) +
              arInfoRow('Date of Admission', fmtDate(r.date_of_admission)) +
              arInfoRow('Current Class', r.current_class) +
              arInfoRow('Status', getStatusBadge(r.status)) +
              arInfoRow('Date of Completion', fmtDate(r.date_of_completion)) +
            '</div>' +
            '<div style="margin-top:20px;padding-top:14px;border-top:1px solid #f3f4f6">' +
              '<div style="font-weight:700;font-size:0.78rem;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Parent / Guardian</div>' +
              '<div class="ar-view-grid">' +
                arInfoRow('Name', r.parent_name) +
                arInfoRow('Phone Number', r.parent_phone) +
                arInfoRow('Home Address', r.parent_address) +
              '</div>' +
            '</div>' +
            '<div style="margin-top:20px;padding-top:14px;border-top:1px solid #f3f4f6">' +
              '<div style="font-weight:700;font-size:0.78rem;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Previous School</div>' +
              '<div class="ar-view-grid">' +
                arInfoRow('School Name', r.previous_school) +
                arInfoRow('Class Passed', r.class_passed_previous) +
              '</div>' +
            '</div>' +
            '<div style="margin-top:14px;padding-top:10px;border-top:1px solid #f3f4f6;font-size:0.73rem;color:#9ca3af">' +
              'Added by ' + (r.created_by || '—') + ' on ' + (r.created_at ? new Date(r.created_at).toLocaleString('en-GB') : '—') +
              (r.updated_at && r.updated_at !== r.created_at
                ? ' &nbsp;&#183;&nbsp; Last edited by ' + (r.updated_by || '—') + ' on ' + new Date(r.updated_at).toLocaleString('en-GB')
                : '') +
            '</div>' +
          '</div>' +

          /* TAB: Class History */
          '<div id="vTab-history" class="ar-tab-panel" style="display:none">' +
            '<div class="table-scroll">' +
              '<table class="data-table">' +
                '<thead><tr><th>#</th><th>Class</th><th>Session</th><th>Enrolled On</th><th>Promoted</th><th>By</th></tr></thead>' +
                '<tbody>' + histHTML + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +

          /* TAB: Documents */
          '<div id="vTab-docs" class="ar-tab-panel" style="display:none">' +
            '<div style="padding:10px 0">' + docsHTML + '</div>' +
          '</div>' +

          /* TAB: Audit Log */
          '<div id="vTab-audit" class="ar-tab-panel" style="display:none">' +
            '<div class="table-scroll">' +
              '<table class="data-table">' +
                '<thead><tr><th>Action</th><th>By</th><th>Date &amp; Time</th><th>Changes</th></tr></thead>' +
                '<tbody>' + auditHTML + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +

        '</div>' + /* end modal-body */
        '<div class="ar-modal-footer">' +
          '<button class="btn btn-outline" onclick="AR.printProfile(\'' + r.id + '\')">&#128424; Print Profile</button>' +
          '<button class="btn btn-primary" onclick="AR.closeModal(\'arViewModal\');AR.edit(\'' + r.id + '\')">Edit Record</button>' +
        '</div>' +
      '</div>';

    modal.classList.add('open');
  }

  /* ── PROMOTE MODAL ────────────────────────── */

  function showPromoteModal(id) {
    var r = REGISTER.find(function (x) { return x.id === id; });
    if (!r) return;

    var allClasses = window.SCHOOL_CLASSES || [
      'Pre-Nursery 1','Pre-Nursery 2','Nursery 1','Nursery 2','Nursery 3',
      'Basic 1A','Basic 1B','Basic 2','Basic 3','Basic 4','Basic 5','Basic 6'
    ];
    var currentIdx = allClasses.indexOf(r.current_class);
    var suggestedNext = (currentIdx >= 0 && currentIdx < allClasses.length - 1)
      ? allClasses[currentIdx + 1] : null;

    var classOpts = '<option value="">— Select Class —</option>' +
      allClasses.map(function (c) {
        return '<option value="' + c + '"' + (c === suggestedNext ? ' selected' : '') + '>' + c + '</option>';
      }).join('');

    var modal = document.getElementById('arFormModal');
    modal.innerHTML =
      '<div class="ar-modal" style="max-width:440px">' +
        '<div class="ar-modal-header">' +
          '<span class="ar-modal-title">Promote Student</span>' +
          '<button class="ar-modal-close" onclick="AR.closeModal(\'arFormModal\')">&#10005;</button>' +
        '</div>' +
        '<div class="ar-modal-body">' +
          '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin-bottom:20px">' +
            '<div style="font-weight:700;color:#166534;font-size:0.92rem">' + (r.full_name || 'Student') + '</div>' +
            '<div style="font-size:0.82rem;color:#16a34a;margin-top:4px">Current Class: <strong>' + (r.current_class || '—') + '</strong></div>' +
          '</div>' +
          '<div class="ar-form-group" style="margin-bottom:14px">' +
            '<label class="ar-form-label">Promote to Class *</label>' +
            '<select id="fPromoteClass" class="ar-form-select">' + classOpts + '</select>' +
          '</div>' +
          '<div class="ar-form-group">' +
            '<label class="ar-form-label">Academic Session</label>' +
            '<input id="fPromoteSession" class="ar-form-input" placeholder="e.g. 2025/2026" value="2025/2026">' +
          '</div>' +
        '</div>' +
        '<div class="ar-modal-footer">' +
          '<button class="btn btn-outline" onclick="AR.closeModal(\'arFormModal\')">Cancel</button>' +
          '<button class="btn btn-primary" id="arPromoteConfirmBtn">Promote</button>' +
        '</div>' +
      '</div>';

    modal.classList.add('open');

    document.getElementById('arPromoteConfirmBtn').addEventListener('click', function () {
      var newClass = document.getElementById('fPromoteClass').value;
      var session  = (document.getElementById('fPromoteSession').value || '').trim();
      if (!newClass) { alert('Please select the class to promote to.'); return; }

      var user = getUser();
      var now  = new Date().toISOString();
      if (!r.class_history) r.class_history = [];
      var last = r.class_history.length ? r.class_history[r.class_history.length - 1] : null;
      if (last && !last.promoted_on) {
        last.promoted_on = now.split('T')[0];
        last.promoted_to = newClass;
        last.promoted_by = user.full_name;
      }
      r.class_history.push({ class_name: newClass, session: session, enrolled_on: now.split('T')[0], enrolled_by: user.full_name });
      if (!r.audit_log) r.audit_log = [];
      r.audit_log.push({ action: 'promoted', by: user.full_name, at: now, changes: [{ field: 'current_class', old: r.current_class, new: newClass }] });
      r.current_class = newClass;
      r.updated_at    = now;
      r.updated_by    = user.full_name;

      saveRegister();
      if (window.logActivity) window.logActivity('promote', 'Promoted ' + r.full_name + ' to ' + newClass, 'students');
      closeModal('arFormModal');
      renderTable();
    });
  }

  /* ── PRINT / EXPORT MODAL ─────────────────── */

  function showPrintModal() {
    var filtered = getFiltered();
    var modal = document.getElementById('arPrintModal');
    modal.innerHTML =
      '<div class="ar-modal" style="max-width:460px">' +
        '<div class="ar-modal-header">' +
          '<span class="ar-modal-title">Print &amp; Export</span>' +
          '<button class="ar-modal-close" onclick="AR.closeModal(\'arPrintModal\')">&#10005;</button>' +
        '</div>' +
        '<div class="ar-modal-body">' +
          '<div style="font-size:0.82rem;color:#6b7280;margin-bottom:14px">' +
            filtered.length + ' record' + (filtered.length !== 1 ? 's' : '') + ' match current filters and will be included.' +
          '</div>' +
          '<div class="ar-print-options">' +
            '<div class="ar-print-option" onclick="AR.doPrint(\'admission_register\')">' +
              '<div class="ar-print-icon">&#128203;</div>' +
              '<div><div class="ar-print-label">Full Admission Register</div>' +
              '<div class="ar-print-desc">Complete register with all student details</div></div>' +
            '</div>' +
            '<div class="ar-print-option" onclick="AR.doPrint(\'ministry_register\')">' +
              '<div class="ar-print-icon">&#127981;</div>' +
              '<div><div class="ar-print-label">Ministry of Education Register</div>' +
              '<div class="ar-print-desc">Official format for regulatory submission</div></div>' +
            '</div>' +
            '<div class="ar-print-option" onclick="AR.doPrint(\'class_register\')">' +
              '<div class="ar-print-icon">&#128218;</div>' +
              '<div><div class="ar-print-label">Class Register</div>' +
              '<div class="ar-print-desc">Students listed and grouped by class</div></div>' +
            '</div>' +
            '<div class="ar-print-option" onclick="AR.doPrint(\'completion_report\')">' +
              '<div class="ar-print-icon">&#127891;</div>' +
              '<div><div class="ar-print-label">Completion Report</div>' +
              '<div class="ar-print-desc">Graduated / completed students only</div></div>' +
            '</div>' +
          '</div>' +
          '<div style="margin-top:20px;padding-top:14px;border-top:1px solid #f3f4f6">' +
            '<div style="font-weight:700;font-size:0.78rem;color:#374151;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">Export Data</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:10px">' +
              '<button style="flex:1 1 140px;padding:10px 12px;border-radius:8px;border:1.5px solid #e5e7eb;background:#f9fafb;font-family:var(--font-heading);font-size:0.82rem;font-weight:700;cursor:pointer;color:#374151" onclick="AR.exportCSV()">&#128202; Export CSV</button>' +
              '<button style="flex:1 1 140px;padding:10px 12px;border-radius:8px;border:1.5px solid #e5e7eb;background:#f9fafb;font-family:var(--font-heading);font-size:0.82rem;font-weight:700;cursor:pointer;color:#374151" onclick="AR.exportExcel()">&#128200; Export Excel</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    modal.classList.add('open');
  }

  /* ── PRINT LOGIC ──────────────────────────── */

  function doPrint(type) {
    var filtered  = getFiltered().slice().sort(function (a, b) { return (a.serial_no || 0) - (b.serial_no || 0); });
    var printArea = document.getElementById('arPrintArea');
    var school    = 'ROYAL CRYSTAL ACADEMY';
    var printed   = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    var html = '';

    if (type === 'admission_register') {
      html = '<h2>' + school + '</h2><h3>STUDENT ADMISSION REGISTER</h3>' +
        '<p>Printed: ' + printed + '&nbsp;&nbsp;|&nbsp;&nbsp;Total Records: ' + filtered.length + '</p>' +
        '<table class="ar-print-table"><thead><tr>' +
        '<th>S/N</th><th>Adm. No</th><th>Full Name</th><th>Sex</th><th>Date of Birth</th>' +
        '<th>Date Admitted</th><th>Parent/Guardian</th><th>Phone</th>' +
        '<th>Prev. School</th><th>Class Passed</th><th>Current Class</th><th>Status</th>' +
        '</tr></thead><tbody>' +
        filtered.map(function (r, i) {
          return '<tr><td>' + (r.serial_no || i + 1) + '</td><td>' + (r.admission_no || '') + '</td>' +
            '<td>' + (r.full_name || '') + '</td><td>' + (r.gender === 'female' ? 'F' : 'M') + '</td>' +
            '<td>' + (r.date_of_birth || '') + '</td><td>' + (r.date_of_admission || '') + '</td>' +
            '<td>' + (r.parent_name || '') + '</td><td>' + (r.parent_phone || '') + '</td>' +
            '<td>' + (r.previous_school || '') + '</td><td>' + (r.class_passed_previous || '') + '</td>' +
            '<td>' + (r.current_class || '') + '</td>' +
            '<td>' + (r.status || 'active').charAt(0).toUpperCase() + (r.status || 'active').slice(1) + '</td></tr>';
        }).join('') + '</tbody></table>';

    } else if (type === 'ministry_register') {
      html = '<h2>' + school + '</h2><h3>MINISTRY OF EDUCATION — STUDENT REGISTER</h3>' +
        '<p>Printed: ' + printed + '</p>' +
        '<table class="ar-print-table"><thead><tr>' +
        '<th>S/N</th><th>Adm. No</th><th>Full Name</th><th>Sex</th><th>Date of Birth</th>' +
        '<th>Date Admitted</th><th>Parent/Guardian</th><th>Address</th>' +
        '<th>Prev. School</th><th>Class Passed</th><th>Class</th><th>Date of Completion</th><th>Status</th>' +
        '</tr></thead><tbody>' +
        filtered.map(function (r, i) {
          return '<tr><td>' + (r.serial_no || i + 1) + '</td><td>' + (r.admission_no || '') + '</td>' +
            '<td>' + (r.full_name || '') + '</td><td>' + (r.gender === 'female' ? 'F' : 'M') + '</td>' +
            '<td>' + (r.date_of_birth || '') + '</td><td>' + (r.date_of_admission || '') + '</td>' +
            '<td>' + (r.parent_name || '') + '</td><td>' + (r.parent_address || '') + '</td>' +
            '<td>' + (r.previous_school || '') + '</td><td>' + (r.class_passed_previous || '') + '</td>' +
            '<td>' + (r.current_class || '') + '</td><td>' + (r.date_of_completion || '') + '</td>' +
            '<td>' + (r.status || 'active').charAt(0).toUpperCase() + (r.status || 'active').slice(1) + '</td></tr>';
        }).join('') + '</tbody></table>';

    } else if (type === 'class_register') {
      var byClass = {};
      filtered.forEach(function (r) {
        var c = r.current_class || 'Unassigned';
        if (!byClass[c]) byClass[c] = [];
        byClass[c].push(r);
      });
      html = '<h2>' + school + '</h2><h3>CLASS REGISTER</h3><p>Printed: ' + printed + '</p>';
      var classOrder = window.SCHOOL_CLASSES || Object.keys(byClass);
      classOrder.forEach(function (cls) {
        if (!byClass[cls] || !byClass[cls].length) return;
        html += '<h4>Class: ' + cls + ' &mdash; ' + byClass[cls].length + ' pupil' + (byClass[cls].length !== 1 ? 's' : '') + '</h4>';
        html += '<table class="ar-print-table"><thead><tr><th>#</th><th>Adm. No</th><th>Full Name</th>' +
          '<th>Sex</th><th>Date of Birth</th><th>Parent/Guardian</th><th>Phone</th></tr></thead><tbody>';
        byClass[cls].forEach(function (r, i) {
          html += '<tr><td>' + (i + 1) + '</td><td>' + (r.admission_no || '') + '</td><td>' + (r.full_name || '') + '</td>' +
            '<td>' + (r.gender === 'female' ? 'F' : 'M') + '</td><td>' + (r.date_of_birth || '') + '</td>' +
            '<td>' + (r.parent_name || '') + '</td><td>' + (r.parent_phone || '') + '</td></tr>';
        });
        html += '</tbody></table>';
      });

    } else if (type === 'completion_report') {
      var completed = filtered.filter(function (r) { return r.status === 'graduated' || r.date_of_completion; });
      html = '<h2>' + school + '</h2><h3>STUDENT COMPLETION REPORT</h3><p>Printed: ' + printed + '</p>' +
        '<table class="ar-print-table"><thead><tr>' +
        '<th>S/N</th><th>Adm. No</th><th>Full Name</th><th>Sex</th><th>Class</th>' +
        '<th>Date Admitted</th><th>Date of Completion</th><th>Status</th>' +
        '</tr></thead><tbody>' +
        completed.map(function (r, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + (r.admission_no || '') + '</td>' +
            '<td>' + (r.full_name || '') + '</td><td>' + (r.gender === 'female' ? 'F' : 'M') + '</td>' +
            '<td>' + (r.current_class || '') + '</td><td>' + (r.date_of_admission || '') + '</td>' +
            '<td>' + (r.date_of_completion || '') + '</td>' +
            '<td>' + (r.status || '').charAt(0).toUpperCase() + (r.status || '').slice(1) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }

    printArea.innerHTML = html;
    closeModal('arPrintModal');
    window.print();
  }

  /* ── PRINT STUDENT PROFILE ────────────────── */

  function printProfile(id) {
    var r = REGISTER.find(function (x) { return x.id === id; });
    if (!r) return;
    var printArea = document.getElementById('arPrintArea');
    var printed   = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    var histRows = (r.class_history || []).map(function (h, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + (h.class_name || '—') + '</td>' +
        '<td>' + (h.session || '—') + '</td>' +
        '<td>' + (h.enrolled_on || '—') + '</td>' +
        '<td>' + (h.promoted_on ? h.promoted_on + ' &rarr; ' + (h.promoted_to || '') : 'Current') + '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="text-align:center">No history</td></tr>';

    printArea.innerHTML =
      '<h2>ROYAL CRYSTAL ACADEMY</h2><h3>STUDENT PROFILE</h3><p>Printed: ' + printed + '</p>' +
      '<table class="ar-print-table" style="width:100%">' +
        '<tr><th style="width:35%">Admission Number</th><td>' + (r.admission_no || '—') + '</td></tr>' +
        '<tr><th>Full Name</th><td>' + (r.full_name || '—') + '</td></tr>' +
        '<tr><th>Gender</th><td>' + (r.gender === 'female' ? 'Female' : 'Male') + '</td></tr>' +
        '<tr><th>Date of Birth</th><td>' + (r.date_of_birth || '—') + '</td></tr>' +
        '<tr><th>Date of Admission</th><td>' + (r.date_of_admission || '—') + '</td></tr>' +
        '<tr><th>Current Class</th><td>' + (r.current_class || '—') + '</td></tr>' +
        '<tr><th>Status</th><td>' + (r.status || 'active').charAt(0).toUpperCase() + (r.status || 'active').slice(1) + '</td></tr>' +
        '<tr><th>Date of Completion</th><td>' + (r.date_of_completion || '—') + '</td></tr>' +
        '<tr><th>Parent / Guardian</th><td>' + (r.parent_name || '—') + '</td></tr>' +
        '<tr><th>Parent Phone</th><td>' + (r.parent_phone || '—') + '</td></tr>' +
        '<tr><th>Home Address</th><td>' + (r.parent_address || '—') + '</td></tr>' +
        '<tr><th>Previous School</th><td>' + (r.previous_school || '—') + '</td></tr>' +
        '<tr><th>Class Passed</th><td>' + (r.class_passed_previous || '—') + '</td></tr>' +
      '</table>' +
      '<h4>Class History</h4>' +
      '<table class="ar-print-table">' +
        '<thead><tr><th>#</th><th>Class</th><th>Session</th><th>Enrolled</th><th>Promoted</th></tr></thead>' +
        '<tbody>' + histRows + '</tbody>' +
      '</table>';

    closeModal('arViewModal');
    window.print();
  }

  /* ── CSV / EXCEL EXPORT ───────────────────── */

  function makeCSVRow(values) {
    return values.map(function (v) {
      return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    }).join(',');
  }

  function exportCSV() {
    var filtered = getFiltered().slice().sort(function (a, b) { return (a.serial_no || 0) - (b.serial_no || 0); });
    var headers  = ['S/N','Admission No','Full Name','Gender','Date of Birth','Date of Admission',
                    'Parent Name','Parent Phone','Parent Address','Previous School','Class Passed',
                    'Current Class','Date of Completion','Status'];
    var rows = filtered.map(function (r, i) {
      return makeCSVRow([
        r.serial_no || i + 1, r.admission_no || '', r.full_name || '',
        r.gender === 'female' ? 'Female' : 'Male',
        r.date_of_birth || '', r.date_of_admission || '',
        r.parent_name || '', r.parent_phone || '', r.parent_address || '',
        r.previous_school || '', r.class_passed_previous || '',
        r.current_class || '', r.date_of_completion || '',
        (r.status || 'active').charAt(0).toUpperCase() + (r.status || 'active').slice(1)
      ]);
    });
    var csv  = [makeCSVRow(headers)].concat(rows).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'rca-admission-register.csv'; a.click();
    URL.revokeObjectURL(url);
    closeModal('arPrintModal');
  }

  function exportExcel() {
    var filtered = getFiltered().slice().sort(function (a, b) { return (a.serial_no || 0) - (b.serial_no || 0); });
    var headers  = ['S/N','Admission No','Full Name','Gender','Date of Birth','Date of Admission',
                    'Parent Name','Parent Phone','Parent Address','Previous School','Class Passed',
                    'Current Class','Date of Completion','Status'];
    function esc(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    var tbl = '<table border="1"><thead><tr>' + headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>';
    filtered.forEach(function (r, i) {
      tbl += '<tr>' + [
        r.serial_no || i + 1, r.admission_no || '', r.full_name || '',
        r.gender === 'female' ? 'Female' : 'Male',
        r.date_of_birth || '', r.date_of_admission || '',
        r.parent_name || '', r.parent_phone || '', r.parent_address || '',
        r.previous_school || '', r.class_passed_previous || '',
        r.current_class || '', r.date_of_completion || '',
        (r.status || 'active').charAt(0).toUpperCase() + (r.status || 'active').slice(1)
      ].map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>';
    });
    tbl += '</tbody></table>';
    var blob = new Blob(['﻿' + tbl], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'rca-admission-register.xls'; a.click();
    URL.revokeObjectURL(url);
    closeModal('arPrintModal');
  }

  /* ── IMPORT FROM STUDENT ROSTER ───────────── */

  function importFromRoster() {
    var students = (window.SAMPLE_STUDENTS || []).filter(function (s) {
      return s.status === 'active' || !s.status;
    });
    if (!students.length) {
      alert('No active students found in the student roster.');
      return;
    }
    var existingNos = REGISTER.map(function (r) { return r.admission_no; });
    var toImport = students.filter(function (s) {
      return !existingNos.includes(s.admission_no);
    });
    if (!toImport.length) {
      alert('All students from the roster are already in the register.');
      return;
    }
    if (!confirm('Import ' + toImport.length + ' student' + (toImport.length !== 1 ? 's' : '') +
                 ' from the student roster into the Admission Register?\n\n' +
                 'Basic fields (name, gender, class) will be copied. You can fill in additional details (parent, previous school, DOB) by editing each record.')) return;

    var user = getUser();
    var now  = new Date().toISOString();
    toImport.forEach(function (s) {
      REGISTER.push({
        id:                    'AR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        serial_no:             getNextSerialNo(),
        admission_no:          s.admission_no || generateAdmissionNo(),
        first_name:            s.first_name || '',
        last_name:             s.last_name  || '',
        full_name:             s.full_name  || '',
        gender:                s.gender     || 'male',
        date_of_birth:         s.date_of_birth || '',
        date_of_admission:     '',
        parent_name:           '',
        parent_phone:          s.parent_phone || '',
        parent_address:        '',
        previous_school:       '',
        class_passed_previous: '',
        current_class:         s.class_name || '',
        date_of_completion:    '',
        status:                s.status === 'active' ? 'active' : 'active',
        docs: { passport: false, birth_cert: false, transfer_letter: false, others: '' },
        class_history: [{ class_name: s.class_name || '', session: '2025/2026', enrolled_on: '', enrolled_by: user.full_name }],
        audit_log:     [{ action: 'imported', by: user.full_name, at: now, changes: [] }],
        created_at:    now,
        created_by:    user.full_name,
        updated_at:    now,
        updated_by:    user.full_name
      });
    });

    saveRegister();
    if (window.logActivity) window.logActivity('import', 'Imported ' + toImport.length + ' students from roster to Admission Register', 'students');
    renderTable();
    alert('Successfully imported ' + toImport.length + ' student' + (toImport.length !== 1 ? 's' : '') + '.\n\nPlease edit each record to add missing details (Date of Admission, Parent information, etc.).');
  }

  /* ── PUBLIC API ───────────────────────────── */

  window.AR = {
    view:    showViewModal,
    edit:    function (id) {
      var r = REGISTER.find(function (x) { return x.id === id; });
      if (r) showFormModal(r);
    },
    remove:  function (id) {
      var r = REGISTER.find(function (x) { return x.id === id; });
      if (!r) return;
      if (!confirm('Permanently remove "' + (r.full_name || 'this student') + '" from the register?\n\nThis cannot be undone.')) return;
      REGISTER = REGISTER.filter(function (x) { return x.id !== id; });
      window.ADMISSION_REGISTER = REGISTER;
      saveRegister();
      if (window.logActivity) window.logActivity('delete', 'Removed from register: ' + (r.full_name || id), 'students');
      renderTable();
    },
    promote: showPromoteModal,
    closeModal: closeModal,
    switchTab: function (btn, tabId) {
      var modal  = btn.closest('.ar-modal');
      var tabs   = modal.querySelectorAll('.ar-tab');
      var panels = modal.querySelectorAll('.ar-tab-panel');
      tabs.forEach(function (t)   { t.classList.remove('active'); });
      panels.forEach(function (p) { p.style.display = 'none'; });
      btn.classList.add('active');
      var panel = document.getElementById(tabId);
      if (panel) panel.style.display = 'block';
    },
    doPrint:    doPrint,
    printProfile: printProfile,
    exportCSV:  exportCSV,
    exportExcel: exportExcel
  };

  /* ── INIT ─────────────────────────────────── */

  /* Mark this page active in the sidebar */
  var activeLink = document.querySelector('a[href="admission-register.html"]');
  if (activeLink) activeLink.classList.add('active');

  /* Populate class filter dropdown */
  if (classFilter) {
    (window.SCHOOL_CLASSES || []).forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      classFilter.appendChild(opt);
    });
  }

  /* Wire search & filters */
  if (searchInput)   searchInput.addEventListener('input',   renderTable);
  if (classFilter)   classFilter.addEventListener('change',  renderTable);
  if (statusFilter)  statusFilter.addEventListener('change', renderTable);

  /* Buttons */
  var addBtn    = document.getElementById('arAddBtn');
  var printBtn  = document.getElementById('arPrintBtn');
  var importBtn = document.getElementById('arImportBtn');
  if (addBtn)    addBtn.addEventListener('click',    function () { showFormModal(null); });
  if (printBtn)  printBtn.addEventListener('click',  showPrintModal);
  if (importBtn) importBtn.addEventListener('click', importFromRoster);

  /* Close modals on overlay click */
  ['arFormModal', 'arViewModal', 'arPrintModal'].forEach(function (mid) {
    var el = document.getElementById(mid);
    if (el) el.addEventListener('click', function (e) {
      if (e.target === el) closeModal(mid);
    });
  });

  /* RBAC: restrict Add/Import for non-admins */
  var cu     = window.CURRENT_USER;
  var cuRoles = cu ? (cu.roles || [cu.role || cu.primary_role || '']) : [];
  var canEdit = cuRoles.some(function (role) {
    return ['ict_admin', 'head_teacher', 'proprietor'].includes(role);
  });
  if (!canEdit) {
    if (addBtn)    addBtn.style.display    = 'none';
    if (importBtn) importBtn.style.display = 'none';
  }

  /* Initial render */
  renderTable();
});
