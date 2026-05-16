import { db } from "/js/firebase.js";
import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
window.openBase64 = function (dataUrl) {
    const win = window.open();
    win.document.write(`<iframe src="${dataUrl}" width="100%" height="100%" style="border:none;margin:0;padding:0;"></iframe>`);
};
document.addEventListener("DOMContentLoaded", () => {

    const params = new URLSearchParams(window.location.search);
    const studentId = params.get("id");

    const reviewBody = document.getElementById("reviewBody");
    const approveBtn = document.getElementById("approveBtn");
    const rejectBtn = document.getElementById("rejectBtn");

    let currentStudent = null;

    async function loadStudent() {
        if (!studentId) {
            reviewBody.innerHTML = "No student selected.";
            return;
        }

        const ref = doc(db, "students", studentId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            reviewBody.innerHTML = "Student not found.";
            return;
        }

        currentStudent = snap.data();
        renderStudent(currentStudent);
        updateActionButtons(currentStudent.status || "pending");
    }

    function docItem(fileName, label) {
        if (!fileName) {
            return `
            <div class="doc-box missing">
                ❌ Missing ${label}
            </div>
        `;
        }

        // TRY treat as URL if possible, else fallback search/view
        const isBase64 = fileName.startsWith("data:");
        const isUrl = fileName.startsWith("http");

        return `
        <div class="doc-box">
            📄 ${label}
            <div class="doc-name">
                ${isBase64
                ? `<span onclick="openBase64('${fileName}')" style="cursor:pointer;color:#1a7f72;text-decoration:underline;">Click to view</span>`
                : isUrl
                    ? `<a href="${fileName}" target="_blank">Click to view</a>`
                    : `<span style="color:#999;">Not uploaded</span>`
            }
            </div>
        </div>
    `;
    }

    function renderStudent(s) {
        reviewBody.innerHTML = `
            <div class="review-title">
                <h2>${s.fullName || "Student"}</h2>
                <p>${s.email || ""}</p>
            </div>

            <div class="review-grid">

                <div class="review-card">
                    <h3>👤 Personal Info</h3>
                    <p><b>Birth:</b> ${s.birthDate || ""}</p>
                    <p><b>Sex:</b> ${s.sex || ""}</p>
                    <p><b>Contact:</b> ${s.contactNumber || ""}</p>
                    <p><b>Address:</b> ${s.address || ""}</p>
                </div>

                <div class="review-card">
                    <h3>🎓 Academic</h3>
                    <p><b>School:</b> ${s.school || ""}</p>
                    <p><b>Course:</b> ${s.course || ""}</p>
                    <p><b>Year:</b> ${s.yearLevel || ""}</p>
                    <p><b>ID:</b> ${s.studentId || ""}</p>
                </div>

                <div class="review-card">
                    <h3>🏢 Preferences</h3>
                    <p><b>Dept:</b> ${s.selectedDept || ""}</p>
                    <p><b>Work Days:</b> ${s.workDays || ""}</p>
                    <p><b>Time:</b> ${s.preferredTime || ""}</p>
                    <p><b>Notes:</b> ${s.notes || ""}</p>
                </div>

                <div class="review-card full">
                    <h3>📂 Documents</h3>
                    <div class="doc-grid">
                        ${docItem(s.documents?.validId, "Valid ID")}
                        ${docItem(s.documents?.medical, "Medical")}
                        ${docItem(s.documents?.moa, "MOA")}
                        ${docItem(s.documents?.resume, "Resume")}
                    </div>
                </div>  

            </div>
        `;
    }

    function updateActionButtons(status) {
        const isForSubmission = status === "for_submission";
        const isApproved = status === "approved";
        const forSubmissionBtn = document.getElementById("forSubmissionBtn");

        approveBtn.disabled = !isForSubmission;
        approveBtn.style.opacity = !isForSubmission ? "0.4" : "1";
        approveBtn.style.cursor = !isForSubmission ? "not-allowed" : "pointer";

        const isRejected = status === "rejected";
        rejectBtn.disabled = isApproved || isRejected;
        rejectBtn.style.opacity = (isApproved || isRejected) ? "0.4" : "1";
        rejectBtn.style.cursor = (isApproved || isRejected) ? "not-allowed" : "pointer";

        forSubmissionBtn.style.display = (!isForSubmission && !isApproved && status !== "rejected") ? "block" : "none";
        forSubmissionBtn.onclick = () => {
            modal.classList.add("show");
            overlay.classList.add("show");
        };

        cancelModal.onclick = () => {
            modal.classList.remove("show");
            overlay.classList.remove("show");
        };

        confirmModal.onclick = async () => {
            const deadline = inputDate.value;

            if (!deadline) {
                showToast("Please select a date first.");
                return;
            }

            await updateDoc(doc(db, "students", studentId), {
                status: "for_submission",
                submissionDeadline: deadline
            });

            modal.classList.remove("show");
            overlay.classList.remove("show");

            showToast(`Deadline set: ${deadline}`);
            await new Promise(r => setTimeout(r, 1200));
            window.location.href = "/pages/admin/admin_documentreview.html";
        };
    }

    approveBtn.onclick = () => {
        showConfirm("Are you sure you want to approve this student?", async () => {
            await updateDoc(doc(db, "students", studentId), { status: "approved" });
            showToast("Student approved!");
            await new Promise(r => setTimeout(r, 1200));
            window.location.href = "/pages/admin/admin_documentreview.html";
        });
    };

    rejectBtn.onclick = () => {
        showConfirm("Are you sure you want to reject this student?", async () => {
            await updateDoc(doc(db, "students", studentId), { status: "rejected" });
            showToast("Student rejected!");
            await new Promise(r => setTimeout(r, 1200));
            window.location.href = "/pages/admin/admin_documentreview.html";
        });
    };

    window.goBack = function () {
        window.location.href = "/pages/admin/admin_documentreview.html";
    };

    loadStudent();
});

function showConfirm(message, onConfirm) {
    const modal = document.getElementById("confirmModal2");
    const overlay = document.getElementById("modalOverlay");
    document.getElementById("confirmModalMsg").textContent = message;
    modal.classList.add("show");
    overlay.classList.add("show");

    document.getElementById("okConfirm").onclick = () => {
        modal.classList.remove("show");
        overlay.classList.remove("show");
        onConfirm();
    };

    document.getElementById("cancelConfirm").onclick = () => {
        modal.classList.remove("show");
        overlay.classList.remove("show");
    };
}



function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

const modal = document.getElementById("submissionModal");
const overlay = document.getElementById("modalOverlay");
const inputDate = document.getElementById("submissionDate");
const cancelModal = document.getElementById("cancelModal");
const confirmModal = document.getElementById("confirmModal");

let pendingDeadline = null;