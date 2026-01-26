import { getCuratedStationsByCountry, CuratedRadioStation, CURATED_RADIO_STATIONS } from './CuratedRadioStations';

export interface OnlineRadioStation {
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
}

export interface OnlineRadioCountry {
  name: string;
  iso_3166_1: string;
  stationcount: number;
}

// Convert curated station to OnlineRadioStation format
function curatedToOnlineStation(curated: CuratedRadioStation, index: number): OnlineRadioStation {
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
    votes: 10000 + (CURATED_RADIO_STATIONS.length - index), // Higher votes for curated to prioritize them
    clickcount: 1000,
    lastcheckok: 1,
    hls: 0,
  };
}

// Countries that use curated stations instead of Radio Browser API
const CURATED_COUNTRIES = ['IN'];

const RADIO_BROWSER_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

const MAX_STATIONS_PER_COUNTRY = 1000;
const API_FETCH_LIMIT = 1500; // Fetch more from API to ensure we get quality stations after filtering
const REQUEST_TIMEOUT = 15000;

// Valid stream URL patterns (must be HTTP/HTTPS with standard audio extensions or streams)
const VALID_URL_PATTERNS = [
  /^https?:\/\/.+\.(mp3|aac|ogg|m3u8|pls|m4a|flac)$/i,
  /^https?:\/\/.+\/stream/i,
  /^https?:\/\/.+\/listen/i,
  /^https?:\/\/.+\/live/i,
  /^https?:\/\/.+\:\d+\/?$/i, // IP:port format
  /^https?:\/\/.+\/[^;]+$/i, // Any URL without semicolon (problematic format)
];

// Problematic URL patterns that should be rejected
const INVALID_URL_PATTERNS = [
  /;stream$/i, // SHOUTcast v1 format - often broken
  /;$/i, // Trailing semicolon
  /\?sid=/i, // Session IDs often expire
];

// Blacklisted station name patterns (low quality or inappropriate content)
const BLACKLISTED_STATION_PATTERNS = [
  /schizoid/i, // Radio Schizoid - remove all variants
];

let currentServerIndex = 0;

async function getRadioBrowserServer(): Promise<string> {
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
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
    throw new Error('Network request failed');
  } finally {
    clearTimeout(timeoutId);
  }
}

function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error('An unknown error occurred');
}

async function fetchFromRadioBrowser(endpoint: string, retries: number = 2): Promise<any> {
  let lastError: Error = new Error('Failed to fetch from Radio Browser API');
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const server = await getRadioBrowserServer();
      const url = `${server}${endpoint}`;
      console.log(`[OnlineRadioService] Fetching: ${url}`);
      
      const response = await fetchWithTimeout(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: unknown) {
      lastError = ensureError(error);
      console.warn(`[OnlineRadioService] Attempt ${attempt + 1} failed:`, lastError.message);
      rotateServer();
    }
  }
  
  throw lastError;
}

function isValidStreamUrl(url: string): boolean {
  if (!url) return false;
  
  // Check for invalid/problematic patterns first
  for (const pattern of INVALID_URL_PATTERNS) {
    if (pattern.test(url)) return false;
  }
  
  // Must start with http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }
  
  return true;
}

function isBlacklistedStation(name: string): boolean {
  if (!name) return false;
  return BLACKLISTED_STATION_PATTERNS.some(pattern => pattern.test(name));
}

function filterAndSortStations(stations: OnlineRadioStation[]): OnlineRadioStation[] {
  return stations
    .filter((station) => {
      // Only stations verified as currently streaming
      if (station.lastcheckok !== 1) return false;
      
      // Remove blacklisted stations (e.g., Radio Schizoid)
      if (isBlacklistedStation(station.name)) return false;
      
      // Get the best available URL
      const streamUrl = station.url_resolved || station.url;
      
      // Must have valid stream URL
      if (!streamUrl) return false;
      
      // Validate URL format (reject problematic formats like ;stream)
      if (!isValidStreamUrl(streamUrl)) return false;
      
      return true;
    })
    // Sort by votes (highest first) - popular/professional stations come first
    .sort((a, b) => b.votes - a.votes)
    .slice(0, MAX_STATIONS_PER_COUNTRY);
}

export const OnlineRadioService = {
  async getStationsByCountryCode(
    countryCode: string,
    limit: number = MAX_STATIONS_PER_COUNTRY
  ): Promise<OnlineRadioStation[]> {
    const upperCountryCode = countryCode.toUpperCase();
    
    // Use curated stations for countries with curated lists
    if (CURATED_COUNTRIES.includes(upperCountryCode)) {
      const curatedStations = getCuratedStationsByCountry(upperCountryCode);
      const convertedStations = curatedStations.map((station, index) => 
        curatedToOnlineStation(station, index)
      );
      console.log(`[OnlineRadioService] Using ${convertedStations.length} curated stations for ${countryCode}`);
      return convertedStations.slice(0, limit);
    }
    
    // For other countries, use Radio Browser API
    try {
      const params = new URLSearchParams({
        countrycode: upperCountryCode,
        lastcheckok: '1',
        order: 'votes',
        reverse: 'true',
        hidebroken: 'true',
        limit: String(API_FETCH_LIMIT),
      });
      
      const stations = await fetchFromRadioBrowser(`/json/stations/bycountrycodeexact/${upperCountryCode}?${params}`);
      const filtered = filterAndSortStations(stations);
      console.log(`[OnlineRadioService] Found ${filtered.length} working stations for ${countryCode}`);
      return filtered.slice(0, limit);
    } catch (error) {
      console.error('[OnlineRadioService] getStationsByCountryCode error:', error);
      throw new Error('Failed to fetch stations. Please check your connection.');
    }
  },

  async searchStations(
    query: string,
    limit: number = MAX_STATIONS_PER_COUNTRY,
    countryCode?: string
  ): Promise<OnlineRadioStation[]> {
    try {
      const params = new URLSearchParams({
        name: query,
        lastcheckok: '1',
        order: 'votes',
        reverse: 'true',
        hidebroken: 'true',
        limit: String(API_FETCH_LIMIT),
      });
      
      if (countryCode) {
        params.set('countrycode', countryCode.toUpperCase());
      }
      
      const stations = await fetchFromRadioBrowser(`/json/stations/search?${params}`);
      const filtered = filterAndSortStations(stations);
      console.log(`[OnlineRadioService] Search found ${filtered.length} stations for "${query}"`);
      return filtered.slice(0, limit);
    } catch (error) {
      console.error('[OnlineRadioService] searchStations error:', error);
      throw new Error('Failed to search stations.');
    }
  },

  async getPopularStations(
    countryCode?: string,
    limit: number = MAX_STATIONS_PER_COUNTRY
  ): Promise<OnlineRadioStation[]> {
    // Use curated stations for countries with curated lists
    if (countryCode && CURATED_COUNTRIES.includes(countryCode.toUpperCase())) {
      const curatedStations = getCuratedStationsByCountry(countryCode.toUpperCase());
      const convertedStations = curatedStations.map((station, index) => 
        curatedToOnlineStation(station, index)
      );
      console.log(`[OnlineRadioService] Using ${convertedStations.length} curated popular stations for ${countryCode}`);
      return convertedStations.slice(0, limit);
    }
    
    // For other countries, use Radio Browser API
    try {
      const params = new URLSearchParams({
        lastcheckok: '1',
        order: 'votes',
        reverse: 'true',
        hidebroken: 'true',
        limit: String(API_FETCH_LIMIT),
      });
      
      let endpoint = '/json/stations/topvote';
      
      if (countryCode) {
        params.set('countrycode', countryCode.toUpperCase());
        endpoint = `/json/stations/bycountrycodeexact/${countryCode.toUpperCase()}`;
      }
      
      const stations = await fetchFromRadioBrowser(`${endpoint}?${params}`);
      const filtered = filterAndSortStations(stations);
      console.log(`[OnlineRadioService] Found ${filtered.length} popular stations${countryCode ? ` for ${countryCode}` : ''}`);
      return filtered.slice(0, limit);
    } catch (error) {
      console.error('[OnlineRadioService] getPopularStations error:', error);
      throw new Error('Failed to fetch popular stations.');
    }
  },

  async getStationsByGenre(
    genre: string,
    countryCode?: string,
    limit: number = MAX_STATIONS_PER_COUNTRY
  ): Promise<OnlineRadioStation[]> {
    try {
      const params = new URLSearchParams({
        tag: genre.toLowerCase(),
        lastcheckok: '1',
        order: 'votes',
        reverse: 'true',
        hidebroken: 'true',
        limit: String(API_FETCH_LIMIT),
      });
      
      if (countryCode) {
        params.set('countrycode', countryCode.toUpperCase());
      }
      
      const stations = await fetchFromRadioBrowser(`/json/stations/search?${params}`);
      const filtered = filterAndSortStations(stations);
      return filtered.slice(0, limit);
    } catch (error) {
      console.error('[OnlineRadioService] getStationsByGenre error:', error);
      throw new Error('Failed to fetch stations by genre.');
    }
  },

  async getCountries(): Promise<OnlineRadioCountry[]> {
    try {
      const countries = await fetchFromRadioBrowser('/json/countries');
      
      const priorityCountries = ['IN', 'US', 'GB', 'DE', 'FR', 'ES', 'IT', 'JP', 'BR', 'CA', 'AU'];
      
      // Get curated station counts and info for override/injection
      const curatedCountryInfo: Record<string, { name: string; count: number }> = {
        'IN': { name: 'India', count: getCuratedStationsByCountry('IN').length },
      };
      
      // Filter and map API countries
      let processedCountries = countries
        .filter((c: any) => c.stationcount > 10)
        .map((c: any) => ({
          name: c.name,
          iso_3166_1: c.iso_3166_1,
          // Use curated count for curated countries, otherwise use API count
          stationcount: curatedCountryInfo[c.iso_3166_1]?.count || c.stationcount,
        }));
      
      // Ensure curated countries are always included
      const existingCountryCodes = new Set(processedCountries.map((c: OnlineRadioCountry) => c.iso_3166_1));
      for (const [countryCode, info] of Object.entries(curatedCountryInfo)) {
        if (!existingCountryCodes.has(countryCode)) {
          console.log(`[OnlineRadioService] Injecting curated country: ${countryCode}`);
          processedCountries.push({
            name: info.name,
            iso_3166_1: countryCode,
            stationcount: info.count,
          });
        }
      }
      
      // Sort with priority countries first
      processedCountries.sort((a: OnlineRadioCountry, b: OnlineRadioCountry) => {
        const aIndex = priorityCountries.indexOf(a.iso_3166_1);
        const bIndex = priorityCountries.indexOf(b.iso_3166_1);
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        return b.stationcount - a.stationcount;
      });
      
      return processedCountries;
    } catch (error) {
      console.error('[OnlineRadioService] getCountries error:', error);
      throw new Error('Failed to fetch countries.');
    }
  },

  async reportStationClick(stationUuid: string): Promise<void> {
    try {
      await fetchFromRadioBrowser(`/json/url/${stationUuid}`);
      console.log(`[OnlineRadioService] Click reported for: ${stationUuid}`);
    } catch (error) {
      console.warn('[OnlineRadioService] Failed to report click:', error);
    }
  },

  async getCountryFromCoords(
    latitude: number,
    longitude: number
  ): Promise<{ countryCode: string | null; country: string | null }> {
    try {
      const response = await fetchWithTimeout(
        `${NOMINATIM_API}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3`,
        5000
      );

      if (!response.ok) {
        throw new Error(`Nominatim error: ${response.status}`);
      }

      const data = await response.json();
      const countryCode = data.address?.country_code?.toUpperCase() || null;
      const country = data.address?.country || null;

      console.log(`[OnlineRadioService] Detected location: ${country} (${countryCode})`);
      return { countryCode, country };
    } catch (error) {
      console.error('[OnlineRadioService] getCountryFromCoords error:', error);
      return { countryCode: null, country: null };
    }
  },

  async verifyStreamUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok || response.status === 405;
    } catch (error) {
      console.warn('[OnlineRadioService] Stream verification failed:', url);
      return false;
    }
  },
};
