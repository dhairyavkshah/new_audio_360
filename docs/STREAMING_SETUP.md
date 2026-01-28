# New Audio 360 - Online Streaming Setup Guide

This guide will help you set up music streaming for your app using Cloudflare R2 (free tier).

## Overview

Your streaming architecture:
```
Your Music Files → Cloudflare R2 (Storage) → Your App (Streaming)
                         ↑
              Songs Database (PostgreSQL)
```

---

## Step 1: Create Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Create a free account
3. Verify your email

---

## Step 2: Set Up Cloudflare R2 Bucket

1. In Cloudflare dashboard, go to **R2** (left sidebar)
2. Click **Create bucket**
3. Name it: `newaudio360-songs` (or your preferred name)
4. Choose a location close to your users
5. Click **Create bucket**

---

## Step 3: Enable Public Access

1. Go to your bucket → **Settings**
2. Under **Public access**, click **Allow Access**
3. Set a custom domain OR use the R2.dev subdomain
4. Note your public URL: `https://pub-xxxxx.r2.dev/` or your custom domain

---

## Step 4: Get R2 API Credentials

1. Go to **R2** → **Overview** → **Manage R2 API Tokens**
2. Click **Create API token**
3. Select **Edit** permission for your bucket
4. Save your:
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint URL** (looks like: `https://<account-id>.r2.cloudflarestorage.com`)

---

## Step 5: Prepare Your Music Files

### Recommended Format:
- **Bitrate**: 192kbps (good balance of quality and size)
- **Format**: MP3
- **Naming**: `artist-name_song-title.mp3` (no spaces)

### Convert with FFmpeg:
```bash
# Convert a single file to 192kbps
ffmpeg -i "Original Song.mp3" -b:a 192k "artist_song-title.mp3"

# Batch convert all MP3s in a folder
for f in *.mp3; do
  ffmpeg -i "$f" -b:a 192k "converted/${f// /_}"
done
```

### File Size Reference:
| Duration | 128kbps | 192kbps | 256kbps | 320kbps |
|----------|---------|---------|---------|---------|
| 3 min    | 2.8 MB  | 4.3 MB  | 5.7 MB  | 7.2 MB  |
| 4 min    | 3.8 MB  | 5.7 MB  | 7.6 MB  | 9.6 MB  |
| 5 min    | 4.7 MB  | 7.1 MB  | 9.5 MB  | 12 MB   |

---

## Step 6: Upload Songs to R2

### Option A: Cloudflare Dashboard (Small batches)
1. Go to your bucket
2. Click **Upload**
3. Select your MP3 files
4. Upload

### Option B: rclone (Large batches - Recommended)
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure rclone
rclone config
# Choose: New remote → Name it 'r2' → S3 → Cloudflare R2
# Enter your Access Key, Secret Key, and Endpoint

# Upload all songs
rclone copy ./songs r2:newaudio360-songs/songs/

# Upload artwork
rclone copy ./artwork r2:newaudio360-songs/artwork/
```

---

## Step 7: Get Song URLs

After uploading, your song URLs will be:
```
https://pub-xxxxx.r2.dev/songs/artist_song-title.mp3
https://pub-xxxxx.r2.dev/artwork/artist_song-title.jpg
```

---

## Step 8: Add Songs to Database

Use the admin script to add songs:

```typescript
// In server/admin.ts or via API
import { addSong } from './admin';

await addSong({
  title: 'Beautiful Song',
  artist: 'Amazing Artist',
  album: 'Great Album',
  genre: 'Pop',
  duration: 245, // in seconds
  stream_url: 'https://pub-xxxxx.r2.dev/songs/amazing-artist_beautiful-song.mp3',
  artwork_url: 'https://pub-xxxxx.r2.dev/artwork/amazing-artist_beautiful-song.jpg',
  bitrate: 192
});
```

Or run the SQL directly:
```sql
INSERT INTO streaming_songs (title, artist, album, genre, duration, stream_url, artwork_url, bitrate)
VALUES 
  ('Beautiful Song', 'Amazing Artist', 'Great Album', 'Pop', 245, 
   'https://pub-xxxxx.r2.dev/songs/amazing-artist_beautiful-song.mp3',
   'https://pub-xxxxx.r2.dev/artwork/amazing-artist_beautiful-song.jpg', 
   192);
```

---

## Step 9: Configure Environment Variables

In Replit, add these secrets:

| Variable | Value |
|----------|-------|
| `R2_ACCOUNT_ID` | Your Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | R2 API secret key |
| `R2_BUCKET_NAME` | newaudio360-songs |
| `R2_PUBLIC_URL` | https://pub-xxxxx.r2.dev |

---

## Step 10: Test Your Setup

1. Start the streaming API server
2. Test search: `curl http://localhost:3001/api/streaming/search?q=song`
3. Test in app: Search for a song and play it

---

## Cost Estimation

### Cloudflare R2 Free Tier:
- 10 GB storage free
- **Unlimited bandwidth (egress) free!**
- 1 million Class A operations/month (uploads)
- 10 million Class B operations/month (downloads)

### At Scale:
| Storage | Monthly Cost |
|---------|--------------|
| 10 GB   | Free         |
| 50 GB   | ~$0.75       |
| 100 GB  | ~$1.50       |
| 500 GB  | ~$7.50       |

**Bandwidth is always free with R2!**

---

## Troubleshooting

### Song won't play
- Check the stream_url is publicly accessible
- Verify CORS is enabled on your R2 bucket
- Check the audio file isn't corrupted

### Slow streaming
- Use 192kbps instead of 320kbps
- Enable Cloudflare caching
- Check user's network connection

### CORS Issues
In R2 bucket settings, add CORS rule:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Next Steps

1. Upload your first batch of songs
2. Add them to the database
3. Test streaming in the app
4. Add more songs as your library grows

For questions, check the main project documentation or contact support.
