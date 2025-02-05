import { FaMusic } from "react-icons/fa";
import { Button } from "@/components/ui";

const NoTracks = ({ onExplore }: { onExplore?: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[24rem] text-gray-400 space-y-4">
      <FaMusic className="w-16 h-16 text-gray-500" />
      <h2 className="text-lg font-semibold">No tracks found in the playlist</h2>
      <p className="text-sm text-gray-500">
        Add songs to your playlist and enjoy your favorite tunes!
      </p>
      {onExplore && (
        <Button onClick={onExplore} variant="default">
          Explore Music
        </Button>
      )}
    </div>
  );
};

export default NoTracks;
