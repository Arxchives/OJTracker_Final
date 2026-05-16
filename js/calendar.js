import { db } from "/js/firebase.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* FIRESTORE */
const annRef = collection(db, "announcements");
const q = query(annRef, orderBy("created", "desc"));

let announcements = [];

let eventMap = {};

let viewDate = new Date();
let viewYear = viewDate.getFullYear();
let viewMonth = viewDate.getMonth();

let selectedKey = null;

function updateClock() {
  const now = new Date();

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  document.getElementById('dateDisplay').textContent =
    `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  let h = now.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;

  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');

  document.getElementById('timeDisplay').textContent =
    `${String(h).padStart(2, '0')}:${m}:${s} ${ampm}`;
}

updateClock();
setInterval(updateClock, 1000);

function formatKey(date) {
  if (!(date instanceof Date) || isNaN(date)) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildEventMap() {
  const map = {};

  for (const a of announcements) {
    if (a.status !== "Active" || !a.deadline) continue;

    const d = new Date(a.deadline);
    if (isNaN(d)) continue;

    const key = formatKey(d);

    if (!map[key]) map[key] = [];
    map[key].push(a); // store full event
  }

  eventMap = map;
}

onSnapshot(q, (snapshot) => {
  announcements = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  buildEventMap();
  renderCalendar();
  renderEvents();
});

function renderCalendar() {
  const grid = document.getElementById("calGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const year = viewYear;
  const month = viewMonth;
  const now = new Date();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  document.getElementById("monthLabel").textContent =
    `${monthNames[month]} ${year}`;

  const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  dows.forEach(d => {
    const el = document.createElement("div");
    el.className = "cal-dow";
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  if (selectedKey && !eventMap[selectedKey]) {
    selectedKey = null;
  }
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement("div");
    el.className = "cal-day other-month";
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const el = document.createElement("div");
    el.className = "cal-day";
    el.textContent = d;

    const key = formatKey(new Date(year, month, d));

    const isToday =
      d === now.getDate() &&
      month === now.getMonth() &&
      year === now.getFullYear();

    const hasEvent = eventMap[key]?.length > 0;
    const isSelected = selectedKey === key;

    if (isSelected) {
      el.classList.add("selected");
    } else if (isToday) {
      el.classList.add("today");
    } else if (hasEvent) {
      el.classList.add("event-day");
    }

    el.addEventListener("click", () => {
      selectedKey = key;
      showDayDetails(key);
      renderCalendar();
    });

    grid.appendChild(el);
  }
}

/* DAY DETAILS */
function showDayDetails(key) {
  const detail = document.getElementById("dayDetail");
  const dateEl = document.getElementById("dayDetailDate");
  const eventsEl = document.getElementById("dayDetailEvents");

  const dateObj = new Date(key);

  dateEl.textContent = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const events = eventMap[key] || [];

  eventsEl.innerHTML = events.length
    ? events.map(e => `• ${e.title}`).join("<br>")
    : "No events on this day.";

  detail.style.display = "flex";
}

function renderEvents() {
  const list = document.getElementById("eventList");
  if (!list) return;

  const active = announcements
    .filter(a => a.status === "Active" && a.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  list.innerHTML = active.length
    ? active.map(a => `
      <div class="event-item">
        <div class="event-bar"></div>
        <div class="event-date">
          ${new Date(a.deadline).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric"
    })}
        </div>
        <div class="event-title">${a.title}</div>
      </div>
    `).join("")
    : `<div class="event-item">No upcoming events</div>`;
}

window.nextMonth = () => {
  viewMonth++;
  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear++;
  }

  // keep selection if same date exists in new view logic
  renderCalendar();
};

window.prevMonth = () => {
  viewMonth--;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear--;
  }
  selectedKey = null;
  renderCalendar();
};

document.getElementById('prevMonth').addEventListener('click', () => window.prevMonth());
document.getElementById('nextMonth').addEventListener('click', () => window.nextMonth());

document.getElementById('logoutBtn').addEventListener('click', () => {
    document.getElementById('logoutModal').style.display = 'flex';
});
document.getElementById('cancelLogout').addEventListener('click', () => {
    document.getElementById('logoutModal').style.display = 'none';
});
document.getElementById('confirmLogout').addEventListener('click', () => {
    window.location.href = '../index.html';
});
