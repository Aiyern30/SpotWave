// src/types/global.d.ts

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => {
        connect: () => Promise<boolean>;
        addListener: (event: string, callback: (data: { device_id: string }) => void) => void;
      };
    };
  }
}

export {};
