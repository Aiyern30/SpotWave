import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import AuthProvider from "./AuthProvider";
import { Toaster } from "@/components/ui/Toaster";
import InQueueWindow from "@/components/InQueueWindow";

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
        <Script
          src="https://sdk.scdn.co/spotify-player.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${inter.className} bg-primary-background`}>
        <AuthProvider>
          {children}
          <Toaster />
          <InQueueWindow />
        </AuthProvider>
      </body>
    </html>
  );
}
