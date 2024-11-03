// /app/Home/layout.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpotWave - Home",
};

const HomeLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default HomeLayout;
