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

const isStreamSupported = (station: OnlineRadioStation): boolean => {
  if (!station.url_resolved || !station.name) return false;
  if (station.lastcheckok !== 1) return false;
  
  const codec = station.codec?.toUpperCase() || '';
  const supportedCodecs = ['MP3', 'AAC', 'AAC+', 'OGG', 'OPUS', 'FLAC', 'UNKNOWN'];
  const unsupportedCodecs = ['WMA', 'ASF'];
  
  if (unsupportedCodecs.some(c => codec.includes(c))) return false;
  
  const url = station.url_resolved.toLowerCase();
  if (url.includes('.asx') || url.includes('.wma') || url.includes('.asf')) return false;
  
  return true;
};

export interface OnlineRadioCountry {
  name: string;
  iso_3166_1: string;
  stationcount: number;
}

const API_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

let currentServerIndex = 0;

const getApiServer = (): string => {
  return API_SERVERS[currentServerIndex];
};

const rotateServer = (): void => {
  currentServerIndex = (currentServerIndex + 1) % API_SERVERS.length;
};

const fetchWithFallback = async <T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const maxRetries = API_SERVERS.length;
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    const server = getApiServer();
    try {
      const response = await fetch(`${server}${endpoint}`, {
        ...options,
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[OnlineRadioService] Server ${server} failed:`, lastError.message);
      rotateServer();
    }
  }

  throw new Error(
    `All Radio Browser API servers failed. Last error: ${lastError?.message || 'Unknown error'}`
  );
};

export const OnlineRadioService = {
  async getStationsByCountryCode(
    countryCode: string,
    limit: number = 100
  ): Promise<OnlineRadioStation[]> {
    try {
      const stations = await fetchWithFallback<OnlineRadioStation[]>(
        `/json/stations/bycountrycodeexact/${countryCode.toUpperCase()}?limit=${limit * 2}&order=votes&reverse=true&hidebroken=true&lastcheckok=1`
      );
      return stations.filter(isStreamSupported).slice(0, limit);
    } catch (error) {
      console.error('[OnlineRadioService] getStationsByCountryCode error:', error);
      throw new Error('Failed to fetch stations for your country. Please check your internet connection.');
    }
  },

  async searchStations(
    query: string,
    limit: number = 50,
    countryCode?: string
  ): Promise<OnlineRadioStation[]> {
    try {
      let endpoint = `/json/stations/search?name=${encodeURIComponent(query)}&limit=${limit * 2}&order=votes&reverse=true&hidebroken=true&lastcheckok=1`;
      if (countryCode) {
        endpoint += `&countrycode=${countryCode.toUpperCase()}`;
      }
      const stations = await fetchWithFallback<OnlineRadioStation[]>(endpoint);
      return stations.filter(isStreamSupported).slice(0, limit);
    } catch (error) {
      console.error('[OnlineRadioService] searchStations error:', error);
      throw new Error('Failed to search stations. Please check your internet connection.');
    }
  },

  async getPopularStations(
    countryCode?: string,
    limit: number = 50
  ): Promise<OnlineRadioStation[]> {
    try {
      if (countryCode) {
        // First, try to get top-voted stations for this country directly
        // This is faster and more reliable than searching for curated stations
        const topStations = await fetchWithFallback<OnlineRadioStation[]>(
          `/json/stations/bycountrycodeexact/${countryCode.toUpperCase()}?limit=${limit * 3}&order=votes&reverse=true&hidebroken=true&lastcheckok=1`
        );
        
        const validStations = topStations.filter(isStreamSupported).slice(0, limit);
        console.log(`[OnlineRadioService] Found ${validStations.length} top stations for ${countryCode}`);
        return validStations;
      }
      
      const stations = await fetchWithFallback<OnlineRadioStation[]>(
        `/json/stations/topvote/${limit * 2}?hidebroken=true&lastcheckok=1`
      );
      return stations.filter(isStreamSupported).slice(0, limit);
    } catch (error) {
      console.error('[OnlineRadioService] getPopularStations error:', error);
      throw new Error('Failed to fetch popular stations. Please check your internet connection.');
    }
  },

  async getCuratedStations(
    countryCode: string,
    limit: number = 20
  ): Promise<OnlineRadioStation[]> {
    // Note: This function is kept for potential future use but is no longer 
    // the primary way to get popular stations. Direct top-voted lookup is faster.
    const { getCuratedStationsForCountry } = await import('./CuratedStations');
    const curatedList = getCuratedStationsForCountry(countryCode);
    
    if (curatedList.length === 0) {
      return [];
    }

    const foundStations: OnlineRadioStation[] = [];
    const seenUuids = new Set<string>();

    // Only search for first 5 curated stations to reduce API calls
    for (const curated of curatedList.slice(0, 5)) {
      if (foundStations.length >= limit) break;
      
      const term = curated.searchTerms[0]; // Use first search term only
      
      try {
        const stations = await fetchWithFallback<OnlineRadioStation[]>(
          `/json/stations/search?name=${encodeURIComponent(term)}&countrycode=${countryCode.toUpperCase()}&limit=5&order=votes&reverse=true&hidebroken=true&lastcheckok=1`
        );
        
        const validStation = stations.find(s => 
          isStreamSupported(s) && !seenUuids.has(s.stationuuid)
        );
        
        if (validStation) {
          seenUuids.add(validStation.stationuuid);
          foundStations.push(validStation);
        }
      } catch (err) {
        console.warn(`[OnlineRadioService] Failed to find curated station: ${curated.name}`);
      }
    }

    return foundStations;
  },

  async getStationsByGenre(
    genre: string,
    countryCode?: string,
    limit: number = 50
  ): Promise<OnlineRadioStation[]> {
    try {
      let endpoint = `/json/stations/bytag/${encodeURIComponent(genre)}?limit=${limit * 2}&order=votes&reverse=true&hidebroken=true&lastcheckok=1`;
      if (countryCode) {
        endpoint += `&countrycode=${countryCode.toUpperCase()}`;
      }
      const stations = await fetchWithFallback<OnlineRadioStation[]>(endpoint);
      return stations.filter(isStreamSupported).slice(0, limit);
    } catch (error) {
      console.error('[OnlineRadioService] getStationsByGenre error:', error);
      throw new Error('Failed to fetch stations by genre. Please check your internet connection.');
    }
  },

  async getCountries(): Promise<OnlineRadioCountry[]> {
    try {
      const countries = await fetchWithFallback<OnlineRadioCountry[]>(
        '/json/countries?order=stationcount&reverse=true'
      );
      return countries.filter((c) => c.stationcount > 0);
    } catch (error) {
      console.error('[OnlineRadioService] getCountries error:', error);
      throw new Error('Failed to fetch countries. Please check your internet connection.');
    }
  },

  async reportStationClick(stationUuid: string): Promise<void> {
    try {
      await fetchWithFallback<{ ok: boolean }>(
        `/json/url/${stationUuid}`
      );
    } catch (error) {
      console.warn('[OnlineRadioService] reportStationClick failed:', error);
    }
  },

  async getCountryFromCoords(
    latitude: number,
    longitude: number
  ): Promise<{ countryCode: string | null; country: string | null }> {
    try {
      const response = await fetch(
        `${NOMINATIM_API}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3&accept-language=en`,
        {
          headers: {
            'User-Agent': 'NewAudio360/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      const countryCode = data.address?.country_code?.toUpperCase() || null;
      const country = data.address?.country || null;

      return { countryCode, country };
    } catch (error) {
      console.error('[OnlineRadioService] getCountryFromCoords error:', error);
      return { countryCode: null, country: null };
    }
  },
};
