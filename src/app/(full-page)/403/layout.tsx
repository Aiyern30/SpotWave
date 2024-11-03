// /app/Explore/layout.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpotWave - Forbidden",
};

const ExploreLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ExploreLayout;
