"use client";

import React from "react";
import { Search, User, ArrowLeft, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

const ArtistQuizPage = () => {
  const artists = [
    {
      name: "David Tao",
      followers: "1,153,725",
      color: "from-orange-700 to-red-900",
    },
    { name: "TINY 7", followers: "10,096", color: "from-blue-700 to-cyan-900" },
    {
      name: "Gareth.T",
      followers: "189,265",
      color: "from-amber-700 to-yellow-900",
    },
    {
      name: "高爾宣 OSN",
      followers: "474,895",
      color: "from-slate-600 to-slate-800",
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
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Select Your Artist</h1>
          <p className="text-zinc-400 text-lg">
            Search for an artist or explore our recommendations.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <Input
            placeholder="Search for artists..."
            className="w-full h-14 pl-12 bg-zinc-900/50 border-zinc-700 text-lg text-white rounded-xl focus-visible:ring-green-500 placeholder:text-zinc-500"
          />
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xl font-semibold text-white">
            <User className="w-6 h-6 text-green-500" />
            <h2>Recommended Artists</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {artists.map((artist, i) => (
              <Card
                key={i}
                className="bg-zinc-800/40 border-zinc-800 overflow-hidden hover:bg-zinc-800 transition-all cursor-pointer group"
              >
                <CardContent className="p-0">
                  <div
                    className={`aspect-square w-full bg-gradient-to-br ${artist.color} relative group-hover:scale-105 transition-transform duration-500`}
                  >
                    {/* Placeholder for Artist Image */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <User className="w-16 h-16 text-white/20" />
                    </div>
                  </div>
                  <div className="p-4 space-y-1">
                    <h3 className="font-bold text-white truncate">
                      {artist.name}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {artist.followers} followers
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

export default ArtistQuizPage;
