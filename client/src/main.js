// Signup form handler
const signupForm = document.querySelector("#signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
      const res = await fetch("http://localhost:8080/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const text = await res.text();
      console.log("Raw server response:", text);

      const result = JSON.parse(text);
      console.log("Signup result:", result);

      if (res.ok) {
        alert("Signup successful!");
      } else {
        console.error("Signup failed:", result.error);
      };
    } catch (err) {
      console.error("Signup error:", err);
    };
  });
};

// Login form handler
const loginForm = document.querySelector("#loginContainer");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = e.target.username.value;
    const password = e.target.password.value;

    const res = await fetch("http://localhost:8080/login", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    console.log(data);

    if (res.ok) {
      alert("Login successful!");
    } else {
      alert(data.error);
    };
  });
};
