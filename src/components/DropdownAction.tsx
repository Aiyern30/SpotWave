import { Plus, Heart, Album, Share2, LogOut, Folder } from "lucide-react"; // Import a Playlist icon if you have one
import { Button, DropdownMenuTrigger } from "@/components/ui/";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/";
import { IoMdMore } from "react-icons/io";

export function DropdownAction() {
  // Example playlists for the submenu
  const playlists = ["Chill Vibes", "Workout Playlist", "Top Hits", "Classics"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="cursor-pointer">
        <IoMdMore className="w-8 h-8" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Manage Song</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Plus className="mr-2 h-4 w-4" />
              <span>Add to Playlist</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {/* Submenu for creating a new playlist */}
              <DropdownMenuItem>
                <span>Create New Playlist</span>
                <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* List of existing playlists */}
              {playlists.map((playlist, index) => (
                <DropdownMenuItem key={index}>
                  <Folder className="mr-2 h-4 w-4" />
                  <span>{playlist}</span>
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem>
            <Heart className="mr-2 h-4 w-4" />
            <span>Saved to your Liked Songs</span>
            <DropdownMenuShortcut>⌘L</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Album className="mr-2 h-4 w-4" />
            <span>Go to Album</span>
            <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Share2 className="mr-2 h-4 w-4" />
            <span>Share</span>
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
