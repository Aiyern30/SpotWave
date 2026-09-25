/** Shared browser session for the PKCE login and Spotify Web Playback SDK. */
export const SESSION_CHANGED = "spotify-session-changed";
export const SESSION_EXPIRED = "spotify-session-expired";
let refreshing: Promise<string> | null = null;

export function saveSpotifySession(data: { access_token: string; refresh_token?: string; expires_in: number }) {
  localStorage.setItem("Token", data.access_token);
  if (data.refresh_token) localStorage.setItem("RefreshToken", data.refresh_token);
  localStorage.setItem("TokenExpiresAt", String(Date.now() + data.expires_in * 1000));
  window.dispatchEvent(new Event(SESSION_CHANGED));
}
export function clearSpotifySession() {
  for (const key of ["Token", "RefreshToken", "TokenExpiresAt"]) localStorage.removeItem(key);
  window.dispatchEvent(new Event(SESSION_CHANGED));
}
function expired(): never {
  clearSpotifySession();
  window.dispatchEvent(new Event(SESSION_EXPIRED));
  throw new Error("Spotify authorization required");
}
export async function getSpotifyToken(force = false): Promise<string> {
  const token = localStorage.getItem("Token");
  const expiry = Number(localStorage.getItem("TokenExpiresAt"));
  if (!force && token && expiry > Date.now() + 60_000) return token;
  if (refreshing) return refreshing;
  const refreshToken = localStorage.getItem("RefreshToken");
  if (!refreshToken) {
    // Older sessions without expiry metadata are validated by the API guard.
    if (!force && token && !expiry) return token;
    return expired();
  }
  const task = async () => {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken,
        client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "" }),
    });
    const data = await response.json();
    // A logout/new login while refreshing must not resurrect the old session.
    if (localStorage.getItem("RefreshToken") !== refreshToken) throw new Error("Session changed");
    if (!response.ok) {
      if (data.error === "invalid_grant") return expired();
      throw new Error("Spotify renewal temporarily unavailable");
    }
    if (typeof data.access_token !== "string" || !(data.expires_in > 0)) throw new Error("Invalid Spotify token response");
    saveSpotifySession(data);
    return data.access_token as string;
  };
  refreshing = task().finally(() => { refreshing = null; });
  return refreshing;
}

/** Cover existing Spotify callers, including components holding an older token. */
export function installSpotifyFetchGuard() {
  const original = window.fetch;
  const guarded: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    if (url.origin !== "https://api.spotify.com") return original(input, init);
    const request = new Request(input, init);
    const send = (token: string) => {
      const headers = new Headers(request.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return original(new Request(request.clone(), { headers }));
    };
    const token = await getSpotifyToken();
    let response = await send(token);
    if (response.status === 401) {
      const current = localStorage.getItem("Token");
      const fresh = current && current !== token ? current : await getSpotifyToken(true);
      response = await send(fresh);
      if (response.status === 401) expired();
    }
    return response;
  };
  window.fetch = guarded;
  return () => { if (window.fetch === guarded) window.fetch = original; };
}
