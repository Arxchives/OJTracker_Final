import { db } from "/js/firebase.js";
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* =========================
   CLOCK
========================= */
function updateClock() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    let h = now.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('dateDisplay').textContent = dateStr;
    document.getElementById('timeDisplay').textContent = `${String(h).padStart(2, '0')}:${m}:${s} ${ampm}`;
}
updateClock();
setInterval(updateClock, 1000);

/* =========================
   STUDENTS — STAT CARDS + RECENT TABLE
========================= */
onSnapshot(collection(db, "students"), (snapshot) => {
    const students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const total = students.length;
    const pending = students.filter(s => s.status === "pending").length;
    const approved = students.filter(s => s.status === "approved").length;
    const rejected = students.filter(s => s.status === "rejected").length;
    const forSubmission = students.filter(s => s.status === "for_submission").length;

    // ✅ Update stat cards
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("stat-total", total);
    set("stat-pending", pending);
    set("stat-approved", approved);
    set("stat-rejected", rejected);
    set("stat-for-submission", forSubmission);

    // ✅ Update alert banner
    const banner = document.getElementById("alertBanner");
    const bannerText = document.getElementById("bannerText");
    if (banner && bannerText) {
        if (pending > 0) {
            bannerText.innerHTML = `<strong>${pending} pending application${pending > 1 ? 's' : ''}</strong> awaiting your review.`;
            banner.style.display = "flex";
        } else {
            banner.style.display = "none";
        }
    }

    // ✅ Recent applications table — latest 5
    const sorted = [...students].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5);
    const tbody = document.getElementById("recentTableBody");
    if (!tbody) return;

    if (!sorted.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;">No applications yet</td></tr>`;
        return;
    }

    tbody.innerHTML = sorted.map(a => {
        const date = a.createdAt?.toDate?.()?.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) || "—";
        const status = (a.status || "pending").toLowerCase();
        const badgeClass = status === "approved" ? "badge-approved" :
            status === "rejected" ? "badge-rejected" :
                status === "for_submission" ? "badge-submission" : "badge-pending";
        const badgeText = status === "for_submission" ? "For Submission" : status.charAt(0).toUpperCase() + status.slice(1);

        return `
            <tr>
                <td>
                    <div class="app-name">${a.fullName || "—"}</div>
                    <div class="app-school">${a.school || "—"}</div>
                </td>
                <td>${a.course || "—"}</td>
                <td class="app-date">${date}</td>
                <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                <td style="text-align:right;">
                    <a href="/pages/admin/admin_applicants.html" class="action-btn">View</a>
                </td>
            </tr>
        `;
    }).join("");

    // ✅ Department Capacity
    const depts = ["Bureau of Fire Protection - San Simon"];
    const maxCapacity = { "Bureau of Fire Protection - San Simon": 30 };

    const deptList = document.getElementById("deptList");
    if (deptList) {
        deptList.innerHTML = depts.map(dept => {
            const count = students.filter(s => s.selectedDept === dept && s.status === "approved").length;
            const max = maxCapacity[dept];
            const pct = Math.min((count / max) * 100, 100);
            const fillClass = pct >= 100 ? "full" : pct >= 75 ? "warn" : "";
            return `
            <div class="dept-item">
                <div class="dept-row">
                    <span class="dept-name">${dept}</span>
                    <span class="dept-count">${count} / ${max}</span>
                </div>
                <div class="dept-track">
                    <div class="dept-fill ${fillClass}" style="width:${pct}%"></div>
                </div>
            </div>
        `;
        }).join("");
    }

    // ✅ Recent Activity
    const activityList = document.getElementById("activityList");
    if (activityList) {
        const activities = [];

        students.forEach(s => {
            const time = s.createdAt?.toDate?.() || null;
            const name = s.fullName || "Unknown";

            // New registration
            activities.push({
                type: "register",
                text: `<strong>${name}</strong> submitted an application.`,
                time,
                dot: "dot-gray"
            });

            // Status changes
            if (s.status === "approved") {
                activities.push({
                    type: "approved",
                    text: `<strong>${name}</strong> was approved.`,
                    time,
                    dot: "dot-teal"
                });
            } else if (s.status === "rejected") {
                activities.push({
                    type: "rejected",
                    text: `<strong>${name}</strong> application was rejected.`,
                    time,
                    dot: "dot-red"
                });
            }
        });

        // Sort by newest
        activities.sort((a, b) => (b.time?.getTime() || 0) - (a.time?.getTime() || 0));

        const latest = activities.slice(0, 5);

        activityList.innerHTML = latest.map((a, i) => {
            const timeStr = a.time
                ? a.time.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
                : "—";
            const isLast = i === latest.length - 1;
            return `
            <div class="activity-item">
                <div class="activity-dot-wrap">
                    <div class="activity-dot ${a.dot}"></div>
                    ${!isLast ? '<div class="activity-line"></div>' : ''}
                </div>
                <div class="activity-content">
                    <div class="activity-text">${a.text}</div>
                    <div class="activity-time">${timeStr}</div>
                </div>
            </div>
        `;
        }).join("");
    }

});

const q = query(collection(db, "announcements"), orderBy("created", "desc"), limit(5));

onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAnnouncements(announcements);
});

function escapeHtml(str = "") {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function renderAnnouncements(data) {
    const tbody = document.getElementById("dashboardAnnouncements");
    if (!tbody) return;

    let active = data.filter(a => a.status === "Active");
    active.sort((a, b) => {
        if (a.pinned !== b.pinned) return (b.pinned === true) - (a.pinned === true);
        return (b.created?.seconds || 0) - (a.created?.seconds || 0);
    });

    if (!active.length) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:20px;">No announcements</td></tr>`;
        return;
    }

    tbody.innerHTML = active.map(a => {
        const posted = a.created?.toDate?.()?.toLocaleDateString("en-PH", { month: "short", day: "numeric" }) || "—";
        return `
            <tr>
                <td class="col-date">${posted}</td>
                <td class="col-title">${a.pinned ? "📌 " : ""}${escapeHtml(a.title)}</td>
                <td style="text-align:right;"><span class="badge badge-open">${a.status}</span></td>
            </tr>
        `;
    }).join("");
}