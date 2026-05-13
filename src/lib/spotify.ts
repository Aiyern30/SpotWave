// Spotify API functions for saving/checking tracks

/**
 * Check if tracks are saved in user's library
 * @param trackIds - Array of Spotify track IDs
 * @returns Array of booleans indicating if each track is saved
 */
export const checkUserSavedTracks = async (
  trackIds: string[]
): Promise<boolean[]> => {
  // Simple in-memory cache with TTL and request de-duplication to avoid
  // repeatedly hitting Spotify for the same ids when multiple components
  // render at once. Cache lives for the lifetime of the page.
  const TTL_MS = 60 * 1000; // 60 seconds

  // Module-level caches (created on first invocation)
  if (!(globalThis as any).__spotify_saved_cache) {
    (globalThis as any).__spotify_saved_cache = new Map<string, { value: boolean; ts: number }>();
    (globalThis as any).__spotify_pending = new Map<string, Promise<boolean>>();
  }

  const cache: Map<string, { value: boolean; ts: number }> = (globalThis as any).__spotify_saved_cache;
  const pending: Map<string, Promise<boolean>> = (globalThis as any).__spotify_pending;

  try {
    const now = Date.now();
    const results: boolean[] = [];

    // Determine which ids we need to fetch
    const idsToFetch: string[] = [];
    const waitPromises: Promise<void>[] = [];

    for (const id of trackIds) {
      const cached = cache.get(id);
      if (cached && now - cached.ts < TTL_MS) {
        results.push(cached.value);
        continue;
      }

      // If there's already a pending request for this id, wait for it
      const p = pending.get(id);
      if (p) {
        // push a promise that fills in later
        const wait = p.then((val) => {
          results.push(val);
        });
        waitPromises.push(wait);
        continue;
      }

      // Mark to fetch
      idsToFetch.push(id);
    }

    // If there are ids to fetch, batch them (max 50 per Spotify API)
    if (idsToFetch.length > 0) {
      const accessToken = await getAccessToken();
      const batches: string[][] = [];
      for (let i = 0; i < idsToFetch.length; i += 50) {
        batches.push(idsToFetch.slice(i, i + 50));
      }

      for (const batch of batches) {
        const batchKeyPromises: Array<{ id: string; resolve: (v: boolean) => void; reject: (e: any) => void }> = [];

        // create individual promises and store in pending map so other callers can join
        for (const id of batch) {
          let resolver: (v: boolean) => void;
          let rejecter: (e: any) => void;
          const p = new Promise<boolean>((res, rej) => {
            resolver = res;
            rejecter = rej;
          }) as Promise<boolean>;
          // @ts-ignore
          pending.set(id, p);
          batchKeyPromises.push({ id, resolve: resolver!, reject: rejecter! });
        }

        const idsParam = batch.join(",");
        const response = await fetch(
          `https://api.spotify.com/v1/me/tracks/contains?ids=${idsParam}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          // reject all pending for this batch
          for (const { id, reject } of batchKeyPromises) {
            pending.delete(id);
            reject(new Error(`Failed to check saved tracks: ${response.status} ${response.statusText} - ${errText}`));
          }
          continue;
        }

        const data: boolean[] = await response.json();

        // store results in cache and resolve pending
        for (let i = 0; i < batch.length; i++) {
          const id = batch[i];
          const val = !!data[i];
          cache.set(id, { value: val, ts: Date.now() });
          const p = pending.get(id);
          if (p) {
            pending.delete(id);
            // resolve the promise stored earlier
            (p as any).then = undefined; // no-op to appease TS (we will call resolver directly)
          }
          // call the resolver that we saved earlier
          try {
            batchKeyPromises[i].resolve(val);
          } catch (e) {
            // ignore resolver errors
          }
        }
      }
    }

    // If we had any waits for pending promises, await them so results are filled
    if (waitPromises.length > 0) await Promise.all(waitPromises);

    // Build final results array from cache (respecting input order)
    for (const id of trackIds) {
      const c = cache.get(id);
      if (c) results.push(c.value);
      else results.push(false);
    }

    return results.slice(0, trackIds.length);
  } catch (error: any) {
    console.warn("⚠️ Spotify API Error (Check Saved Tracks):", error?.message || error);
    return trackIds.map(() => false);
  }
};

/**
 * Save tracks to user's library
 * @param trackIds - Array of Spotify track IDs to save
 */
export const saveTracksForUser = async (trackIds: string[]): Promise<void> => {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch("https://api.spotify.com/v1/me/tracks", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: trackIds }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to save tracks: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error("Error saving tracks:", error);
    throw new Error("Failed to save tracks");
  }
};

/**
 * Remove tracks from user's library
 * @param trackIds - Array of Spotify track IDs to remove
 */
export const removeTracksFromUser = async (
  trackIds: string[]
): Promise<void> => {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch("https://api.spotify.com/v1/me/tracks", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: trackIds }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to remove tracks: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error("Error removing tracks:", error);
    throw new Error("Failed to remove tracks");
  }
};

// Placeholder - replace with your actual token retrieval function
async function getAccessToken(): Promise<string> {
  const token = localStorage.getItem("Token");

  if (!token) {
    console.error("No access token found.");
    throw new Error("No access token found");
  }

  return token;
}
