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

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

let currentProxyIndex = 0;

function getProxiedUrl(url: string): string {
  if (isWeb) {
    const proxy = CORS_PROXIES[currentProxyIndex];
    return `${proxy}${encodeURIComponent(url)}`;
  }
  return url;
}

function rotateProxy(): void {
  currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
  console.log('[InternetMusic] Switching to proxy:', CORS_PROXIES[currentProxyIndex]);
}

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
  const fullQuery = `${query} AND mediatype:audio`;
  const directUrl = `${ARCHIVE_SEARCH_API}?q=${encodeURIComponent(fullQuery)}&output=json&rows=15&fl[]=identifier,title,creator,collection`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const searchUrl = getProxiedUrl(directUrl);
    
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
        const metadataDirectUrl = `${ARCHIVE_METADATA_API}/${doc.identifier}`;
        const metadataUrl = getProxiedUrl(metadataDirectUrl);
        
        const metadataResponse = await fetch(metadataUrl, {
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
  if (isWeb) {
    return [];
  }
  
  try {
    const searchUrl = `${AUDIOMACK_API_BASE}/music/search?q=${encodeURIComponent(query)}&type=songs&limit=10`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
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

// No fallback results - only show real matches from APIs

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
    
    // Liberal search - use OR logic: ANY query word can match in title, artist, or album
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
    
    results = results.filter(result => {
      const titleLower = result.title.toLowerCase();
      const artistLower = result.artist.toLowerCase();
      const albumLower = result.album.toLowerCase();
      const combined = `${titleLower} ${artistLower} ${albumLower}`;
      
      // ANY query word can be present somewhere in title, artist, or album (OR logic - liberal search)
      return queryWords.some(word => combined.includes(word));
    });
    
    // Sort by relevance - exact matches first
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const aArtist = a.artist.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const bArtist = b.artist.toLowerCase();
      
      // Exact title match gets highest priority
      const aExactTitle = aTitle === queryLower;
      const bExactTitle = bTitle === queryLower;
      if (aExactTitle && !bExactTitle) return -1;
      if (!aExactTitle && bExactTitle) return 1;
      
      // Title starts with query
      const aStartsTitle = aTitle.startsWith(queryLower);
      const bStartsTitle = bTitle.startsWith(queryLower);
      if (aStartsTitle && !bStartsTitle) return -1;
      if (!aStartsTitle && bStartsTitle) return 1;
      
      // Exact artist match
      const aExactArtist = aArtist === queryLower;
      const bExactArtist = bArtist === queryLower;
      if (aExactArtist && !bExactArtist) return -1;
      if (!aExactArtist && bExactArtist) return 1;
      
      // Artist contains query
      const aArtistMatch = aArtist.includes(queryLower);
      const bArtistMatch = bArtist.includes(queryLower);
      if (aArtistMatch && !bArtistMatch) return -1;
      if (!aArtistMatch && bArtistMatch) return 1;
      
      return 0;
    });
    
    if (results.length === 0) {
      console.log('[InternetMusic] No matching results found for query:', query);
    }
  } catch (error: any) {
    console.error('[InternetMusic] Search error:', error?.message);
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
