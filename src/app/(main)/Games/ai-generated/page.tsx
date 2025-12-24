"use client";

import React from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import Link from "next/link";

const AiGeneratedPage = () => {
  const suggestions = [
    {
      title: "Taipei Nights",
      description:
        "A Chill Vibe Collection Featuring Ryan.B, David Tao, and J.Sheon",
    },
    {
      title: "Emotional Ballads",
      description: "Heartfelt Songs by Jay Chou, Leehom Wang, and Khalil Fong",
    },
    {
      title: "Mandopop Classics: 2000s Hits",
      description: "Timeless Tracks from the Golden Era of Mandopop",
    },
    {
      title: "Indie Pop Essentials",
      description: "Exploring the Best of Modern Indie Pop Sounds",
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

      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Input Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Enter your prompt</h1>
            <p className="text-zinc-400">
              Ask chatGPT to generate your quiz, you can ask about anything.
            </p>
          </div>

          <div className="space-y-4">
            <Textarea
              placeholder="e.g., '90s rock hits', 'romantic ballads', 'upbeat workout songs', 'classic jazz standards', 'indie folk favorites'..."
              className="min-h-[120px] bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 resize-none focus-visible:ring-green-500"
            />
            <Button className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg transition-all rounded-lg">
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Quiz
            </Button>
          </div>
        </div>

        {/* Suggestions Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xl font-semibold text-white">
            <Sparkles className="w-6 h-6 text-green-500" />
            <h2>AI Playlist Ideas</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((item, i) => (
              <Card
                key={i}
                className="bg-zinc-800/40 border-zinc-700Hover hover:bg-zinc-800 hover:border-zinc-600 transition-all cursor-pointer group"
              >
                <CardHeader>
                  <CardTitle className="text-lg group-hover:text-green-400 transition-colors">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-400">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              className="border-green-900 text-green-500 hover:bg-green-900/20 hover:text-green-400"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Get New Suggestions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiGeneratedPage;
