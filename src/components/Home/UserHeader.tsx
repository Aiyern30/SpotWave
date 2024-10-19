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

  // Update playlist details (name, description)
  const updatePlaylistDetails = async () => {
    if (!id || !playlist.id || !token) return;

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

      if (response.ok) {
        console.log("Playlist updated successfully");
      } else {
        console.error("Failed to update playlist details");
      }
    } catch (error) {
      console.error("Error updating playlist details:", error);
    }
  };

  // Upload image to Spotify
  const uploadPlaylistImage = async (base64Data: string) => {
    console.log(token);
    const imageUrl = `https://api.spotify.com/v1/playlists/${playlist.id}/images`;

    try {
      const response = await fetch(imageUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`, // Ensure token is correct
          "Content-Type": "image/jpeg", // Spotify expects a raw image in base64
        },
        body: base64Data, // The raw base64 string without any JSON wrapping
      });

      if (response.ok) {
        console.log("Playlist cover image updated successfully");
      } else if (response.status === 401) {
        console.error("Unauthorized. Check token.");
      } else {
        console.error("Failed to upload image:", response.statusText);
      }
    } catch (error) {
      console.error("Error uploading playlist cover image:", error);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const image = new window.Image(); // Use window context to access the Image constructor
        image.src = reader.result as string;
        image.onload = () => {
          // Create a canvas to resize the image
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          const MAX_SIZE = 300; // You can adjust this size as needed

          // Scale the image to fit within the MAX_SIZE
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

          // Draw the resized image on the canvas
          ctx?.drawImage(image, 0, 0, width, height);

          // Convert the canvas back to base64
          const resizedBase64String = canvas.toDataURL("image/jpeg");

          // Strip the metadata prefix
          const base64Data = resizedBase64String.split(",")[1];

          // Upload resized image to Spotify
          uploadPlaylistImage(base64Data);

          // Update the displayed image
          setUploadedImage(resizedBase64String);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  // Handling input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setDescriptionValue(e.target.value);
  };

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
                onBlur={() => {
                  setNameEditing(false);
                  updatePlaylistDetails(); // Update playlist details when title loses focus
                }}
              />
            </div>
          ) : (
            <div
              className="text-5xl cursor-pointer"
              onClick={() => setNameEditing(true)}
            >
              {inputValue}
            </div>
          )}

          {isOwner && descriptionEditing ? (
            <div className="description-container">
              <Textarea
                placeholder="Playlist Description"
                value={descriptionValue}
                onChange={handleDescriptionChange}
                onBlur={() => {
                  setDescriptionEditing(false);
                  updatePlaylistDetails(); // Update playlist details when description loses focus
                }}
                className="max-h-40"
              />
            </div>
          ) : (
            <div
              className="text-lg cursor-pointer"
              onClick={() => setDescriptionEditing(true)}
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
              className="text-sm hover:underline cursor-pointer font-bold"
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
