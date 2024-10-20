import { useEffect, useState } from "react";
import { CiSettings } from "react-icons/ci";
import {
  FiEdit,
  FiDownload,
  FiDelete,
  FiPlusCircle,
  FiShare2,
} from "react-icons/fi";
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

interface SettingsProps {
  playlist: PlaylistProps;
}

export default function Settings({ playlist }: SettingsProps) {
  const [token, setToken] = useState<string>("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] =
    useState<PlaylistProps>(playlist);

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const togglePrivacy = async () => {
    const newPublicStatus = !currentPlaylist.public; // Toggle the public status
    await updatePrivacy(newPublicStatus);

    // No need to update local state here, as we will fetch new data
    setIsDropdownOpen(false); // Close the dropdown menu after the action
  };

  const fetchPlaylistDetails = async () => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${currentPlaylist.id}`,
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
      setCurrentPlaylist(data); // Update the current playlist with new data
    } catch (error) {
      console.error("Error occurred while fetching playlist details:", error);
    }
  };

  const updatePrivacy = async (newPublicStatus: boolean) => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${currentPlaylist.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ public: newPublicStatus }),
        }
      );

      console.log("Response Status:", response.status);
      if (response.ok) {
        console.log("Updated privacy successfully. Checking for new data...");
        await fetchPlaylistDetails(); // Fetch updated playlist details
      } else {
        const errorText = await response.text();
        console.error(
          "Failed to update playlist:",
          response.statusText,
          errorText
        );
      }
    } catch (error) {
      console.error("Error occurred while updating privacy:", error);
    }
  };

  const deletePlaylist = async () => {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${currentPlaylist.id}/followers`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      console.log("Playlist deleted successfully");
    } else {
      console.error("Failed to delete playlist:", response.statusText);
    }
    setIsDeleteDialogOpen(false);
    setIsDropdownOpen(false); // Close the dropdown menu after deletion
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
          <DropdownMenuItem onClick={togglePrivacy}>
            <BiUserPlus className="mr-2" />
            {currentPlaylist.public ? "Make private" : "Make public"}
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
