import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpotWave - Playlists",
};

const PlaylistsLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default PlaylistsLayout;
