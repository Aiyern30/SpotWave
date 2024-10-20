import { CiSettings } from "react-icons/ci";
import {
  FiEdit,
  FiDownload,
  FiDelete,
  FiPlusCircle,
  FiShare2,
} from "react-icons/fi"; // Import icons
import { BiUserPlus } from "react-icons/bi"; // For inviting collaborators
import { AiOutlineLink } from "react-icons/ai"; // For copying the link
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui";
import { FaLaptopCode } from "react-icons/fa";

export default function Settings() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <CiSettings size={45} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mr-5">
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <FiPlusCircle className="mr-2" /> Add to profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FiEdit className="mr-2" /> Edit details
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FiDelete className="mr-2" /> Delete
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FiDownload className="mr-2" /> Download
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FiPlusCircle className="mr-2" /> Create playlists
        </DropdownMenuItem>
        <DropdownMenuItem>
          <BiUserPlus className="mr-2" /> Make private
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
  );
}
