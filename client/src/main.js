import { notify } from "./utils/notification.js";

// Signup form handler
const signupForm = document.querySelector("#signupContainer");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const username = e.target.username.value;
    const password = e.target.password.value;

    // Form validation
    if (!email || !username || !password) {
      notify.warning("Please fill in all fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      notify.warning("Please enter a valid email address");
      return;
    }

    // Basic password validation
    if (password.length < 6) {
      notify.warning("Password must be at least 6 characters long");
      return;
    }

    try {
      const res = await fetch("http://opinia.onrender.com/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const result = await res.json();

      if (res.ok) {
        notify.success("Account created successfully");
        // Redirect after showing the notification
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      } else {
        notify.error(result.error || "Failed to create account");
      }
    } catch (err) {
      console.error("Signup error:", err);
      notify.error("An unexpected error occurred");
    }
  });
}

// Login form handler
const loginForm = document.querySelector("#loginContainer");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = e.target.username.value;
    const password = e.target.password.value;

    if (!username || !password) {
      notify.warning("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch("http://opinia.onrender.com/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        notify.success("Login successful");
        // Redirect after showing the notification
        setTimeout(() => {
          window.location.href = "../index.html";
        }, 1500);
      } else {
        notify.error(data.error || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      notify.error("An unexpected error occurred");
    }
  });
}
