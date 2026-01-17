import {
  CuratedRadioStation,
  getCuratedStationsByCountry,
  getAllCuratedStations,
  getCuratedCountries,
  searchCuratedStations,
} from './CuratedRadioStations';

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

const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

function curatedToOnlineStation(curated: CuratedRadioStation): OnlineRadioStation {
  return {
    stationuuid: curated.id,
    name: curated.name,
    url: curated.streamUrl,
    url_resolved: curated.streamUrl,
    homepage: curated.website,
    favicon: curated.favicon,
    country: curated.country,
    countrycode: curated.countryCode,
    state: '',
    language: curated.language,
    languagecodes: curated.language.toLowerCase(),
    tags: curated.genre,
    codec: 'MP3',
    bitrate: curated.bitrate,
    votes: 100,
    clickcount: 1000,
    lastcheckok: 1,
    hls: curated.streamUrl.includes('.m3u8') ? 1 : 0,
  };
}

export const OnlineRadioService = {
  async getStationsByCountryCode(
    countryCode: string,
    limit: number = 100
  ): Promise<OnlineRadioStation[]> {
    try {
      const curatedStations = getCuratedStationsByCountry(countryCode);
      const stations = curatedStations.map(curatedToOnlineStation);
      console.log(`[OnlineRadioService] Found ${stations.length} curated stations for ${countryCode}`);
      return stations.slice(0, limit);
    } catch (error) {
      console.error('[OnlineRadioService] getStationsByCountryCode error:', error);
      throw new Error('Failed to fetch stations for your country.');
    }
  },

  async searchStations(
    query: string,
    limit: number = 50,
    countryCode?: string
  ): Promise<OnlineRadioStation[]> {
    try {
      let results = searchCuratedStations(query);
      
      if (countryCode) {
        results = results.filter(
          (s) => s.countryCode.toUpperCase() === countryCode.toUpperCase()
        );
      }
      
      const stations = results.map(curatedToOnlineStation);
      console.log(`[OnlineRadioService] Search found ${stations.length} stations for "${query}"`);
      return stations.slice(0, limit);
    } catch (error) {
      console.error('[OnlineRadioService] searchStations error:', error);
      throw new Error('Failed to search stations.');
    }
  },

  async getPopularStations(
    countryCode?: string,
    limit: number = 50
  ): Promise<OnlineRadioStation[]> {
    try {
      let curatedStations: CuratedRadioStation[];
      
      if (countryCode) {
        curatedStations = getCuratedStationsByCountry(countryCode);
      } else {
        curatedStations = getAllCuratedStations();
      }
      
      const stations = curatedStations.map(curatedToOnlineStation);
      console.log(`[OnlineRadioService] Found ${stations.length} popular stations${countryCode ? ` for ${countryCode}` : ''}`);
      return stations.slice(0, limit);
    } catch (error) {
      console.error('[OnlineRadioService] getPopularStations error:', error);
      throw new Error('Failed to fetch popular stations.');
    }
  },

  async getCuratedStations(
    countryCode: string,
    limit: number = 20
  ): Promise<OnlineRadioStation[]> {
    return this.getStationsByCountryCode(countryCode, limit);
  },

  async getStationsByGenre(
    genre: string,
    countryCode?: string,
    limit: number = 50
  ): Promise<OnlineRadioStation[]> {
    try {
      let curatedStations = getAllCuratedStations().filter(
        (s) => s.genre.toLowerCase().includes(genre.toLowerCase())
      );
      
      if (countryCode) {
        curatedStations = curatedStations.filter(
          (s) => s.countryCode.toUpperCase() === countryCode.toUpperCase()
        );
      }
      
      const stations = curatedStations.map(curatedToOnlineStation);
      return stations.slice(0, limit);
    } catch (error) {
      console.error('[OnlineRadioService] getStationsByGenre error:', error);
      throw new Error('Failed to fetch stations by genre.');
    }
  },

  async getCountries(): Promise<OnlineRadioCountry[]> {
    try {
      const curatedCountries = getCuratedCountries();
      return curatedCountries.map(({ countryCode, country, stationCount }) => ({
        name: country,
        iso_3166_1: countryCode,
        stationcount: stationCount,
      }));
    } catch (error) {
      console.error('[OnlineRadioService] getCountries error:', error);
      throw new Error('Failed to fetch countries.');
    }
  },

  async reportStationClick(stationUuid: string): Promise<void> {
    console.log(`[OnlineRadioService] Station clicked: ${stationUuid}`);
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
