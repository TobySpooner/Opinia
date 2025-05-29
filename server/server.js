import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcrypt";
import session from "express-session";



const app = express();
app.use(express.json());

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true               
}));

dotenv.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24
    },
  })
);


const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

app.listen(8080, () => console.log("port 8080 confirmed"));

app.get("/", (req, res) => res.json({ route: "root" }));

console.log("Loaded DB URL:", process.env.DATABASE_URL);


app.get("/users", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM accounts");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    const result = await db.query(
      `INSERT INTO accounts (username, email, password, bio)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [username, email, hashedPassword, "Hey there!"]
    );

    res.status(201).json({ message: "Account created", user: result.rows[0] });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if the email exists
    const result = await db.query("SELECT * FROM accounts WHERE username = $1", [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Compare hashed password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Set user info in session (excluding password)
    req.session.user = {
      id: user.id,
      username: user.username,
    };

    res.json({ message: "Login successful", user: req.session.user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/me", (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
    console.log("Signed in")
  } else {
    res.status(401).json({ error: "Not logged in" });
    console.log("Not signed in")
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid"); // name of the session cookie
    res.json({ message: "Logged out successfully" });
  });
});

app.get('/posts', async (req, res) => {
  try {
    const q = await db.query('SELECT * FROM posts ORDER BY created_at DESC LIMIT 10');

    const data = [];

    for (const [_, v] of Object.entries(q.rows)) {
      const user = await db.query(`SELECT * FROM user_with_roles WHERE id = ${v.user_id}`);

      data.push({
        ...v,
        user: user.rows[0]
      });
    };

    return res.json({
      ok: true,
      message: "Fetched posts successfully",
      data: data
    }).status(200);
  } catch (e) {
    console.log(`Error fetching posts: ${e}`);
  };
});