export type SpotifyDevice = {
  id: string | null;
  name: string;
  type: string;
  is_active: boolean;
  is_restricted: boolean;
  supports_volume?: boolean;
};

async function deviceRequest(path: string, init?: RequestInit) {
  const token = localStorage.getItem("Token");
  if (!token) throw new Error("Sign in to Spotify again to manage devices.");
  const response = await fetch(`https://api.spotify.com/v1/me/player${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "Your Spotify session expired. Sign in again.",
      403: "Spotify denied access. Check your Premium subscription and reconnect your account to grant playback permissions.",
      404: "This device is no longer available. Open Spotify on it and refresh the list.",
      429: "Spotify is receiving too many requests. Wait a moment, then refresh.",
    };
    throw new Error(messages[response.status] || "Could not connect to Spotify. Please try again.");
  }
  return response;
}

export async function getSpotifyDevices(signal?: AbortSignal): Promise<SpotifyDevice[]> {
  const response = await deviceRequest("/devices", { signal });
  return (await response.json()).devices || [];
}

export async function transferToSpotifyDevice(device: SpotifyDevice, playing: boolean) {
  if (!device.id || device.is_restricted) throw new Error("Spotify does not allow playback control on this device.");
  await deviceRequest("", { method: "PUT", body: JSON.stringify({ device_ids: [device.id], play: playing }) });
}
