document.querySelector("form").addEventListener("submit", async (e) => {
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
    }
  } catch (err) {
    console.error("Signup error:", err);
  }
});
