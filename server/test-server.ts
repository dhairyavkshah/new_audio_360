import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { Pool } from 'pg';

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'public')));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/api/streaming/songs', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, title, artist, album, duration, artwork_url, stream_url, file_size, genre FROM streaming_songs ORDER BY created_at DESC LIMIT 50'
    );
    res.json({ songs: result.rows, total: result.rows.length, page: 1, limit: 50 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load songs' });
  }
});

app.get('/api/streaming/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const result = await pool.query(
      'SELECT id, title, artist, album, duration, artwork_url, stream_url, file_size FROM streaming_songs WHERE title ILIKE $1 OR artist ILIKE $1 LIMIT 20',
      [`%${q}%`]
    );
    res.json({ songs: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'streaming-test.html'));
});

app.listen(5000, '0.0.0.0', () => {
  console.log('Streaming test server running on port 5000');
});
