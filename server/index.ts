import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import path from 'path';

const app = express();
const PORT = 3001; // Streaming API runs on port 3001 (not 5000 which is for frontend)

app.use(cors());
app.use(express.json());

app.use('/static', express.static(path.join(__dirname, '..', 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.get('/api/streaming/search', async (req: Request, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const searchTerm = `%${q.toLowerCase()}%`;
    
    const result = await pool.query(
      `SELECT id, title, artist, album, duration, artwork_url, stream_url, file_size
       FROM streaming_songs 
       WHERE LOWER(title) LIKE $1 
          OR LOWER(artist) LIKE $1 
          OR LOWER(album) LIKE $1
       ORDER BY title ASC
       LIMIT $2`,
      [searchTerm, Number(limit)]
    );

    res.json({
      songs: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/streaming/songs', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, genre } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `SELECT id, title, artist, album, duration, artwork_url, stream_url, file_size, genre
                 FROM streaming_songs`;
    const params: any[] = [];
    
    if (genre && typeof genre === 'string') {
      query += ` WHERE genre = $1`;
      params.push(genre);
    }
    
    query += ` ORDER BY title ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);
    
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM streaming_songs${genre ? ' WHERE genre = $1' : ''}`,
      genre ? [genre] : []
    );

    res.json({
      songs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Fetch songs error:', error);
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

app.get('/api/streaming/song/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT id, title, artist, album, duration, artwork_url, stream_url, file_size, genre
       FROM streaming_songs WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    await pool.query(
      `UPDATE streaming_songs SET play_count = play_count + 1 WHERE id = $1`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get song error:', error);
    res.status(500).json({ error: 'Failed to get song' });
  }
});

app.get('/api/streaming/genres', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT genre, COUNT(*) as count 
       FROM streaming_songs 
       WHERE genre IS NOT NULL 
       GROUP BY genre 
       ORDER BY count DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({ error: 'Failed to get genres' });
  }
});

app.get('/api/streaming/popular', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const result = await pool.query(
      `SELECT id, title, artist, album, duration, artwork_url, stream_url, file_size
       FROM streaming_songs 
       ORDER BY play_count DESC 
       LIMIT $1`,
      [Number(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get popular error:', error);
    res.status(500).json({ error: 'Failed to get popular songs' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'streaming-api' });
});

app.listen(PORT, () => {
  console.log(`Streaming API running on port ${PORT}`);
});

export default app;
