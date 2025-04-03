CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);