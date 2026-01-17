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
  {
    id: "air-vividh-bharati",
    name: "AIR Vividh Bharati",
    streamUrl: "https://vividhbharati-lh.akamaihd.net/i/vividhbharati_1@507811/index_1_a-p.m3u8?sd=10&rebase=on",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Hindi Film Songs",
    bitrate: 96,
    favicon: "https://prasarbharati.gov.in/wp-content/uploads/2021/06/air-logo.png",
  },
  {
    id: "air-fm-gold",
    name: "AIR FM Gold",
    streamUrl: "http://airfmgold-lh.akamaihd.net/i/fmgold_1@507591/master.m3u8",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Golden Oldies, Classic",
    bitrate: 96,
    favicon: "https://prasarbharati.gov.in/wp-content/uploads/2021/06/air-logo.png",
  },
  {
    id: "air-fm-rainbow",
    name: "AIR FM Rainbow",
    streamUrl: "https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio00464kbps/hlspbaudio00464kbps.m3u8",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi, English",
    genre: "Contemporary, Youth",
    bitrate: 64,
    favicon: "https://prasarbharati.gov.in/wp-content/uploads/2021/06/air-logo.png",
  },
  {
    id: "air-raagam",
    name: "AIR Raagam",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio021/playlist.m3u8",
    website: "https://prasarbharati.gov.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Indian Classical",
    bitrate: 80,
    favicon: "https://prasarbharati.gov.in/wp-content/uploads/2021/06/air-logo.png",
  },

  // Radio Mirchi - India's #1 Hit Hindi Music Station
  {
    id: "radio-mirchi",
    name: "Radio Mirchi 98.3",
    streamUrl: "http://peridot.streamguys.com:7150/Mirchi",
    website: "https://www.radiomirchi.com/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood Hits, Pop",
    bitrate: 128,
    favicon: "https://www.radiomirchi.com/favicon.ico",
  },
  {
    id: "radio-mirchi-love",
    name: "Radio Mirchi Love",
    streamUrl: "https://mirchimahfil-lh.akamaihd.net/i/MirchiMehfl_1@120798/index_1_a-b.m3u8",
    website: "https://www.radiomirchi.com/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Romantic, Ghazals",
    bitrate: 96,
    favicon: "https://www.radiomirchi.com/favicon.ico",
  },

  // Radio City - Rag Rag Mein Daude City
  {
    id: "radio-city-hindi",
    name: "Radio City Hindi",
    streamUrl: "http://prclive4.listenon.in/Hindi",
    website: "https://www.radiocity.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Pop",
    bitrate: 128,
    favicon: "https://www.radiocity.in/favicon.ico",
  },
  {
    id: "radio-city-91-1",
    name: "Radio City 91.1 FM",
    streamUrl: "http://prclive1.listenon.in:9960/",
    website: "https://www.radiocity.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Hits",
    bitrate: 128,
    favicon: "https://www.radiocity.in/favicon.ico",
  },
  {
    id: "radio-city-lata",
    name: "Radio City Lata Mangeshkar",
    streamUrl: "http://prclive1.listenon.in:8832/",
    website: "https://www.radiocity.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Lata Mangeshkar Hits",
    bitrate: 128,
    favicon: "https://www.radiocity.in/favicon.ico",
  },
  {
    id: "radio-city-asha",
    name: "Radio City Asha Bhosle",
    streamUrl: "http://prclive1.listenon.in:8812/",
    website: "https://www.radiocity.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Asha Bhosle Hits",
    bitrate: 128,
    favicon: "https://www.radiocity.in/favicon.ico",
  },
  {
    id: "radio-city-rafi",
    name: "Radio City Mohammed Rafi",
    streamUrl: "http://prclive1.listenon.in:8814/",
    website: "https://www.radiocity.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Mohammed Rafi Classics",
    bitrate: 128,
    favicon: "https://www.radiocity.in/favicon.ico",
  },
  {
    id: "radio-city-kishore",
    name: "Radio City Kishore Kumar",
    streamUrl: "http://prclive1.listenon.in:8834/",
    website: "https://www.radiocity.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Kishore Kumar Classics",
    bitrate: 128,
    favicon: "https://www.radiocity.in/favicon.ico",
  },
  {
    id: "radio-city-mukesh",
    name: "Radio City Mukesh",
    streamUrl: "http://prclive1.listenon.in:9308/",
    website: "https://www.radiocity.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Mukesh Classics",
    bitrate: 128,
    favicon: "https://www.radiocity.in/favicon.ico",
  },

  // Radio Hungama - Bollywood Music Network
  {
    id: "hungama-bollywood-dil-se",
    name: "Hungama Bollywood Dil Se",
    streamUrl: "http://103.16.47.70:7333/",
    website: "https://www.hungama.com/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Romantic",
    bitrate: 128,
    favicon: "https://www.hungama.com/favicon.ico",
  },
  {
    id: "hungama-hot-now",
    name: "Hungama Hot Now Bollywood",
    streamUrl: "http://103.16.47.70:7222/",
    website: "https://www.hungama.com/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Latest Bollywood Hits",
    bitrate: 128,
    favicon: "https://www.hungama.com/favicon.ico",
  },
  {
    id: "hungama-evergreen",
    name: "Hungama Evergreen Bollywood",
    streamUrl: "http://103.16.47.70:7666/",
    website: "https://www.hungama.com/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Classic Bollywood",
    bitrate: 128,
    favicon: "https://www.hungama.com/favicon.ico",
  },
  {
    id: "hungama-90s",
    name: "Hungama 90s Once Again",
    streamUrl: "http://103.16.47.70:7444/",
    website: "https://www.hungama.com/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "90s Bollywood",
    bitrate: 128,
    favicon: "https://www.hungama.com/favicon.ico",
  },
  {
    id: "hungama-punjabi",
    name: "Hungama Punjabi Hits",
    streamUrl: "http://103.16.47.70:9888/",
    website: "https://www.hungama.com/",
    country: "India",
    countryCode: "IN",
    language: "Punjabi",
    genre: "Punjabi, Bhangra",
    bitrate: 128,
    favicon: "https://www.hungama.com/favicon.ico",
  },
  {
    id: "hungama-dance-masti",
    name: "Hungama Dance Masti",
    streamUrl: "http://103.16.47.70:9222/",
    website: "https://www.hungama.com/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Dance, Party",
    bitrate: 128,
    favicon: "https://www.hungama.com/favicon.ico",
  },
  {
    id: "hungama-ghazals",
    name: "Hungama Best of Ghazals",
    streamUrl: "http://103.16.47.70:9666/",
    website: "https://www.hungama.com/",
    country: "India",
    countryCode: "IN",
    language: "Hindi, Urdu",
    genre: "Ghazals",
    bitrate: 128,
    favicon: "https://www.hungama.com/favicon.ico",
  },

  // Big FM
  {
    id: "big-fm-927",
    name: "Big FM 92.7",
    streamUrl: "http://sc-bb.1.fm:8017/",
    website: "https://www.bigfmindia.com/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Pop",
    bitrate: 128,
    favicon: "https://www.bigfmindia.com/favicon.ico",
  },

  // Artist-Specific Stations
  {
    id: "arijit-singh-radio",
    name: "Arijit Singh Radio",
    streamUrl: "http://southradios.net:9090/arijitsinghradio",
    website: "https://radioindia.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Arijit Singh Hits",
    bitrate: 128,
    favicon: "https://radioindia.in/favicon.ico",
  },
  {
    id: "udit-narayan-radio",
    name: "Udit Narayan Radio",
    streamUrl: "http://192.227.116.104:4182/autodj",
    website: "https://radioindia.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Udit Narayan Hits",
    bitrate: 128,
    favicon: "https://radioindia.in/favicon.ico",
  },

  // Other Popular Indian Stations
  {
    id: "radio-gupshup",
    name: "Radio Gup Shup 94.3",
    streamUrl: "http://103.95.48.18:8080/;",
    website: "https://gupshupradio.com/",
    country: "India",
    countryCode: "IN",
    language: "Hindi, Assamese",
    genre: "Local, Music",
    bitrate: 96,
    favicon: "https://gupshupradio.com/favicon.ico",
  },
  {
    id: "non-stop-hindi",
    name: "Non Stop Hindi Radio",
    streamUrl: "http://198.178.123.14:8216/",
    website: "https://radioindia.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Non-Stop Hindi Music",
    bitrate: 128,
    favicon: "https://radioindia.in/favicon.ico",
  },
  {
    id: "retro-bollywood",
    name: "Retro Bollywood",
    streamUrl: "http://64.71.79.181:5124/",
    website: "https://radioindia.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Retro, Classic Bollywood",
    bitrate: 128,
    favicon: "https://radioindia.in/favicon.ico",
  },
  {
    id: "hits-of-bollywood",
    name: "Hits of Bollywood",
    streamUrl: "http://50.7.77.115:8174/",
    website: "https://radioindia.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood Hits",
    bitrate: 128,
    favicon: "https://radioindia.in/favicon.ico",
  },
  {
    id: "radio-choklate",
    name: "Radio Choklate 104 FM",
    streamUrl: "https://stream.zeno.fm/u9744afb8gruv",
    website: "https://radiochoklateonline.com/",
    country: "India",
    countryCode: "IN",
    language: "Odia, Hindi",
    genre: "Bollywood, Odia",
    bitrate: 128,
    favicon: "https://radiochoklateonline.com/favicon.ico",
  },
  {
    id: "radio-desi-music",
    name: "Desi Music Mix",
    streamUrl: "http://66.23.234.242:8012/",
    website: "https://radioindia.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Desi, Bollywood Mix",
    bitrate: 128,
    favicon: "https://radioindia.in/favicon.ico",
  },
  {
    id: "my-masti-radio",
    name: "My Masti Radio",
    streamUrl: "http://144.217.203.184:9056/",
    website: "https://radioindia.in/",
    country: "India",
    countryCode: "IN",
    language: "Hindi",
    genre: "Bollywood, Entertainment",
    bitrate: 128,
    favicon: "https://radioindia.in/favicon.ico",
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
