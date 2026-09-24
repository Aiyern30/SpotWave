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

/** Transfer the existing session, never start the track again with /play. */
export async function transferSpotifySession(device: SpotifyDevice) {
  if (!device.id || device.is_restricted) throw new Error("Spotify does not allow playback control on this device.");
  const readState = async () => {
    const response = await deviceRequest("");
    return response.status === 204 ? null : response.json();
  };
  const before = await readState();
  if (before?.device?.id === device.id) return;
  const started = Date.now();
  // Continue the existing session on the destination without sending a new track URI.
  await transferToSpotifyDevice(device, true);
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const after = await readState();
    if (after?.device?.id !== device.id) continue;
    if (before?.item?.uri && after.item?.uri === before.item.uri &&
        typeof before.progress_ms === "number" && typeof after.progress_ms === "number" &&
        after.progress_ms + 3000 < before.progress_ms) {
      const elapsed = before.is_playing ? Date.now() - started : 0;
      const position = Math.max(0, Math.min(before.item.duration_ms - 1, before.progress_ms + elapsed));
      if (Number.isFinite(position)) {
        await deviceRequest(`/seek?position_ms=${Math.round(position)}&device_id=${encodeURIComponent(device.id)}`, { method: "PUT" });
      }
    }
    return;
  }
  throw new Error("Spotify has not confirmed the switch yet. Refresh the device list to check before trying again.");
}
