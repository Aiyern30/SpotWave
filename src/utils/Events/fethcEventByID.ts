import axios from "axios";
import { EventData } from "@/lib/events";

const TICKETMASTER_API_KEY = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY;

const handleTicketMasterResponse = (data: any): EventData | null => {
  if (data._embedded?.events) {
    return data._embedded.events[0]; 
  }
  return null;
};

const handleUniverseResponse = (data: any): EventData | null => {
  if (data) {
    return data; 
  }
  return null;
};

export const fetchEventById = async (eventId: string): Promise<{ event: EventData | null; error: string | null }> => {
  try {
    const ticketMasterUrl = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json?apikey=${TICKETMASTER_API_KEY}`;
    
    const response = await axios.get(ticketMasterUrl);

    let event = handleTicketMasterResponse(response.data);
    
    if (!event) {
      event = handleUniverseResponse(response.data);
    }

    if (!event) {
      return { event: null, error: "Event not found." };
    }

    return { event, error: null };

  } catch (error: any) {
    console.error("Error fetching event by ID:", error);
    return { event: null, error: error.message || "Failed to fetch event details." };
  }
};
