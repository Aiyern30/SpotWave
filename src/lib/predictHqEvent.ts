interface PredictHQAddress {
    country_code: string;
    formatted_address: string;
    locality: string;
    postcode: string;
    region: string;
  }
  
  interface PredictHQImpact {
    vertical: string;
    impact_type: string;
    impacts: { date_local: string; value: number; position: string }[];
  }
  
  interface PredictHQGeoGeometry {
    coordinates: number[];
    type: string;
  }
  
  interface PredictHQGeo {
    geometry: PredictHQGeoGeometry;
    placekey: string;
    address: PredictHQAddress;
  }
  
  interface PredictHQEventData {
    relevance: number;
    id: string;
    title: string;
    description: string;
    category: string;
    labels: string[];
    rank: number;
    local_rank: number;
    phq_attendance: number;
    entities: any[]; // You can specify more types if needed
    duration: number;
    start: string;
    start_local: string;
    end: string;
    end_local: string;
    predicted_end: string;
    predicted_end_local: string;
    updated: string;
    first_seen: string;
    timezone: string;
    location: number[]; // [longitude, latitude]
    geo: PredictHQGeo;
    impact_patterns: PredictHQImpact[];
    scope: string;
    country: string;
    place_hierarchies: string[][];
    state: string;
    brand_safe: boolean;
    private: boolean;
    predicted_event_spend: number;
    predicted_event_spend_industries: {
      accommodation: number;
      hospitality: number;
      transportation: number;
    };
  }
  
  export default PredictHQEventData;
  