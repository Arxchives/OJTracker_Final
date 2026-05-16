import { db } from "./firebase.js";
import { auth } from "/js/firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const annRef = collection(db, "announcements");
const q = query(annRef, orderBy("created", "desc"));

let announcements = [];
let editingId = null;
let deletingId = null;
onSnapshot(q, (snapshot) => {
    announcements = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    renderStats();
    renderTable();
});

const OFFICES = ["Mayor's Office", "HRMO", "Legal Office", "Engineering Office", "Internship Desk", "All Departments"];

/* ── HELPERS ── */
function badgeClass(s) {
    return {
        Active: 'badge-active',
        Draft: 'badge-draft',
        Archived: 'badge-archived',
    }[s] || 'badge-draft';
}

function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function daysLeft(str) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dl = new Date(str + 'T00:00:00');
    const diff = Math.round((dl - today) / 86400000);
    if (diff < 0) return {
        text: `${Math.abs(diff)}d overdue`,
        overdue: true
    };
    if (diff === 0) return {
        text: 'Due today',
        overdue: false
    };
    return {
        text: `${diff}d remaining`,
        overdue: false
    };
}

function escHtml(s = "") {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ── STATS ── */
function renderStats() {
    const total = announcements.length;
    const active = announcements.filter(a => a.status === 'Active').length;
    const draft = announcements.filter(a => a.status === 'Draft').length;
    const expired = announcements.filter(a => a.status === 'Expired' || a.status === 'Archived').length;
    document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card teal">
      <div class="stat-card-top"><span class="stat-card-label">Total Announcements</span>
        <div class="stat-icon teal"><svg viewBox="0 0 24 24" fill="none" stroke="#1a7f72" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
      </div>
      <div class="stat-card-value">${total}</div>
      <div class="stat-card-sub">all announcements</div>
    </div>
    <div class="stat-card teal">
      <div class="stat-card-top"><span class="stat-card-label">Active</span>
        <div class="stat-icon teal"><svg viewBox="0 0 24 24" fill="none" stroke="#1a7f72" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
      </div>
      <div class="stat-card-value">${active}</div>
      <div class="stat-card-sub"><span class="stat-delta delta-up">Live</span> visible to interns</div>
    </div>
    <div class="stat-card gold">
      <div class="stat-card-top"><span class="stat-card-label">Drafts</span>
        <div class="stat-icon gold"><svg viewBox="0 0 24 24" fill="none" stroke="#c8902a" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></div>
      </div>
      <div class="stat-card-value">${draft}</div>
      <div class="stat-card-sub"><span class="stat-delta delta-warn">Unpublished</span></div>
    </div>
    <div class="stat-card red">
      <div class="stat-card-top"><span class="stat-card-label">Expired / Archived</span>
        <div class="stat-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
      </div>
      <div class="stat-card-value">${expired}</div>
      <div class="stat-card-sub">no longer active</div>
    </div>`;
}

/* ── TABLE ── */
function renderTable() {
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const office = document.getElementById('officeFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';

    let data = announcements.filter(a => {
        const mq =
            !search ||
            (a.title || '').toLowerCase().startsWith(search.toLowerCase());
        const mo = !office || a.office === office;
        const ms = !status || a.status === status;
        return mq && mo && ms;
    });

    data.sort((a, b) => {
        if (a.pinned !== b.pinned) {
            return (b.pinned === true) - (a.pinned === true);
        }

        const aTime =
            a.created?.seconds ??
            new Date(a.created)?.getTime() / 1000 ??
            0;

        const bTime =
            b.created?.seconds ??
            new Date(b.created)?.getTime() / 1000 ??
            0;

        return bTime - aTime;
    });
    const tbody = document.getElementById('tableBody');
    const empty = document.getElementById('emptyState');
    const pinNote = document.getElementById('pinnedNote');

    if (!data.length) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        pinNote.style.display = 'none';
    } else {
        empty.style.display = 'none';
        pinNote.style.display = data.some(a => a.pinned) ? 'inline' : 'none';
        tbody.innerHTML = data.map(a => {
            const dl = daysLeft(a.deadline);
            const bc = badgeClass(a.status);
            const pinRow = a?.pinned ? ' class="pinned-row"' : '';
            const pinDot = a.pinned ?
                `<svg class="pin-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a1 1 0 0 1 .894.553l2.382 4.764 5.254.763a1 1 0 0 1 .555 1.705l-3.804 3.707.898 5.234a1 1 0 0 1-1.451 1.054L12 17.347l-4.728 2.433a1 1 0 0 1-1.451-1.054l.898-5.234L2.915 9.785a1 1 0 0 1 .555-1.705l5.254-.763 2.382-4.764A1 1 0 0 1 12 2z"/></svg>` :
                '<span style="width:15px;display:inline-block;"></span>';
            return `<tr${pinRow}>
        <td style="padding-left:1.25rem;padding-right:0;">${pinDot}</td>
        <td>
          <div class="ann-title">${escHtml(a.title)}</div>
          <div class="ann-body">${escHtml(a.body || '—')}</div>
        </td>
        <td><span class="office-tag">${escHtml(a.office)}</span></td>
        <td>
          <div class="deadline-date ${dl.overdue && a.status === 'Active' ? 'deadline-overdue' : ''}">${formatDate(a.deadline)}</div>
          <div class="deadline-sub">${dl.text}</div>
        </td>
        <td class="td-center"><span class="badge ${bc}">${a.status}</span></td>
        <td>
          <div class="actions-cell">
            <button 
  class="icon-btn pin ${a.pinned ? 'is-active' : ''}" 
  title="${a.pinned ? 'Unpin from top' : 'Pin to top'}" 
  onclick="togglePin('${a.id}')">
              <svg viewBox="0 0 24 24" fill="${a.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 2a1 1 0 0 1 .894.553l2.382 4.764 5.254.763a1 1 0 0 1 .555 1.705l-3.804 3.707.898 5.234a1 1 0 0 1-1.451 1.054L12 17.347l-4.728 2.433a1 1 0 0 1-1.451-1.054l.898-5.234L2.915 9.785a1 1 0 0 1 .555-1.705l5.254-.763 2.382-4.764A1 1 0 0 1 12 2z"/></svg>
            </button>
            <button class="icon-btn edit" title="Edit" onclick="openEditModal('${a.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="icon-btn del" title="Delete" onclick="openDelModal('${a.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
        }).join('');
    }

    document.getElementById('rowCount').textContent = `Showing ${data.length} announcement${data.length !== 1 ? 's' : ''}`;
    document.getElementById('paginationInfo').textContent = `Showing 1–${data.length} of ${data.length}`;
}

/* ── CHAR COUNTER ── */
function updateCharCount(fieldId, countId, max) {
    const len = document.getElementById(fieldId).value.length;
    const el = document.getElementById(countId);
    el.textContent = `${len} / ${max}`;
    el.className = 'char-count' + (len > max * .85 ? ' warn' : '');
}

function openEditModal(id) {
    const a = announcements.find(x => x.id === id);
    if (!a) return;

    editingId = id;

    document.getElementById('modalTitle').textContent = 'Edit Announcement';
    document.getElementById('saveBtn').textContent = 'Save Changes';

    document.getElementById('field-title').value = a.title;
    document.getElementById('field-body').value = a.body || '';
    document.getElementById('field-office').value = a.office;
    document.getElementById('field-status').value = a.status;
    document.getElementById('field-deadline').value = a.deadline;
    document.getElementById('field-pin').checked = a.pinned;

    document.getElementById('pinToggleWrap').classList.toggle('checked', a.pinned);

    updateCharCount('field-title', 'titleCount', 100);
    updateCharCount('field-body', 'bodyCount', 500);

    clearErrors();
    document.getElementById('formModal').classList.add('open');
}
function closeFormModal() {
    document.getElementById('formModal').classList.remove('open');
    editingId = null;
    clearErrors();
}

function clearForm() {
    ['field-title', 'field-body', 'field-office', 'field-deadline'].forEach(id => {
        const el = document.getElementById(id);
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';
    });
    document.getElementById('field-status').value = 'Active';
    document.getElementById('field-pin').checked = false;
    document.getElementById('pinToggleWrap').classList.remove('checked');

    document.getElementById('titleCount').textContent = '0 / 100';
    document.getElementById('bodyCount').textContent = '0 / 500';
    clearErrors();
}

function clearErrors() {
    ['row-title', 'row-office', 'row-deadline'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('has-error');
    });
}
function closeDelModal() {
    deletingId = null;
    document.getElementById('delModal').classList.remove('open');
}

async function saveAnnouncement() {
    clearErrors();

    const title = document.getElementById('field-title')?.value?.trim() || '';
    const body = document.getElementById('field-body')?.value?.trim() || '';
    const office = document.getElementById('field-office').value;
    const status = document.getElementById('field-status').value;
    const deadline = document.getElementById('field-deadline').value;
    const pinned = !!document.getElementById('field-pin')?.checked;

    if (!title) document.getElementById('row-title')?.classList.add('has-error');
    if (!office) document.getElementById('row-office')?.classList.add('has-error');
    if (!deadline) document.getElementById('row-deadline')?.classList.add('has-error');

    if (!title || !office || !deadline) return;

    const data = {
        title,
        body,
        office,
        status,
        deadline,
        pinned,
    };

    try {

        if (editingId) {

            await updateDoc(
                doc(db, "announcements", editingId),
                data
            );

            showToast(
                'Announcement updated successfully.',
                'success'
            );

        } else {

            await addDoc(annRef, {
                ...data,
                created: serverTimestamp()
            });

            showToast(
                'Announcement created successfully.',
                'success'
            );
        }

        closeFormModal();

    } catch (err) {

        console.error(err);

        showToast(err.message, 'error');
    }

    closeFormModal();
}

function showToast(message, type = 'success') {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;

    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.textContent = message;

    wrap.appendChild(div);

    setTimeout(() => div.remove(), 3000);
}

function openDelModal(id) {
    deletingId = id;
    document.getElementById('delModal').classList.add('open');
}
window.openDelModal = openDelModal;

async function confirmDelete() {
    if (!deletingId) return;

    try {
        await deleteDoc(doc(db, "announcements", deletingId));
        showToast('Announcement deleted.', 'success');
    } catch (err) {
        console.error(err);
        showToast('Delete failed.', 'error');
    } finally {
        closeDelModal();
    }
}

function updateClock() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('dateDisplay').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    let h = now.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('timeDisplay').textContent = `${String(h).padStart(2, '0')}:${m}:${s} ${ampm}`;
}
updateClock();
setInterval(updateClock, 1000);

async function togglePin(id) {
    const a = announcements.find(x => x.id === id);
    if (!a) return;

    try {
        await updateDoc(doc(db, "announcements", id), {
            pinned: !a.pinned
        });
    } catch (err) {
        console.error(err);
        showToast('Failed to update pin.', 'error');
    }
}
function cancelDelete() {
    deletingId = null;
    document.getElementById('delModal').classList.remove('open');
}
window.cancelDelete = cancelDelete;

function openCreateModal() {
    editingId = null;

    document.getElementById('modalTitle').textContent = 'New Announcement';
    document.getElementById('saveBtn').textContent = 'Create Announcement';

    clearForm();
    document.getElementById('formModal').classList.add('open');
}

window.togglePin = togglePin;
window.openEditModal = openEditModal;
window.openCreateModal = openCreateModal;
window.saveAnnouncement = saveAnnouncement;
window.confirmDelete = confirmDelete;
window.closeFormModal = closeFormModal;
window.closeDelModal = closeDelModal;

window.renderTable = renderTable;
window.updateCharCount = updateCharCount;

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput')?.addEventListener('input', renderTable);
    document.getElementById('officeFilter')?.addEventListener('change', renderTable);
    document.getElementById('statusFilter')?.addEventListener('change', renderTable);
});

const pinCheckbox = document.getElementById('field-pin');
const pinWrap = document.getElementById('pinToggleWrap');

pinCheckbox?.addEventListener('change', () => {
    pinWrap.classList.toggle('checked', pinCheckbox.checked);
});

document.querySelector(".logout-btn")?.addEventListener("click", () => {
    document.getElementById('logoutModal').style.display = 'flex';
});
document.getElementById('cancelLogout')?.addEventListener("click", () => {
    document.getElementById('logoutModal').style.display = 'none';
});
document.getElementById('confirmLogout')?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "/index.html";
});