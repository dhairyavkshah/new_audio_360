import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface SongInput {
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration: number;
  stream_url: string;
  artwork_url?: string;
  file_size?: number;
  bitrate?: number;
}

export async function addSong(song: SongInput): Promise<number> {
  const result = await pool.query(
    `INSERT INTO streaming_songs (title, artist, album, genre, duration, stream_url, artwork_url, file_size, bitrate)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      song.title,
      song.artist,
      song.album || null,
      song.genre || null,
      song.duration,
      song.stream_url,
      song.artwork_url || null,
      song.file_size || 0,
      song.bitrate || 192
    ]
  );
  return result.rows[0].id;
}

export async function addSongsBatch(songs: SongInput[]): Promise<number[]> {
  const ids: number[] = [];
  
  for (const song of songs) {
    const id = await addSong(song);
    ids.push(id);
    console.log(`Added: ${song.title} by ${song.artist} (ID: ${id})`);
  }
  
  return ids;
}

export async function updateSong(id: number, updates: Partial<SongInput>): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.title) {
    fields.push(`title = $${paramCount++}`);
    values.push(updates.title);
  }
  if (updates.artist) {
    fields.push(`artist = $${paramCount++}`);
    values.push(updates.artist);
  }
  if (updates.album !== undefined) {
    fields.push(`album = $${paramCount++}`);
    values.push(updates.album);
  }
  if (updates.genre !== undefined) {
    fields.push(`genre = $${paramCount++}`);
    values.push(updates.genre);
  }
  if (updates.duration !== undefined) {
    fields.push(`duration = $${paramCount++}`);
    values.push(updates.duration);
  }
  if (updates.stream_url) {
    fields.push(`stream_url = $${paramCount++}`);
    values.push(updates.stream_url);
  }
  if (updates.artwork_url !== undefined) {
    fields.push(`artwork_url = $${paramCount++}`);
    values.push(updates.artwork_url);
  }
  if (updates.bitrate !== undefined) {
    fields.push(`bitrate = $${paramCount++}`);
    values.push(updates.bitrate);
  }

  if (fields.length === 0) return false;

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await pool.query(
    `UPDATE streaming_songs SET ${fields.join(', ')} WHERE id = $${paramCount}`,
    values
  );

  return result.rowCount !== null && result.rowCount > 0;
}

export async function deleteSong(id: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM streaming_songs WHERE id = $1',
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function getSongCount(): Promise<number> {
  const result = await pool.query('SELECT COUNT(*) FROM streaming_songs');
  return parseInt(result.rows[0].count);
}

export async function listAllSongs(): Promise<any[]> {
  const result = await pool.query(
    'SELECT id, title, artist, album, genre, duration, stream_url, bitrate FROM streaming_songs ORDER BY id'
  );
  return result.rows;
}

if (require.main === module) {
  (async () => {
    console.log('\n=== Streaming Songs Admin ===\n');
    
    const count = await getSongCount();
    console.log(`Total songs in database: ${count}`);
    
    if (count > 0) {
      console.log('\nSongs list:');
      const songs = await listAllSongs();
      songs.forEach(s => {
        console.log(`  [${s.id}] ${s.title} - ${s.artist} (${s.genre || 'No genre'})`);
      });
    }
    
    console.log('\n--- To add songs, use the addSong() or addSongsBatch() functions ---');
    console.log('Example:');
    console.log(`
  import { addSong } from './admin';
  
  await addSong({
    title: 'Song Name',
    artist: 'Artist Name',
    album: 'Album Name',
    genre: 'Pop',
    duration: 240,
    stream_url: 'https://your-r2-bucket.r2.cloudflarestorage.com/songs/song.mp3',
    artwork_url: 'https://your-r2-bucket.r2.cloudflarestorage.com/artwork/song.jpg',
    bitrate: 192
  });
`);
    
    process.exit(0);
  })();
}
