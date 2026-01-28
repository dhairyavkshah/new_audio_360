import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = 'newaudio360-songs';
const PUBLIC_URL = 'https://pub-9b6df67c7b3748c4a8f34a585a1d4ddf.r2.dev';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  stream_url: string;
  artwork_url: string;
  file_size: number;
  genre: string;
}

function parseFilename(key: string): { title: string; artist: string } {
  const filename = key.replace(/\.mp3$/i, '');
  
  const separators = [' - ', ' – ', '_-_'];
  for (const sep of separators) {
    if (filename.includes(sep)) {
      const parts = filename.split(sep);
      return {
        title: parts[0].replace(/_/g, ' ').trim(),
        artist: parts.slice(1).join(' ').replace(/_/g, ' ').trim() || 'Unknown Artist',
      };
    }
  }
  
  return {
    title: filename.replace(/_/g, ' ').replace(/%20/g, ' ').trim(),
    artist: 'Unknown Artist',
  };
}

async function generateSongsJson() {
  console.log('Fetching songs from R2 bucket...');
  
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
  });
  
  const response = await s3Client.send(command);
  const songs: Song[] = [];
  
  if (response.Contents) {
    let id = 1;
    for (const obj of response.Contents) {
      if (obj.Key && obj.Key.toLowerCase().endsWith('.mp3')) {
        const { title, artist } = parseFilename(obj.Key);
        const streamUrl = `${PUBLIC_URL}/${encodeURIComponent(obj.Key).replace(/%2F/g, '/')}`;
        
        songs.push({
          id: id++,
          title,
          artist,
          album: '',
          duration: 0,
          stream_url: streamUrl,
          artwork_url: `https://placehold.co/300x300/6b21a8/ffffff?text=${encodeURIComponent(title.substring(0, 2))}`,
          file_size: obj.Size || 0,
          genre: 'Music',
        });
      }
    }
  }
  
  console.log(`Found ${songs.length} songs`);
  
  const songsJson = JSON.stringify({ songs, total: songs.length, updated: new Date().toISOString() }, null, 2);
  
  const fs = await import('fs');
  fs.writeFileSync('songs.json', songsJson);
  console.log('Generated songs.json locally');
  console.log(`Upload this file to your R2 bucket to make it available at: ${PUBLIC_URL}/songs.json`);
  console.log('\nSongs found:');
  songs.forEach(s => console.log(`  - ${s.title} by ${s.artist}`));
}

generateSongsJson().catch(console.error);
