"use client";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage, Input, Textarea } from "../ui";
import { useRouter } from "next/navigation";
import { PlaylistProps, User, UserProfile } from "@/lib/types";
import { useEffect, useState } from "react";
import { formatDuration } from "../formDuration";

interface Playlist {
  playlist: PlaylistProps;
  user: UserProfile;
  id: User;
}

export default function UserHeader({ playlist, user, id }: Playlist) {
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  useEffect(() => {
    if (playlist.owner.id === id?.id) {
      setIsOwner(true);
    }
  }, [playlist, id]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
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

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      !target.closest(".input-container") &&
      !target.closest(".description-container")
    ) {
      setNameEditing(false);
      setDescriptionEditing(false);
      updatePlaylistDetails(); // Update playlist details when clicking outside
    }
  };

  const updatePlaylistDetails = async () => {
    if (!id || !playlist.id || !token) return; // Ensure the user ID, playlist ID, and token are available

    const url = `https://api.spotify.com/v1/playlists/${playlist.id}`;

    const body = {
      name: inputValue,
      description: descriptionValue,
      public: false, // or true, depending on your requirement
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

      if (!response.ok) {
        throw new Error("Failed to update playlist details");
      }

      const result = await response.json(); // Parse the response
      console.log("Playlist updated successfully:", result); // Log success
    } catch (error) {
      console.error("Error updating playlist details:", error);
    }
  };

  useEffect(() => {
    if (nameEditing || descriptionEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [nameEditing, descriptionEditing]);

  return (
    <div>
      <div className="cover flex flex-col md:flex-row items-center p-4 space-x-4 w-full">
        <div
          className="relative group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Image
            src={uploadedImage || playlist.images[0]?.url || "/placeholder.jpg"}
            width={300}
            height={300}
            alt={playlist?.name || "Playlist cover image"}
            priority
            className="w-full max-w-[300px] h-auto md:max-w-[150px] md:w-auto md:h-auto transition-opacity duration-300"
          />
          {isOwner && isHovered && (
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Upload new cover image"
            />
          )}
        </div>
        <div className="flex flex-col space-y-3 mt-4 md:mt-0 flex-grow">
          {isOwner && nameEditing ? (
            <div className="input-container">
              <Input
                type="text"
                placeholder="Your Library Name"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={() => setNameEditing(false)}
              />
            </div>
          ) : (
            <div
              className="text-5xl cursor-pointer"
              onClick={() => {
                setNameEditing(true);
              }}
            >
              {inputValue}
            </div>
          )}

          {isOwner && descriptionEditing ? (
            <div className="description-container ">
              <Textarea
                placeholder="Playlist Description"
                value={descriptionValue}
                onChange={handleDescriptionChange}
                onBlur={() => setDescriptionEditing(false)}
                className="max-h-40"
              />
            </div>
          ) : (
            <div
              className="text-lg cursor-pointer"
              onClick={() => {
                setDescriptionEditing(true);
              }}
            >
              {descriptionValue || "No description"}
            </div>
          )}

          <div className="flex space-x-3 items-center">
            <div className="text-sm">
              <Avatar>
                <AvatarImage
                  src={user?.images[0]?.url}
                  className="rounded-full"
                />
                <AvatarFallback>{playlist?.owner?.display_name}</AvatarFallback>
              </Avatar>
            </div>
            <div
              className="text-sm hover:underline cursor-pointer font-bold "
              onClick={() =>
                router.push(
                  `/Artists/${playlist.owner.id}?name=${encodeURIComponent(
                    playlist.owner.display_name
                  )}`
                )
              }
            >
              {playlist?.owner?.display_name}
            </div>
            <div className="text-gray-400 text-sm">
              {playlist.tracks.total} songs,{" "}
              {formatDuration(
                playlist.tracks.items
                  .map((i) => i.track.duration_ms)
                  .reduce((a, b) => a + b, 0)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
