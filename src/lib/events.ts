export interface EventData {
  name: string;
  type: string;
  id: string;
  test: boolean;
  url: string;
  locale: string;
  description?: string;
  images: {
    ratio: string;
    url: string;
    width: number;
    height: number;
    fallback: boolean;
  }[];
  sales: {
    public: {
      startDateTime: string;
      startTBD: boolean;
      startTBA: boolean;
      endDateTime?: string;
    };
  };
  dates: {
    start: {
      localDate: string;
      localTime: string;
      dateTime: string;
      dateTBD: boolean;
      dateTBA: boolean;
      timeTBA: boolean;
      noSpecificTime: boolean;
    };
    end?: {
      localDate?: string;
      localTime?: string;
      dateTime?: string;
      approximate?: boolean;
      noSpecificTime?: boolean;
    };
    timezone?: string;
    status?: {
      code: string;
    };
  };
  classifications?: {
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
  }[];
  promoter?: {
    id: string;
    name: string;
    description: string;
  };
  priceRanges?: {
    type: string;
    currency: string;
    min: number;
    max: number;
  }[];
  accessibility?: {
    id: string;
  };
  ticketLimit?: {
    info: string;
    id: string;
  };
  ageRestrictions?: {
    legalAgeEnforced: boolean;
    id: string;
  };
  ticketing?: {
    safeTix: {
      enabled: boolean;
    };
    allInclusivePricing: {
      enabled: boolean;
    };
    id: string;
  };
  _embedded?: {
    venues?: {
      name: string;
      type: string;
      id: string;
      test: boolean;
      url: string;
      locale: string;
      postalCode?: string;
      timezone?: string;
      city?: {
        name: string;
      };
      state?: {
        name: string;
        stateCode: string;
      };
      country?: {
        name: string;
        countryCode: string;
      };
      address?: {
        line1: string;
      };
      location?: {
        longitude: string;
        latitude: string;
      };
    }[];
  };
  place?: {
    city: { name: string };
    country: { name: string; countryCode: string };
    address: { line1: string };
    location: { longitude: string; latitude: string };
    state: { name: string; stateCode: string };
  };
}
