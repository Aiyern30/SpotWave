import { Skeleton } from "@/components/ui";

// Shared by music collections and their loading states. Two columns on phones;
// larger screens adapt to the content width, including an expanded sidebar.
export const mediaGridClass = "grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-5";

export function MediaGridSkeleton({ count = 6, view = "Grid" }: { count?: number; view?: "Grid" | "List" }) {
  return (
    <div className={view === "Grid" ? mediaGridClass : "space-y-2"} aria-label="Loading music" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`min-w-0 rounded-xl border border-zinc-800/70 bg-zinc-900/50 p-3 ${view === "List" ? "flex items-center gap-4" : ""}`}>
          <Skeleton className={`${view === "List" ? "h-14 w-14 shrink-0" : "aspect-square w-full"} rounded-lg bg-zinc-800 motion-reduce:animate-none`} />
          <div className={`${view === "List" ? "flex-1" : "h-[72px] pt-3"} space-y-2`}>
            <Skeleton className="h-5 w-3/4 bg-zinc-800 motion-reduce:animate-none" />
            <Skeleton className="h-4 w-1/2 bg-zinc-800 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
