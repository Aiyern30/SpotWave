// /app/Explore/layout.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpotWave - Unauthorized",
};

const ExploreLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ExploreLayout;
