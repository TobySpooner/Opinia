import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

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

    const result = await db.query(
      `INSERT INTO accounts (username, email, password, bio)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [username, email, password, "Hey there!"]
    );

    res.status(201).json({ message: "Account created", user: result.rows[0] });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

