"use client";
import ViewSelector from "@/components/ViewSelector";
import { useCollectionView } from "@/hooks/useCollectionView";
import { useEffect, useState, useCallback } from "react";
import HomeMediaCard from "@/components/HomeMediaCard";
import { Button } from "@/components/ui/";
import { mediaGridClass, MediaGridSkeleton } from "@/components/MediaGrid";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, Music } from "lucide-react";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { CreatePlaylist } from "@/utils/createPlaylist";
import { fetchSpotifyPlaylists } from "@/utils/fetchAllPlaylist";
import { fetchBrowseCategories } from "@/utils/fetchCategories";
import { usePlayer } from "@/contexts/PlayerContext";

type PlaylistsProps = {
  id: string;
  image: string;
  title: string;
  description: string;
};

type CategoryProps = {
  id: string;
  name: string;
  icons: { url: string }[];
};

type UserProfile = {
  id: string;
  display_name: string;
  images: { url: string }[];
};

const Page = () => {
  const [view, setView] = useCollectionView("spotwave:view:home", ["Grid", "List"] as const, "Grid");
  const [token, setToken] = useState<string>("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistsProps[]>([]);
  const [categories, setCategories] = useState<CategoryProps[]>([]);

  const [loadingPlaylists, setLoadingPlaylists] = useState<boolean>(true);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);

  const [playlistError, setPlaylistError] = useState("");
  const [createError, setCreateError] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  const [creating, setCreating] = useState<boolean>(false);
  const [currentPlaylistUri, setCurrentPlaylistUri] = useState<string | null>(
    null
  );

  const router = useRouter();
  const { playPlaylist, pauseTrack, resumeTrack, currentTrack, isPlaying } =
    usePlayer();

  const handleFetchUserProfile = useCallback(async () => {
    const profile = await fetchUserProfile(token);
    if (profile) {
      setUserProfile(profile);
    }
  }, [token]);

  const userID = userProfile?.id || "";

  // Fetch Playlists
  const handleFetchAllProfilePlaylist = useCallback(async () => {
    setLoadingPlaylists(true);
    setPlaylistError("");
    const data = await fetchSpotifyPlaylists(token);
    if (data) {
      const formattedPlaylists = data.filter((playlist) => playlist?.id).map((playlist) => ({
        id: playlist?.id,
        image: playlist?.images?.[0]?.url || "",
        title: playlist?.name || "",
        description: playlist?.description || "",
      }));
      setPlaylists(formattedPlaylists);
    } else {
      setPlaylistError("Your playlists could not be loaded. Please try again.");
    }
    setLoadingPlaylists(false);
  }, [token]);

  // Fetch Categories
  const handleFetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    const data = await fetchBrowseCategories(token);
    if (data) {
      setCategories(data.slice(0, 8)); // Show first 8 categories
    }
    setLoadingCategories(false);
  }, [token]);

  const handleCreatePlaylist = async () => {
    if (creating || !userID) return;
    setCreateError("");
    setCreating(true);
    const playlistResponse = await CreatePlaylist(userID, token);
    if (playlistResponse) {
      await handleFetchAllProfilePlaylist();
    } else {
      setCreateError("Playlist could not be created. Please try again.");
    }
    setCreating(false);
  };

  const handlePlayPlaylist = useCallback(
    async (playlistId?: string) => {
      if (!playlistId) return;
      const playlistUri = `spotify:playlist:${playlistId}`;
      if (currentPlaylistUri === playlistUri) {
        if (isPlaying) {
          pauseTrack();
        } else {
          resumeTrack();
        }
      } else {
        try {
          playPlaylist(playlistUri);
          setCurrentPlaylistUri(playlistUri);
        } catch (error) {
          console.error("Error playing playlist:", error);
        }
      }
    },
    [playPlaylist, pauseTrack, resumeTrack, currentPlaylistUri, isPlaying]
  );

  useEffect(() => {
    if (currentTrack?.uri) {
      const contextUri = currentTrack.uri.split(":").slice(0, 3).join(":");
      if (contextUri.startsWith("spotify:playlist:")) {
        setCurrentPlaylistUri(contextUri);
      }
    }
  }, [currentTrack]);

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    } else {
      setSignedOut(true);
      setLoadingPlaylists(false);
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      handleFetchUserProfile();
      handleFetchAllProfilePlaylist();
      handleFetchCategories();
    }
  }, [
    token,
    handleFetchUserProfile,
    handleFetchAllProfilePlaylist,
    handleFetchCategories,
  ]);

  if (signedOut) return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-zinc-100">
      <h1 className="text-2xl font-semibold">Your music starts here</h1>
      <p className="mt-2 text-zinc-400">Sign in to see your playlists and discover something new.</p>
      <Button className="mt-6" onClick={() => router.push("/")}>Sign in</Button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-10 pb-10 sm:space-y-12">
      <div className="flex justify-end"><ViewSelector value={view} onChange={setView} options={["Grid", "List"]} label="Home collection view" /></div>
      <section aria-labelledby="playlists-heading" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 id="playlists-heading" className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Your Playlists</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              {loadingPlaylists ? "Getting your music ready" : `${playlists.length} playlist${playlists.length !== 1 ? "s" : ""} in your collection`}
            </p>
          </div>
          <Button onClick={handleCreatePlaylist} disabled={creating || !userID} className="h-10 shrink-0 gap-2 whitespace-nowrap rounded-full bg-brand px-4 text-brand-foreground hover:bg-brand/90 active:scale-[0.98]">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {creating ? "Creating..." : "Create Playlist"}
          </Button>
        </div>
        {createError && <p role="alert" className="text-sm text-red-300">{createError}</p>}
        {loadingPlaylists ? <MediaGridSkeleton view={view} /> : playlistError ? (
          <div role="alert" className="rounded-xl border border-zinc-800 p-6 text-zinc-300">
            <p>{playlistError}</p>
            <Button variant="outline" className="mt-4" onClick={handleFetchAllProfilePlaylist}>Try again</Button>
          </div>
        ) : playlists.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-12 text-center">
            <Music className="mx-auto mb-4 h-8 w-8 text-brand" aria-hidden="true" />
            <h2 className="font-semibold text-zinc-100">Make room for your favorites</h2>
            <p className="mt-2 text-sm text-zinc-400">Create your first playlist using the button above.</p>
          </div>
        ) : (
          <div className={view === "Grid" ? mediaGridClass : "space-y-2"}>
            {playlists.map((playlist) => (
              <HomeMediaCard view={view} key={playlist.id} title={playlist.title} image={playlist.image}
                subtitle={playlist.description || "Playlist"}
                href={`/Playlists/${playlist.id}?name=${encodeURIComponent(playlist.title)}`}
                isPlaying={currentPlaylistUri === `spotify:playlist:${playlist.id}` && isPlaying}
                onPlay={() => handlePlayPlaylist(playlist.id)} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="categories-heading" className="space-y-5 border-t border-zinc-800/70 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="categories-heading" className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">Browse Categories</h2>
            <p className="mt-1.5 text-sm text-zinc-400">Find a sound for whatever comes next.</p>
          </div>
          <Button variant="ghost" className="shrink-0 gap-2 whitespace-nowrap rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100" onClick={() => router.push("/Categories")}>
            See All <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        {loadingCategories ? <MediaGridSkeleton view={view} /> : categories.length ? (
          <div className={view === "Grid" ? mediaGridClass : "space-y-2"}>
            {categories.map((category) => (
              <HomeMediaCard view={view} key={category.id} title={category.name} subtitle="Explore category"
                image={category.icons?.[0]?.url || ""}
                href={`/Categories/${category.id}?name=${encodeURIComponent(category.name)}`} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 p-6 text-sm text-zinc-400">
            <p>No categories are available right now.</p>
            <Button variant="outline" className="mt-4" onClick={handleFetchCategories}>Try again</Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Page;
