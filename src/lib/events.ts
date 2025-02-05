export interface Venue {
    name: string;
    city: {
      name: string;
    };
    state?: {
      name: string;
      stateCode: string;
    };
    country: {
      name: string;
      countryCode: string;
    };
    address?: {
      line1: string;
    };
    location: {
      latitude: string;
      longitude: string;
    };
    url?: string;
    postalCode?: string;
    timezone?: string;
  }
  
  export interface EventImage {
    url: string;
    width: number;
    height: number;
    ratio: string;
    fallback: boolean;
  }
  
  export interface EventClassification {
    primary: boolean;
    segment: {
      id: string;
      name: string;
      levelType: string;
    };
    genre?: {
      id: string;
      name: string;
      levelType: string;
    };
    subGenre?: {
      id: string;
      name: string;
      levelType: string;
    };
    type?: {
      id: string;
      name: string;
      levelType: string;
    };
    subType?: {
      id: string;
      name: string;
      levelType: string;
    };
  }
  
  export interface EventDates {
    start: {
      localDate: string;
      localTime: string;
      dateTime: string;
      dateTBD: boolean;
      dateTBA: boolean;
      timeTBA: boolean;
      noSpecificTime: boolean;
    };
    timezone: string;
    status: {
      code: string;
    };
    spanMultipleDays: boolean;
  }
  
  export interface PriceRange {
    type: string;
    currency: string;
    min: number;
    max: number;
  }
  
  export interface TicketLimit {
    info: string;
    id: string;
  }
  
  export interface Event {
    id: string;
    name: string;
    type: string;
    url: string;
    locale: string;
    images: EventImage[];
    distance: number;
    units: string;
    sales: {
      public: {
        startDateTime: string;
        startTBD: boolean;
        startTBA: boolean;
        endDateTime: string;
      };
    };
    dates: EventDates;
    classifications: EventClassification[];
    promoter: {
      id: string;
      name: string;
      description: string;
    };
    promoters: {
      id: string;
      name: string;
      description: string;
    }[];
    info?: string;
    pleaseNote?: string;
    priceRanges?: PriceRange[];
    ticketLimit?: TicketLimit;
    ageRestrictions?: {
      legalAgeEnforced: boolean;
      id: string;
    };
    _embedded: {
      venues: Venue[];
    };
  }
  