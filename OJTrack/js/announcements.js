import { db } from "/js/firebase.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const annRef = collection(db, "announcements");
const q = query(annRef, orderBy("created", "desc"));

onSnapshot(q, (snapshot) => {
  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  renderTable(data);
});

function formatDate(dateStr) {
  if (!dateStr) return "—";

  const d = new Date(dateStr + "T00:00:00");

  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function renderTable(data) {
  const tbody = document.querySelector("tbody");

  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:20px;">
          No announcements yet
        </td>
      </tr>
    `;
    return;
  }

  const activeAnnouncements = data.filter(
    a => a.status === "Active"
  );

  tbody.innerHTML = activeAnnouncements.map(a => `
    <tr>
      <td>${a.created?.toDate().toLocaleDateString("en-PH") || "—"}</td>
      <td>
        <strong>${a.title}</strong><br>
        <small>${a.body || ""}</small>
      </td>
      <td>${a.office}</td>
      <td>${formatDate(a.deadline)}</td>
      <td>${a.status}</td>
    </tr>
  `).join("");
}

