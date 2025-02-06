export type backgroundColor = {
    backgroundColor: "Gray" | "Blue" | "White";
  };
  
  export type StateType =
    | "Johor"
    | "Kedah"
    | "Kelantan"
    | "Melaka"
    | "Negeri Sembilan"
    | "Pahang"
    | "Perak"
    | "Perlis"
    | "Penang"
    | "Sabah"
    | "Sarawak"
    | "Selangor"
    | "Terengganu"
    | "Kuala Lumpur"
    | "Putrajaya"
    | "Labuan";
  
  export type GoogleMapMarker = {
    id: number;
    latitude: number;
    longitude: number;
    label: string;
    description?: string;
    state: StateType;
    type: "default" | "workshop";
    focusLevel: number;
    link: SharedLinkProps;
  };
  
  export type GoogleMapsProps = {
    component: {
      title?: string;
      description?: string;
      centerLatitude: number;
      centerLongitude: number;
      focusLevel: number;
      markers: GoogleMapMarker[];
      state: StateType[];
      marginTop: "None" | "Small" | "Medium" | "Large";
      marginBottom: "None" | "Small" | "Medium" | "Large";
      backgroundColor: backgroundColor;
    };
    loading?: boolean;
  };
  
  export type SharedMediaProps = {
    id: number;
    attributes: {
      mime: string | null | undefined;
      name: string;
      url: string;
      caption: string;
      ext: string;
      height: number;
      width: number;
    };
  };
  
  export type SharedSingleMediaProps = {
    data: SharedMediaProps;
  };
  
  export type SharedMultipleMediaProps = {
    data: SharedMediaProps[];
  };
  
  export type SharedLinkProps = {
    id: number;
    href: string;
    label: string;
    target?: string;
    style?: string;
    sublink: SharedLinkProps;
  };
  
  export type SharedOpengraphProps = {
    id: number;
    title: string;
    url: string;
    description: string;
    type: "website" | "article" | "profile";
    image: SharedSingleMediaProps | string;
  };
  
  export type SharedSeoProps = {
    id: number;
    metaTitle: string;
    metaDescription: string;
    metaImage?: SharedSingleMediaProps;
  };