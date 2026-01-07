export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork: string;
  audioUrl?: string;
}

export interface Recording {
  id: string;
  title: string;
  songId: string;
  songTitle: string;
  artist: string;
  createdAt: string;
  duration: number;
  voiceVolume: number;
  musicVolume: number;
  effect: string;
}

export interface PlayerState {
  currentSongId: string | null;
  isPlaying: boolean;
  currentTime: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  queue: string[];
}

export const mockSongs: Song[] = [
  {
    id: 'test-real',
    title: 'Dhurandhar Title Track',
    artist: 'Sound Lab Test',
    album: 'Real Audio Test',
    duration: 180,
    artwork: 'https://picsum.photos/seed/dhurandhar/400/400',
    audioUrl: '/audio/test_song.mp3',
  },
  {
    id: '1',
    title: 'Midnight Dreams',
    artist: 'Aurora Waves',
    album: 'Starlight Journey',
    duration: 234,
    artwork: 'https://picsum.photos/seed/song1/400/400',
  },
  {
    id: '2',
    title: 'Electric Soul',
    artist: 'Neon Pulse',
    album: 'Digital Hearts',
    duration: 198,
    artwork: 'https://picsum.photos/seed/song2/400/400',
  },
  {
    id: '3',
    title: 'Ocean Breeze',
    artist: 'Coastal Dreams',
    album: 'Summer Nights',
    duration: 267,
    artwork: 'https://picsum.photos/seed/song3/400/400',
  },
  {
    id: '4',
    title: 'City Lights',
    artist: 'Urban Echo',
    album: 'Metropolitan',
    duration: 212,
    artwork: 'https://picsum.photos/seed/song4/400/400',
  },
  {
    id: '5',
    title: 'Mountain High',
    artist: 'Alpine Sound',
    album: 'Peak Experience',
    duration: 289,
    artwork: 'https://picsum.photos/seed/song5/400/400',
  },
  {
    id: '6',
    title: 'Velvet Night',
    artist: 'Silhouette',
    album: 'Shadow Dance',
    duration: 245,
    artwork: 'https://picsum.photos/seed/song6/400/400',
  },
  {
    id: '7',
    title: 'Golden Hour',
    artist: 'Sunset Boulevard',
    album: 'Twilight Sessions',
    duration: 223,
    artwork: 'https://picsum.photos/seed/song7/400/400',
  },
  {
    id: '8',
    title: 'Crystal Clear',
    artist: 'Prism',
    album: 'Reflections',
    duration: 276,
    artwork: 'https://picsum.photos/seed/song8/400/400',
  },
  {
    id: '9',
    title: 'Rhythm of Rain',
    artist: 'Storm Chaser',
    album: 'Weather Patterns',
    duration: 251,
    artwork: 'https://picsum.photos/seed/song9/400/400',
  },
  {
    id: '10',
    title: 'Starry Night',
    artist: 'Cosmos',
    album: 'Galaxy Dreams',
    duration: 302,
    artwork: 'https://picsum.photos/seed/song10/400/400',
  },
];

export const mockAlbums = [
  { id: '1', name: 'Starlight Journey', artist: 'Aurora Waves', artwork: 'https://picsum.photos/seed/album1/400/400', songCount: 12 },
  { id: '2', name: 'Digital Hearts', artist: 'Neon Pulse', artwork: 'https://picsum.photos/seed/album2/400/400', songCount: 10 },
  { id: '3', name: 'Summer Nights', artist: 'Coastal Dreams', artwork: 'https://picsum.photos/seed/album3/400/400', songCount: 8 },
  { id: '4', name: 'Metropolitan', artist: 'Urban Echo', artwork: 'https://picsum.photos/seed/album4/400/400', songCount: 14 },
];

export const mockArtists = [
  { id: '1', name: 'Aurora Waves', artwork: 'https://picsum.photos/seed/artist1/400/400', songCount: 24 },
  { id: '2', name: 'Neon Pulse', artwork: 'https://picsum.photos/seed/artist2/400/400', songCount: 18 },
  { id: '3', name: 'Coastal Dreams', artwork: 'https://picsum.photos/seed/artist3/400/400', songCount: 15 },
  { id: '4', name: 'Urban Echo', artwork: 'https://picsum.photos/seed/artist4/400/400', songCount: 22 },
];

export function getSongById(id: string): Song | undefined {
  return mockSongs.find(song => song.id === id);
}
