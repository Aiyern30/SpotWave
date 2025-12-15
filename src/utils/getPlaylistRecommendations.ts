// Add this list (from Spotify docs, partial for brevity; use the full list in production)
const SPOTIFY_SEED_GENRES = [
  "acoustic","afrobeat","alt-rock","alternative","ambient","anime","black-metal","bluegrass","blues","bossanova","brazil","breakbeat","british","cantopop","chicago-house","children","chill","classical","club","comedy","country","dance","dancehall","death-metal","deep-house","detroit-techno","disco","disney","drum-and-bass","dub","dubstep","edm","electro","electronic","emo","folk","forro","french","funk","garage","german","gospel","goth","grindcore","groove","grunge","guitar","happy","hard-rock","hardcore","hardstyle","heavy-metal","hip-hop","holidays","honky-tonk","house","idm","indian","indie","indie-pop","industrial","iranian","j-dance","j-idol","j-pop","j-rock","jazz","k-pop","kids","latin","latino","malay","mandopop","metal","metal-misc","metalcore","minimal-techno","movies","mpb","new-age","new-release","opera","pagode","party","philippines-opm","piano","pop","pop-film","post-dubstep","power-pop","progressive-house","psych-rock","punk","punk-rock","r-n-b","rainy-day","reggae","reggaeton","road-trip","rock","rock-n-roll","rockabilly","romance","sad","salsa","samba","sertanejo","show-tunes","singer-songwriter","ska","sleep","songwriter","soul","soundtracks","spanish","study","summer","swedish","synth-pop","tango","techno","trance","trip-hop","turkish","work-out","world-music"
];

export async function getPlaylistRecommendations(genres: string[], token: string) {
  // Only use valid Spotify seed genres
  const validGenres = genres.filter(g =>
    SPOTIFY_SEED_GENRES.includes(g.toLowerCase().replace(/\s+/g, "-"))
  );
  if (!validGenres.length) return [];
  const params = new URLSearchParams({
    seed_genres: validGenres.slice(0, 2).join(","),
    limit: "10",
  });
  const response = await fetch(
    `https://api.spotify.com/v1/recommendations?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    // Optionally log error or return []
    return [];
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return [];
  }
  return data.tracks || [];
}
