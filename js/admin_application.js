import { db, auth } from "/js/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let ALL_STUDENTS = [];
let CURRENT_FILTER = "all";
let tableBody = null;

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
    tableBody = document.getElementById("tableBody");
    if (!tableBody) {
        console.error("❌ tableBody not found");
        return;
    }

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "/index.html";
            return;
        }
        listenStudents();
    });
});

/* =========================
   HELPERS
========================= */
function normalize(status) {
    return (status || "pending").toLowerCase().trim();
}

/* sort: newest to oldest */
function sortByNewest(list) {
    return [...list].sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
    });
}

/* =========================
   FIRESTORE LISTENER
========================= */
function listenStudents() {
    const studentsRef = collection(db, "students");

    onSnapshot(studentsRef, (snapshot) => {

        ALL_STUDENTS = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        updateSummaryCounts();
        renderTable();

    }, (error) => {
        console.error("Firestore listener error:", error);
    });
}

/* =========================
   FILTER DATA
========================= */
function getFilteredData() {
    let filtered = ALL_STUDENTS;

    if (CURRENT_FILTER !== "all") {
        filtered = ALL_STUDENTS.filter(
            a => normalize(a.status) === CURRENT_FILTER
        );
    }

    return sortByNewest(filtered);
}
/* =========================
   RENDER TABLE
========================= */
function renderTable(data = null) {

    const list = data ?? getFilteredData();

    if (!list.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:20px;">
                    No applicants found
                </td>
            </tr>
        `;
        return;
    }

    const sorted = sortByNewest(list);

    tableBody.innerHTML = sorted.map(a => `
    <tr>
        <td>
            <div style="font-weight:600;">${a.fullName || "N/A"}</div>
            <div style="font-size:0.8rem;color:#6b7280;">${a.email || ""}</div>
        </td>
        <td>${a.course || "N/A"}</td>
        <td>${a.yearLevel || "N/A"}</td>
        <td>${a.createdAt?.toDate
            ? a.createdAt.toDate().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
            : "N/A"
        }</td>
        <td>${a.submissionDeadline ? `<span style="color:#92400e;font-weight:600;">📅 ${a.submissionDeadline}</span>` : "—"}</td>
        <td>${normalize(a.status) === "for_submission" ? "For Submission" : normalize(a.status)}</td>
        <td style="text-align:right;">
            <a href="/pages/admin/admin_student_review.html?id=${a.id}" style="color:#1a7f72;font-weight:600;text-decoration:none;">View →</a>
        </td>
    </tr>
`).join("");
}

/* =========================
   SEARCH
========================= */
document.getElementById("searchInput")?.addEventListener("input", function () {

    const search = this.value.toLowerCase();

    const filtered = getFilteredData().filter(a =>
        (a.title || '').toLowerCase().startsWith(search.toLowerCase()));

    renderTable(filtered);
});

/* =========================
   SUMMARY
========================= */
function updateSummaryCounts() {

    const count = (status) =>
        ALL_STUDENTS.filter(a => normalize(a.status) === status).length;

    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    set("cnt-all", ALL_STUDENTS.length);
    set("cnt-pending", count("pending"));
    set("cnt-approved", count("approved"));
    set("cnt-rejected", count("rejected"));
    set("cnt-for-submission", count("for_submission"));

    const badge = document.getElementById("sidebarBadge");

    if (badge) {
        const pending = count("pending");
        badge.textContent = pending > 0 ? pending : "";
        badge.style.display = pending > 0 ? "inline-flex" : "none";
    }
}

/* =========================
   FILTER BUTTONS
========================= */
window.filterCards = function (filter, el) {

    CURRENT_FILTER = filter.toLowerCase().trim();

    document.querySelectorAll(".summary-card")
        .forEach(c => c.classList.remove("filter-active"));

    if (el) el.classList.add("filter-active");

    renderTable();
    updateSummaryCounts();
};
document.querySelector(".logout-btn")?.addEventListener("click", () => {
    document.getElementById('logoutModal').style.display = 'flex';
});
document.getElementById('cancelLogout')?.addEventListener("click", () => {
    document.getElementById('logoutModal').style.display = 'none';
});
document.getElementById('confirmLogout')?.addEventListener("click", () => {
    window.location.href = "/index.html";
});
