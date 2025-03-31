import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import fetch from 'node-fetch';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backend = express();
const backendPort = 3000;

backend.set('view engine', 'ejs');
backend.use(bodyParser.urlencoded({ extended: true }));
backend.use(express.static('public'));
backend.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

backend.use(methodOverride('_method'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    console.log('Uploading file to:', uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});


const upload = multer({ storage });

backend.get('/', async (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

backend.get('/services', async (req, res) => {
  res.sendFile(__dirname + '/public/services.html');
});

backend.get('/explore', async (req, res) => {
  res.sendFile(__dirname + '/public/explore.html');
});

backend.get('/blog', async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Get the current page from query params, default to 1
  const limit = 5; // Number of posts per page

  try {
    const response = await fetch(`http://localhost:4000/posts?page=${page}&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();

    // Ensure `posts` is always an array
    const posts = Array.isArray(data.posts) ? data.posts : [];
    const currentPage = data.currentPage || page;
    const totalPages = data.totalPages || 1;

    res.render('index', { posts, currentPage, totalPages });
  } catch (error) {
    console.error('Error fetching posts for /blog:', error);

    // Pass default values if the API call fails
    res.render('index', { posts: [], currentPage: 1, totalPages: 1 });
  }
});

backend.get('/admin', async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Get the current page from query params, default to 1
  const limit = 5; // Number of posts per page

  try {
    const response = await fetch(`http://localhost:4000/posts?page=${page}&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();

    // Ensure `posts` is always an array
    const posts = Array.isArray(data.posts) ? data.posts : [];
    const currentPage = data.currentPage || page;
    const totalPages = data.totalPages || 1;

    res.render('admin', { posts, currentPage, totalPages });
  } catch (error) {
    console.error('Error fetching posts for /admin:', error);

    // Pass default values if the API call fails
    res.render('admin', { posts: [], currentPage: 1, totalPages: 1 });
  }
});

backend.post('/posts', upload.single('image'), async (req, res) => {
  console.log('Request body:', req.body);
  console.log('Uploaded file:', req.file);

  let base64Image = null;
  if (req.file) {
    // Read the uploaded file and convert it to Base64
    const filePath = path.join(process.cwd(), 'uploads', req.file.filename);
    const fileBuffer = fs.readFileSync(filePath);
    base64Image = fileBuffer.toString('base64');
  }

  console.log('Base64 Image:', base64Image);

  const postData = {
    title: req.body.title,
    content: req.body.content,
    image: req.file ? `/uploads/${req.file.filename}` : null, // Save image URL
  };

  try {
    const response = await fetch('http://localhost:4000/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    res.redirect('/admin'); // Redirect to the admin page after successful creation
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Error creating post');
  }
});

backend.post('/posts/:id/edit', upload.single('image'), async (req, res) => {
  const updatedData = {
    title: req.body.title,
    content: req.body.content,
  };

  if (req.file) {
    updatedData.image = `/uploads/${req.file.filename}`; // Update image
  }

  try {
    await fetch(`http://localhost:4000/posts/${req.params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });
    res.redirect('/admin');
  } catch (error) {
    console.error('Error editing post:', error);
    res.status(500).send('Error editing post');
  }
});

backend.post('/posts/:id/delete', async (req, res) => {
  try {
    await fetch(`http://localhost:4000/posts/${req.params.id}`, {
      method: 'DELETE',
    });
    res.redirect('/admin');
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).send('Error deleting post');
  }
});

backend.listen(backendPort, () => {
  console.log(`Backend Server running on http://localhost:${backendPort}`);
});