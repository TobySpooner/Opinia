import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcrypt";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

// const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 3000;

// Serve static files from the 'dist' folder
app.use(express.static(path.join(__dirname, '../client/dist')));

// Fallback for SPA or HTML routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// Load environment variables first
dotenv.config();

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      secure: false,  // Set to false for development (http)
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: 'lax'
    },
  })
);

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

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

app.get('/posts', async (req, res) => {
  try {
    // Get posts with user and tag information using proper joins
    const query = `
      SELECT 
        p.post_id,
        p.post_title,
        p.post_content,
        p.created_at,
        p.post_likes,
        u.username,
        u.profile_pic,
        ARRAY_AGG(t.tag_name) as tags,
        COUNT(DISTINCT c.id) as comment_count
      FROM posts p
      LEFT JOIN accounts u ON p.user_id = u.id
      LEFT JOIN post_tags pt ON p.post_id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN comments c ON p.post_id = c.post_id
      GROUP BY p.post_id, p.post_title, p.post_content, p.created_at, p.post_likes, u.username, u.profile_pic
      ORDER BY p.created_at DESC
      LIMIT 20
    `;

    const result = await db.query(query);
    
    // Format posts for client
    const posts = result.rows.map(row => ({
      id: row.post_id,
      title: row.post_title,
      content: row.post_content,
      created_at: row.created_at,
      likes: row.post_likes || 0,
      comment_count: parseInt(row.comment_count) || 0,
      username: row.username,
      profile_pic: row.profile_pic,
      tags: row.tags.filter(tag => tag !== null) // Remove null tags
    }));

    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Database error' });
  }
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
        const isAdmin = req.session.user && req.session.user.role === 'admin';
        
        // Base query for approved tags
        let query = `
            SELECT t.id, t.tag_name, t.description, t.status,
                   c.username as created_by_username,
                   a.username as approved_by_username
            FROM tags t
            LEFT JOIN accounts c ON t.created_by = c.id
            LEFT JOIN accounts a ON t.approved_by = a.id
            WHERE t.status = 'approved'`;

        // If admin, include pending tags
        if (isAdmin && req.query.includePending === 'true') {
            query = query.replace('WHERE t.status = \'approved\'', '');
        }

        query += ' ORDER BY t.tag_name ASC';

        const result = await db.query(query);
        
        // Format tags for client
        const tags = result.rows.map(tag => ({
            id: tag.id,
            name: tag.tag_name,
            description: tag.description,
            status: tag.status,
            created_by: tag.created_by_username,
            approved_by: tag.approved_by_username
        }));

        res.json(tags);
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
      `SELECT posts.post_id as id, 
              posts.post_title as title,
              posts.post_content as content,
              posts.created_at,
              posts.post_likes as likes,
              posts.post_comments as comment_count
       FROM posts
       WHERE posts.user_id = $1
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
      `SELECT comments.id,
              comments.content,
              comments.created_at,
              comments.like_count as likes,
              comments.post_id
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

// Get all users with roles
app.get("/roles/all", async (req, res) => {
    try {
        const result = await db.query(
            `SELECT a.id as user_id, r.role_name
             FROM accounts a
             JOIN roles r ON a.role_id = r.id`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching user roles:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Get all users (basic info)
app.get("/users", async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, username, bio, karma
             FROM accounts
             ORDER BY karma DESC, username ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Create a new post
app.post('/posts', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Must be logged in to create posts" });
  }

  try {
    const { post_title, post_content, tag_ids } = req.body;

    if (!post_title || !post_content || !tag_ids || !tag_ids.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Start a transaction
    await db.query('BEGIN');

    try {
      // Create the post
      const postResult = await db.query(
        `INSERT INTO posts (post_title, post_content, user_id, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING post_id`,
        [post_title, post_content, req.session.user.id]
      );

      const postId = postResult.rows[0].post_id;

      // Add tags to post_tags table
      for (const tagId of tag_ids) {
        await db.query(
          `INSERT INTO post_tags (post_id, tag_id)
           VALUES ($1, $2)`,
          [postId, tagId]
        );
      }

      // Commit transaction
      await db.query('COMMIT');

      // Fetch the complete post with tags
      const query = `
        SELECT 
          p.post_id,
          p.post_title,
          p.post_content,
          p.created_at,
          p.post_likes,
          u.username,
          u.profile_pic,
          ARRAY_AGG(t.tag_name) as tags,
          0 as comment_count
        FROM posts p
        LEFT JOIN accounts u ON p.user_id = u.id
        LEFT JOIN post_tags pt ON p.post_id = pt.post_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.post_id = $1
        GROUP BY p.post_id, p.post_title, p.post_content, p.created_at, p.post_likes, u.username, u.profile_pic
      `;

      const result = await db.query(query, [postId]);
      
      const post = {
        id: result.rows[0].post_id,
        title: result.rows[0].post_title,
        content: result.rows[0].post_content,
        created_at: result.rows[0].created_at,
        likes: result.rows[0].post_likes || 0,
        comment_count: 0,
        username: result.rows[0].username,
        profile_pic: result.rows[0].profile_pic,
        tags: result.rows[0].tags.filter(tag => tag !== null)
      };

      res.status(201).json(post);
    } catch (err) {
      // If anything fails, roll back the transaction
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Handle 404s by sending JSON instead of HTML
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

