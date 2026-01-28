-- Streaming Songs Catalog
-- This table stores metadata for songs available for online streaming

CREATE TABLE IF NOT EXISTS streaming_songs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  album VARCHAR(255),
  genre VARCHAR(100),
  duration INTEGER NOT NULL DEFAULT 0,  -- Duration in seconds
  stream_url TEXT NOT NULL,             -- URL to the audio file (Cloudflare R2 or other CDN)
  artwork_url TEXT,                      -- URL to album artwork
  file_size INTEGER DEFAULT 0,           -- File size in bytes
  bitrate INTEGER DEFAULT 192,           -- Audio bitrate (128, 192, 256, 320)
  play_count INTEGER DEFAULT 0,          -- Track play statistics
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster searching
CREATE INDEX IF NOT EXISTS idx_streaming_songs_title ON streaming_songs(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_streaming_songs_artist ON streaming_songs(LOWER(artist));
CREATE INDEX IF NOT EXISTS idx_streaming_songs_genre ON streaming_songs(genre);
CREATE INDEX IF NOT EXISTS idx_streaming_songs_play_count ON streaming_songs(play_count DESC);

-- User's streaming favorites and playlists
CREATE TABLE IF NOT EXISTS user_streaming_favorites (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,        -- Device ID or user identifier
  song_id INTEGER NOT NULL REFERENCES streaming_songs(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, song_id)
);

CREATE TABLE IF NOT EXISTS user_streaming_playlists (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_streaming_playlist_songs (
  id SERIAL PRIMARY KEY,
  playlist_id INTEGER NOT NULL REFERENCES user_streaming_playlists(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES streaming_songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(playlist_id, song_id)
);

-- Example: Insert sample songs (replace with your actual Cloudflare R2 URLs)
-- INSERT INTO streaming_songs (title, artist, album, genre, duration, stream_url, artwork_url, bitrate)
-- VALUES 
--   ('Song Name', 'Artist Name', 'Album Name', 'Genre', 240, 'https://your-r2-bucket.r2.cloudflarestorage.com/songs/song1.mp3', 'https://your-r2-bucket.r2.cloudflarestorage.com/artwork/song1.jpg', 192);
