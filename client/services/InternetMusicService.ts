import { Platform } from 'react-native';

export interface StreamSongResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork: string;
  streamUrl: string;
  bitrate: number;
  licenseType: 'public_domain' | 'creative_commons' | 'streaming';
  identifier: string;
  source: 'archive' | 'audiomack';
}

const isWeb = Platform.OS === 'web';

const ARCHIVE_SEARCH_API = 'https://archive.org/advancedsearch.php';
const ARCHIVE_METADATA_API = 'https://archive.org/metadata';
const ARCHIVE_DOWNLOAD_BASE = 'https://archive.org/download';
const ARCHIVE_COVER_BASE = 'https://archive.org/services/img';

const AUDIOMACK_API_BASE = 'https://api.audiomack.com/v1';

const searchCache = new Map<string, { results: StreamSongResult[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

const VALID_AUDIO_FORMATS = ['mp3', 'ogg', 'vbr mp3', '128kbps mp3', '192kbps mp3', '256kbps mp3', '320kbps mp3'];

function normalizeCreator(creator: string | string[] | undefined): string {
  if (!creator) return 'Unknown Artist';
  if (Array.isArray(creator)) return creator[0] || 'Unknown Artist';
  return creator;
}

function parseDuration(length: string | undefined): number {
  if (!length) return 0;
  const parts = length.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return parseFloat(length) || 0;
}

function parseBitrate(bitrateStr: string | undefined): number {
  if (!bitrateStr) return 128;
  const match = bitrateStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 128;
}

async function searchArchiveOrg(query: string): Promise<StreamSongResult[]> {
  const searchUrl = `${ARCHIVE_SEARCH_API}?q=${encodeURIComponent(query)}&mediatype=audio&output=json&rows=10&fl[]=identifier,title,creator,collection`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Archive.org returned ${response.status}`);
    }
    
    const data = await response.json();
    const docs = data.response?.docs || [];
    
    if (docs.length === 0) return [];
    
    const results: StreamSongResult[] = [];
    
    for (const doc of docs.slice(0, 5)) {
      try {
        const metadataResponse = await fetch(`${ARCHIVE_METADATA_API}/${doc.identifier}`, {
          headers: { 'Accept': 'application/json' },
        });
        
        if (!metadataResponse.ok) continue;
        
        const metadata = await metadataResponse.json();
        const files = metadata.files || [];
        
        const audioFile = files.find((f: any) => 
          f.format && VALID_AUDIO_FORMATS.some(fmt => 
            f.format.toLowerCase().includes(fmt.toLowerCase())
          )
        );
        
        if (!audioFile) continue;
        
        results.push({
          id: `archive-${doc.identifier}`,
          title: metadata.metadata?.title || doc.title || 'Unknown Title',
          artist: normalizeCreator(metadata.metadata?.creator || doc.creator),
          album: Array.isArray(metadata.metadata?.collection) 
            ? metadata.metadata.collection[0] 
            : metadata.metadata?.collection || 'Archive.org',
          duration: parseDuration(audioFile.length),
          artwork: `${ARCHIVE_COVER_BASE}/${doc.identifier}`,
          streamUrl: `${ARCHIVE_DOWNLOAD_BASE}/${doc.identifier}/${audioFile.name}`,
          bitrate: parseBitrate(audioFile.bitrate),
          licenseType: metadata.metadata?.licenseurl?.includes('creativecommons') 
            ? 'creative_commons' 
            : 'public_domain',
          identifier: doc.identifier,
          source: 'archive',
        });
        
        if (results.length >= 5) break;
      } catch (e) {
        continue;
      }
    }
    
    return results;
  } catch (error: any) {
    console.error('[InternetMusic] Archive.org search error:', error?.message);
    return [];
  }
}

async function searchAudiomack(query: string): Promise<StreamSongResult[]> {
  try {
    const searchUrl = `${AUDIOMACK_API_BASE}/music/search?q=${encodeURIComponent(query)}&type=songs&limit=10`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(searchUrl, {
      headers: { 
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('[InternetMusic] Audiomack API returned:', response.status);
      return [];
    }
    
    const data = await response.json();
    const results: StreamSongResult[] = [];
    
    const songs = data.results || data.songs || [];
    
    for (const song of songs.slice(0, 5)) {
      if (!song.streaming_url && !song.url) continue;
      
      results.push({
        id: `audiomack-${song.id || song.url_slug}`,
        title: song.title || 'Unknown Title',
        artist: song.artist || song.uploader?.name || 'Unknown Artist',
        album: song.album || 'Audiomack',
        duration: song.duration || 0,
        artwork: song.image || song.image_base || '',
        streamUrl: song.streaming_url || song.url || '',
        bitrate: 192,
        licenseType: 'streaming',
        identifier: song.url_slug || song.id?.toString() || '',
        source: 'audiomack',
      });
    }
    
    return results;
  } catch (error: any) {
    console.error('[InternetMusic] Audiomack search error:', error?.message);
    return [];
  }
}

const FALLBACK_RESULTS: StreamSongResult[] = [
  {
    id: 'fallback-1',
    title: 'Symphony No. 5 in C Minor',
    artist: 'Ludwig van Beethoven',
    album: 'Classical Masterpieces',
    duration: 432,
    artwork: 'https://archive.org/services/img/cd_beethoven-symphony-no-5',
    streamUrl: 'https://archive.org/download/cd_beethoven-symphony-no-5/disc1/01.%20I.%20Allegro%20con%20brio.mp3',
    bitrate: 192,
    licenseType: 'public_domain',
    identifier: 'cd_beethoven-symphony-no-5',
    source: 'archive',
  },
  {
    id: 'fallback-2',
    title: 'Moonlight Sonata',
    artist: 'Ludwig van Beethoven',
    album: 'Piano Sonatas',
    duration: 375,
    artwork: 'https://archive.org/services/img/lp_beethoven-moonlight-sonata',
    streamUrl: 'https://archive.org/download/lp_beethoven-moonlight-sonata/disc1/01.01.%20Sonata%20No.%2014%20In%20C-Sharp%20Minor%2C%20Op.%2027%2C%20No.%202%20-%20Adagio%20Sostenuto.mp3',
    bitrate: 192,
    licenseType: 'public_domain',
    identifier: 'lp_beethoven-moonlight-sonata',
    source: 'archive',
  },
  {
    id: 'fallback-3',
    title: 'Canon in D',
    artist: 'Johann Pachelbel',
    album: 'Baroque Classics',
    duration: 300,
    artwork: 'https://archive.org/services/img/cd_pachelbel-canon-in-d',
    streamUrl: 'https://archive.org/download/PachelbelCanonInD/pachelbel_canon_in_d.mp3',
    bitrate: 192,
    licenseType: 'public_domain',
    identifier: 'PachelbelCanonInD',
    source: 'archive',
  },
  {
    id: 'fallback-4',
    title: 'The Four Seasons - Spring',
    artist: 'Antonio Vivaldi',
    album: 'The Four Seasons',
    duration: 210,
    artwork: 'https://archive.org/services/img/cd_vivaldi-four-seasons',
    streamUrl: 'https://archive.org/download/VivaldiTheFourSeasons/01-vivaldi-spring.mp3',
    bitrate: 192,
    licenseType: 'public_domain',
    identifier: 'VivaldiTheFourSeasons',
    source: 'archive',
  },
  {
    id: 'fallback-5',
    title: 'Fur Elise',
    artist: 'Ludwig van Beethoven',
    album: 'Piano Works',
    duration: 180,
    artwork: 'https://archive.org/services/img/FurElise_201805',
    streamUrl: 'https://archive.org/download/FurElise_201805/Fur%20Elise.mp3',
    bitrate: 192,
    licenseType: 'public_domain',
    identifier: 'FurElise_201805',
    source: 'archive',
  },
];

export async function searchInternetMusic(query: string): Promise<StreamSongResult[]> {
  if (!query || query.trim().length < 2) return [];
  
  const cacheKey = query.toLowerCase().trim();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.results;
  }
  
  console.log('[InternetMusic] Searching for:', query);
  
  let results: StreamSongResult[] = [];
  
  try {
    const [archiveResults, audiomackResults] = await Promise.allSettled([
      searchArchiveOrg(query),
      searchAudiomack(query),
    ]);
    
    if (archiveResults.status === 'fulfilled') {
      results.push(...archiveResults.value);
    }
    
    if (audiomackResults.status === 'fulfilled') {
      results.push(...audiomackResults.value);
    }
    
    results.sort((a, b) => {
      const aMatch = a.title.toLowerCase().includes(query.toLowerCase()) || 
                     a.artist.toLowerCase().includes(query.toLowerCase());
      const bMatch = b.title.toLowerCase().includes(query.toLowerCase()) || 
                     b.artist.toLowerCase().includes(query.toLowerCase());
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
    
    if (results.length === 0 && isWeb) {
      console.log('[InternetMusic] No results from APIs, using fallback data for web preview');
      const queryLower = query.toLowerCase();
      results = FALLBACK_RESULTS.filter(r => 
        r.title.toLowerCase().includes(queryLower) ||
        r.artist.toLowerCase().includes(queryLower) ||
        queryLower.includes('beethoven') ||
        queryLower.includes('classical') ||
        queryLower.includes('piano') ||
        queryLower.includes('symphony')
      );
      if (results.length === 0) {
        results = FALLBACK_RESULTS.slice(0, 3);
      }
    }
  } catch (error: any) {
    console.error('[InternetMusic] Search error:', error?.message);
    if (isWeb) {
      results = FALLBACK_RESULTS.slice(0, 3);
    }
  }
  
  if (results.length > 0) {
    searchCache.set(cacheKey, { results, timestamp: Date.now() });
  }
  
  return results;
}

export function clearInternetMusicCache(): void {
  searchCache.clear();
}

export { searchArchiveOrg, searchAudiomack };
