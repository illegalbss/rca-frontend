<script>
    let allRealStudents = [];
    let allRealParents  = [];

    // Load parent list from the real backend
    async function renderParents() {
      const list = document.getElementById('parentsList');
      if (!list || !window.RCA_API) return;

      list.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;text-align:center;padding:20px">Loading…</p>';

      try {
        const data = await window.RCA_API.call('/users/parents');
        allRealParents = data.parents || [];
      } catch (e) {
        list.innerHTML = `<p style="color:#dc2626;font-size:0.85rem;text-align:center;padding:20px">Could not load parents: ${e.message}</p>`;
        return;
      }

      if (allRealParents.length === 0) {
        list.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;text-align:center;padding:20px">No parent accounts yet. Click + Add Parent Account to create one.</p>';
        return;
      }

      list.innerHTML = allRealParents.map(p => {
        const children = p.children || [];
        return `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <strong style="font-size:0.9rem;color:#111">${p.full_name}</strong>
            <span style="display:block;font-size:0.78rem;color:#6b7280">${p.email} • ${p.phone || 'No phone'}</span>
            <span style="display:block;font-size:0.75rem;color:#1d4ed8;margin-top:4px">
              ${children.length > 0 ? '👦 ' + children.map(c => c.full_name + ' (' + c.class_name + ')').join(', ') : '⚠ No children linked yet'}
            </span>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="linkChildModal(${p.id})" style="padding:6px 12px;background:#dbeafe;color:#1d4ed8;border:none;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer">+ Link Child</button>
            <button onclick="deleteParent(${p.id})" style="padding:6px 12px;background:#fef2f2;color:#dc2626;border:none;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer">Delete</button>
          </div>
        </div>`;
      }).join('');
    }

    // Fetch the real student list (used to populate checkboxes)
    async function loadRealStudents() {
      if (!window.RCA_API) return [];
      try {
        const data = await window.RCA_API.call('/students');
        return data.students || [];
      } catch (e) {
        console.warn('Could not load students:', e.message);
        return [];
      }
    }

    async function showAddParentModal() {
      const modal = document.getElementById('addParentModal');
      modal.classList.add('open');
      ['par_name','par_email','par_phone'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('par_password').value = 'RCA@2026!';
      document.getElementById('parentModalAlert').style.display = 'none';

      allRealStudents = await loadRealStudents();
      const activeStudents = allRealStudents.filter(s => s.status !== 'archived' && s.status !== 'inactive');
      const box = document.getElementById('studentCheckboxes');
      box.innerHTML = activeStudents.length
        ? activeStudents.map(s => `
            <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;font-size:0.82rem">
              <input type="checkbox" value="${s.admission_no}" style="width:16px;height:16px">
              ${s.full_name} — ${s.class_name}
            </label>`).join('')
        : '<p style="color:#9ca3af;font-size:0.82rem;padding:4px">No students registered yet</p>';
    }

    function closeParentModal() {
      document.getElementById('addParentModal').classList.remove('open');
    }

    async function submitAddParent() {
      const name  = document.getElementById('par_name').value.trim();
      const email = document.getElementById('par_email').value.trim();
      const phone = document.getElementById('par_phone').value.trim();
      const pass  = document.getElementById('par_password').value.trim();
      const alertEl = document.getElementById('parentModalAlert');

      if (!name || !email || !phone) {
        alertEl.textContent = 'Please fill in name, email and phone.';
        alertEl.style.display = 'block';
        return;
      }

      const checked = [...document.querySelectorAll('#studentCheckboxes input:checked')].map(i => i.value);

      try {
        await window.RCA_API.call('/users', {
          method: 'POST',
          body: {
            full_name: name,
            email,
            phone,
            password: pass,
            primary_role: 'parent',
            linked_children: checked
          }
        });
      } catch (e) {
        alertEl.textContent = 'Could not create account: ' + e.message;
        alertEl.style.display = 'block';
        return;
      }

      closeParentModal();
      renderParents();

      const toast = document.createElement('div');
      toast.textContent = `✅ Parent account created for ${name}. Login: ${email} / ${pass}`;
      toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#059669;color:#fff;padding:14px 20px;border-radius:10px;z-index:9999;font-size:0.85rem;font-weight:600;max-width:400px;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    }

    async function linkChildModal(parentId) {
      if (allRealStudents.length === 0) allRealStudents = await loadRealStudents();
      const activeStudents = allRealStudents.filter(s => s.status !== 'archived');
      const p = allRealParents.find(p => p.id === parentId);
      const linkedAdmNos = (p?.children || []).map(c => c.admission_no);

      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px';
      modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;width:100%;max-width:400px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
          <h3 style="margin-bottom:16px;color:var(--color-primary);font-size:1rem">Link Child to ${p?.full_name}</h3>
          <div style="max-height:250px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:16px">
            ${activeStudents.map(s => `
              <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;font-size:0.82rem">
                <input type="checkbox" value="${s.admission_no}" ${linkedAdmNos.includes(s.admission_no) ? 'checked' : ''} style="width:16px;height:16px">
                ${s.full_name} — ${s.class_name}
              </label>
            `).join('')}
          </div>
          <div style="display:flex;gap:10px">
            <button onclick="this.closest('[style*=fixed]').remove()" class="btn btn-outline" style="flex:1">Cancel</button>
            <button onclick="saveLinkedChildren(${parentId}, this)" class="btn btn-primary" style="flex:1">Save</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    async function saveLinkedChildren(parentId, btn) {
      const modal = btn.closest('[style*="fixed"]');
      const checked = [...modal.querySelectorAll('input:checked')].map(i => i.value);

      try {
        await window.RCA_API.call(`/users/${parentId}`, {
          method: 'PUT',
          body: { linked_children: checked }
        });
      } catch (e) {
        alert('Could not save: ' + e.message);
        return;
      }

      modal.remove();
      renderParents();
    }

    async function deleteParent(parentId) {
      if (!confirm('Delete this parent account?')) return;
      try {
        await window.RCA_API.call(`/users/${parentId}`, { method: 'DELETE' });
      } catch (e) {
        alert('Could not delete: ' + e.message);
        return;
      }
      renderParents();
    }

    // Close parent modal when clicking outside it
    document.getElementById('addParentModal').addEventListener('click', function(e) {
      if (e.target === this) closeParentModal();
    });

    // Init
    document.addEventListener('DOMContentLoaded', renderParents);
  </script>
