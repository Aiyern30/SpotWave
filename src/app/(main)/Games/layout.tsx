// /app/Games/layout.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpotWave - Games",
};

const GamesLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default GamesLayout;
