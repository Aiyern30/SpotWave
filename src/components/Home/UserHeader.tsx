"use client";

import type React from "react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Input,
  Textarea,
  Skeleton,
  Button,
  Card,
  CardContent,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import {
  Camera,
  Edit3,
  Music,
  Clock,
  Users,
  Check,
  X,
  Upload,
  ImageIcon,
  Loader2,
  Save,
  Sparkles,
  Wand2,
  ListFilter,
  AlignLeft,
  Download,
} from "lucide-react";
import { formatDuration } from "@/utils/function";
import type { PlaylistProps, UserProfile } from "@/lib/types";
import Settings from "../Settings";
import SearchSongs from "../SearchSongs";
import { analyzePlaylistGenres } from "@/utils/analyzePlaylistGenres";
import { toast } from "sonner";

interface UserHeaderProps {
  playlist: PlaylistProps;
  user: UserProfile;
  id: string;
  refetch: (silent?: boolean) => void;
}

export default function UserHeader({
  playlist,
  user,
  id,
  refetch,
}: UserHeaderProps) {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [nameEditing, setNameEditing] = useState(false);
  const [descriptionEditing, setDescriptionEditing] = useState(false);
  const [inputValue, setInputValue] = useState(playlist.name);
  const [descriptionValue, setDescriptionValue] = useState(
    playlist.description || ""
  );
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [inputWidth, setInputWidth] = useState<number>(0);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);

  // New AI Generation States
  const [aiGenIsOpen, setAiGenIsOpen] = useState(false);
  const [userAiPrompt, setUserAiPrompt] = useState("");
  const [descriptionLength, setDescriptionLength] = useState<"short" | "long">(
    "short"
  );
  const [generatedContent, setGeneratedContent] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [playlistImages, setPlaylistImages] = useState<{ url: string }[]>([]);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenSpanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  useEffect(() => {
    const ownerId = playlist.owner.id;
    const isCurrentUser = ownerId === id;
    setIsOwner(isCurrentUser);

    if (isCurrentUser) {
      setOwnerProfile(user);
    } else if (token) {
      // Fetch owner profile if not the current user
      fetch(`https://api.spotify.com/v1/users/${ownerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setOwnerProfile(data);
        })
        .catch((err) => console.error("Error fetching owner profile:", err));
    }
    setLoading(false);
  }, [playlist.owner.id, id, user, token]);

  // Fetch specialized playlist images
  useEffect(() => {
    if (token && playlist.id) {
      fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/images`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setPlaylistImages(data);
          }
        })
        .catch((err) => console.error("Error fetching playlist images:", err));
    }
  }, [token, playlist.id]);

  useEffect(() => {
    if (nameEditing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [nameEditing]);

  useEffect(() => {
    if (descriptionEditing && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [descriptionEditing]);

  useEffect(() => {
    if (summaryDialogOpen && !aiSummary) {
      setSummaryLoading(true);
      analyzePlaylistGenres(playlist.tracks.items, token)
        .then((summary) => {
          // If the AI returned nested recommendations (old structure), fix it
          if (summary.recommendations) {
            setAiSummary(summary.recommendations);
          } else {
            setAiSummary(summary);
          }
        })
        .finally(() => setSummaryLoading(false));
    }
  }, [summaryDialogOpen, aiSummary, playlist.tracks.items, token]);

  // Calculate input width based on text content
  useEffect(() => {
    if (hiddenSpanRef.current) {
      const width = hiddenSpanRef.current.offsetWidth;
      setInputWidth(Math.max(width + 40, 200)); // Add padding and set minimum width
    }
  }, [inputValue, nameEditing]);

  const updatePlaylistDetails = async () => {
    if (!id || !playlist.id || !token) return;

    setUpdating(true);
    const url = `https://api.spotify.com/v1/playlists/${playlist.id}`;

    const body = {
      name: inputValue,
      description: descriptionValue,
      public: false,
    };

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        console.log("Playlist updated successfully");
        refetch();
      } else {
        console.error("Failed to update playlist details");
      }
    } catch (error) {
      console.error("Error updating playlist details:", error);
    } finally {
      setUpdating(false);
    }
  };

  const uploadPlaylistImage = async (base64Data: string) => {
    setUploading(true);
    const imageUrl = `https://api.spotify.com/v1/playlists/${playlist.id}/images`;

    try {
      const response = await fetch(imageUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "image/jpeg",
        },
        body: base64Data,
      });

      if (response.ok) {
        console.log("Playlist cover image updated successfully");
        refetch();
        setImageDialogOpen(false);
      } else if (response.status === 401) {
        console.error("Unauthorized. Check token.");
      } else {
        console.error("Failed to upload image:", response.statusText);
      }
    } catch (error) {
      console.error("Error uploading playlist cover image:", error);
    } finally {
      setUploading(false);
    }
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const image = new window.Image();
      image.src = reader.result as string;
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const MAX_SIZE = 300;
        let width = image.width;
        let height = image.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(image, 0, 0, width, height);

        const resizedBase64String = canvas.toDataURL("image/jpeg");
        const base64Data = resizedBase64String.split(",")[1];

        uploadPlaylistImage(base64Data);
        setUploadedImage(resizedBase64String);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setDescriptionValue(e.target.value);
  };

  const handleKeyPress = (
    e: React.KeyboardEvent,
    type: "name" | "description"
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (type === "name") {
        setNameEditing(false);
      } else {
        setDescriptionEditing(false);
      }
      updatePlaylistDetails();
    }
    if (e.key === "Escape") {
      if (type === "name") {
        setInputValue(playlist.name);
        setNameEditing(false);
      } else {
        setDescriptionValue(playlist.description || "");
        setDescriptionEditing(false);
      }
    }
  };

  const generatePlaylistNameAndDescription = async () => {
    if (!token || playlist.tracks.items.length === 0) {
      const { toast } = await import("react-toastify");
      toast.error("Cannot generate for empty playlist");
      return;
    }

    setGeneratingAI(true);
    setGeneratedContent(null);

    try {
      // Gather playlist context
      const tracks = playlist.tracks.items.slice(0, 20); // Use first 20 tracks
      const artists = [
        ...new Set(tracks.flatMap((t) => t.track.artists.map((a) => a.name))),
      ];
      const trackNames = tracks.map((t) => t.track.name);

      const playlistInfo = `Playlist contains ${
        playlist.tracks.total
      } tracks. Sample tracks: ${trackNames
        .slice(0, 10)
        .join(", ")}. Artists include: ${artists.slice(0, 10).join(", ")}.`;

      const response = await fetch("/api/ai-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "playlist-naming",
          context: {
            playlistInfo,
            userPrompt: userAiPrompt,
            length: descriptionLength,
          },
        }),
      });

      if (!response.ok) throw new Error("AI generation failed");

      const data = await response.json();
      const rawResult = data.recommendations;

      // Robust extraction: handle both array and direct object
      const result = Array.isArray(rawResult) ? rawResult[0] : rawResult;

      if (result && (result.name || result.description)) {
        setGeneratedContent({
          name: result.name || playlist.name,
          description: result.description || playlist.description || "",
        });
        toast.success("✨ Generated! Review and apply.");
      } else {
        throw new Error("Invalid AI response format");
      }
    } catch (error) {
      console.error("Error generating playlist details:", error);
      toast.error("❌ Failed to generate playlist details");
    } finally {
      setGeneratingAI(false);
    }
  };

  const applyGeneratedContent = () => {
    if (generatedContent) {
      setInputValue(generatedContent.name);
      setDescriptionValue(generatedContent.description);
      setNameEditing(true);
      setDescriptionEditing(true);
      setAiGenIsOpen(false);
      setGeneratedContent(null);
    }
  };

  const handleExportPlaylist = async () => {
    try {
      toast.info("📦 Preparing export...");

      // Prepare JSON content with enhanced metadata for better YouTube matching
      const exportData = playlist.tracks.items.map((item, index) => {
        const track = item.track;
        const artists = track.artists.map((a) => a.name).join(", ");
        const primaryArtist = track.artists[0]?.name || "";

        // Extract release year from album release date
        const releaseYear = track.album.release_date
          ? new Date(track.album.release_date).getFullYear()
          : null;

        // Format duration as MM:SS for reference
        const durationSeconds = Math.floor(track.duration_ms / 1000);
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        const durationFormatted = `${minutes}:${seconds
          .toString()
          .padStart(2, "0")}`;

        return {
          // Basic info
          title: track.name,
          artist: artists,
          primaryArtist: primaryArtist,
          album: track.album.name,

          // Unique identifiers (ISRC is the most reliable for finding exact tracks)
          isrc: track.external_ids?.isrc || null,
          spotifyId: track.id,

          // Metadata for verification
          durationMs: track.duration_ms,
          durationFormatted: durationFormatted,
          releaseYear: releaseYear,
          explicit: track.explicit,

          // Search queries (ordered by accuracy)
          queries: {
            // Best: ISRC-based search (most accurate if available)
            isrcQuery: track.external_ids?.isrc
              ? `${track.name} ${primaryArtist} ISRC:${track.external_ids.isrc}`
              : null,

            // Good: Include album and year for better matching
            detailedQuery: releaseYear
              ? `${track.name} ${primaryArtist} ${track.album.name} ${releaseYear} audio`
              : `${track.name} ${primaryArtist} ${track.album.name} audio`,

            // Fallback: Basic query
            basicQuery: `${track.name} ${artists} audio`,

            // Topic channel (official audio)
            topicQuery: `${track.name} ${primaryArtist} topic audio`,
          },

          // Default query for backward compatibility
          query: track.external_ids?.isrc
            ? `${track.name} ${primaryArtist} ${track.album.name} official audio`
            : `${track.name} ${artists} ${track.album.name} audio`,

          // Position in playlist
          position: index + 1,
        };
      });

      const content = JSON.stringify(exportData, null, 2);

      // Create a blob and download link
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "playlist.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("✅ Playlist exported as playlist.json!");
      toast.info(
        "💡 Enhanced with ISRC codes for accurate matching! Save to SpotWave/downloads, then run: .\\downloader.ps1",
        { duration: 8000 }
      );
    } catch (error: any) {
      console.error("Export failed:", error);
      toast.error("❌ Failed to export playlist. Please try again.");
    }
  };

  const totalDuration = playlist.tracks.items
    .map((item) => item.track.duration_ms)
    .reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8 bg-gradient-to-b from-brand/30 to-transparent rounded-xl p-8">
          <Skeleton className="w-80 h-80 rounded-xl" />
          <div className="flex-1 space-y-4 text-center lg:text-left">
            <Skeleton className="h-12 w-96 mx-auto lg:mx-0" />
            <Skeleton className="h-6 w-64 mx-auto lg:mx-0" />
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden span for measuring text width */}
      <span
        ref={hiddenSpanRef}
        className="absolute opacity-0 pointer-events-none text-4xl lg:text-6xl font-bold whitespace-nowrap"
        aria-hidden="true"
      >
        {inputValue}
      </span>

      {/* Enhanced Playlist Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand/30 via-zinc-800/50 to-zinc-900/90 backdrop-blur-sm border border-zinc-800/50">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--brand-primary)/0.15),transparent_70%)]" />

        <div className="relative flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8 p-8">
          {/* Enhanced Playlist Cover Image */}
          <div className="relative group flex-shrink-0">
            <div
              className="relative"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className="relative overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10">
                <Image
                  src={
                    uploadedImage ||
                    (playlistImages.length > 0
                      ? playlistImages[0].url
                      : playlist?.images?.length
                      ? playlist.images[0].url
                      : "/default-artist.png")
                  }
                  width={320}
                  height={320}
                  alt={playlist?.name || "Playlist cover image"}
                  priority
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Upload Overlay for Owner */}
                {isOwner && (
                  <div
                    className={`absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${
                      isHovered ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <Dialog
                      open={imageDialogOpen}
                      onOpenChange={setImageDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          size="lg"
                          className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                        >
                          <Camera className="h-5 w-5 mr-2" />
                          Change Photo
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-white">
                            Update Playlist Cover
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          {/* Drag & Drop Area */}
                          <div
                            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                              dragActive
                                ? "border-brand bg-brand/10"
                                : "border-zinc-700 hover:border-zinc-600"
                            }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              disabled={uploading}
                            />

                            <div className="space-y-3">
                              {uploading ? (
                                <Loader2 className="h-12 w-12 bg-brand mx-auto animate-spin" />
                              ) : (
                                <ImageIcon className="h-12 w-12 text-zinc-400 mx-auto" />
                              )}

                              <div>
                                <p className="text-white font-medium">
                                  {uploading
                                    ? "Uploading..."
                                    : "Drop your image here"}
                                </p>
                                <p className="text-zinc-400 text-sm">
                                  or click to browse (JPG, PNG up to 10MB)
                                </p>
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="default"
                            className="w-full border-zinc-700 text-white hover:bg-zinc-800"
                            disabled={uploading}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>

              {/* Upload Status Badge */}
              {uploading && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-brand text-brand-foreground">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Uploading
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Playlist Info */}
          <div className="flex-1 text-center lg:text-left space-y-6">
            <div className="space-y-3">
              <Badge
                variant="secondary"
                className="bg-brand/20 text-brand border-brand/30"
              >
                <Music className="h-3 w-3 mr-1" />
                Playlist
              </Badge>

              {/* Enhanced Editable Title */}
              <div className="relative">
                {nameEditing ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 w-full max-w-4xl">
                    <div className="relative flex-1 w-full">
                      <Input
                        ref={nameInputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={(e: React.KeyboardEvent<Element>) =>
                          handleKeyPress(e, "name")
                        }
                        className="text-3xl lg:text-5xl font-bold bg-zinc-900/50 border-2 border-brand/30 focus:border-brand text-white px-4 py-2 h-auto leading-tight rounded-xl transition-all shadow-2xl backdrop-blur-md w-full"
                        disabled={updating}
                      />
                      {updating && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-5 w-5 text-brand animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                      <Button
                        size="lg"
                        onClick={() => {
                          setNameEditing(false);
                          updatePlaylistDetails();
                        }}
                        className="bg-brand hover:bg-brand/90 text-brand-foreground font-bold shadow-lg shadow-brand/20 rounded-xl px-6"
                        disabled={updating}
                      >
                        <Check className="h-5 w-5 mr-2" />
                        Save
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => {
                          setInputValue(playlist.name);
                          setNameEditing(false);
                        }}
                        className="border-zinc-700 bg-zinc-800/50 text-white hover:bg-zinc-800 hover:text-white rounded-xl px-6"
                      >
                        <X className="h-5 w-5 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-center justify-center lg:justify-start space-x-3">
                    <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                      {inputValue}
                    </h1>
                    {isOwner && (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setNameEditing(true)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white hover:bg-zinc-800/50 flex-shrink-0"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit playlist name</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAiGenIsOpen(true)}
                                disabled={
                                  generatingAI || playlist.tracks.total === 0
                                }
                                className="text-brand hover:text-brand/80 hover:bg-brand/10 flex-shrink-0 bg-brand/5 backdrop-blur-sm border border-brand/20 shadow-lg"
                              >
                                <Wand2 className="h-4 w-4 mr-2" />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                  AI Rename
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>AI Magic Rename & Description</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Dialog
                          open={aiGenIsOpen}
                          onOpenChange={(open) => {
                            setAiGenIsOpen(open);
                            if (!open) setGeneratedContent(null);
                          }}
                        >
                          <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[450px] overflow-hidden shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-purple-900/10 pointer-events-none" />
                            <DialogHeader className="relative z-10">
                              <DialogTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-brand to-purple-400 bg-clip-text text-transparent">
                                <Sparkles className="h-6 w-6 text-brand" />
                                AI Magic Renamer
                              </DialogTitle>
                              <DialogDescription className="text-zinc-400">
                                Infuse your playlist with fresh energy and
                                vibes.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-6 py-6 relative z-10">
                              <div className="space-y-3">
                                <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                                  <Edit3 className="h-4 w-4 text-brand/70" />
                                  Custom Vibe (Optional)
                                </label>
                                <Input
                                  placeholder="e.g. 'Chill late night drive', 'Gym beast mode'"
                                  value={userAiPrompt}
                                  onChange={(e) =>
                                    setUserAiPrompt(e.target.value)
                                  }
                                  className="bg-zinc-900/80 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-brand focus:ring-4 focus:ring-brand/10 rounded-xl"
                                />
                              </div>

                              <div className="space-y-3">
                                <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                                  <AlignLeft className="h-4 w-4 text-brand/70" />
                                  Vibe Intensity
                                </label>
                                <div className="flex gap-3">
                                  <div
                                    onClick={() =>
                                      setDescriptionLength("short")
                                    }
                                    className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                                      descriptionLength === "short"
                                        ? "bg-brand/20 border-brand shadow-lg shadow-brand/20"
                                        : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <ListFilter
                                        className={`h-4 w-4 ${
                                          descriptionLength === "short"
                                            ? "text-brand"
                                            : ""
                                        }`}
                                      />
                                      <span
                                        className={`font-bold text-sm ${
                                          descriptionLength === "short"
                                            ? "text-white"
                                            : ""
                                        }`}
                                      >
                                        Punchy
                                      </span>
                                    </div>
                                    <p className="text-[10px] uppercase tracking-widest opacity-50">
                                      Concise
                                    </p>
                                  </div>

                                  <div
                                    onClick={() => setDescriptionLength("long")}
                                    className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                                      descriptionLength === "long"
                                        ? "bg-brand/20 border-brand shadow-lg shadow-brand/20"
                                        : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <AlignLeft
                                        className={`h-4 w-4 ${
                                          descriptionLength === "long"
                                            ? "text-brand"
                                            : ""
                                        }`}
                                      />
                                      <span
                                        className={`font-bold text-sm ${
                                          descriptionLength === "long"
                                            ? "text-white"
                                            : ""
                                        }`}
                                      >
                                        Detailed
                                      </span>
                                    </div>
                                    <p className="text-[10px] uppercase tracking-widest opacity-50">
                                      Explosive
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {generatedContent && (
                                <div className="space-y-5 pt-6 border-t border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand uppercase tracking-[0.2em] px-1">
                                      Proposed Name
                                    </label>
                                    <Input
                                      value={generatedContent.name}
                                      onChange={(e) =>
                                        setGeneratedContent((prev) =>
                                          prev
                                            ? { ...prev, name: e.target.value }
                                            : null
                                        )
                                      }
                                      className="bg-zinc-900/50 border-brand/30 text-white font-bold text-lg rounded-xl focus:border-brand"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand uppercase tracking-[0.2em] px-1">
                                      Proposed Vibe Description
                                    </label>
                                    <Textarea
                                      value={generatedContent.description}
                                      onChange={(e) =>
                                        setGeneratedContent((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                description: e.target.value,
                                              }
                                            : null
                                        )
                                      }
                                      className="bg-zinc-900/50 border-brand/30 text-white h-28 resize-none rounded-xl focus:border-brand leading-relaxed"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 relative z-10">
                              {!generatedContent ? (
                                <Button
                                  onClick={generatePlaylistNameAndDescription}
                                  disabled={generatingAI}
                                  className="w-full h-12 bg-brand hover:bg-brand/90 text-brand-foreground font-black uppercase tracking-widest rounded-xl shadow-xl shadow-brand/20"
                                >
                                  {generatingAI ? (
                                    <>
                                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                      Spinning Vibes...
                                    </>
                                  ) : (
                                    <>
                                      <Wand2 className="mr-3 h-5 w-5" />
                                      Cast Spell
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <div className="flex gap-3 w-full">
                                  <Button
                                    variant="outline"
                                    onClick={generatePlaylistNameAndDescription}
                                    disabled={generatingAI}
                                    className="flex-1 h-12 border-zinc-700 bg-zinc-900/50 text-white hover:bg-zinc-800 rounded-xl font-bold"
                                  >
                                    Reroll
                                  </Button>
                                  <Button
                                    onClick={applyGeneratedContent}
                                    className="flex-1 h-12 bg-brand hover:bg-brand/90 text-brand-foreground font-black uppercase tracking-widest rounded-xl shadow-xl shadow-brand/20"
                                  >
                                    Apply
                                  </Button>
                                </div>
                              )}
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Enhanced Editable Description */}
              <div className="relative">
                {descriptionEditing ? (
                  <div className="space-y-4 max-w-3xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <Textarea
                      ref={descriptionInputRef}
                      value={descriptionValue}
                      onChange={handleDescriptionChange}
                      onKeyDown={(e: React.KeyboardEvent<Element>) =>
                        handleKeyPress(e, "description")
                      }
                      placeholder="Add a description to your playlist..."
                      className="text-lg bg-zinc-900/50 border-2 border-brand/20 focus:border-brand text-zinc-300 resize-none rounded-xl p-4 min-h-[120px] transition-all focus:ring-4 focus:ring-brand/10"
                      disabled={updating}
                    />
                    <div className="flex space-x-3">
                      <Button
                        size="default"
                        onClick={() => {
                          setDescriptionEditing(false);
                          updatePlaylistDetails();
                        }}
                        className="bg-brand hover:bg-brand/90 text-brand-foreground font-bold rounded-xl px-6 shadow-lg shadow-brand/20"
                        disabled={updating}
                      >
                        {updating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                      <Button
                        size="default"
                        variant="ghost"
                        onClick={() => {
                          setDescriptionValue(playlist.description || "");
                          setDescriptionEditing(false);
                        }}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-xl px-6"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-start space-x-2">
                    <p className="text-zinc-300 text-lg max-w-2xl leading-relaxed">
                      {descriptionValue ||
                        (isOwner ? "Add a description..." : "No description")}
                    </p>
                    {isOwner && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDescriptionEditing(true)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white hover:bg-zinc-800/50 flex-shrink-0"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit description</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Playlist Metadata */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-zinc-300">
              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8 ring-2 ring-white/20">
                  <AvatarImage
                    src={ownerProfile?.images?.[0]?.url || "/placeholder.svg"}
                    className="rounded-full"
                  />
                  <AvatarFallback className="text-xs bg-zinc-700 text-white">
                    {playlist?.owner?.display_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <button
                  className="hover:text-white transition-colors font-medium hover:underline"
                  onClick={() =>
                    router.push(
                      `/Profile/${playlist.owner.id}?name=${encodeURIComponent(
                        playlist.owner.display_name
                      )}`
                    )
                  }
                >
                  {playlist?.owner?.display_name}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <Music className="h-4 w-4 text-brand" />
                <span className="font-medium">
                  {playlist.tracks.total} songs
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="font-medium">
                  {formatDuration(totalDuration)}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex flex-row lg:flex-col space-x-3 lg:space-x-0 lg:space-y-3 items-center lg:items-end justify-center lg:justify-end mt-6 lg:mt-0">
            {isOwner && (
              <>
                <Settings playlistID={playlist.id} />
                <SearchSongs
                  playlistID={playlist.id}
                  playlistName={playlist.name}
                  refetch={refetch}
                />
              </>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleExportPlaylist}
                    className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/30 hover:border-white/20 transition-all duration-200 hover:scale-105"
                  >
                    <Download className="h-5 w-5 text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export Playlist Info</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* View Summary Button - Only show if playlist has tracks and user is owner */}
            {isOwner && playlist.tracks.total > 0 && (
              <Dialog
                open={summaryDialogOpen}
                onOpenChange={setSummaryDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/30 hover:border-white/20 transition-all duration-200 hover:scale-105"
                  >
                    <Sparkles className="h-4 w-4 text-white" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-950/95 border-zinc-800/50 max-w-xl backdrop-blur-2xl shadow-2xl">
                  {/* ... rest of content ... */}
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-brand via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand/10 rounded-lg">
                          <Sparkles className="h-6 w-6 text-brand" />
                        </div>
                        AI Playlist Analysis
                      </div>
                    </DialogTitle>
                  </DialogHeader>

                  {summaryLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full border-t-2 border-b-2 border-brand animate-spin" />
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-brand animate-pulse" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium text-white">
                          AI is reading your music vibes...
                        </p>
                        <p className="text-sm text-zinc-500">
                          Analyzing genres, moods, and eras
                        </p>
                      </div>
                    </div>
                  ) : aiSummary ? (
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                      {/* Genres Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-brand/80 font-semibold tracking-wide uppercase text-xs">
                          <div className="w-1 h-1 rounded-full bg-brand" />
                          Top Genres
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {aiSummary.genres?.map((g: string) => (
                            <span
                              key={g}
                              className="px-3 py-1.5 rounded-full bg-brand/10 text-brand border border-brand/20 text-sm font-medium hover:bg-brand/20 transition-all cursor-default"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Moods Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-blue-400/80 font-semibold tracking-wide uppercase text-xs">
                          <div className="w-1 h-1 rounded-full bg-blue-400" />
                          Dominant Moods
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {aiSummary.moods?.map((m: string) => (
                            <span
                              key={m}
                              className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-medium hover:bg-blue-500/20 transition-all cursor-default"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Eras Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-purple-400/80 font-semibold tracking-wide uppercase text-xs">
                          <div className="w-1 h-1 rounded-full bg-purple-400" />
                          Eras Represented
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {aiSummary.eras?.map((e: string) => (
                            <span
                              key={e}
                              className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-sm font-medium hover:bg-purple-500/20 transition-all cursor-default"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Styles Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-yellow-400/80 font-semibold tracking-wide uppercase text-xs">
                          <div className="w-1 h-1 rounded-full bg-yellow-400" />
                          Artist Styles
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {aiSummary.artistStyles?.map((a: string) => (
                            <span
                              key={a}
                              className="px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-sm font-medium hover:bg-yellow-500/20 transition-all cursor-default"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Search Terms Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-pink-400/80 font-semibold tracking-wide uppercase text-xs">
                          <div className="w-1 h-1 rounded-full bg-pink-400" />
                          Perfect Search Queries
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {aiSummary.searchTerms?.map((s: string) => (
                            <span
                              key={s}
                              className="px-3 py-1.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 text-sm font-medium hover:bg-pink-500/20 hover:scale-105 transition-all cursor-pointer italic"
                            >
                              "{s}"
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-500 space-y-2">
                      <Music className="h-12 w-12 opacity-20" />
                      <p>Analysis failed to load. Please try again.</p>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-brand/30 to-zinc-800/50 border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-800/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-brand/20 rounded-xl ring-1 ring-brand/30">
                <Music className="h-6 w-6 text-brand" />
              </div>
              <div>
                <p className="text-sm text-zinc-400 font-medium">
                  Total Tracks
                </p>
                <p className="text-2xl font-bold text-white">
                  {playlist.tracks.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-brand/30 to-zinc-800/50 border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-800/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-brand/20 rounded-xl ring-1 ring-brand/30">
                <Users className="h-6 w-6 text-brand" />
              </div>
              <div>
                <p className="text-sm text-zinc-400 font-medium">Created by</p>
                <p className="text-2xl font-bold text-white truncate">
                  {playlist.owner.display_name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
