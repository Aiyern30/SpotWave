import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpotWave - Events",
};

const EventLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default EventLayout;
