"use client";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useCallback, useEffect, useState } from "react";
import { CiSettings } from "react-icons/ci";
import { FiDownload, FiDelete, FiPlusCircle, FiShare2 } from "react-icons/fi";
import { BiUserPlus } from "react-icons/bi";
import { AiOutlineLink } from "react-icons/ai";
import { FaLaptopCode } from "react-icons/fa";
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
  Label,
  ScrollArea,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui";
import { PlaylistProps } from "@/lib/types";
import { useRouter } from "next/navigation";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { CreatePlaylist } from "@/utils/createPlaylist";

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
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);
  const [iframeWidth, setIframeWidth] = useState<"352" | "252" | "152">("352");
  const [iframeHeight, setIframeHeight] = useState<
    "380" | "280" | "180" | "80"
  >("380");
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [generatedEmbedCode, setGeneratedEmbedCode] = useState<string>("");
  const [userID, setUserID] = useState<string>("");

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleCreatePlaylist = async () => {
    const playlistResponse = await CreatePlaylist(userID, token);
    if (playlistResponse) {
      const playlistID = playlistResponse.id;
      const playlistName = playlistResponse.name;
      router.push(
        `/Home/${playlistID}?name=${encodeURIComponent(playlistName)}`
      );
    } else {
      console.log("Playlist creation failed.");
    }
  };

  const fetchPlaylistDetails = useCallback(async () => {
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
  }, [token, playlistID]);

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

  const copyPlaylistLink = () => {
    const playlistLink = `https://open.spotify.com/playlist/${playlistID}`;
    navigator.clipboard
      .writeText(playlistLink)
      .then(() => {
        toast.success("Playlist link copied to clipboard!");
      })
      .catch((err) => {
        toast.error("Failed to copy playlist link.");
      });
  };

  const copyEmbedCode = () => {
    navigator.clipboard
      .writeText(generatedEmbedCode)
      .then(() => {
        toast.success("Embed code copied to clipboard!");
      })
      .catch((err) => {
        toast.error("Failed to copy embed code.");
      });
  };

  const generateEmbedCode = useCallback(() => {
    const embedCode = `<iframe src="https://open.spotify.com/embed/playlist/${playlistID}" width="${iframeWidth}" height="${iframeHeight}" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
    setGeneratedEmbedCode(embedCode);
  }, [iframeWidth, iframeHeight, playlistID]);

  const copyInviteLink = () => {
    const inviteLink = `https://open.spotify.com/playlist/${playlistID}?si=6576ac9c34fe4ed9&pt=39f1d270c5215a4a714c9ff6a0552c26`;
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => {
        toast.success("Invite link copied to clipboard!");
      })
      .catch((err) => {
        toast.error("Failed to copy invite link.");
      });
  };

  useEffect(() => {
    if (token) {
      fetchPlaylistDetails();

      const fetchAndSetUserID = async () => {
        const userId = await fetchUserProfile(token);
        if (userId) {
          setUserID(userId);
        }
      };

      fetchAndSetUserID();
    }
  }, [token, fetchPlaylistDetails]);

  useEffect(() => {
    generateEmbedCode();
  }, [iframeWidth, iframeHeight, playlistID, generateEmbedCode]);

  return (
    <>
      <ToastContainer />
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger>
          <CiSettings size={45} />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="sm:mr-5">
          <DropdownMenuItem>
            <FiPlusCircle className="mr-2" /> Add to profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCreatePlaylist}>
            <FiPlusCircle className="mr-2" /> Create playlists
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyInviteLink}>
            <BiUserPlus className="mr-2" /> Invite collaborators
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FiShare2 className="mr-2" /> Share
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={copyPlaylistLink}>
                  <AiOutlineLink className="mr-2" /> Copy link to playlist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEmbedDialogOpen(true)}>
                  <FaLaptopCode className="mr-2" /> Embed playlist
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setIsDeleteDialogOpen(true);
              setIsDropdownOpen(false);
            }}
            className="text-destructive focus:text-destructive"
          >
            <FiDelete className="mr-2" /> Delete
          </DropdownMenuItem>
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
            <Button
              type="submit"
              onClick={deletePlaylist}
              variant={"destructive"}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmbedDialogOpen} onOpenChange={setIsEmbedDialogOpen}>
        <DialogContent className="">
          <DialogHeader>
            <DialogTitle>Customize Embed Code</DialogTitle>
            <DialogDescription>
              Set the dimensions of the iframe to embed your Spotify playlist
              and see a live preview.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] overflow-y-auto pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">Width:</Label>
                  <Select
                    value={iframeWidth}
                    onValueChange={(value: "352" | "252" | "152") =>
                      setIframeWidth(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select width" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="352">Standard (352px)</SelectItem>
                      <SelectItem value="252">Medium (252px)</SelectItem>
                      <SelectItem value="152">Compact (152px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height:</Label>
                  <Select
                    value={iframeHeight}
                    onValueChange={(value: "380" | "280" | "180" | "80") =>
                      setIframeHeight(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select height" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="380">Full (380px)</SelectItem>
                      <SelectItem value="280">Medium (280px)</SelectItem>
                      <SelectItem value="180">Short (180px)</SelectItem>
                      <SelectItem value="80">Mini (80px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 ">
                <h4 className="font-medium">Live Preview:</h4>
                <div className="overflow-hidden ">
                  <iframe
                    src={`https://open.spotify.com/embed/playlist/${playlistID}`}
                    width={iframeWidth}
                    height={iframeHeight}
                    frameBorder="0"
                    allow="encrypted-media"
                    allowTransparency={true}
                    className="mx-auto"
                  ></iframe>
                </div>
              </div>

              <div className="flex items-center space-x-2 justify-between">
                <div className="flex items-center space-x-2 flex-grow">
                  <Switch
                    id="show-embed-code"
                    checked={showEmbedCode}
                    onCheckedChange={setShowEmbedCode}
                  />
                  <Label htmlFor="show-embed-code">Show Embed Code</Label>
                </div>
                <Button variant="secondary" onClick={copyEmbedCode}>
                  Copy
                </Button>
              </div>

              {showEmbedCode && (
                <div className="space-y-2">
                  <ScrollArea className="max-h-[150px] w-full rounded-md border">
                    <pre className="p-4">
                      <code className="text-xs whitespace-pre-wrap break-all">
                        {generatedEmbedCode}
                      </code>
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
