"use client";

import Header from "@/components/Header";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ProfileComponent from "./Profile";
import PublicLibrary from "./PublicLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import FollowingArtists from "./FollowingArtists";

const Profile = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1 transition-all ml-16 duration-300 ${
          sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
        }`}
      >
        <div className="p-4 space-y-6">
          <Header />
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
      </div>
    </div>
  );
};

export default Profile;
