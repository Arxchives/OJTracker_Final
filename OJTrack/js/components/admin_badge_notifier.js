import { db } from "/js/firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* prevent duplicate */
if (!window.__badgeListenerInitialized) {
    window.__badgeListenerInitialized = true;

    const studentsRef = collection(db, "students");

    function setBadge(selector, count) {
        document.querySelectorAll(selector).forEach(el => {
            if (!el) return;

            el.textContent = count > 0 ? count : "";
            el.style.display = count > 0 ? "inline-flex" : "none";
        });
    }

    function updateApplicantsBadge(count) {
        setBadge("#sidebarBadge", count);
    }

    function updateDocumentsBadge(count) {
        setBadge(".doc-badge", count);
    }

    onSnapshot(studentsRef, (snapshot) => {

        let pendingCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const status = (data.status || "").toLowerCase().trim();

            if (status === "pending") {
                pendingCount++;
            }
        });

        // SAME VALUE FOR BOTH BADGES
        updateApplicantsBadge(pendingCount);
        updateDocumentsBadge(pendingCount);

    });
}