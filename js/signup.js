import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let currentStep = 1;
const totalSteps = 5;

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

async function getFileBase64(id) {
    const el = document.getElementById(id);
    const file = el?.files?.[0];
    if (!file) return "";

    // If it's an image, compress it first
    if (file.type.startsWith("image/")) {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX = 800;
                let w = img.width, h = img.height;
                if (w > MAX) { h = h * MAX / w; w = MAX; }
                if (h > MAX) { w = w * MAX / h; h = MAX; }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL("image/jpeg", 0.6)); // 60% quality
            };
            img.src = url;
        });
    }

    // For PDFs, just convert as-is (warn if too big)
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

}

function notify(message, type = "error") {
    const container = document.getElementById("notif-container");

    const notif = document.createElement("div");
    notif.className = `notif ${type}`;
    notif.textContent = message;

    container.appendChild(notif);

    setTimeout(() => {
        notif.remove();
    }, 3000);
}

function clearError(id) {
    const input = document.getElementById(id);
    if (!input) return;

    input.classList.remove("input-error");

    const parent = input.closest(".form-group") || input.parentElement;
    const err = parent.querySelector(".field-error");

    if (err) err.remove();
}

function showError(id, message) {
    const input = document.getElementById(id);
    if (!input) return false;

    clearError(id);

    input.classList.add("input-error");

    const error = document.createElement("small");
    error.className = "field-error";
    error.textContent = message;

    const parent = input.closest(".form-group") || input.parentElement;
    parent.appendChild(error);

    return false;
}

function clearAllErrors() {
    document.querySelectorAll(".field-error").forEach(e => e.remove());
    document.querySelectorAll(".input-error").forEach(i => {
        i.classList.remove("input-error");
    });
}

const MAX_FILE_SIZE = 500 * 1024;

function validateFile(file, fieldName) {
    if (!file) return `${fieldName} is required.`;

    const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png"
    ];

    if (!allowedTypes.includes(file.type)) {
        return `${fieldName} must be PDF, JPG, or PNG only.`;
    }

    if (file.size > MAX_FILE_SIZE) {
        return `${fieldName} must be 500KB or less.`;
    }

    return null;
}


const stepValidators = {

    1: () => {
        clearAllErrors();
        let valid = true;

        const fields = [
            ["firstName", "First name is required."],
            ["lastName", "Last name is required."],
            ["birthDate", "Birth date is required."],
            ["sex", "Select sex."],
            ["contactNumber", "Contact number is required."],
            ["email", "Email is required."],
            ["address", "Address is required."],
            ["password", "Password is required."],
            ["confirmPassword", "Confirm password."]
        ];

        fields.forEach(([id, msg]) => {
            if (!getValue(id)) {
                showError(id, msg);
                valid = false;
            }
        });

        if (getValue("password").length < 6) {
            showError("password", "Minimum 6 characters.");
            valid = false;
        }

        if (getValue("password") !== getValue("confirmPassword")) {
            showError("confirmPassword", "Passwords do not match.");
            valid = false;
        }

        return valid;
    },

    2: () => {
        clearAllErrors();
        let valid = true;

        const fields = [
            "school", "college", "course", "yearLevel",
            "studentId", "academicYear", "requiredHours",
            "targetStart", "targetEnd", "adviserName"
        ];

        fields.forEach(id => {
            if (!getValue(id)) {
                showError(id, "Required field.");
                valid = false;
            }
        });

        return valid;
    },

    3: () => {
        clearAllErrors();
        let valid = true;

        const files = [
            ["validIdFile", "Valid ID"],
            ["medicalFile", "Medical"],
            ["moaFile", "MOA"],
            ["resumeFile", "Resume"]
        ];

        files.forEach(([id, label]) => {
            const file = document.getElementById(id)?.files?.[0];
            const error = validateFile(file, label);

            if (error) {
                showError(id, error);
                valid = false;
            }
        });

        return valid;
    },

    4: () => {
        const dept = document.querySelector(".dept-card.selected");
        if (!dept) {
            notify("Select department", "warning");
            return false;
        }
        return true;
    },

    5: () => true
};

function loadReview() {

    const review = document.getElementById("reviewContainer");

    function fileLink(id, label) {
        const input = document.getElementById(id);
        const file = input?.files?.[0];

        if (!file) {
            return `<span class="review-missing">No file uploaded</span>`;
        }

        const url = URL.createObjectURL(file);

        const isImage = file.type.startsWith("image/");

        // auto cleanup after 10 seconds (safe preview window)
        setTimeout(() => URL.revokeObjectURL(url), 10000);

        if (isImage) {
            return `
                <a href="${url}" target="_blank">
                    <img src="${url}" style="max-width:120px; border-radius:6px;" />
                    <div>📷 View ${label}</div>
                </a>
            `;
        }

        return `
            <a class="review-file-link" href="${url}" target="_blank">
                📄 View ${label} (${file.name})
            </a>
        `;
    }

    review.innerHTML = `
        
        <div class="review-grid">

            <!-- STEP 1 -->
            <div class="review-card">
                <h3>👤 Personal Information</h3>

                <div class="review-item"><b>Name:</b> ${getValue("firstName")} ${getValue("lastName")}</div>
                <div class="review-item"><b>Birth Date:</b> ${getValue("birthDate")}</div>
                <div class="review-item"><b>Sex:</b> ${getValue("sex")}</div>
                <div class="review-item"><b>Email:</b> ${getValue("email")}</div>
                <div class="review-item"><b>Contact:</b> ${getValue("contactNumber")}</div>
                <div class="review-item"><b>Address:</b> ${getValue("address")}</div>
            </div>

            <!-- STEP 2 -->
            <div class="review-card">
                <h3>🎓 School Information</h3>

                <div class="review-item"><b>School:</b> ${getValue("school")}</div>
                <div class="review-item"><b>Campus:</b> ${getValue("campus")}</div>
                <div class="review-item"><b>College:</b> ${getValue("college")}</div>
                <div class="review-item"><b>Course:</b> ${getValue("course")}</div>
                <div class="review-item"><b>Year Level:</b> ${getValue("yearLevel")}</div>
                <div class="review-item"><b>Student ID:</b> ${getValue("studentId")}</div>
                <div class="review-item"><b>Required Hours:</b> ${getValue("requiredHours")}</div>
            </div>

            <!-- STEP 3 -->
    <div class="review-card">
        <h3>🏢 Department Preference</h3>

        <div class="review-item">
            <b>Department:</b> 
            ${document.querySelector(".dept-card.selected")?.dataset.dept || "None"}
        </div>

        <div class="review-item">
            <b>Work Days:</b> ${getValue("workDays") || "N/A"}
        </div>

        <div class="review-item">
            <b>Preferred Time:</b> ${getValue("preferredTime") || "N/A"}
        </div>

        <div class="review-item">
            <b>Notes:</b> ${getValue("notes") || "None"}
        </div>
    </div>

    <!-- STEP 4 -->
    <div class="review-card2">
        <h3>📂 Uploaded Documents</h3>

    <div class="review-doc-grid">
        ${fileLink("validIdFile", "Valid ID")}
        ${fileLink("medicalFile", "Medical")}
        ${fileLink("moaFile", "MOA")}
        ${fileLink("resumeFile", "Resume")}
    </div>
    </div>
        `;
}

function updateStepUI(step) {
    window.currentStep = step;

    document.querySelectorAll('.form-slide').forEach(s => s.classList.remove('active'));
    document.getElementById('slide' + step).classList.add('active');

    document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('visible'));
    document.getElementById('panel' + step).classList.add('visible');

    for (let i = 1; i <= totalSteps; i++) {
        const circle = document.getElementById('pc' + i);
        const label = document.getElementById('pl' + i);
        const line = document.getElementById('line' + i);

        if (!circle) continue;

        circle.classList.remove('active', 'done');
        label.classList.remove('active', 'done');

        if (i < step) {
            circle.classList.add('done');
            circle.textContent = '✓';
            label.classList.add('done');
        } else if (i === step) {
            circle.classList.add('active');
            circle.textContent = i;
            label.classList.add('active');
        } else {
            circle.textContent = i;
        }

        if (line) line.classList.toggle('done', i < step);
    }
}

document.querySelectorAll("input, select, textarea").forEach(el => {

    el.addEventListener("input", () => {
        clearError(el.id);
    });

    el.addEventListener("change", () => {
        clearError(el.id);
    });

});

window.goNext = function () {

    if (!stepValidators[currentStep]()) return;

    if (currentStep < totalSteps) {
        currentStep++;
        updateStepUI(currentStep);

        // 🔥 ALWAYS ENSURE REVIEW LOADS
        if (currentStep === 5) {
            setTimeout(() => {
                loadReview();
            }, 50);
        }
    }
};

window.goBack = function () {
    if (currentStep > 1) {
        currentStep--;
        updateStepUI(currentStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
};

document.querySelectorAll('.dept-card').forEach(card => {

    card.addEventListener('click', function () {

        document.querySelectorAll('.dept-card')
            .forEach(c => c.classList.remove('selected'));

        this.classList.add('selected');

    });

});

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("signupForm");
    const btn = document.getElementById("submitBtn");

    form.addEventListener("keydown", (e) => {

        if (e.key === "Enter") {

            if (e.target.tagName === "TEXTAREA") return;

            e.preventDefault();

            if (currentStep < 5) {
                goNext();
            }

        }

    });
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!stepValidators[5]()) return;

        btn.disabled = true;
        const oldText = btn.textContent;
        btn.textContent = "Creating account...";

        try {
            const email = getValue("email");
            const password = getValue("password");

            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCred.user;

            const fullName = `${getValue("firstName")} ${getValue("middleName")} ${getValue("lastName")}`.trim();

            await updateProfile(user, { displayName: fullName });

            const data = {
                uid: user.uid,
                fullName,

                firstName: getValue("firstName"),
                middleName: getValue("middleName"),
                lastName: getValue("lastName"),

                birthDate: getValue("birthDate"),
                sex: getValue("sex"),
                contactNumber: getValue("contactNumber"),
                email,
                address: getValue("address"),

                school: getValue("school"),
                campus: getValue("campus"),
                college: getValue("college"),
                course: getValue("course"),
                yearLevel: getValue("yearLevel"),
                studentId: getValue("studentId"),
                academicYear: getValue("academicYear"),

                requiredHours: getValue("requiredHours"),
                targetStart: getValue("targetStart"),
                targetEnd: getValue("targetEnd"),

                adviserName: getValue("adviserName"),
                adviserContact: getValue("adviserContact"),

                selectedDept: document.querySelector(".dept-card.selected")?.dataset.dept || "",

                workDays: getValue("workDays"),
                preferredTime: getValue("preferredTime"),
                notes: getValue("notes"),

                documents: {
                    validId: await getFileBase64("validIdFile"),
                    medical: await getFileBase64("medicalFile"),
                    moa: await getFileBase64("moaFile"),
                    resume: await getFileBase64("resumeFile")
                },

                status: "pending",
                createdAt: serverTimestamp()
            };


            await setDoc(doc(db, "students", user.uid), data);

            document.getElementById('successModal').style.display = 'flex';

        } catch (err) {
            console.error(err);
            notify(err.message, "error");
        } finally {
            btn.disabled = false;
            btn.textContent = oldText;
        }
    });

    updateStepUI(currentStep);
});