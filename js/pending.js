import { auth, db } from "/js/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

function showForSubmissionNotice(deadline) {
    const statusTitle = document.getElementById("statusTitle");
    const statusBadge = document.getElementById("statusBadge");
    const statusNotice = document.getElementById("statusNotice");

    if (statusTitle) statusTitle.textContent = "⚠️ Action Required";
    if (statusBadge) statusBadge.innerHTML = `<span class="badge badge-warning" style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:600;">For Submission</span>`;
    if (statusNotice) {
        statusNotice.style.background = "#fef3c7";
        statusNotice.style.border = "1px solid #f59e0b";
        statusNotice.style.borderRadius = "8px";
        statusNotice.style.padding = "1rem";
        statusNotice.innerHTML = `
        <strong>⚠️ Your application requires in-person document submission.</strong><br><br>
        Please bring your original documents to the <strong>Bureau of Fire Protection – San Simon</strong> office.<br><br>
        ${deadline ? `<strong>📅 Submission Deadline: ${formatDateMDY(deadline)}</strong><br><br>` : ""}
        Your application will only be processed after your physical documents have been received and verified by the designated personnel.
    `;
    }
}

function formatDateMDY(dateStr) {
    if (!dateStr) return null;

    const date = new Date(dateStr);

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "2-digit"
    });
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/index.html";
        return;
    }

    const snap = await getDoc(doc(db, "students", user.uid));

    if (!snap.exists()) return;

    const data = snap.data();
    const status = data.status;
    const deadline = data.submissionDeadline || null;

    if (status === "approved") {
        window.location.href = "/pages/student/dashboard.html";
    } else if (status === "rejected") {
        window.location.href = "/pages/student/rejected.html";
    } else if (status === "for_submission") {
        showForSubmissionNotice(deadline);
    }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "/index.html";
});