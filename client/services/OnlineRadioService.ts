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

const RADIO_BROWSER_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

const MAX_STATIONS_PER_COUNTRY = 250;
const API_FETCH_LIMIT = 1500; // Fetch more from API to ensure we get 250+ after filtering
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
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchFromRadioBrowser(endpoint: string, retries: number = 2): Promise<any> {
  let lastError: Error | null = null;
  
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
    } catch (error) {
      lastError = error as Error;
      console.warn(`[OnlineRadioService] Attempt ${attempt + 1} failed:`, error);
      rotateServer();
    }
  }
  
  throw lastError || new Error('Failed to fetch from Radio Browser API');
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
    try {
      const params = new URLSearchParams({
        countrycode: countryCode.toUpperCase(),
        lastcheckok: '1',
        order: 'votes',
        reverse: 'true',
        hidebroken: 'true',
        limit: String(API_FETCH_LIMIT),
      });
      
      const stations = await fetchFromRadioBrowser(`/json/stations/bycountrycodeexact/${countryCode.toUpperCase()}?${params}`);
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
      
      const sorted = countries
        .filter((c: any) => c.stationcount > 10)
        .sort((a: any, b: any) => {
          const aIndex = priorityCountries.indexOf(a.iso_3166_1);
          const bIndex = priorityCountries.indexOf(b.iso_3166_1);
          
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          
          return b.stationcount - a.stationcount;
        });
      
      return sorted.map((c: any) => ({
        name: c.name,
        iso_3166_1: c.iso_3166_1,
        stationcount: c.stationcount,
      }));
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
