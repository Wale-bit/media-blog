import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'blog',
  password: '9255533',
  port: 5432,
});

async function verifyImageField() {
  try {
    const result = await pool.query('SELECT id, title, image FROM posts');
    console.log('Posts:', result.rows);
  } catch (error) {
    console.error('Error verifying image field:', error);
  } finally {
    pool.end();
  }
}

verifyImageField();