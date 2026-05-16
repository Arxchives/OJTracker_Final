import { auth, db } from "/js/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const adminSnap = await getDoc(doc(db, "admins", user.uid));

    let name = user.email;
    let initials = user.email[0].toUpperCase();

    if (adminSnap.exists()) {
        const data = adminSnap.data();
        if (data.name) {
            name = data.name;
            initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
        } else if (data.email) {
            name = data.email;
            initials = data.email[0].toUpperCase();
        }
    }

    document.querySelectorAll(".admin-name").forEach(el => el.textContent = name);
    document.querySelectorAll(".admin-avatar").forEach(el => el.textContent = initials);
});