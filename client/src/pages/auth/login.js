import { notify } from "../../utils/notification.js";

const API_URL = "http://opinia.onrender.com";
const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!username || !password) {
    notify.warning("Please fill in all fields");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    notify.success("Login successful");

    // Redirect after a short delay to show the success message
    setTimeout(() => {
      window.location.href = "../feed/feed.html";
    }, 1500);
  } catch (error) {
    console.error("Login error:", error);
    notify.error(error.message || "Failed to login");
  }
});
