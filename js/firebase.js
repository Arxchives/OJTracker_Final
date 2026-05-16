import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyATrFSgc2ZXNjhLbMXQdfeOTr27hZdsuz8",
  authDomain: "ojt-tracker-b179e.firebaseapp.com",
  projectId: "ojt-tracker-b179e",
  storageBucket: "ojt-tracker-b179e.firebasestorage.app",
  messagingSenderId: "1057035967672",
  appId: "1:1057035967672:web:2b83e3ab53518d9c96a84d"
};
// IMPORTANT: initialize FIRST
const app = initializeApp(firebaseConfig);

// THEN exports
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);