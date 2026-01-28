import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { listBuckets, listSongs, searchSongs, R2Song } from './r2Service';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/static', express.static(path.join(__dirname, '..', 'public')));

const BUCKET_NAME = 'newaudio360-songs';

async function getBucketName(): Promise<string> {
  return BUCKET_NAME;
}

function formatSongResponse(song: R2Song, index: number) {
  return {
    id: index + 1,
    title: song.title,
    artist: song.artist,
    album: '',
    duration: 0,
    artwork_url: `https://placehold.co/300x300/6b21a8/ffffff?text=${encodeURIComponent(song.title.substring(0, 2))}`,
    stream_url: song.stream_url,
    file_size: song.size,
    genre: 'Music',
  };
}

app.get('/api/streaming/search', async (req: Request, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const bucketName = await getBucketName();
    const songs = await searchSongs(bucketName, q);
    const limitedSongs = songs.slice(0, Number(limit));

    res.json({
      songs: limitedSongs.map(formatSongResponse),
      count: limitedSongs.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/streaming/songs', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const bucketName = await getBucketName();
    const allSongs = await listSongs(bucketName);
    
    const paginatedSongs = allSongs.slice(offset, offset + Number(limit));

    res.json({
      songs: paginatedSongs.map(formatSongResponse),
      total: allSongs.length,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Fetch songs error:', error);
    res.status(500).json({ error: 'Failed to fetch songs from R2' });
  }
});

app.get('/api/streaming/buckets', async (_req: Request, res: Response) => {
  try {
    const buckets = await listBuckets();
    res.json({ buckets });
  } catch (error) {
    console.error('List buckets error:', error);
    res.status(500).json({ error: 'Failed to list buckets' });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', source: 'r2-direct' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Streaming API (R2 Direct) running on port ${PORT}`);
});
