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
}

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
        headers: {
          'User-Agent': 'NewAudio360/1.0',
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[OnlineRadioService] Server ${server} failed, rotating...`);
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
        `/json/stations/bycountrycodeexact/${countryCode.toUpperCase()}?limit=${limit}&order=clickcount&reverse=true&hidebroken=true`
      );
      return stations.filter((s) => s.url_resolved && s.name);
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
      let endpoint = `/json/stations/search?name=${encodeURIComponent(query)}&limit=${limit}&order=clickcount&reverse=true&hidebroken=true`;
      if (countryCode) {
        endpoint += `&countrycode=${countryCode.toUpperCase()}`;
      }
      const stations = await fetchWithFallback<OnlineRadioStation[]>(endpoint);
      return stations.filter((s) => s.url_resolved && s.name);
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
      let endpoint = `/json/stations/topclick/${limit}?hidebroken=true`;
      if (countryCode) {
        endpoint = `/json/stations/bycountrycodeexact/${countryCode.toUpperCase()}?limit=${limit}&order=clickcount&reverse=true&hidebroken=true`;
      }
      const stations = await fetchWithFallback<OnlineRadioStation[]>(endpoint);
      return stations.filter((s) => s.url_resolved && s.name);
    } catch (error) {
      console.error('[OnlineRadioService] getPopularStations error:', error);
      throw new Error('Failed to fetch popular stations. Please check your internet connection.');
    }
  },

  async getStationsByGenre(
    genre: string,
    countryCode?: string,
    limit: number = 50
  ): Promise<OnlineRadioStation[]> {
    try {
      let endpoint = `/json/stations/bytag/${encodeURIComponent(genre)}?limit=${limit}&order=clickcount&reverse=true&hidebroken=true`;
      if (countryCode) {
        endpoint += `&countrycode=${countryCode.toUpperCase()}`;
      }
      const stations = await fetchWithFallback<OnlineRadioStation[]>(endpoint);
      return stations.filter((s) => s.url_resolved && s.name);
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
