import { routeUser } from "./routeUser.js";
import { signInWithEmailAndPassword } from "firebase-auth";

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = getValue("email");
    const password = getValue("password");

    try {
        const result = await signInWithEmailAndPassword(auth, email, password);

        const user = result.user;

        // 🔥 DITO IMPORTANT
        await routeUser(user);

    } catch (err) {
        console.error(err);
        alert(err.message);
    }
});