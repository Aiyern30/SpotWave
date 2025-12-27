/* eslint-disable react/no-unescaped-entities */
"use client";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useCallback, useEffect, useState } from "react";
import {
  SettingsIcon,
  Plus,
  Users,
  Share2,
  Link,
  Code,
  Trash2,
  Heart,
  Copy,
  Check,
  Globe,
  Lock,
} from "lucide-react";
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
  Badge,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui";
import type { PlaylistProps } from "@/lib/types";
import { useRouter } from "next/navigation";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { CreatePlaylist } from "@/utils/createPlaylist";
import { deletePlaylist } from "@/utils/deletePlaylist";
import { fetchPlaylistDetails } from "@/utils/fetchPlaylist";

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
  const [isLoading, setIsLoading] = useState(false);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>(
    {}
  );

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleCreatePlaylist = async () => {
    setIsLoading(true);
    try {
      const playlistResponse = await CreatePlaylist(userID, token);
      if (playlistResponse) {
        const playlistID = playlistResponse.id;
        const playlistName = playlistResponse.name;
        toast.success("Playlist created successfully!");
        router.push(
          `/Home/${playlistID}?name=${encodeURIComponent(playlistName)}`
        );
      } else {
        toast.error("Failed to create playlist");
      }
    } catch (error) {
      toast.error("Error creating playlist");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchPlaylistDetails = useCallback(async () => {
    const fetchPlaylist = await fetchPlaylistDetails(playlistID, token);
    if (fetchPlaylist) {
      setCurrentPlaylist(fetchPlaylist);
    }
  }, [token, playlistID]);

  const handleDeletePlaylist = async () => {
    setIsLoading(true);
    try {
      const confirmDelete = await deletePlaylist(playlistID, token);
      if (confirmDelete) {
        toast.success("Playlist deleted successfully!");
        router.push("/Home");
        setIsDeleteDialogOpen(false);
        setIsDropdownOpen(false);
      } else {
        toast.error("Failed to delete playlist");
      }
    } catch (error) {
      toast.error("Error deleting playlist");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlaylistPrivacy = async () => {
    if (!currentPlaylist) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistID}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            public: !currentPlaylist.public,
          }),
        }
      );

      if (response.ok) {
        toast.success(
          `Playlist set to ${!currentPlaylist.public ? "Public" : "Private"}`
        );
        // Refresh playlist details to get updated state
        await handleFetchPlaylistDetails();
      } else {
        throw new Error("Failed to update playlist privacy");
      }
    } catch (error) {
      console.error("Error updating playlist privacy:", error);
      toast.error("Failed to update playlist privacy");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [type]: true }));
      toast.success(`${type} copied to clipboard!`);
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (error) {
      toast.error(`Failed to copy ${type.toLowerCase()}`);
    }
  };

  const copyPlaylistLink = () => {
    const playlistLink = `https://open.spotify.com/playlist/${playlistID}`;
    copyToClipboard(playlistLink, "Playlist link");
  };

  const copyEmbedCode = () => {
    copyToClipboard(generatedEmbedCode, "Embed code");
  };

  const copyInviteLink = () => {
    const inviteLink = `https://open.spotify.com/playlist/${playlistID}?si=6576ac9c34fe4ed9&pt=39f1d270c5215a4a714c9ff6a0552c26`;
    copyToClipboard(inviteLink, "Invite link");
  };

  const generateEmbedCode = useCallback(() => {
    const embedCode = `<iframe src="https://open.spotify.com/embed/playlist/${playlistID}" width="${iframeWidth}" height="${iframeHeight}" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
    setGeneratedEmbedCode(embedCode);
  }, [iframeWidth, iframeHeight, playlistID]);

  useEffect(() => {
    if (token) {
      handleFetchPlaylistDetails();

      const fetchAndSetUserID = async () => {
        const data = await fetchUserProfile(token);
        const userId = data?.id;
        if (userId) {
          setUserID(userId);
        }
      };

      fetchAndSetUserID();
    }
  }, [token, handleFetchPlaylistDetails]);

  useEffect(() => {
    generateEmbedCode();
  }, [iframeWidth, iframeHeight, playlistID, generateEmbedCode]);

  return (
    <TooltipProvider>
      <ToastContainer position="top-right" theme="dark" />

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <DropdownMenu
              open={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/30 hover:border-white/20 transition-all duration-200 hover:scale-105"
                >
                  <SettingsIcon className="h-5 w-5 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 bg-zinc-900/95 backdrop-blur-sm border-zinc-700/50 shadow-2xl"
                align="end"
                sideOffset={8}
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-white">
                    Playlist Settings
                  </p>
                  <p className="text-xs text-zinc-400">Manage your playlist</p>
                </div>
                <DropdownMenuSeparator className="bg-zinc-700/50" />

                <DropdownMenuItem
                  onClick={togglePlaylistPrivacy}
                  disabled={isLoading}
                  className="text-white hover:bg-zinc-800/50 focus:bg-zinc-800/50"
                >
                  {currentPlaylist?.public ? (
                    <>
                      <Lock className="mr-3 h-4 w-4" />
                      <span>Set to Private</span>
                    </>
                  ) : (
                    <>
                      <Globe className="mr-3 h-4 w-4" />
                      <span>Set to Public</span>
                    </>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleCreatePlaylist}
                  disabled={isLoading}
                  className="text-white hover:bg-zinc-800/50 focus:bg-zinc-800/50"
                >
                  <Plus className="mr-3 h-4 w-4" />
                  <span>{isLoading ? "Creating..." : "Create playlist"}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={copyInviteLink}
                  className="text-white hover:bg-zinc-800/50 focus:bg-zinc-800/50"
                >
                  <Users className="mr-3 h-4 w-4" />
                  <span>Invite collaborators</span>
                  {copiedStates["Invite link"] && (
                    <Check className="ml-auto h-4 w-4 text-green-500" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-white hover:bg-zinc-800/50 focus:bg-zinc-800/50">
                    <Share2 className="mr-3 h-4 w-4" />
                    <span>Share</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="bg-zinc-900/95 backdrop-blur-sm border-zinc-700/50">
                      <DropdownMenuItem
                        onClick={copyPlaylistLink}
                        className="text-white hover:bg-zinc-800/50 focus:bg-zinc-800/50"
                      >
                        <Link className="mr-3 h-4 w-4" />
                        <span>Copy playlist link</span>
                        {copiedStates["Playlist link"] && (
                          <Check className="ml-auto h-4 w-4 text-green-500" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsEmbedDialogOpen(true)}
                        className="text-white hover:bg-zinc-800/50 focus:bg-zinc-800/50"
                      >
                        <Code className="mr-3 h-4 w-4" />
                        <span>Embed playlist</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSeparator className="bg-zinc-700/50" />

                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setIsDeleteDialogOpen(true);
                    setIsDropdownOpen(false);
                  }}
                  className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="mr-3 h-4 w-4" />
                  <span>Delete playlist</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Playlist settings</p>
        </TooltipContent>
      </Tooltip>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              Delete Playlist
            </DialogTitle>
            <DialogDescription className="text-zinc-300">
              This action cannot be undone. Are you sure you want to permanently
              delete this playlist?
              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-300 font-medium">
                  "{currentPlaylist?.name}" will be permanently removed from
                  your library.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="default"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-zinc-600 text-white hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeletePlaylist}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? "Deleting..." : "Delete Playlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed Dialog */}
      <Dialog open={isEmbedDialogOpen} onOpenChange={setIsEmbedDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Embed Playlist
            </DialogTitle>
            <DialogDescription className="text-zinc-300">
              Customize the embed player and copy the code to use on your
              website.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Size Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white">
                    Width
                  </Label>
                  <Select
                    value={iframeWidth}
                    onValueChange={(value: "352" | "252" | "152") =>
                      setIframeWidth(value)
                    }
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-600">
                      <SelectItem value="352">Standard (352px)</SelectItem>
                      <SelectItem value="252">Medium (252px)</SelectItem>
                      <SelectItem value="152">Compact (152px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white">
                    Height
                  </Label>
                  <Select
                    value={iframeHeight}
                    onValueChange={(value: "380" | "280" | "180" | "80") =>
                      setIframeHeight(value)
                    }
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-600">
                      <SelectItem value="380">Full (380px)</SelectItem>
                      <SelectItem value="280">Medium (280px)</SelectItem>
                      <SelectItem value="180">Short (180px)</SelectItem>
                      <SelectItem value="80">Mini (80px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-zinc-700" />

              {/* Preview */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-white">
                  Live Preview
                </Label>
                <div className="flex justify-center p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <iframe
                    src={`https://open.spotify.com/embed/playlist/${playlistID}`}
                    width={iframeWidth}
                    height={iframeHeight}
                    frameBorder="0"
                    allow="encrypted-media"
                    allowTransparency={true}
                    className="rounded-lg"
                  />
                </div>
              </div>

              <Separator className="bg-zinc-700" />

              {/* Embed Code */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-embed-code"
                      checked={showEmbedCode}
                      onCheckedChange={setShowEmbedCode}
                    />
                    <Label
                      htmlFor="show-embed-code"
                      className="text-sm font-medium text-white"
                    >
                      Show embed code
                    </Label>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={copyEmbedCode}
                    className="border-zinc-600 text-white hover:bg-zinc-800"
                  >
                    {copiedStates["Embed code"] ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>

                {showEmbedCode && (
                  <ScrollArea className="max-h-32 w-full rounded-lg border border-zinc-700 bg-zinc-800/50">
                    <pre className="p-4">
                      <code className="text-xs text-zinc-300 whitespace-pre-wrap break-all">
                        {generatedEmbedCode}
                      </code>
                    </pre>
                  </ScrollArea>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
