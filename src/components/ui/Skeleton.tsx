import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-loading animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
