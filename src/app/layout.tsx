import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpotWave",
  description: "Created by Ian Gan",
  manifest: "/manifest.json",
  themeColor: "#22c55e",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpotWave",
  },
  icons: {
    icon: "/Logo.png",
    apple: "/Logo.png",
  },
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22c55e" />
        <link rel="icon" href="/Logo.png" />
        <link rel="apple-touch-icon" href="/Logo.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('app-theme');
                  if (savedTheme) {
                    document.documentElement.classList.add(savedTheme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-primary-background`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
