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
} from "lucide-react";
import { formatDuration } from "@/utils/function";
import type { PlaylistProps, UserProfile } from "@/lib/types";
import Settings from "../Settings";
import SearchSongs from "../SearchSongs";

interface UserHeaderProps {
  playlist: PlaylistProps;
  user: UserProfile;
  id: string;
  refetch: (playlistID: string) => void;
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

  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  useEffect(() => {
    if (playlist.owner.id === id) {
      setIsOwner(true);
    }
    setLoading(false);
  }, [playlist, id]);

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
        refetch(playlist.id);
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
        refetch(playlist.id);
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

  const totalDuration = playlist.tracks.items
    .map((item) => item.track.duration_ms)
    .reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8 bg-gradient-to-b from-zinc-800/50 to-transparent rounded-xl p-8">
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
      {/* Enhanced Playlist Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900/90 via-zinc-800/50 to-zinc-900/90 backdrop-blur-sm border border-zinc-800/50">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />

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
                    (playlist?.images?.length
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
                                ? "border-green-500 bg-green-500/10"
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
                                <Loader2 className="h-12 w-12 text-green-500 mx-auto animate-spin" />
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
                  <Badge className="bg-green-500 text-black">
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
                className="bg-green-500/20 text-green-400 border-green-500/30"
              >
                <Music className="h-3 w-3 mr-1" />
                Playlist
              </Badge>

              {/* Enhanced Editable Title */}
              <div className="relative">
                {nameEditing ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      ref={nameInputRef}
                      type="text"
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={(e: React.KeyboardEvent<Element>) =>
                        handleKeyPress(e, "name")
                      }
                      className="text-4xl lg:text-6xl font-bold bg-transparent border-2 border-green-500/50 focus:border-green-500 text-white p-2 rounded-lg"
                      disabled={updating}
                    />
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          setNameEditing(false);
                          updatePlaylistDetails();
                        }}
                        className="bg-green-500 hover:bg-green-600 text-black"
                        disabled={updating}
                      >
                        {updating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setInputValue(playlist.name);
                          setNameEditing(false);
                        }}
                        className="border-zinc-700 text-white hover:bg-zinc-800"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-center space-x-3">
                    <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                      {inputValue}
                    </h1>
                    {isOwner && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setNameEditing(true)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit playlist name</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>

              {/* Enhanced Editable Description */}
              <div className="relative">
                {descriptionEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      ref={descriptionInputRef}
                      value={descriptionValue}
                      onChange={handleDescriptionChange}
                      onKeyDown={(e: React.KeyboardEvent<Element>) =>
                        handleKeyPress(e, "description")
                      }
                      placeholder="Add a description to your playlist..."
                      className="text-lg bg-zinc-800/50 border-2 border-green-500/50 focus:border-green-500 text-zinc-300 resize-none rounded-lg"
                      rows={3}
                      disabled={updating}
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setDescriptionEditing(false);
                          updatePlaylistDetails();
                        }}
                        className="bg-green-500 hover:bg-green-600 text-black"
                        disabled={updating}
                      >
                        {updating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setDescriptionValue(playlist.description || "");
                          setDescriptionEditing(false);
                        }}
                        className="border-zinc-700 text-white hover:bg-zinc-800"
                      >
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
                    src={user?.images?.[0]?.url || "/placeholder.svg"}
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
                      `/Artists/${playlist.owner.id}?name=${encodeURIComponent(
                        playlist.owner.display_name
                      )}`
                    )
                  }
                >
                  {playlist?.owner?.display_name}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <Music className="h-4 w-4 text-green-500" />
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
          <div className="flex flex-col space-y-3 lg:items-end">
            <Settings playlistID={playlist.id} />
            <SearchSongs playlistID={playlist.id} refetch={refetch} />
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/50 border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-800/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500/20 rounded-xl ring-1 ring-green-500/30">
                <Music className="h-6 w-6 text-green-500" />
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

        <Card className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/50 border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-800/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/20 rounded-xl ring-1 ring-blue-500/30">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-zinc-400 font-medium">
                  Total Duration
                </p>
                <p className="text-2xl font-bold text-white">
                  {formatDuration(totalDuration)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/50 border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-800/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-500/20 rounded-xl ring-1 ring-purple-500/30">
                <Users className="h-6 w-6 text-purple-500" />
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
