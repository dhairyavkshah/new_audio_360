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
const MIN_BITRATE = 128; // Professional broadcast quality (upgraded from 96)
const MIN_VOTES = 20; // Community validated stations (upgraded from 5)
const MIN_CLICKCOUNT = 500; // Actively listened to stations
const VALID_CODECS = ['MP3', 'OGG', 'AAC'];
const REQUEST_TIMEOUT = 10000;

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

function filterAndSortStations(stations: OnlineRadioStation[]): OnlineRadioStation[] {
  return stations
    .filter((station) => {
      // Only verified working stations
      if (station.lastcheckok !== 1) return false;
      // Professional broadcast quality (128+ kbps)
      if (station.bitrate < MIN_BITRATE) return false;
      // Community validated (20+ votes)
      if (station.votes < MIN_VOTES) return false;
      // Actively listened to (500+ clicks)
      if (station.clickcount < MIN_CLICKCOUNT) return false;
      // Standard audio codecs only
      const codec = station.codec?.toUpperCase() || '';
      if (!VALID_CODECS.some(vc => codec.includes(vc))) return false;
      // Must have valid stream URL
      if (!station.url_resolved && !station.url) return false;
      return true;
    })
    // Sort by votes (highest first) for most reliable stations
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
        limit: String(Math.min(limit * 3, 750)),
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
        limit: String(Math.min(limit * 3, 750)),
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
        limit: String(Math.min(limit * 3, 750)),
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
        limit: String(Math.min(limit * 3, 750)),
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
