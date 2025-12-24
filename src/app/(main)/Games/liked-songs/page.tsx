"use client";

import React, { useState } from "react";
import { Music, ArrowLeft, Timer, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import Link from "next/link";

const LikedSongsPage = () => {
  const [manualMode, setManualMode] = useState(false);

  return (
    <div className="flex flex-col min-h-screen w-full bg-black/50 p-6 md:p-12 space-y-8">
      <Link
        href="/Games"
        className="text-zinc-400 hover:text-white flex items-center gap-2 w-fit transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Games
      </Link>

      <div className="flex flex-col items-center justify-center max-w-2xl mx-auto w-full flex-1 min-h-[60vh] space-y-12">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500 mb-4 shadow-[0_0_40px_-5px_rgba(34,197,94,0.4)]">
            <Music className="w-12 h-12 text-black fill-current" />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">Music Quiz</h1>
            <p className="text-zinc-400 text-xl">
              Quiz from your 90 Liked Songs
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <p className="text-zinc-300">
              We found 79 songs, you'll play in rounds of 10 songs.
              <br />
              Listen to each and try to guess the title!
            </p>
          </div>
        </div>

        <Button className="w-48 h-14 bg-green-500 hover:bg-green-400 text-black font-bold text-lg rounded-full shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.5)] transition-all transform hover:scale-105">
          Start Quiz
        </Button>

        <div className="w-full space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-white justify-center border-t border-zinc-800 pt-8 w-full">
            <h3>Quiz Settings</h3>
          </div>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-full">
                  <Timer className="w-6 h-6 text-blue-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-white">Manual Mode</h4>
                  <p className="text-sm text-zinc-400">
                    You control when to skip songs
                  </p>
                </div>
              </div>
              <Switch checked={manualMode} onCheckedChange={setManualMode} />
            </CardContent>
          </Card>

          <div className="text-center pt-4">
            <p className="text-sm text-zinc-500">
              Chromecast is now only available on the mobile app.{" "}
              <span className="text-blue-400 hover:underline cursor-pointer">
                Download here
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LikedSongsPage;
