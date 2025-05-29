import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcrypt";
import session from "express-session";

// Load environment variables first
dotenv.config();

const app = express();
app.use(express.json());

// Development CORS configuration
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_do_not_use_in_production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',  // Only use secure in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24
    },
  })
);

// Database configuration
const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

db.connect()
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Database connection error:', err));

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

// Get user role
app.get("/users/:id/role", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const result = await db.query(
      `SELECT role_name FROM user_with_roles WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.json({ role_name: 'User' }); // Default role
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching user role:", err);
    res.status(500).json({ error: "Database error" });
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

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const result = await db.query(
      `SELECT role_name FROM user_with_roles WHERE id = $1`,
      [req.session.user.id]
    );

    if (result.rows[0]?.role_name === 'Administrator') {
      next();
    } else {
      res.status(403).json({ error: "Admin access required" });
    }
  } catch (err) {
    console.error("Error checking admin status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get tags (with optional pending for admins)
app.get("/tags", async (req, res) => {
    try {
        // Join with accounts to get creator information
        const query = `
            SELECT t.*, 
                   c.username as created_by_username,
                   a.username as approved_by_username
            FROM tags t
            LEFT JOIN accounts c ON t.created_by = c.id
            LEFT JOIN accounts a ON t.approved_by = a.id`;

        console.log('Executing query:', query);
        const result = await db.query(query);
        console.log('Query results:', result.rows);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching tags:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Helper function to check if user is admin
async function checkIsAdmin(userId, db) {
    try {
        const result = await db.query(
            `SELECT role_name FROM user_with_roles WHERE id = $1`,
            [userId]
        );
        return result.rows[0]?.role_name === 'Administrator';
    } catch (err) {
        console.error("Error checking admin status:", err);
        return false;
    }
}

// Create a new tag (requires login)
app.post("/tags", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Must be logged in to create tags" });
  }

  try {
    const { tag_name, description } = req.body;

    if (!tag_name) {
      return res.status(400).json({ error: "Tag name is required" });
    }

    const result = await db.query(
      `INSERT INTO tags (tag_name, description, created_by, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [tag_name, description || null, req.session.user.id]
    );

    // Fetch the complete tag data with username
    const completeTag = await db.query(
      `SELECT t.*, 
              c.username as created_by_username,
              a.username as approved_by_username
       FROM tags t
       LEFT JOIN accounts c ON t.created_by = c.id
       LEFT JOIN accounts a ON t.approved_by = a.id
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(completeTag.rows[0]);
  } catch (err) {
    console.error("Error creating tag:", err);
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: "Tag already exists" });
    } else {
      res.status(500).json({ error: "Database error" });
    }
  }
});

// Approve or reject a tag (admin only)
app.patch("/tags/:id/status", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // If rejecting, delete the tag instead
    if (status === 'rejected') {
      const result = await db.query(
        `DELETE FROM tags 
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Tag not found" });
      }

      return res.json({ message: "Tag rejected and deleted" });
    }

    // For approval, update the status
    const result = await db.query(
      `UPDATE tags 
       SET status = $1, 
           approved_by = $2
       WHERE id = $3
       RETURNING *`,
      [status, req.session.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tag not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating tag status:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete a tag (admin only)
app.delete("/tags/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM tags 
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tag not found" });
    }

    res.json({ message: "Tag deleted successfully" });
  } catch (err) {
    console.error("Error deleting tag:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get user details
app.get("/users/:id", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.username, a.email, a.bio, a.karma
       FROM accounts a
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Update user profile
app.patch("/users/:id", async (req, res) => {
  if (!req.session.user || req.session.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const { bio } = req.body;
    const result = await db.query(
      `UPDATE accounts 
       SET bio = $1
       WHERE id = $2
       RETURNING id, username, email, bio, karma`,
      [bio, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Change password
app.post("/users/:id/change-password", async (req, res) => {
  if (!req.session.user || req.session.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const user = await db.query(
      "SELECT password FROM accounts WHERE id = $1",
      [req.params.id]
    );

    const validPassword = await bcrypt.compare(currentPassword, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash and update new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.query(
      "UPDATE accounts SET password = $1 WHERE id = $2",
      [hashedPassword, req.params.id]
    );

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete account
app.delete("/users/:id", async (req, res) => {
  if (!req.session.user || req.session.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    await db.query("DELETE FROM accounts WHERE id = $1", [req.params.id]);
    req.session.destroy();
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get user's posts
app.get("/users/:id/posts", async (req, res) => {
  try {
    // First check if user exists
    const userExists = await db.query(
      "SELECT id FROM accounts WHERE id = $1",
      [req.params.id]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const result = await db.query(
      `SELECT posts.*, 
              COUNT(DISTINCT comments.id) as comment_count
       FROM posts
       LEFT JOIN comments ON comments.post_id = posts.id
       WHERE posts.user_id = $1
       GROUP BY posts.id
       ORDER BY posts.created_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching user posts:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get user's comments
app.get("/users/:id/comments", async (req, res) => {
  try {
    // First check if user exists
    const userExists = await db.query(
      "SELECT id FROM accounts WHERE id = $1",
      [req.params.id]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const result = await db.query(
      `SELECT comments.*
       FROM comments
       WHERE comments.user_id = $1
       ORDER BY comments.created_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching user comments:", err);
    res.status(500).json({ error: "Database error" });
  }
});

