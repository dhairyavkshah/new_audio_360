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
  // ============================================
  // COMMERCIAL STATIONS - Radio City, Radio Mirchi
  // ============================================
  
  // Radio City - Rag Rag Mein Daude City (Verified Working)
  {
    id: "radio-city-hindi",
    name: "Radio City 91.1 Hindi",
    streamUrl: "http://prclive4.listenon.in/Hindi",
    website: "https://www.radiocity.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Pop",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/City-Hindi.webp",
  },
  {
    id: "radio-city-tamil",
    name: "Radio City 91.1 Tamil",
    streamUrl: "http://prclive4.listenon.in/Tamil",
    website: "https://www.radiocity.in/",
    country: "India",
    countryCode: "IN",
    language: "Tamil",
    genre: "Tamil Pop, Kollywood",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/City-Hindi.webp",
  },
  {
    id: "radio-city-kannada",
    name: "Radio City 91.1 Kannada",
    streamUrl: "http://prclive4.listenon.in/Kannada",
    website: "https://www.radiocity.in/",
    country: "India",
    countryCode: "IN",
    language: "Kannada",
    genre: "Kannada Pop, Sandalwood",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/City-Hindi.webp",
  },
  {
    id: "radio-city-punjabi",
    name: "Radio City 91.1 Punjabi",
    streamUrl: "http://prclive4.listenon.in/Punjabi",
    website: "https://www.radiocity.in/",
    country: "India",
    countryCode: "IN",
    language: "Punjabi",
    genre: "Punjabi Pop, Bhangra",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/City-Hindi.webp",
  },
  {
    id: "radio-city-main",
    name: "Radio City 91.1 FM",
    streamUrl: "http://prclive4.listenon.in:9960/",
    website: "https://www.radiocity.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Top Hits",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/City-Hindi.webp",
  },

  // Radio Mirchi - It's Hot! (Verified Working)
  {
    id: "radio-mirchi-chennai",
    name: "Radio Mirchi 98.3 Chennai",
    streamUrl: "http://radios.crabdance.com:8002/1",
    website: "https://www.radiomirchi.com/",
    country: "India",
    countryCode: "IN",
    language: "Tamil, Hindi",
    genre: "Bollywood, Tamil Hits",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/mirchi.webp",
  },

  // ============================================
  // ALL INDIA RADIO (AIR) - Government Stations
  // Verified working streams from Prasar Bharati CDN
  // ============================================
  {
    id: "air-vividh-bharati",
    name: "AIR Vividh Bharati",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8",
    website: "https://www.vividhbharti.org/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Golden Oldies",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/fmgold.webp",
  },
  {
    id: "air-raagam",
    name: "AIR FM Raagam",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio021/playlist.m3u8",
    website: "https://prasarbharati.gov.in/",
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
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Telugu, Hindi",
    genre: "Regional, News",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
  },
  {
    id: "air-west",
    name: "AIR Akashvani West",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio155/playlist.m3u8",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Gujarati, Hindi",
    genre: "Regional, News",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air-gujarati1.jpg",
  },
  {
    id: "air-primary-hindi",
    name: "AIR Primary Hindi",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio012/playlist.m3u8",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "News, Talk, Music",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
  },
  {
    id: "air-news-hindi",
    name: "AIR News Hindi",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio013/playlist.m3u8",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "News, Current Affairs",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
  },
  {
    id: "air-tamil",
    name: "AIR Akashvani Tamil",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio017/playlist.m3u8",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Tamil",
    genre: "Tamil Music, Classical",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air-tamil.jpg",
  },
  {
    id: "air-urdu",
    name: "AIR Akashvani Urdu",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio022/playlist.m3u8",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Urdu",
    genre: "Urdu Music, Ghazals",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
  },
  {
    id: "air-telugu",
    name: "AIR Akashvani Telugu",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio024/playlist.m3u8",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Telugu",
    genre: "Telugu Music, Classical",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air-telugu.jpg",
  },
  {
    id: "air-malayalam",
    name: "AIR Akashvani Malayalam",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio025/playlist.m3u8",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Malayalam",
    genre: "Malayalam Music, Classical",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/malayalam1.jpg",
  },
  {
    id: "air-kannada",
    name: "AIR Akashvani Kannada",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio031/playlist.m3u8",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Kannada",
    genre: "Kannada Music, Classical",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air-kannada.webp",
  },
  {
    id: "air-marathi",
    name: "AIR Akashvani Marathi",
    streamUrl: "http://air.pc.cdn.bitgravity.com/air/live/pbaudio034/playlist.m3u8",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Marathi",
    genre: "Marathi Music, Folk",
    bitrate: 96,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/marathi-mumbai-asmita.jpg",
  },

  // ============================================
  // ZENO.FM BOLLYWOOD STATIONS (Verified Working)
  // ============================================
  {
    id: "radio-choklate",
    name: "Radio Choklate 104 FM",
    streamUrl: "https://stream.zeno.fm/u9744afb8gruv",
    website: "https://radiochoklateonline.com/",
    country: "India",
    countryCode: "IN",
    language: "Odia, Hindi",
    genre: "Bollywood, Odia Music",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/choklate.webp",
  },
  {
    id: "ju-radio",
    name: "JU Radio 90.8 FM",
    streamUrl: "https://stream.zeno.fm/60ef4p33vxquv",
    website: "http://www.jaduniv.edu.in/radioju.php",
    country: "India",
    countryCode: "IN",
    language: "Bengali, Hindi",
    genre: "Community, Bollywood",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/hitsofbollywood.webp",
  },
  {
    id: "bollywood-dil-se",
    name: "Bollywood Dil Se",
    streamUrl: "https://stream.zeno.fm/0r0xa792kwzuv",
    website: "https://zeno.fm/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Romantic Bollywood",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/bollywooddilse.webp",
  },
  {
    id: "aap-ki-awaaz",
    name: "Aap Ki Awaaz 90.8 FM",
    streamUrl: "https://stream.zeno.fm/spm0t8gq45quv",
    website: "https://zeno.fm/",
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
    website: "https://zeno.fm/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Community",
    bitrate: 64,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
  },

  // ============================================
  // COMMUNITY & LOCAL FM STATIONS (Verified Working)
  // ============================================
  {
    id: "radio-gupshup",
    name: "Radio Gup Shup 94.3 FM",
    streamUrl: "http://103.95.48.18:8080/;",
    website: "https://gupshupradio.com/",
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
    website: "https://onlineradiofm.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Non-Stop Bollywood",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/nonstophindi.webp",
  },
  {
    id: "radio-ala",
    name: "Radio Ala 90.8 FM",
    streamUrl: "http://mahi.radioca.st/live",
    website: "https://zeno.fm/",
    country: "India",
    countryCode: "IN",
    language: "Telugu",
    genre: "Telugu Music, Community",
    bitrate: 64,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
  },
  {
    id: "radio-kissan",
    name: "Radio Kissan 90.8 FM",
    streamUrl: "http://radiosavre.com:8000/radio.mp3",
    website: "https://zeno.fm/",
    country: "India",
    countryCode: "IN",
    language: "Odia",
    genre: "Agricultural, Community",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
  },
  {
    id: "radio-azad-hind",
    name: "Radio Azad Hind 90.8 FM",
    streamUrl: "https://edge.mixlr.com/channel/uaphi",
    website: "https://radio-azad-hind.mixlr.com/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Community Radio",
    bitrate: 128,
    favicon: "https://onlineradiofm.in/assets/image/radio/100/air_live.webp",
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
