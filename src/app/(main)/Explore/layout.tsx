// /app/Explore/layout.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpotWave - Explore",
};

const ExploreLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ExploreLayout;
