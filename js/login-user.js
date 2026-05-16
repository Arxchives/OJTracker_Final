import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const loginForm = document.getElementById("loginForm");
const loginButton = loginForm.querySelector(".login-button");
const loginError = document.getElementById("loginError");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const captchaText = document.getElementById("captchaText");
const refreshCaptcha = document.getElementById("refreshCaptcha");
const captchaInput = document.getElementById("captchaInput");
const captchaError = document.getElementById("captchaError");
let currentCaptcha = "";

const generateCaptcha = () => {
  currentCaptcha = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join("");
  if (captchaText) captchaText.textContent = currentCaptcha;
  if (captchaInput) captchaInput.value = "";
  if (captchaError) captchaError.textContent = "";
};

const togglePasswordVisibility = () => {
  if (!passwordInput) return;
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  if (togglePassword) togglePassword.textContent = isHidden ? "🙈" : "👁";
};

if (togglePassword) togglePassword.addEventListener("click", togglePasswordVisibility);
if (refreshCaptcha) refreshCaptcha.addEventListener("click", generateCaptcha);

generateCaptcha();

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const enteredCaptcha = captchaInput ? captchaInput.value.trim() : "";

  if (!enteredCaptcha || enteredCaptcha !== currentCaptcha) {
    e.preventDefault();
    loginButton.classList.remove("loading");
    loginButton.disabled = false;
    if (captchaError) captchaError.textContent = "Captcha code does not match. Please retry.";
    generateCaptcha();
    return;
  }

  if (captchaError) captchaError.textContent = "";
  loginButton.classList.add("loading");
  loginButton.disabled = true;
  loginError.textContent = "";

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("userEmail", user.email);

    loginButton.classList.remove("loading");
    loginButton.innerHTML = "<span>✓ Success!</span>";

    // ✅ Check admin first
    const adminSnap = await getDoc(doc(db, "admins", user.uid));
    if (adminSnap.exists()) {
      window.location.href = "../pages/admin/admin_dashboard.html";
      return;
    }

    // ✅ Check student status
    const studentSnap = await getDoc(doc(db, "students", user.uid));
    if (!studentSnap.exists()) {
      window.location.href = "../pages/student/pending.html";
      return;
    }

    const status = studentSnap.data().status;
    if (status === "approved") {
      window.location.href = "../pages/student/dashboard.html";
    } else if (status === "rejected") {
      window.location.href = "../pages/student/rejected.html";
    } else {
      window.location.href = "../pages/student/pending.html";
    }

  } catch (error) {
    loginButton.classList.remove("loading");
    loginButton.disabled = false;
    console.error("Login error:", error.code, error.message);
    document.getElementById("password").value = "";

    let message = "Login failed. Please try again.";
    if (error.code === "auth/invalid-email") message = "Invalid email format.";
    else if (error.code === "auth/user-not-found") message = "No account found with this email.";
    else if (error.code === "auth/wrong-password") message = "Incorrect password.";
    else if (error.code === "auth/invalid-credential") message = "Invalid email or password.";

    loginError.textContent = message;
  }
});