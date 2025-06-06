import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcrypt";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables first
dotenv.config();

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// URL validation middleware - must come before route handlers
app.use((req, res, next) => {
  // Check if the URL is a full URL (contains protocol)
  if (req.url.match(/^https?:\/\//)) {
    console.error('Rejected full URL:', req.url);
    return res.status(400).json({ error: 'Full URLs are not allowed' });
  }
  next();
});

// Path normalization middleware
app.use((req, res, next) => {
  // Remove query strings and normalize slashes
  req.url = req.url.split('?')[0].replace(/\/+/g, '/');
  next();
});

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

// Serve static files - keep this AFTER security middleware but BEFORE route handlers
app.use(express.static(path.join(__dirname, '../client')));

// URL normalization middleware
app.use((req, res, next) => {
  try {
    // Log incoming request
    console.log('Request URL:', req.url);
    
    // Clean the URL
    req.cleanUrl = req.url.split('?')[0];
    
    // Proceed to next middleware
    next();
  } catch (error) {
    console.error('Error in URL normalization middleware:', error);
    res.status(400).json({ error: 'Invalid URL format' });
  }
});

// Database configuration
const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize default tags
const DEFAULT_TAGS = [
  { name: 'Music', description: 'Posts about music, artists, and songs' },
  { name: 'Food', description: 'Culinary experiences and recipes' },
  { name: 'Cinema', description: 'Movies, film reviews, and cinema discussion' },
  { name: 'Technology', description: 'Tech news, gadgets, and innovations' },
  { name: 'Gaming', description: 'Video games and gaming culture' },
  { name: 'Sports', description: 'Sports news and athletic achievements' },
  { name: 'Art', description: 'Visual arts, paintings, and creative works' },
  { name: 'Travel', description: 'Travel experiences and destinations' }
];

async function initializeDefaultTags() {
  try {
    console.log('Initializing default tags...');
    
    // Start a transaction
    await db.query('BEGIN');

    for (const tag of DEFAULT_TAGS) {
      // Check if tag already exists
      const existingTag = await db.query(
        'SELECT id FROM tags WHERE tag_name = $1',
        [tag.name]
      );

      if (existingTag.rows.length === 0) {
        // Create new tag if it doesn't exist
        await db.query(
          `INSERT INTO tags (tag_name, description, status)
           VALUES ($1, $2, 'approved')`,
          [tag.name, tag.description]
        );
        console.log(`Created tag: ${tag.name}`);
      }
    }

    await db.query('COMMIT');
    console.log('Default tags initialized successfully');
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error initializing default tags:', err);
  }
}

db.connect()
  .then(() => {
    console.log('Database connected successfully');
    // Initialize default tags after database connection
    initializeDefaultTags();
  })
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
    // get posts with user and tag information using proper joins
    const query = `
      SELECT 
        p.post_id,
        p.post_title,
        p.post_content,
        p.created_at,
        p.post_likes,
        u.username,
        u.profile_pic,
        COALESCE(
          ARRAY_AGG(t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL),
          ARRAY[]::text[]
        ) as tags,
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
    
    // format posts for client
    const posts = result.rows.map(row => ({
      id: row.post_id,
      title: row.post_title,
      content: row.post_content,
      created_at: row.created_at,
      likes: row.post_likes || 0,
      comment_count: parseInt(row.comment_count) || 0,
      username: row.username,
      profile_pic: row.profile_pic,
      tags: row.tags
    }));

    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// check if user is admin
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

// get tags (with optional pending for admins)
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

// delete  tag (admin only)
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
    const { post_title, post_content, tag_ids = [] } = req.body;

    if (!post_title || !post_content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    // Start a transaction
    await db.query('BEGIN');

    try {
      // If there are tag_ids, validate they exist
      if (tag_ids.length > 0) {
        const tagCheck = await db.query(
          `SELECT id FROM tags 
           WHERE id = ANY($1::int[]) 
           AND status = 'approved'`,
          [tag_ids]
        );
        
        if (tagCheck.rows.length !== tag_ids.length) {
          await db.query('ROLLBACK');
          return res.status(400).json({ error: "One or more invalid or unapproved tags" });
        }
      }

      // Create the post
      const postResult = await db.query(
        `INSERT INTO posts (post_title, post_content, user_id, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING post_id`,
        [post_title, post_content, req.session.user.id]
      );

      const postId = postResult.rows[0].post_id;

      // Add tags to post_tags table if any
      if (tag_ids.length > 0) {
        await db.query(
          `INSERT INTO post_tags (post_id, tag_id)
           SELECT $1, UNNEST($2::int[])`,
          [postId, tag_ids]
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
          COALESCE(
            ARRAY_AGG(t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL),
            ARRAY[]::text[]
          ) as tags,
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
        tags: result.rows[0].tags
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

// Get a single post by ID
app.get('/posts/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const query = `
      SELECT 
        p.post_id,
        p.post_title,
        p.post_content,
        p.created_at,
        p.post_likes,
        u.username,
        u.profile_pic,
        COALESCE(
          ARRAY_AGG(t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL),
          ARRAY[]::text[]
        ) as tags,
        COUNT(DISTINCT c.id) as comment_count,
        EXISTS (
          SELECT 1 FROM post_likes pl 
          WHERE pl.post_id = p.post_id 
          AND pl.user_id = $2
        ) as liked
      FROM posts p
      LEFT JOIN accounts u ON p.user_id = u.id
      LEFT JOIN post_tags pt ON p.post_id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN comments c ON p.post_id = c.post_id
      WHERE p.post_id = $1
      GROUP BY p.post_id, p.post_title, p.post_content, p.created_at, p.post_likes, u.username, u.profile_pic
    `;

    const result = await db.query(query, [postId, req.session.user?.id || null]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = {
      post_id: result.rows[0].post_id,
      post_title: result.rows[0].post_title,
      post_content: result.rows[0].post_content,
      created_at: result.rows[0].created_at,
      post_likes: result.rows[0].post_likes || 0,
      comment_count: parseInt(result.rows[0].comment_count) || 0,
      username: result.rows[0].username,
      profile_pic: result.rows[0].profile_pic,
      tags: result.rows[0].tags,
      liked: result.rows[0].liked || false
    };

    res.json(post);
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get comments for a post
app.get('/posts/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const query = `
      SELECT 
        c.id,
        c.content,
        c.created_at,
        c.like_count,
        u.username,
        u.profile_pic,
        CASE WHEN cl.user_id = $1 THEN true ELSE false END as liked
      FROM comments c
      LEFT JOIN accounts u ON c.user_id = u.id
      LEFT JOIN comment_likes cl ON c.id = cl.comment_id AND cl.user_id = $1
      WHERE c.post_id = $2
      ORDER BY c.created_at DESC
    `;

    const result = await db.query(query, [req.session.user?.id || null, postId]);
    
    const comments = result.rows.map(comment => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      likes: comment.like_count || 0,
      username: comment.username,
      profile_pic: comment.profile_pic,
      liked: comment.liked
    }));

    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add a comment to a post
app.post('/posts/:id/comments', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Must be logged in to comment" });
  }

  try {
    const postId = parseInt(req.params.id);
    const { content } = req.body;
    
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // First check if post exists
    const postExists = await db.query(
      "SELECT post_id FROM posts WHERE post_id = $1",
      [postId]
    );

    if (postExists.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create the comment
    const result = await db.query(
      `INSERT INTO comments (content, post_id, user_id, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id, content, created_at`,
      [content, postId, req.session.user.id]
    );

    // Get the complete comment data with username
    const commentQuery = `
      SELECT 
        c.id,
        c.content,
        c.created_at,
        c.like_count,
        u.username,
        u.profile_pic
      FROM comments c
      LEFT JOIN accounts u ON c.user_id = u.id
      WHERE c.id = $1
    `;

    const commentResult = await db.query(commentQuery, [result.rows[0].id]);
    
    const comment = {
      id: commentResult.rows[0].id,
      content: commentResult.rows[0].content,
      created_at: commentResult.rows[0].created_at,
      likes: commentResult.rows[0].like_count || 0,
      username: commentResult.rows[0].username,
      profile_pic: commentResult.rows[0].profile_pic,
      liked: false
    };

    res.status(201).json(comment);
  } catch (err) {
    console.error('Error creating comment:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Like/unlike a post
app.post('/posts/:id/like', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Must be logged in to like posts" });
  }

  try {
    const postId = parseInt(req.params.id);
    
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    // Check if user has already liked the post
    const likeExists = await db.query(
      `SELECT * FROM post_likes 
       WHERE post_id = $1 AND user_id = $2`,
      [postId, req.session.user.id]
    );

    if (likeExists.rows.length > 0) {
      // Unlike
      await db.query(
        `DELETE FROM post_likes 
         WHERE post_id = $1 AND user_id = $2`,
        [postId, req.session.user.id]
      );
      await db.query(
        `UPDATE posts 
         SET post_likes = post_likes - 1
         WHERE post_id = $1`,
        [postId]
      );
    } else {
      // Like
      await db.query(
        `INSERT INTO post_likes (post_id, user_id)
         VALUES ($1, $2)`,
        [postId, req.session.user.id]
      );
      await db.query(
        `UPDATE posts 
         SET post_likes = post_likes + 1
         WHERE post_id = $1`,
        [postId]
      );
    }

    // Get updated like count
    const result = await db.query(
      `SELECT post_likes FROM posts WHERE post_id = $1`,
      [postId]
    );

    res.json({ 
      likes: result.rows[0].post_likes,
      liked: !likeExists.rows.length
    });
  } catch (err) {
    console.error('Error toggling post like:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Like/unlike a comment
app.post('/comments/:id/like', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Must be logged in to like comments" });
  }

  try {
    const commentId = parseInt(req.params.id);
    
    if (isNaN(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    // Check if user has already liked the comment
    const likeExists = await db.query(
      `SELECT * FROM comment_likes 
       WHERE comment_id = $1 AND user_id = $2`,
      [commentId, req.session.user.id]
    );

    if (likeExists.rows.length > 0) {
      // Unlike
      await db.query(
        `DELETE FROM comment_likes 
         WHERE comment_id = $1 AND user_id = $2`,
        [commentId, req.session.user.id]
      );
      await db.query(
        `UPDATE comments 
         SET like_count = like_count - 1
         WHERE id = $1`,
        [commentId]
      );
    } else {
      // Like
      await db.query(
        `INSERT INTO comment_likes (comment_id, user_id)
         VALUES ($1, $2)`,
        [commentId, req.session.user.id]
      );
      await db.query(
        `UPDATE comments 
         SET like_count = like_count + 1
         WHERE id = $1`,
        [commentId]
      );
    }

    // Get updated like count
    const result = await db.query(
      `SELECT like_count FROM comments WHERE id = $1`,
      [commentId]
    );

    res.json({ 
      likes: result.rows[0].like_count,
      liked: !likeExists.rows.length
    });
  } catch (err) {
    console.error('Error toggling comment like:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Handle API 404s - must come after all API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

// Serve index.html for client-side routing
app.use((req, res, next) => {
  // Skip if the request is for a file
  if (req.path.includes('.')) {
    return next();
  }
  
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Final 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

