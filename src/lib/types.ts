export interface PlaylistProps {
  id: string;
  name: string;
  description?: string;
  images: { url: string; height?: number; width?: number }[];
  owner: {
    display_name: string;
    id: string;
  };
  tracks: {
    items: PlaylistTrack[];
    total: number;
  };
  collaborative?: boolean;
  external_urls?: {
    spotify: string;
  };
  followers?: {
    total: number;
  };
  href?: string;
  public?: boolean;
  snapshot_id?: string;
  type?: string;
  uri?: string;
}

export interface PlaylistTrack {
  track: {
    id: string;
    name: string;
    artists: { name: string; id: string }[];
    album: {
      name: string;
      id: string;
      images: { url: string }[];
    };
    duration_ms: number;
    uri: string;
    preview_url?: string | null;
  };
  added_at: string;
}

export interface UserProfile {
  id: string;
  display_name: string;
  email?: string;
  images: { url: string }[];
  followers: {
    total: number;
  };
  country?: string;
  product?: string;
}

export interface User {
  id: string;
  display_name: string;
  email?: string;
  images: { url: string }[];
  followers: {
    total: number;
  };
  country?: string;
  product?: string;
}

export interface Artist {
  id: string;
  name: string;
  image?: string;
  genres?: string[];
  followers?: number;
}

export interface RecentTracksProps {
  track: {
    album: {
      artists: {
        id: string;
        name: string;
      }[];
      images: {
        url: string;
      }[];
      name: string;
      release_date: string;
    };
    artists: {
      id: string;
      name: string;
    }[];
    id: string;
    name: string;
    duration_ms: number;
    uri: string;
    preview_url?: string | null;
  };
  played_at: string;
}

export interface GlobalArtistPropsLASTFM {
  id: string;
  name: string;
  playcount: number;
  listeners: number;
  image: {
    "#text": string;
    size: string;
  }[];
}

export interface ArtistsResponseLASTFM {
  artists: {
    artist: GlobalArtistPropsLASTFM[];
  };
}

export interface TrackDataLASTFM {
  id: string;
  name: string;
  playcount: number;
  listeners: number;
  artist: {
    name: string;
    id: string;
  };
  image: {
    "#text": string;
    size: string;
  }[];
}

export interface TopTracksResponseLASTFM {
  tracks: {
    track: TrackDataLASTFM[];
  };
}

export interface Track {
  id: string;
  name: string;
  artists: { name: string; id: string }[];
  album: {
    name: string;
    images: { url: string }[];
    id: string;
    artists: { name: string; id: string }[];
    release_date: string;
    total_tracks: number;
  };
  duration_ms: number;
  explicit: boolean;
  external_urls: {
    spotify: string;
  };
  popularity: number;
  preview_url?: string | null;
  track_number: number;
  disc_number: number;
  uri: string;
}

export interface Album {
  id: string;
  name: string;
  artists: { name: string; id: string }[];
  images: { url: string }[];
  release_date: string;
  total_tracks: number;
  album_type: string;
  tracks: {
    items: {
      id: string;
      name: string;
      artists: { name: string; id: string }[];
      duration_ms: number;
      preview_url?: string | null;
      uri: string;
      album?: {
        images: { url: string }[];
      };
    }[];
  };
}

export type DisplayUIProps = "Table" | "Grid";
