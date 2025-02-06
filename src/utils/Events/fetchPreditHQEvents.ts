import axios from "axios";

const PREDICTHQ_API_KEY = process.env.NEXT_PUBLIC_PREDICTHQ_API_KEY;

export const fetchMusicEvents = async (): Promise<any> => {
  try {
    const response = await axios.get("https://api.predicthq.com/v1/events", {
      headers: {
        Authorization: `Bearer ${PREDICTHQ_API_KEY}`,
        Accept: "application/json",
      },
      params: {
        country: "MY", // Malaysia
        category: "concerts", // PredictHQ uses "concerts" instead of "music"
        limit: 20,
      },
    });

    console.log("Fetched music events:", response.data.results);

    return response.data.results;
  } catch (error) {
    console.error("Error fetching music events:", error);
    return [];
  }
};

export const fetchPreditHQEventById = async (eventId: string): Promise<any> => {
  try {
    const response = await axios.get(
      `https://api.predicthq.com/v1/events/${eventId}`,
      {
        headers: {
          Authorization: `Bearer ${PREDICTHQ_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    console.log("Fetched event by ID:", response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching event with ID ${eventId}:`, error);
    return null;
  }
};
