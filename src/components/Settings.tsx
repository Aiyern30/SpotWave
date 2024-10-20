"use client";

import { useEffect, useState } from "react";
import { CiSettings } from "react-icons/ci";
import { FiDownload, FiDelete, FiPlusCircle, FiShare2 } from "react-icons/fi";
import { BiUserPlus } from "react-icons/bi";
import { AiOutlineLink } from "react-icons/ai";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui";
import { FaLaptopCode } from "react-icons/fa";
import { PlaylistProps } from "@/lib/types";
import { useRouter } from "next/navigation";

interface SettingsProps {
  playlistID: string;
}

export default function Settings({ playlistID }: SettingsProps) {
  const router = useRouter();

  const [token, setToken] = useState<string>("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<PlaylistProps | null>(
    null
  );
  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchPlaylistDetails();
    }
  }, [token]);

  const fetchPlaylistDetails = async () => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistID}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Failed to fetch playlist details:",
          response.statusText,
          errorText
        );
        return;
      }

      const data = await response.json();
      console.log("Fetched playlist details:", data);
      setCurrentPlaylist(data);
    } catch (error) {
      console.error("Error occurred while fetching playlist details:", error);
    }
  };

  const deletePlaylist = async () => {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistID}/followers`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      router.push("/Home");
      console.log("Playlist deleted successfully");
    } else {
      console.error("Failed to delete playlist:", response.statusText);
    }
    setIsDeleteDialogOpen(false);
    setIsDropdownOpen(false);
  };

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger>
          <CiSettings size={45} />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mr-5">
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <FiPlusCircle className="mr-2" /> Add to profile
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setIsDeleteDialogOpen(true);
              setIsDropdownOpen(false); // Close the dropdown menu
            }}
          >
            <FiDelete className="mr-2" /> Delete
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FiDownload className="mr-2" /> Download
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FiPlusCircle className="mr-2" /> Create playlists
          </DropdownMenuItem>

          <DropdownMenuItem>
            <BiUserPlus className="mr-2" /> Invite collaborators
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FiPlusCircle className="mr-2" /> Pin playlists
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FiShare2 className="mr-2" /> Share
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem>
                  <AiOutlineLink className="mr-2" /> Copy link to playlist
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FaLaptopCode className="mr-2" />
                  Embed playlist
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to permanently
              delete this playlist?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={deletePlaylist}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
