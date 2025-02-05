export interface Venue {
    name: string;
    city: string;
    country: string;
    location: {
      latitude: number;
      longitude: number;
    };
  }
  
  export interface EventImage {
    url: string;
    width: number;
    height: number;
    alt: string;
  }
  
  export interface Event {
    id: string;
    name: string;
    _embedded: {
      venues: Venue[];
    };
    dates: {
      start: {
        localDate: string;
        localTime: string;
      };
    };
    images: EventImage[];
    url: string;
  }