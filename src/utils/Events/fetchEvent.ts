import axios from "axios";
import { Event } from "@/lib/events";

const TICKETMASTER_API_KEY = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY;

/**
 * Fetch events from Ticketmaster API based on latitude and longitude.
 * @param lat Latitude of the location.
 * @param long Longitude of the location.
 * @returns Array of events or an error message.
 */
export const fetchEvents = async (lat: number, long: number): Promise<{ events: Event[]; error?: string }> => {
  try {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?latlong=${lat},${long}&apikey=${TICKETMASTER_API_KEY}`;
    console.log("Fetching:", url);

    const response = await axios.get(url);

    if (response.data._embedded?.events) {
      return { events: response.data._embedded.events };
    } else {
      return { events: [], error: "No events found." };
    }
  } catch (error: any) {
    console.error("Error fetching events:", error);
    return { events: [], error: error.message || "Failed to fetch events." };
  }
};
