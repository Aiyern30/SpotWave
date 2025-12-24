"use client";

import React, { useState } from "react";
import {
  Search,
  ListMusic,
  ArrowLeft,
  RefreshCw,
  Globe,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PlaylistQuizPage = () => {
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");

  const playlists = [
    {
      title: "David Tao | 必聽精選",
      subtitle: "By Topsify Taiwan",
      color: "from-zinc-700 to-black",
    },
    {
      title: "我們都要好好過",
      subtitle: "By Spotify",
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "CHASE ATLANTIC",
      subtitle: "By DRose25",
      color: "from-red-900 to-black",
    },
    {
      title: "Jay Chou, Eric Chou...",
      subtitle: "By Hermond Cheng",
      color: "from-gray-700 to-gray-900",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-black/50 p-6 md:p-12 space-y-8">
      <Link
        href="/Games"
        className="text-zinc-400 hover:text-white flex items-center gap-2 w-fit transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Games
      </Link>

      <div className="max-w-5xl mx-auto w-full space-y-10">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">
              Select Your Playlist
            </h1>
            <p className="text-zinc-400 text-lg">
              Search for playlists or explore our recommendations.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-zinc-900/80 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all",
                  activeTab === "all"
                    ? "bg-green-500 text-black shadow-lg"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Globe className="w-4 h-4" />
                All Playlists
              </button>
              <button
                onClick={() => setActiveTab("my")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all",
                  activeTab === "my"
                    ? "bg-green-500 text-black shadow-lg"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <User className="w-4 h-4" />
                My Playlists
              </button>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <Input
            placeholder="Search for playlists..."
            className="w-full h-14 pl-12 bg-zinc-900/50 border-zinc-700 text-lg text-white rounded-xl focus-visible:ring-green-500 placeholder:text-zinc-500"
          />
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xl font-semibold text-white">
            <ListMusic className="w-6 h-6 text-green-500" />
            <h2>Recommended Playlists</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {playlists.map((playlist, i) => (
              <Card
                key={i}
                className="bg-zinc-800/40 border-zinc-800 overflow-hidden hover:bg-zinc-800 transition-all cursor-pointer group"
              >
                <CardContent className="p-0">
                  <div
                    className={`aspect-square w-full bg-gradient-to-br ${playlist.color} relative group-hover:scale-105 transition-transform duration-500`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ListMusic className="w-16 h-16 text-white/20" />
                    </div>
                  </div>
                  <div className="p-4 space-y-1">
                    <h3 className="font-bold text-white truncate">
                      {playlist.title}
                    </h3>
                    <p className="text-sm text-zinc-400 line-clamp-1">
                      {playlist.subtitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center pt-8">
            <Button
              variant="outline"
              className="border-green-900 text-green-500 hover:bg-green-900/20 hover:text-green-400"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Get New Suggestions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistQuizPage;
