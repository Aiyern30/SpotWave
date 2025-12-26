"use client";

import ProfileComponent from "./Profile";
import PublicLibrary from "./PublicLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import FollowingArtists from "./FollowingArtists";

const Profile = () => {
  return (
    <div className="space-y-6">
      <ProfileComponent />

      <Tabs defaultValue="My Library" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-zinc-800/50 p-1 rounded-lg">
          <TabsTrigger
            value="My Library"
            className="data-[state=active]:bg-green-500 data-[state=active]:text-black text-zinc-400 hover:text-white transition-colors px-6 py-2 rounded-md font-medium"
          >
            My Library
          </TabsTrigger>
          <TabsTrigger
            value="Following Artists"
            className="data-[state=active]:bg-green-500 data-[state=active]:text-black text-zinc-400 hover:text-white transition-colors px-6 py-2 rounded-md font-medium"
          >
            Following Artists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="My Library" className="mt-6">
          <PublicLibrary />
        </TabsContent>

        <TabsContent value="Following Artists" className="mt-6">
          <FollowingArtists />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
