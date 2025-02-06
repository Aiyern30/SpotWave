import { XCircle } from "lucide-react";
import { Button } from "./ui";

const NoEventsFound = ({ onRetry }: { onRetry?: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-84px)] px-6 text-center">
      <XCircle className="w-20 h-20 text-gray-400 mb-4 animate-fadeIn" />
      <h2 className="text-5xl font-semibold text-white">No Events Found</h2>
      <p className="text-white mt-2">
        Try changing your filters or check back later.
      </p>
      {onRetry && (
        <Button className="mt-4 px-6 py-2" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
};

export default NoEventsFound;
