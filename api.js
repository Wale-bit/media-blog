// Import required modules
import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

export default pool;

// Initialize Express app
const api = express();
const apiPort = process.env.API_PORT || 4000;

// Middleware setup
api.use(bodyParser.json());
api.use(bodyParser.urlencoded({ extended: true }));
api.use(cors());

// File upload configuration
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
api.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Routes

// Get all posts with pagination
api.get('/posts', async (req, res) => {
  let { page = 1, limit = 5 } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]);
    const totalPosts = await pool.query('SELECT COUNT(*) FROM posts');

    res.json({
      message: 'Posts retrieved successfully',
      currentPage: page,
      totalPages: Math.ceil(totalPosts.rows[0].count / limit),
      posts: result.rows.map(post => ({
        ...post,
        image: post.image ? `/${post.image}` : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving posts', error: error.message });
  }
});

// Create a new post
api.post('/posts', upload.single('image'), async (req, res) => {
  try {
    const { title, content } = req.body;

    let base64Image = null;
    if (req.file) {
      const filePath = path.join(uploadDir, req.file.filename);
      const fileBuffer = fs.readFileSync(filePath);
      base64Image = fileBuffer.toString('base64');
      fs.unlinkSync(filePath); // Optionally delete the file after converting to Base64
    }

    const result = await pool.query(
      'INSERT INTO posts (title, content, image) VALUES ($1, $2, $3) RETURNING *',
      [title, content, base64Image]
    );

    res.status(201).json({ message: 'Post created successfully', post: result.rows[0] });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Error creating post', error: error.message });
  }
});

// Update an existing post
api.put('/posts/:id', upload.single('image'), async (req, res) => {
  const { title, content } = req.body;
  const imageUrl = req.file ? `uploads/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      'UPDATE posts SET title = $1, content = $2, image = COALESCE($3, image) WHERE id = $4 RETURNING *',
      [title, content, imageUrl, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ message: 'Post updated successfully', post: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Error updating post', error: error.message });
  }
});

// Delete a post
api.delete('/posts/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post', error: error.message });
  }
});

// Start the server
api.listen(apiPort, () => {
  console.log(`API Server running on http://localhost:${apiPort}`);
});