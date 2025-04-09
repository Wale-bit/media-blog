// Import required modules
import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import fetch from 'node-fetch';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

// Setup file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const backend = express();
const backendPort = 3000;

// Middleware setup
backend.set('view engine', 'ejs');
backend.use(bodyParser.urlencoded({ extended: true }));
backend.use(express.static('public'));
backend.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('Serving /uploads from:', path.join(__dirname, 'uploads'));

backend.use(methodOverride('_method'));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads'); // ✅ consistent with .use()
    console.log('Uploading file to:', uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  },
});
const upload = multer({ storage });

// Use API_BASE_URL from environment variables
const apiBaseUrl = process.env.API_BASE_URL || '4000';

// Routes

// Serve static HTML pages
backend.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
backend.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'public/services.html')));
backend.get('/explore', (req, res) => res.sendFile(path.join(__dirname, 'public/explore.html')));

// Blog route with pagination
backend.get('/blog', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;

  try {
    const response = await fetch(`${apiBaseUrl}/posts?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

    const data = await response.json();
    const posts = Array.isArray(data.posts) ? data.posts : [];
    const currentPage = data.currentPage || page;
    const totalPages = data.totalPages || 1;

    res.render('index', { posts, currentPage, totalPages });
  } catch (error) {
    console.error('Error fetching posts for /blog:', error);
    res.render('index', { posts: [], currentPage: 1, totalPages: 1 });
  }
});

// Admin route with pagination
backend.get('/admin', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;

  try {
    const response = await fetch(`${apiBaseUrl}/posts?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

    const data = await response.json();
    const posts = Array.isArray(data.posts) ? data.posts : [];
    const currentPage = data.currentPage || page;
    const totalPages = data.totalPages || 1;

    res.render('admin', { posts, currentPage, totalPages });
  } catch (error) {
    console.error('Error fetching posts for /admin:', error);
    res.render('admin', { posts: [], currentPage: 1, totalPages: 1 });
  }
});

// Create a new post
backend.post('/posts', upload.single('image'), async (req, res) => {
  try {
    const postData = {
      title: req.body.title,
      content: req.body.content,
      image: req.file ? `/uploads/${req.file.filename}` : null,
    };

    const response = await fetch(`${apiBaseUrl}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    
    res.redirect('/admin');
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Error creating post');
  }
});

// Edit an existing post
backend.post('/posts/:id/edit', upload.single('image'), async (req, res) => {
  try {
    const updatedData = {
      title: req.body.title,
      content: req.body.content,
      ...(req.file && { image: `/uploads/${req.file.filename}` }),
    };

    const response = await fetch(`${apiBaseUrl}/posts/${req.params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    res.redirect('/admin');
  } catch (error) {
    console.error('Error editing post:', error);
    res.status(500).send('Error editing post');
  }
});

// Delete a post
backend.post('/posts/:id/delete', async (req, res) => {
  try {
    const response = await fetch(`${apiBaseUrl}/posts/${req.params.id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    res.redirect('/admin');
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).send('Error deleting post');
  }
});

// Start the server
backend.listen(backendPort, () => {
  console.log(`Backend Server running on http://localhost:${backendPort}`);
});