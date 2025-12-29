"use client";

import ProfileComponent from "./Profile";
import PublicLibrary from "./PublicLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import FollowingArtists from "./FollowingArtists";
import SavedAlbums from "./SavedAlbums";

const Profile = () => {
  return (
    <div className="space-y-6">
      <ProfileComponent />

      <Tabs defaultValue="My Library" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-zinc-800/50 p-1 rounded-lg">
          <TabsTrigger
            value="My Library"
            className="data-[state=active]:bg-brand data-[state=active]:text-brand-foreground text-zinc-400 hover:text-white transition-colors px-6 py-2 rounded-md font-medium"
          >
            Playlists
          </TabsTrigger>
          <TabsTrigger
            value="Saved Albums"
            className="data-[state=active]:bg-brand data-[state=active]:text-brand-foreground text-zinc-400 hover:text-white transition-colors px-6 py-2 rounded-md font-medium"
          >
            Saved Albums
          </TabsTrigger>
          <TabsTrigger
            value="Following Artists"
            className="data-[state=active]:bg-brand data-[state=active]:text-brand-foreground text-zinc-400 hover:text-white transition-colors px-6 py-2 rounded-md font-medium"
          >
            Following Artists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="My Library" className="mt-6">
          <PublicLibrary />
        </TabsContent>

        <TabsContent value="Saved Albums" className="mt-6">
          <SavedAlbums />
        </TabsContent>

        <TabsContent value="Following Artists" className="mt-6">
          <FollowingArtists />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
