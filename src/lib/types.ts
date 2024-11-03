export interface Image {
  url: string;
  height: number;
  width: number;
}

export interface Artist {
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
  genres: string[];
  image: string;
}

export interface RecentTracksProps {
  played_at: string;
  track: {
    album: {
      album_type: string;
      artists: {
        name: string;
        id: string;
        type: string;
      }[];
      release_date: string;
      images: Image[];
    };
    name: string;
    duration_ms: string;
  };
}

export interface Album {
  album_type: string;
  total_tracks: number;
  available_markets: string[];
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  images: Image[];
  name: string;
  release_date: string;
  release_date_precision: string;
  restrictions: {
    reason: string;
  };
  type: string;
  uri: string;
  artists: Artist[];
  tracks: {
    items: {
      id: string;
      name: string;
      duration_ms: number;
      preview_url: string | null;
      uri: string;
      album: {
        images: Image[];
      };
      artists: {
        id: string;
        name: string;
      }[];
    }[];
  };
}

export interface Track {
  album: Album;
  artists: Artist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: {
    isrc: string;
    ean: string;
    upc: string;
  };
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  is_playable: boolean;
  linked_from: {};
  restrictions: {
    reason: string;
  };
  name: string;
  popularity: number;
  preview_url: string;
  track_number: number;
  type: string;
  uri: string;
  is_local: boolean;
}

export interface PlaylistProps {
  collaborative: boolean;
  description: string;
  external_urls: {
    spotify: string;
  };
  followers: {
    href: string;
    total: number;
  };
  href: string;
  id: string;
  images: Image[];
  name: string;
  owner: {
    external_urls: {
      spotify: string;
    };
    followers: {
      href: string;
      total: number;
    };
    href: string;
    id: string;
    type: string;
    uri: string;
    display_name: string;
  };
  public: boolean;
  snapshot_id: string;
  tracks: {
    href: string;
    limit: number;
    next: string;
    offset: number;
    previous: string;
    total: number;
    items: {
      added_at: string;
      added_by: {
        external_urls: {
          spotify: string;
        };
        followers: {
          href: string;
          total: number;
        };
        href: string;
        id: string;
        type: string;
        uri: string;
      };
      is_local: boolean;
      track: Track;
    }[];
  };
  type: string;
  uri: string;
}

export interface UserProfile {
  images: Image[];
}

export interface DisplayUIProps {
  displayUI: "Table" | "Grid";
}

export interface UserImage {
  url: string;
  height: number;
  width: number;
}

export interface UserFollowers {
  href: string | null;
  total: number;
}

export interface ExplicitContent {
  filter_enabled: boolean;
  filter_locked: boolean;
}

export interface User {
  display_name: string;
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  images: UserImage[];
  type: string;
  uri: string;
  followers: UserFollowers;
  country: string;
  product: string;
  explicit_content: ExplicitContent;
  email: string;
}

export interface ImageLASTFM {
  ["#text"]: string;
  size: string;
}

export interface TrackDataLASTFM {
  name: string;
  playcount: string;
  listeners: string;
  artist: {
    name: string;
    id: string;
  };
  image: ImageLASTFM[];
  id: string;
}

export interface TopTracksResponseLASTFM {
  tracks: {
    track: TrackDataLASTFM[];
  };
}

export interface GlobalArtistPropsLASTFM {
  name: string;
  playcount: string;
  listeners: string;
  mbid: string;
  url: string;
  image: ImageLASTFM[];
  id: string;
}

export interface ArtistsResponseLASTFM {
  artists: {
    artist: GlobalArtistPropsLASTFM[];
  };
}
