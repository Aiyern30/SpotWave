import { EventData } from "@/lib/events";
import axios from "axios";

// Fetch event details by eventId
export const fetchEventById = async (eventId: string): Promise<{ event: EventData | null; error: string | null }> => {
    const TICKETMASTER_API_KEY = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY;
  
    try {
      const url = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json?apikey=${TICKETMASTER_API_KEY}`;
      console.log("Fetching event by ID:", url);
  
      const response = await axios.get(url);
      console.log("API Response:", response.data);  // Log the full response
  
      if (response.data._embedded?.events) {
        return { event: response.data._embedded.events[0], error: null }; 
      } else {
        return { event: null, error: "Event not found." };
      }
    } catch (error: any) {
      console.error("Error fetching event by ID:", error);
      return { event: null, error: error.message || "Failed to fetch event details." };
    }
  };
  
