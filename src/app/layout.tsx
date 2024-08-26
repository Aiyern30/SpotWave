import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpotWave",
  description: "Created by Ian Gan",
  
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add the Spotify SDK script */}
        <Script src="https://sdk.scdn.co/spotify-player.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
