import { db } from "/js/firebase.js";
import {
    collection,
    onSnapshot,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ───────────────
   FIRESTORE
─────────────── */
const studentsRef = collection(db, "students");

let allStudents = [];
let currentFilter = "all";

/* ───────────────
   HELPERS
─────────────── */
function setBadge(selector, count) {
    document.querySelectorAll(selector).forEach(el => {
        if (!el) return;
        el.textContent = count > 0 ? count : "";
        el.style.display = count > 0 ? "inline-flex" : "none";
    });
}

function getDocs(data) {
    return data?.documents || {};
}

onSnapshot(studentsRef, (snapshot) => {

    const temp = [];

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let forSubmission = 0;

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const status = (data.status || "pending").toLowerCase();

        temp.push({
            id: docSnap.id,
            ...data
        });

        if (status === "pending") pending++;
        else if (status === "approved") approved++;
        else if (status === "rejected") rejected++;
        else if (status === "for_submission") forSubmission++;
    });

    temp.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? a.createdAt ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? b.createdAt ?? 0;

        return bTime - aTime;
    });

    allStudents = temp;

    setBadge("#sidebarBadge", pending);
    setBadge(".doc-badge", pending);

    document.getElementById("stat-total").textContent = allStudents.length;
    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-approved").textContent = approved;
    document.getElementById("stat-for-submission").textContent = forSubmission;

    document.getElementById("tab-all").textContent = allStudents.length;
    document.getElementById("tab-pending").textContent = pending;
    document.getElementById("tab-approved").textContent = approved;
    document.getElementById("tab-for-submission").textContent = forSubmission;
    document.getElementById("tab-rejected").textContent = rejected;

    renderCards();
});

window.setFilter = function (filter, el) {
    currentFilter = filter;

    document.querySelectorAll(".filter-tab")
        .forEach(t => t.classList.remove("active"));

    el.classList.add("active");

    renderCards();
};

window.renderCards = function () {
    const list = document.getElementById("studentsList");
    const empty = document.getElementById("emptyState");
    const search = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();

    let filtered = allStudents
        // 1. FILTER (search + filter tab)
        .filter(s => {
            const name = (s.fullName || "").toLowerCase();
            const school = (s.school || "").toLowerCase();
            const status = (s.status || "pending").toLowerCase();

            const matchSearch =
                search === "" ||
                name.startsWith(search) ||
                school.startsWith(search);

            if (!matchSearch) return false;

            if (currentFilter === "pending") return status === "pending";
            if (currentFilter === "approved") return status === "approved";
            if (currentFilter === "rejected") return status === "rejected";
            if (currentFilter === "for_submission") return status === "for_submission";

            return true;
        })

        // 2. PRIORITY SYSTEM (IMPORTANT PART)
        .map(s => {
            const name = (s.fullName || "").toLowerCase();

            s._priority =
                search === "" ? 0 :
                    name.startsWith(search) ? 2 :
                        name.includes(search) ? 1 : 0;

            return s;
        })

        // 3. SORT (priority first)
        .sort((a, b) => {
            return (b._priority || 0) - (a._priority || 0);
        });

    list.innerHTML = "";

    if (filtered.length === 0) {
        empty.style.display = "block";
        return;
    }

    empty.style.display = "none";

    filtered.forEach(s => {
        const status = (s.status || "pending").toLowerCase();

        const statusClass =
            status === "approved" ? "good" :
                status === "rejected" ? "bad" :
                    status === "for_submission" ? "info" : "warn";

        const card = document.createElement("div");
        card.className = "student-card";

        card.innerHTML = `
            <div class="card-top">
                <div>
                    <div class="student-name">${s.fullName || "Unknown"}</div>
                    <div class="student-school">${s.school || ""}</div>
                </div>

               <span class="status-pill ${statusClass}">
                    ${status === "for_submission" ? "For Submission" : status}
                </span>
            </div>

            <button class="review-btn" onclick="openReview('${s.id}')">
    Review Application
</button>
        `;

        list.appendChild(card);
    });

    document.getElementById("rowCount").textContent =
        `Showing ${filtered.length} students`;
};

window.viewStudent = function (id) {
    const student = allStudents.find(s => s.id === id);
    if (!student) return;

    openDrawer(student);
};

function openDrawer(student) {
    const overlay = document.getElementById("drawerOverlay");
    const drawer = document.getElementById("drawer");
    const body = document.getElementById("drawerBody");
    const footer = document.getElementById("drawerFooter");

    const docs = getDocs(student);

    const filePreview = (file, label) => {
        if (!file) {
            return `<div class="doc-missing">✖ ${label} (Missing)</div>`;
        }

        const url = typeof file === "string"
            ? file
            : URL.createObjectURL(file);

        const isImage = (file?.type || "").startsWith?.("image/");

        return isImage
            ? `<a href="${url}" target="_blank">
                    <img src="${url}" class="doc-img"/>
                    <div>${label}</div>
               </a>`
            : `<a href="${url}" target="_blank">📄 ${label}</a>`;
    };

    body.innerHTML = `
        <div class="review-container">

            <div class="review-title">
                <h2>${student.fullName || "Student"}</h2>
                <p>${student.email || ""}</p>
            </div>

            <div class="review-grid">

                <div class="review-card">
                    <h3>👤 Personal Info</h3>
                    <p><b>Birth:</b> ${student.birthDate || ""}</p>
                    <p><b>Sex:</b> ${student.sex || ""}</p>
                    <p><b>Contact:</b> ${student.contactNumber || ""}</p>
                    <p><b>Address:</b> ${student.address || ""}</p>
                </div>

                <div class="review-card">
                    <h3>🎓 Academic</h3>
                    <p><b>School:</b> ${student.school || ""}</p>
                    <p><b>Course:</b> ${student.course || ""}</p>
                    <p><b>Year:</b> ${student.yearLevel || ""}</p>
                    <p><b>ID:</b> ${student.studentId || ""}</p>
                </div>

                <div class="review-card">
                    <h3>🏢 Preferences</h3>
                    <p><b>Dept:</b> ${student.selectedDept || ""}</p>
                    <p><b>Work Days:</b> ${student.workDays || ""}</p>
                    <p><b>Time:</b> ${student.preferredTime || ""}</p>
                    <p><b>Notes:</b> ${student.notes || ""}</p>
                </div>

                <div class="review-card full">
                    <h3>📂 Documents</h3>
                    <div class="doc-grid">
                        ${filePreview(docs.validId, "Valid ID")}
                        ${filePreview(docs.medical, "Medical")}
                        ${filePreview(docs.moa, "MOA")}
                        ${filePreview(docs.resume, "Resume")}
                    </div>
                </div>

            </div>
        </div>
    `;

    const isForSubmission = (student.status || "").toLowerCase() === "for_submission";

    footer.innerHTML = `
    <button class="cancel-btn" onclick="closeDrawer()">Close</button>
    ${!isForSubmission ? `<button class="btn-warning" onclick="markForSubmission('${student.id}')">For Submission</button>` : ""}
    <button class="btn-primary" ${isForSubmission ? "" : "disabled title='Mark as For Submission first'"} onclick="approveStudent('${student.id}')">Approve</button>
    <button class="btn-danger" onclick="rejectStudent('${student.id}')">Reject</button>
`;

    overlay.style.display = "block";
    drawer.style.display = "block";
}

/* ───────────────
   CLOSE
─────────────── */
window.closeDrawer = function () {
    document.getElementById("drawerOverlay").style.display = "none";
    document.getElementById("drawer").style.display = "none";
};

/* ───────────────
   ACTIONS
─────────────── */
window.approveStudent = async function (id) {
    await updateDoc(doc(db, "students", id), { status: "approved" });
    closeDrawer();
};

window.rejectStudent = async function (id) {
    await updateDoc(doc(db, "students", id), { status: "rejected" });
    closeDrawer();
};

window.markForSubmission = async function (id) {
    await updateDoc(doc(db, "students", id), { status: "for_submission" });
    closeDrawer();
};

window.openReview = function (id) {
    window.location.href = `/pages/admin/admin_student_review.html?id=${id}`;
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