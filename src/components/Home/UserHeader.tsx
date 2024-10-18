import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "../ui";
import router, { useRouter } from "next/navigation";
import { PlaylistProps, UserProfile } from "@/lib/types";

interface Playlist {
  playlist: PlaylistProps;
  user: UserProfile;
}

export default function UserHeader({ playlist, user }: Playlist) {
  const router = useRouter();

  return (
    <div>
      <div className="cover flex flex-col md:flex-row items-center p-4 space-x-4">
        {playlist?.images?.[0]?.url && (
          <Image
            src={playlist.images[0].url}
            width={300}
            height={300}
            alt={playlist?.name || "Playlist cover image"}
            priority
            className="w-full max-w-[300px] h-auto md:max-w-[150px] md:w-auto md:h-auto"
          />
        )}
        <div className="flex flex-col space-y-3 mt-4 md:mt-0">
          <div className="text-5xl">{playlist?.name}</div>
          <div className="text-lg">{playlist?.description}</div>

          <div className="flex space-x-3 items-center">
            <div className="text-sm">
              <Avatar>
                <AvatarImage src={user?.images[0].url} />
                <AvatarFallback>{playlist?.owner?.display_name}</AvatarFallback>
              </Avatar>
            </div>
            <div
              className="text-sm hover:underline cursor-pointer"
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
          </div>
        </div>
      </div>
    </div>
  );
}
