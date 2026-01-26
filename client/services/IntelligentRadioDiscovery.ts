import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCuratedStationsByCountry, CuratedRadioStation, CURATED_RADIO_STATIONS } from './CuratedRadioStations';

const CACHE_KEY_PREFIX = '@na360_radio_cache_';
const CACHE_METADATA_KEY = '@na360_radio_cache_metadata';
const REFRESH_INTERVAL_DAYS = 7;
const MAX_STATIONS_PER_COUNTRY = 1000;
const API_FETCH_LIMIT = 1500;
const REQUEST_TIMEOUT = 20000;

const RADIO_BROWSER_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

export interface CachedRadioStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  languagecodes: string;
  tags: string;
  codec: string;
  bitrate: number;
  votes: number;
  clickcount: number;
  lastcheckok: number;
  hls: number;
  isCurated?: boolean;
}

interface CacheMetadata {
  [countryCode: string]: {
    lastRefresh: number;
    stationCount: number;
    version: number;
  };
}

const INVALID_URL_PATTERNS = [
  /;stream$/i,
  /;$/i,
  /\?sid=/i,
];

const BLACKLISTED_STATION_PATTERNS = [
  /schizoid/i,
];

let currentServerIndex = 0;

function getRadioBrowserServer(): string {
  return RADIO_BROWSER_SERVERS[currentServerIndex % RADIO_BROWSER_SERVERS.length];
}

function rotateServer(): void {
  currentServerIndex = (currentServerIndex + 1) % RADIO_BROWSER_SERVERS.length;
}

async function fetchWithTimeout(url: string, timeout: number = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NewAudio360/1.0',
      },
    });
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchFromRadioBrowser(endpoint: string, retries: number = 2): Promise<any> {
  let lastError: Error = new Error('Failed to fetch from Radio Browser API');
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const server = getRadioBrowserServer();
      const url = `${server}${endpoint}`;
      console.log(`[IntelligentRadio] Fetching: ${url}`);
      
      const response = await fetchWithTimeout(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`[IntelligentRadio] Attempt ${attempt + 1} failed:`, lastError.message);
      rotateServer();
    }
  }
  
  throw lastError;
}

function isValidStreamUrl(url: string): boolean {
  if (!url) return false;
  
  for (const pattern of INVALID_URL_PATTERNS) {
    if (pattern.test(url)) return false;
  }
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }
  
  return true;
}

function isBlacklistedStation(name: string): boolean {
  if (!name) return false;
  return BLACKLISTED_STATION_PATTERNS.some(pattern => pattern.test(name));
}

function filterAndSortStations(stations: CachedRadioStation[], limit: number = MAX_STATIONS_PER_COUNTRY): CachedRadioStation[] {
  return stations
    .filter((station) => {
      if (station.lastcheckok !== 1) return false;
      if (isBlacklistedStation(station.name)) return false;
      
      const streamUrl = station.url_resolved || station.url;
      if (!streamUrl) return false;
      if (!isValidStreamUrl(streamUrl)) return false;
      
      return true;
    })
    .sort((a, b) => {
      const aScore = (a.votes * 2) + a.clickcount;
      const bScore = (b.votes * 2) + b.clickcount;
      return bScore - aScore;
    })
    .slice(0, limit);
}

function curatedToStation(curated: CuratedRadioStation, index: number): CachedRadioStation {
  return {
    stationuuid: `curated-${curated.id}`,
    name: curated.name,
    url: curated.streamUrl,
    url_resolved: curated.streamUrl,
    homepage: curated.website,
    favicon: curated.favicon,
    country: curated.country,
    countrycode: curated.countryCode,
    state: '',
    language: curated.language,
    languagecodes: curated.language,
    tags: curated.genre,
    codec: 'MP3',
    bitrate: curated.bitrate,
    votes: 50000 + (CURATED_RADIO_STATIONS.length - index),
    clickcount: 10000,
    lastcheckok: 1,
    hls: 0,
    isCurated: true,
  };
}

async function getCacheMetadata(): Promise<CacheMetadata> {
  try {
    const data = await AsyncStorage.getItem(CACHE_METADATA_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('[IntelligentRadio] Error reading cache metadata:', error);
    return {};
  }
}

async function saveCacheMetadata(metadata: CacheMetadata): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('[IntelligentRadio] Error saving cache metadata:', error);
  }
}

async function getCachedStations(countryCode: string): Promise<CachedRadioStation[] | null> {
  try {
    const data = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${countryCode}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[IntelligentRadio] Error reading cached stations:', error);
    return null;
  }
}

async function saveCachedStations(countryCode: string, stations: CachedRadioStation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${countryCode}`, JSON.stringify(stations));
    
    const metadata = await getCacheMetadata();
    metadata[countryCode] = {
      lastRefresh: Date.now(),
      stationCount: stations.length,
      version: 1,
    };
    await saveCacheMetadata(metadata);
    
    console.log(`[IntelligentRadio] Cached ${stations.length} stations for ${countryCode}`);
  } catch (error) {
    console.error('[IntelligentRadio] Error saving cached stations:', error);
  }
}

function needsRefresh(lastRefresh: number | undefined): boolean {
  if (!lastRefresh) return true;
  
  const daysSinceRefresh = (Date.now() - lastRefresh) / (1000 * 60 * 60 * 24);
  return daysSinceRefresh >= REFRESH_INTERVAL_DAYS;
}

async function fetchStationsFromAPI(countryCode: string): Promise<CachedRadioStation[]> {
  const params = new URLSearchParams({
    countrycode: countryCode.toUpperCase(),
    lastcheckok: '1',
    order: 'votes',
    reverse: 'true',
    hidebroken: 'true',
    limit: String(API_FETCH_LIMIT),
  });
  
  const stations = await fetchFromRadioBrowser(`/json/stations/bycountrycodeexact/${countryCode.toUpperCase()}?${params}`);
  return filterAndSortStations(stations, MAX_STATIONS_PER_COUNTRY);
}

async function fetchStationsByClickCount(countryCode: string): Promise<CachedRadioStation[]> {
  const params = new URLSearchParams({
    countrycode: countryCode.toUpperCase(),
    lastcheckok: '1',
    order: 'clickcount',
    reverse: 'true',
    hidebroken: 'true',
    limit: String(API_FETCH_LIMIT),
  });
  
  const stations = await fetchFromRadioBrowser(`/json/stations/bycountrycodeexact/${countryCode.toUpperCase()}?${params}`);
  return stations;
}

async function mergeAndDeduplicateStations(
  voteStations: CachedRadioStation[],
  clickStations: CachedRadioStation[],
  curatedStations: CachedRadioStation[]
): Promise<CachedRadioStation[]> {
  const stationMap = new Map<string, CachedRadioStation>();
  
  for (const station of curatedStations) {
    stationMap.set(station.stationuuid, station);
  }
  
  for (const station of voteStations) {
    if (!stationMap.has(station.stationuuid)) {
      stationMap.set(station.stationuuid, station);
    }
  }
  
  for (const station of clickStations) {
    if (!stationMap.has(station.stationuuid)) {
      stationMap.set(station.stationuuid, station);
    }
  }
  
  const merged = Array.from(stationMap.values());
  
  return merged
    .sort((a, b) => {
      if (a.isCurated && !b.isCurated) return -1;
      if (!a.isCurated && b.isCurated) return 1;
      
      const aScore = (a.votes * 2) + a.clickcount;
      const bScore = (b.votes * 2) + b.clickcount;
      return bScore - aScore;
    })
    .slice(0, MAX_STATIONS_PER_COUNTRY);
}

export const IntelligentRadioDiscovery = {
  async getStationsForCountry(
    countryCode: string,
    forceRefresh: boolean = false
  ): Promise<CachedRadioStation[]> {
    const upperCode = countryCode.toUpperCase();
    
    const metadata = await getCacheMetadata();
    const countryMeta = metadata[upperCode];
    
    if (!forceRefresh && countryMeta && !needsRefresh(countryMeta.lastRefresh)) {
      const cached = await getCachedStations(upperCode);
      if (cached && cached.length > 0) {
        console.log(`[IntelligentRadio] Using ${cached.length} cached stations for ${upperCode} (age: ${Math.floor((Date.now() - countryMeta.lastRefresh) / (1000 * 60 * 60 * 24))} days)`);
        return cached;
      }
    }
    
    console.log(`[IntelligentRadio] Refreshing stations for ${upperCode}...`);
    
    try {
      const curatedStations = getCuratedStationsByCountry(upperCode);
      const convertedCurated = curatedStations.map((s, i) => curatedToStation(s, i));
      
      const [voteStations, clickStations] = await Promise.all([
        fetchStationsFromAPI(upperCode).catch(() => []),
        fetchStationsByClickCount(upperCode).catch(() => []),
      ]);
      
      const filteredClickStations = filterAndSortStations(clickStations, MAX_STATIONS_PER_COUNTRY);
      
      const merged = await mergeAndDeduplicateStations(
        voteStations,
        filteredClickStations,
        convertedCurated
      );
      
      if (merged.length > 0) {
        await saveCachedStations(upperCode, merged);
        console.log(`[IntelligentRadio] Discovered ${merged.length} stations for ${upperCode} (${convertedCurated.length} curated, ${voteStations.length + filteredClickStations.length} from API)`);
        return merged;
      }
      
      if (convertedCurated.length > 0) {
        console.log(`[IntelligentRadio] API failed, using ${convertedCurated.length} curated stations for ${upperCode}`);
        return convertedCurated;
      }
      
      const cached = await getCachedStations(upperCode);
      if (cached && cached.length > 0) {
        console.log(`[IntelligentRadio] Using stale cache (${cached.length} stations) for ${upperCode}`);
        return cached;
      }
      
      return [];
    } catch (error) {
      console.error(`[IntelligentRadio] Error fetching stations for ${upperCode}:`, error);
      
      const cached = await getCachedStations(upperCode);
      if (cached && cached.length > 0) {
        console.log(`[IntelligentRadio] Error fallback: using ${cached.length} cached stations for ${upperCode}`);
        return cached;
      }
      
      const curatedStations = getCuratedStationsByCountry(upperCode);
      const convertedCurated = curatedStations.map((s, i) => curatedToStation(s, i));
      if (convertedCurated.length > 0) {
        console.log(`[IntelligentRadio] Error fallback: using ${convertedCurated.length} curated stations for ${upperCode}`);
        return convertedCurated;
      }
      
      return [];
    }
  },

  async searchStations(
    query: string,
    countryCode?: string,
    limit: number = 100
  ): Promise<CachedRadioStation[]> {
    try {
      const params = new URLSearchParams({
        name: query,
        lastcheckok: '1',
        order: 'votes',
        reverse: 'true',
        hidebroken: 'true',
        limit: String(Math.min(limit * 2, 500)),
      });
      
      if (countryCode) {
        params.set('countrycode', countryCode.toUpperCase());
      }
      
      const stations = await fetchFromRadioBrowser(`/json/stations/search?${params}`);
      return filterAndSortStations(stations, limit);
    } catch (error) {
      console.error('[IntelligentRadio] Search error:', error);
      return [];
    }
  },

  async getCacheStatus(): Promise<{ [countryCode: string]: { lastRefresh: Date; stationCount: number; needsRefresh: boolean } }> {
    const metadata = await getCacheMetadata();
    const status: { [countryCode: string]: { lastRefresh: Date; stationCount: number; needsRefresh: boolean } } = {};
    
    for (const [code, meta] of Object.entries(metadata)) {
      status[code] = {
        lastRefresh: new Date(meta.lastRefresh),
        stationCount: meta.stationCount,
        needsRefresh: needsRefresh(meta.lastRefresh),
      };
    }
    
    return status;
  },

  async clearCache(countryCode?: string): Promise<void> {
    try {
      if (countryCode) {
        await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${countryCode.toUpperCase()}`);
        const metadata = await getCacheMetadata();
        delete metadata[countryCode.toUpperCase()];
        await saveCacheMetadata(metadata);
        console.log(`[IntelligentRadio] Cleared cache for ${countryCode}`);
      } else {
        const metadata = await getCacheMetadata();
        for (const code of Object.keys(metadata)) {
          await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${code}`);
        }
        await AsyncStorage.removeItem(CACHE_METADATA_KEY);
        console.log('[IntelligentRadio] Cleared all cache');
      }
    } catch (error) {
      console.error('[IntelligentRadio] Error clearing cache:', error);
    }
  },

  async forceRefreshCountry(countryCode: string): Promise<CachedRadioStation[]> {
    return this.getStationsForCountry(countryCode, true);
  },

  getMaxStationsPerCountry(): number {
    return MAX_STATIONS_PER_COUNTRY;
  },

  getRefreshIntervalDays(): number {
    return REFRESH_INTERVAL_DAYS;
  },
};
