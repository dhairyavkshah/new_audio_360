export interface StreamSongResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork: string;
  streamUrl: string;
  bitrate: number;
  licenseType: 'public_domain' | 'creative_commons';
  identifier: string;
}

interface ArchiveSearchResponse {
  response: {
    numFound: number;
    docs: Array<{
      identifier: string;
      title?: string;
      creator?: string | string[];
      collection?: string | string[];
      description?: string;
      mediatype?: string;
    }>;
  };
}

interface ArchiveMetadataResponse {
  metadata: {
    title?: string;
    creator?: string | string[];
    collection?: string | string[];
    description?: string;
    licenseurl?: string;
  };
  files: Array<{
    name: string;
    format?: string;
    bitrate?: string;
    length?: string;
    size?: string;
    source?: string;
  }>;
}

const SEARCH_API = 'https://archive.org/advancedsearch.php';
const METADATA_API = 'https://archive.org/metadata';
const DOWNLOAD_BASE = 'https://archive.org/download';
const COVER_ART_BASE = 'https://archive.org/services/img';

const VALID_BITRATES = [128, 192, 256, 320];
const VALID_FORMATS = ['mp3', 'ogg', 'vbr mp3', '128kbps mp3', '192kbps mp3', '256kbps mp3', '320kbps mp3'];

const searchCache = new Map<string, { results: StreamSongResult[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

function normalizeCreator(creator: string | string[] | undefined): string {
  if (!creator) return 'Unknown Artist';
  if (Array.isArray(creator)) return creator[0] || 'Unknown Artist';
  return creator;
}

function parseBitrate(bitrateStr: string | undefined): number | null {
  if (!bitrateStr) return null;
  const match = bitrateStr.match(/(\d+)/);
  if (match) {
    const bitrate = parseInt(match[1], 10);
    if (VALID_BITRATES.includes(bitrate)) return bitrate;
    if (bitrate >= 128 && bitrate <= 320) {
      return VALID_BITRATES.find(b => Math.abs(b - bitrate) <= 32) || null;
    }
  }
  return null;
}

function parseDuration(lengthStr: string | undefined): number {
  if (!lengthStr) return 0;
  const seconds = parseFloat(lengthStr);
  return isNaN(seconds) ? 0 : Math.floor(seconds);
}

function isValidAudioFormat(format: string | undefined): boolean {
  if (!format) return false;
  const lowerFormat = format.toLowerCase();
  return VALID_FORMATS.some(f => lowerFormat.includes(f));
}

function getLicenseType(licenseUrl: string | undefined): 'public_domain' | 'creative_commons' {
  if (!licenseUrl) return 'public_domain';
  if (licenseUrl.includes('creativecommons.org')) return 'creative_commons';
  return 'public_domain';
}

async function fetchMetadata(identifier: string): Promise<ArchiveMetadataResponse | null> {
  try {
    const response = await fetch(`${METADATA_API}/${identifier}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn(`[ArchiveSearch] Failed to fetch metadata for ${identifier}:`, error);
    return null;
  }
}

function findBestAudioFile(files: ArchiveMetadataResponse['files']): {
  name: string;
  bitrate: number;
  duration: number;
} | null {
  let bestFile: { name: string; bitrate: number; duration: number } | null = null;
  let highestBitrate = 0;

  for (const file of files) {
    if (!isValidAudioFormat(file.format)) continue;
    if (file.source === 'metadata') continue;
    
    const bitrate = parseBitrate(file.bitrate);
    if (!bitrate) continue;
    
    if (bitrate > highestBitrate) {
      highestBitrate = bitrate;
      bestFile = {
        name: file.name,
        bitrate,
        duration: parseDuration(file.length),
      };
    }
  }

  return bestFile;
}

export async function searchArchive(query: string): Promise<StreamSongResult[]> {
  if (!query || query.trim().length < 3) return [];

  const cacheKey = query.toLowerCase().trim();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.results;
  }

  try {
    const searchUrl = `${SEARCH_API}?q=${encodeURIComponent(query)}&mediatype=audio&output=json&rows=15&fl[]=identifier,title,creator,collection`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
      mode: 'cors',
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data: ArchiveSearchResponse = await response.json();
    const docs = data.response?.docs || [];

    if (docs.length === 0) return [];

    const results: StreamSongResult[] = [];
    const metadataPromises = docs.slice(0, 10).map(doc => fetchMetadata(doc.identifier));
    const metadataResults = await Promise.all(metadataPromises);

    for (let i = 0; i < docs.length && results.length < 10; i++) {
      const doc = docs[i];
      const metadata = metadataResults[i];
      
      if (!metadata) continue;

      const audioFile = findBestAudioFile(metadata.files);
      if (!audioFile) continue;

      const title = metadata.metadata.title || doc.title || 'Unknown Title';
      const artist = normalizeCreator(metadata.metadata.creator || doc.creator);
      const collection = metadata.metadata.collection;
      const album = Array.isArray(collection) ? collection[0] : collection || 'Public Domain';

      results.push({
        id: `stream_${doc.identifier}_${Date.now()}`,
        title: typeof title === 'string' ? title : String(title),
        artist,
        album: typeof album === 'string' ? album : 'Public Domain',
        duration: audioFile.duration,
        artwork: `${COVER_ART_BASE}/${doc.identifier}`,
        streamUrl: `${DOWNLOAD_BASE}/${doc.identifier}/${encodeURIComponent(audioFile.name)}`,
        bitrate: audioFile.bitrate,
        licenseType: getLicenseType(metadata.metadata.licenseurl),
        identifier: doc.identifier,
      });
    }

    searchCache.set(cacheKey, { results, timestamp: Date.now() });
    return results;
  } catch (error) {
    console.error('[ArchiveSearch] Search error:', error);
    return [];
  }
}

export function clearSearchCache(): void {
  searchCache.clear();
}
