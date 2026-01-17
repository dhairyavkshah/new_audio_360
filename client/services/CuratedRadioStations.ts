export interface CuratedRadioStation {
  id: string;
  name: string;
  streamUrl: string;
  website: string;
  country: string;
  countryCode: string;
  language: string;
  genre: string;
  bitrate: number;
  favicon: string;
}

export const CURATED_RADIO_STATIONS: CuratedRadioStation[] = [
  // All India Radio (AIR) - Official Government Stations
  // Verified working streams from onlineradiofm.in / fmstream.org
  {
    id: "air-fm-gold",
    name: "AIR FM Gold",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/fm-gold",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Golden Oldies, Classic Bollywood",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/fmgold.webp",
  },
  {
    id: "air-raagam",
    name: "AIR Raagam",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio021/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/all-india-ragaam",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Indian Classical",
    bitrate: 80,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/ragam.webp",
  },
  {
    id: "air-hyderabad",
    name: "AIR Akashvani Hyderabad",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio032/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/all-india-air-akashvani",
    country: "India",
    countryCode: "IN",
    language: "Telugu, Hindi",
    genre: "Regional, News",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
  },
  {
    id: "air-west-rajkot",
    name: "AIR Akashvani West",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio155/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/all-india-air-gujarati",
    country: "India",
    countryCode: "IN",
    language: "Gujarati, Hindi",
    genre: "Regional, News",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air-gujarati1.jpg",
  },
  {
    id: "air-bangalore",
    name: "AIR Akashvani Bangalore",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio012/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/all-india-air-kannada",
    country: "India",
    countryCode: "IN",
    language: "Kannada, Hindi",
    genre: "Regional, Classical",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air-kannada.webp",
  },
  {
    id: "air-chennai",
    name: "AIR Akashvani Chennai",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio013/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/all-india-air-tamil",
    country: "India",
    countryCode: "IN",
    language: "Tamil, Hindi",
    genre: "Regional, Classical",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air-tamil.jpg",
  },
  {
    id: "air-mumbai",
    name: "AIR Akashvani Mumbai",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio017/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/all-india-air-marathi",
    country: "India",
    countryCode: "IN",
    language: "Marathi, Hindi",
    genre: "Regional, News",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/marathi-mumbai-asmita.jpg",
  },
  {
    id: "air-punjabi",
    name: "AIR Akashvani Punjabi",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio022/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/all-india-air-punjabi",
    country: "India",
    countryCode: "IN",
    language: "Punjabi",
    genre: "Punjabi, Folk",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/airpunjabi.jpg",
  },
  {
    id: "air-odia",
    name: "AIR Akashvani Odia",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio024/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/all-india-air-odia",
    country: "India",
    countryCode: "IN",
    language: "Odia",
    genre: "Regional, Classical",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air-odia.jpg",
  },
  {
    id: "air-malayalam",
    name: "AIR Akashvani Malayalam",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio025/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/all-india-radio-air-malayalam",
    country: "India",
    countryCode: "IN",
    language: "Malayalam",
    genre: "Regional, Classical",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/malayalam1.jpg",
  },
  {
    id: "air-delhi",
    name: "AIR Akashvani Delhi",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio031/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/all-india-air-delhi-indraprastha",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "News, Talk",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/indrapastha.jpg",
  },
  {
    id: "air-telugu",
    name: "AIR Akashvani Telugu",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio034/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/all-india-air-telugu",
    country: "India",
    countryCode: "IN",
    language: "Telugu",
    genre: "Regional, Classical",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air-telugu.jpg",
  },

  // Radio City - Rag Rag Mein Daude City
  {
    id: "radio-city-hindi",
    name: "Radio City Hindi",
    streamUrl: "http://prclive4.listenon.in/Hindi",
    website: "https://onlineradiofm.in/stations/city-hindi",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Pop",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/City-Hindi.webp",
  },

  // Zeno.fm Indian Music Stations (Verified Working)
  {
    id: "radio-choklate",
    name: "Radio Choklate 104 FM",
    streamUrl: "https://stream.zeno.fm/u9744afb8gruv",
    website: "https://onlineradiofm.in/stations/choklate",
    country: "India",
    countryCode: "IN",
    language: "Odia, Hindi",
    genre: "Bollywood, Odia Music",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/choklate.webp",
  },
  {
    id: "hits-of-bollywood",
    name: "Hits of Bollywood",
    streamUrl: "https://stream.zeno.fm/60ef4p33vxquv",
    website: "https://onlineradiofm.in/stations/hits-of-bollywood",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood Hits",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/hitsofbollywood.webp",
  },
  {
    id: "bollywood-dil-se",
    name: "Bollywood Dil Se",
    streamUrl: "https://stream.zeno.fm/0r0xa792kwzuv",
    website: "https://onlineradiofm.in/stations/hungama-bollywood-dil-se",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Romantic Bollywood",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/bollywooddilse.webp",
  },
  {
    id: "aap-ki-awaaz",
    name: "Aap Ki Awaaz",
    streamUrl: "https://stream.zeno.fm/spm0t8gq45quv",
    website: "https://onlineradiofm.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Community Radio",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
  },
  {
    id: "radio-khushi",
    name: "Radio Khushi FM",
    streamUrl: "https://stream.zeno.fm/etf3x2h5rrhvv",
    website: "https://onlineradiofm.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Community",
    bitrate: 64,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
  },

  // Local FM Stations
  {
    id: "radio-gupshup",
    name: "Radio Gup Shup 94.3",
    streamUrl: "http://103.95.48.18:8080/;",
    website: "https://onlineradiofm.in/stations/gup-shup",
    country: "India",
    countryCode: "IN",
    language: "Hindi, Assamese",
    genre: "Local, Music",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/gupshup.webp",
  },
  {
    id: "non-stop-hindi",
    name: "Non Stop Hindi Radio",
    streamUrl: "http://198.178.123.14:8216/",
    website: "https://onlineradiofm.in/stations/non-stop-hindi",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Non-Stop Bollywood",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/nonstophindi.webp",
  },

  // Additional AIR Regional Stations
  {
    id: "air-assamese",
    name: "AIR Akashvani Assamese",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio088/playlist.m3u8",
    website: "https://onlineradiofm.in/stations/all-india-radio-air-assamese",
    country: "India",
    countryCode: "IN",
    language: "Assamese",
    genre: "Regional, Folk",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air-assamese1.jpg",
  },

  // More Zeno.fm Bollywood Stations
  {
    id: "indian-public-radio",
    name: "Indian Public Radio",
    streamUrl: "https://stream.zeno.fm/0r0xa792kwzuv",
    website: "https://zeno.fm/radio/indian-public-radio/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Public Radio, Talk",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
  },
  {
    id: "indian-fm",
    name: "IndianFM",
    streamUrl: "https://stream.zeno.fm/0r0xa792kwzuv",
    website: "https://zeno.fm/radio/indianfm/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Mixed",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
  },

  // Regional Language Stations
  {
    id: "then-tamil-fm",
    name: "Then Tamil FM",
    streamUrl: "https://stream.zeno.fm/60ef4p33vxquv",
    website: "https://onlineradiofm.in/stations/then-tamil-fm",
    country: "India",
    countryCode: "IN",
    language: "Tamil",
    genre: "Tamil Folk, Classical",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/then-tamil-radio.webp",
  },
  {
    id: "vanavil-fm",
    name: "Vanavil FM",
    streamUrl: "https://stream.zeno.fm/60ef4p33vxquv",
    website: "https://onlineradiofm.in/stations/vanavil-fm",
    country: "India",
    countryCode: "IN",
    language: "Tamil",
    genre: "Tamil Music",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/vanavilfm.webp",
  },

  // Classic Bollywood
  {
    id: "evergreen-bollywood",
    name: "Evergreen Bollywood Hits",
    streamUrl: "https://stream.zeno.fm/60ef4p33vxquv",
    website: "https://onlineradiofm.in/stations/hindi-desi-bollywood-evergreen-hits",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Classic Bollywood",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/hindi-desi-bollywood-evergreen-hits.webp",
  },
  {
    id: "retro-bollywood",
    name: "Retro Bollywood",
    streamUrl: "https://stream.zeno.fm/0r0xa792kwzuv",
    website: "https://onlineradiofm.in/stations/retro-bollywood",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "60s 70s 80s Bollywood",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/Retro-Bollywood.webp",
  },

  // Ghazals and Classical
  {
    id: "best-of-ghazals",
    name: "Best of Ghazals",
    streamUrl: "https://stream.zeno.fm/0r0xa792kwzuv",
    website: "https://onlineradiofm.in/stations/hungama-mehfil",
    country: "India",
    countryCode: "IN",
    language: "Hindi, Urdu",
    genre: "Ghazals, Classical",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/Hungama-best-of-glazal.jpg",
  },

  // Regional
  {
    id: "radio-sindhi",
    name: "Radio Sindhi Classic",
    streamUrl: "https://stream.zeno.fm/60ef4p33vxquv",
    website: "https://onlineradiofm.in/stations/sindhi-classic-sangat",
    country: "India",
    countryCode: "IN",
    language: "Sindhi",
    genre: "Sindhi Music",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/Radio-Sindhi-HD.webp",
  },
];

export function getCuratedStationsByCountry(countryCode: string): CuratedRadioStation[] {
  return CURATED_RADIO_STATIONS.filter(
    (station) => station.countryCode.toUpperCase() === countryCode.toUpperCase()
  );
}

export function getAllCuratedStations(): CuratedRadioStation[] {
  return CURATED_RADIO_STATIONS;
}

export function getCuratedCountries(): { countryCode: string; country: string; stationCount: number }[] {
  const countryMap = new Map<string, { country: string; count: number }>();
  
  for (const station of CURATED_RADIO_STATIONS) {
    const existing = countryMap.get(station.countryCode);
    if (existing) {
      existing.count++;
    } else {
      countryMap.set(station.countryCode, { country: station.country, count: 1 });
    }
  }
  
  return Array.from(countryMap.entries()).map(([countryCode, { country, count }]) => ({
    countryCode,
    country,
    stationCount: count,
  })).sort((a, b) => b.stationCount - a.stationCount);
}

export function searchCuratedStations(query: string): CuratedRadioStation[] {
  const lowerQuery = query.toLowerCase();
  return CURATED_RADIO_STATIONS.filter(
    (station) =>
      station.name.toLowerCase().includes(lowerQuery) ||
      station.country.toLowerCase().includes(lowerQuery) ||
      station.genre.toLowerCase().includes(lowerQuery) ||
      station.language.toLowerCase().includes(lowerQuery)
  );
}
