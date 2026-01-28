import { S3Client, ListObjectsV2Command, ListBucketsCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

export interface R2Song {
  key: string;
  title: string;
  artist: string;
  stream_url: string;
  size: number;
  lastModified: Date | undefined;
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

export async function listBuckets(): Promise<string[]> {
  try {
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    return response.Buckets?.map(b => b.Name || '') || [];
  } catch (error) {
    console.error('Error listing buckets:', error);
    return [];
  }
}

export async function listSongs(bucketName: string, prefix?: string): Promise<R2Song[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });
    
    const response = await s3Client.send(command);
    const songs: R2Song[] = [];
    
    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && obj.Key.toLowerCase().endsWith('.mp3')) {
          const { title, artist } = parseFilename(obj.Key);
          songs.push({
            key: obj.Key,
            title,
            artist,
            stream_url: `https://pub-9b6df67c7b3748c4a8f34a585a1d4ddf.r2.dev/${encodeURIComponent(obj.Key).replace(/%2F/g, '/')}`,
            size: obj.Size || 0,
            lastModified: obj.LastModified,
          });
        }
      }
    }
    
    return songs;
  } catch (error) {
    console.error('Error listing songs from R2:', error);
    throw error;
  }
}

export async function searchSongs(bucketName: string, query: string): Promise<R2Song[]> {
  const allSongs = await listSongs(bucketName);
  const lowerQuery = query.toLowerCase();
  
  return allSongs.filter(song => 
    song.title.toLowerCase().includes(lowerQuery) ||
    song.artist.toLowerCase().includes(lowerQuery) ||
    song.key.toLowerCase().includes(lowerQuery)
  );
}

export { s3Client };
