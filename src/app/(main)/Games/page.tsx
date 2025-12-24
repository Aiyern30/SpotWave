import React from "react";
import { Sparkles, User, ListMusic, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

const GamesPage = () => {
  const quizOptions = [
    {
      title: "AI Generated",
      description: "Ask Gemini to generate any quiz",
      icon: Sparkles,
      color: "text-green-400",
    },
    {
      title: "Artist Quiz",
      description: "Quiz about a specific artist",
      icon: User,
      color: "text-green-400",
    },
    {
      title: "Playlist Quiz",
      description: "Quiz from any Spotify playlist",
      icon: ListMusic,
      color: "text-green-400",
    },
    {
      title: "Liked Songs",
      description: "Quiz on your saved songs",
      icon: Heart,
      color: "text-green-400",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-6 space-y-12 bg-black/50">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Choose Your Quiz Type
        </h1>
        <p className="text-zinc-400 text-lg">
          Select how you want to create your music quiz
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {quizOptions.map((option, index) => (
          <Card
            key={index}
            className="group relative overflow-hidden border border-zinc-800 bg-zinc-900/50 p-8 hover:bg-zinc-900 transition-all duration-300 hover:border-green-500/50 hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.15)] cursor-pointer"
          >
            <CardContent className="flex flex-col items-center justify-center text-center space-y-6 p-0">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-zinc-800 group-hover:bg-zinc-800/80 transition-colors border border-zinc-700/50 group-hover:border-green-500/20">
                  <option.icon className="w-10 h-10 text-green-500" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white group-hover:text-green-400 transition-colors">
                  {option.title}
                </h3>
                <p className="text-zinc-400 group-hover:text-zinc-300 transition-colors">
                  {option.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GamesPage;
