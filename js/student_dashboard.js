import { db, auth } from "/js/firebase.js";
import {
    doc, getDoc, onSnapshot,
    collection, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

/* ── CLOCK ── */
function updateClock() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('dateDisplay').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    let h = now.getHours(); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    const m = String(now.getMinutes()).padStart(2, '0'), s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('timeDisplay').textContent = `${String(h).padStart(2, '0')}:${m}:${s} ${ampm}`;
}
updateClock(); setInterval(updateClock, 1000);

/* ── AUTH + LOAD STUDENT ── */
onAuthStateChanged(auth, async user => {
    if (!user) { window.location.href = '/index.html'; return; }

    // Find student doc by uid field
    const { getDocs, where } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
    const snap = await getDocs(query(collection(db, 'students'), where('uid', '==', user.uid)));

    if (snap.empty) {
        document.getElementById('welcomeName').textContent = `Welcome, ${user.displayName || user.email}`;
        return;
    }

    const data = snap.docs[0].data();
    renderStudentData(data);
});

function renderStudentData(s) {
    /* Welcome */
    const firstName = (s.fullName || '').split(' ')[0] || 'Student';
    const el = document.getElementById('welcomeName');
    if (el) el.textContent = `Welcome, ${firstName}`;

    /* Profile card */
    const courseEl = document.querySelector('.profile-row:nth-child(1) span');
    const schoolEl = document.querySelector('.profile-row:nth-child(2) span');
    if (courseEl) courseEl.textContent = s.course || '—';
    if (schoolEl) schoolEl.textContent = s.school || '—';

    /* Status chip */
    const chip = document.querySelector('.status-chip');
    if (chip) {
        const status = s.status || 'pending';
        chip.textContent = status === 'for_submission' ? 'For Submission'
            : status.charAt(0).toUpperCase() + status.slice(1);
        chip.className = 'status-chip';
        if (status === 'approved') chip.classList.add('approved');
        else if (status === 'rejected') chip.classList.add('rejected');
        else if (status === 'for_submission') chip.classList.add('submission');
        else chip.classList.add('pending');
    }

    /* Hours tracker */
    const required = parseInt(s.requiredHours) || 486;
    const rendered = parseInt(s.renderedHours) || 0;
    const remaining = Math.max(required - rendered, 0);
    const pct = required > 0 ? Math.round((rendered / required) * 100) : 0;
    // Days left estimate: assume 8hrs/day
    const daysLeft = remaining > 0 ? `~${Math.ceil(remaining / 8)}` : '0';

    const fraction = document.querySelector('.hours-fraction');
    const barFill = document.querySelector('.hours-bar-fill');
    const pctLabel = document.querySelector('.hours-pct');
    const totalLabel = document.querySelector('.hours-bar-labels span:last-child');
    const vals = document.querySelectorAll('.hours-stat-val');

    if (fraction) fraction.textContent = `${rendered} / ${required} hrs`;
    if (barFill) barFill.style.width = `${pct}%`;
    if (pctLabel) pctLabel.textContent = `${pct}%`;
    if (totalLabel) totalLabel.textContent = required;
    if (vals[0]) vals[0].textContent = rendered;
    if (vals[1]) vals[1].textContent = remaining;
    if (vals[2]) vals[2].textContent = daysLeft;

    /* Application Status Timeline */
    renderTimeline(s);

    /* Submission deadline */
    renderDeadline(s);
}

function renderTimeline(s) {
    const status = s.status || 'pending';
    const steps = ['applied', 'review', 'approved', 'submission'];

    // Map status → active step index
    const activeIndex = status === 'rejected' ? 1
        : status === 'pending' ? 1
            : status === 'for_submission' ? 2
                : status === 'approved' ? 3
                    : 0;

    const tlSteps = document.querySelectorAll('.timeline-step');
    tlSteps.forEach((step, i) => {
        step.classList.remove('done', 'active', 'pending', 'rejected');
        if (i < activeIndex) step.classList.add('done');
        else if (i === activeIndex) step.classList.add(status === 'rejected' ? 'rejected' : 'active');
        else step.classList.add('pending');
    });

    // Update dates on Applied step
    if (s.createdAt?.toDate) {
        const appliedDate = s.createdAt.toDate().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
        const subEl = tlSteps[0]?.querySelector('.tl-sub');
        if (subEl) subEl.textContent = appliedDate;
    }

    // For Submission step — show deadline if set
    const subStep = tlSteps[3];
    if (subStep) {
        const subEl = subStep.querySelector('.tl-sub');
        if (subEl) {
            if (s.submissionDeadline) {
                const dl = new Date(s.submissionDeadline);
                subEl.textContent = `Due: ${dl.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            } else {
                subEl.textContent = 'Submit physical docs';
            }
        }
    }
}

function renderDeadline(s) {
    const list = document.querySelector('.deadline-list');
    if (!list) return;

    const items = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (s.submissionDeadline) {
        const dl = new Date(s.submissionDeadline);
        const diffDays = Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
        const isUrgent = diffDays <= 5;
        items.push({
            name: 'Document Submission',
            date: dl.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
            days: diffDays < 0 ? 'Overdue' : diffDays === 0 ? 'Today' : `${diffDays} day${diffDays !== 1 ? 's' : ''}`,
            urgent: isUrgent || diffDays < 0,
        });
    }

    if (s.targetEnd) {
        const end = new Date(s.targetEnd);
        const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        items.push({
            name: 'OJT End Date',
            date: end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
            days: diffDays < 0 ? 'Passed' : diffDays === 0 ? 'Today' : `${diffDays} day${diffDays !== 1 ? 's' : ''}`,
            urgent: diffDays <= 7 && diffDays >= 0,
        });
    }

    if (!items.length) {
        list.innerHTML = `<div style="color:#7a8898;font-size:.85rem;padding:.5rem 0;">No upcoming deadlines set.</div>`;
        return;
    }

    list.innerHTML = items.map(item => `
        <div class="deadline-item ${item.urgent ? 'urgent' : ''}">
            <div class="deadline-dot"></div>
            <div class="deadline-info">
                <div class="deadline-name">${item.name}</div>
                <div class="deadline-date">${item.date}</div>
            </div>
            <div class="deadline-badge ${item.urgent ? 'urgent-badge' : ''}">${item.days}</div>
        </div>
    `).join('');
}

/* ── ANNOUNCEMENTS ── */
function escapeHtml(str = '') {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const annQ = query(collection(db, 'announcements'), orderBy('created', 'desc'), limit(5));
onSnapshot(annQ, snap => {
    const tbody = document.getElementById('dashboardAnnouncements');
    if (!tbody) return;
    let active = snap.docs.map(d => d.data()).filter(a => a.status === 'Active');
    active.sort((a, b) => {
        if (a.pinned !== b.pinned) return (b.pinned === true) - (a.pinned === true);
        return (b.created?.seconds || 0) - (a.created?.seconds || 0);
    });
    if (!active.length) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:20px;">No announcements</td></tr>`;
        return;
    }
    tbody.innerHTML = active.map(a => {
        const posted = a.created?.toDate?.()?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) || '—';
        return `<tr>
            <td class="col-date">${posted}</td>
            <td class="col-title">${a.pinned ? '📌 ' : ''}${escapeHtml(a.title)}</td>
            <td style="text-align:right;"><span class="badge badge-open">${a.status}</span></td>
        </tr>`;
    }).join('');
});


const logoutModal = document.getElementById("logoutModal");
document.getElementById("logoutBtn").addEventListener("click", () => {
    logoutModal.style.display = "flex";
});
document.getElementById("cancelLogout").addEventListener("click", () => {
    logoutModal.style.display = "none";
});
document.getElementById("confirmLogout").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "../index.html";
});