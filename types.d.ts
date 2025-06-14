interface Window {
  Spotify?: {
    Player: new (options: {
      name: string;
      getOAuthToken: (cb: (token: string) => void) => void;
      volume?: number;
    }) => {
      connect: () => Promise<boolean>;
      disconnect: () => void;
      addListener: (event: string, callback: (data: any) => void) => void;
      removeListener: (event: string, callback?: (data: any) => void) => void;
      getCurrentState: () => Promise<any>;
      setName: (name: string) => Promise<void>;
      getVolume: () => Promise<number>;
      setVolume: (volume: number) => Promise<void>;
      pause: () => Promise<void>;
      resume: () => Promise<void>;
      togglePlay: () => Promise<void>;
      seek: (position_ms: number) => Promise<void>;
      previousTrack: () => Promise<void>;
      nextTrack: () => Promise<void>;
      activateElement: () => Promise<void>;
    };
  };
  onSpotifyWebPlaybackSDKReady?: () => void;
}
