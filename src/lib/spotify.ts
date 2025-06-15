const BASE_URL = "https://api.spotify.com/v1";

const getAccessToken = () => {
  // You should use your own access token mechanism (auth context, cookie, etc.)
  return localStorage.getItem("spotify_access_token") || "";
};

export async function checkUserSavedTracks(ids: string[]) {
  const res = await fetch(
    `${BASE_URL}/me/tracks/contains?ids=${ids.join(",")}`,
    {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to check saved tracks");
  return res.json() as Promise<boolean[]>;
}

export async function saveTracksForUser(ids: string[]) {
  const res = await fetch(`${BASE_URL}/me/tracks`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to save tracks");
}

export async function removeTracksFromUser(ids: string[]) {
  const res = await fetch(`${BASE_URL}/me/tracks`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to remove tracks");
}
